"""Train, compare and persist trend classifiers using strictly chronological validation."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score
from sklearn.model_selection import TimeSeriesSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from ..utils.errors import InsufficientDataError, ModelError
from .evaluate import evaluate
from .features import FEATURE_NAMES, build_features
from .labels import CLASSES, make_labels

log = logging.getLogger(__name__)
MIN_LABELLED_ROWS = 250
TEST_FRACTION = 0.2
SEED = 42


def candidate_models() -> dict[str, Pipeline]:
    return {
        "Logistic Regression": Pipeline([("imp", SimpleImputer(strategy="median")), ("sc", StandardScaler()),
                                         ("clf", LogisticRegression(max_iter=1000, C=0.5, class_weight="balanced"))]),
        "Random Forest": Pipeline([("imp", SimpleImputer(strategy="median")),
                                   ("clf", RandomForestClassifier(n_estimators=250, max_depth=6, min_samples_leaf=10,
                                                                  class_weight="balanced_subsample", n_jobs=-1, random_state=SEED))]),
        "Gradient Boosting": Pipeline([("imp", SimpleImputer(strategy="median")),
                                       ("clf", GradientBoostingClassifier(n_estimators=120, max_depth=3, learning_rate=0.05,
                                                                          subsample=0.8, random_state=SEED))]),
    }


def build_dataset(prices: pd.DataFrame, sentiment_daily, horizon: int, threshold: float):
    feats = build_features(prices, sentiment_daily)
    labels = make_labels(prices["Close"], horizon, threshold)
    data = feats.join(labels.rename("label"))
    labelled = data.dropna(subset=["label"] + [c for c in FEATURE_NAMES if not c.startswith("sent_")])
    return labelled[FEATURE_NAMES], labelled["label"]


def _feature_importance(pipe: Pipeline, top: int = 8) -> list[dict]:
    clf = pipe.named_steps["clf"]
    if hasattr(clf, "feature_importances_"):
        imp = clf.feature_importances_
    elif hasattr(clf, "coef_"):
        imp = np.abs(clf.coef_).mean(axis=0)
    else:
        return []
    order = np.argsort(imp)[::-1][:top]
    total = float(np.sum(imp)) or 1.0
    return [{"feature": FEATURE_NAMES[i], "importance": round(float(imp[i] / total), 4)} for i in order]


def train(symbol: str, prices: pd.DataFrame, sentiment_daily, horizon: int, threshold: float,
          model_dir: str, demo: bool = False) -> dict:
    X, y = build_dataset(prices, sentiment_daily, horizon, threshold)
    if len(X) < MIN_LABELLED_ROWS:
        raise InsufficientDataError(
            f"Only {len(X)} usable trading days are available for {symbol}; at least {MIN_LABELLED_ROWS} are "
            "needed to train a trend model. Try a longer history or a more established ticker.",
            details={"rows": len(X), "required": MIN_LABELLED_ROWS})
    if y.nunique() < 2:
        raise InsufficientDataError("Price history shows no variety in outcomes; cannot train a classifier.")

    # Chronological split with an embargo of `horizon` rows so that no training label overlaps the test window.
    split = int(len(X) * (1 - TEST_FRACTION))
    X_tr, y_tr = X.iloc[:split], y.iloc[:split]
    X_te, y_te = X.iloc[split + horizon:], y.iloc[split + horizon:]
    if len(X_te) < 30:
        raise InsufficientDataError("Not enough recent data left over to evaluate the model.")

    # Model selection: walk-forward CV on the training portion only (gap = horizon).
    tscv = TimeSeriesSplit(n_splits=4, gap=horizon)
    comparison: list[dict] = []
    for name, pipe in candidate_models().items():
        cv_scores = []
        for tr_idx, va_idx in tscv.split(X_tr):
            if y_tr.iloc[tr_idx].nunique() < 2:
                continue
            pipe.fit(X_tr.iloc[tr_idx], y_tr.iloc[tr_idx])
            cv_scores.append(f1_score(y_tr.iloc[va_idx], pipe.predict(X_tr.iloc[va_idx]), labels=CLASSES, average="macro", zero_division=0))
        pipe.fit(X_tr, y_tr)
        metrics = evaluate(y_te, pipe.predict(X_te))
        comparison.append({"model": name, "cv_f1_macro": round(float(np.mean(cv_scores)), 4) if cv_scores else None,
                           "test": metrics})

    baseline = DummyClassifier(strategy="most_frequent").fit(X_tr, y_tr)
    baseline_metrics = evaluate(y_te, baseline.predict(X_te))

    best = max(comparison, key=lambda c: (c["cv_f1_macro"] if c["cv_f1_macro"] is not None else -1, c["test"]["f1_macro"]))
    best_name = best["model"]

    # Out-of-sample backtest from the train-only model (never seen these rows).
    selected = candidate_models()[best_name].fit(X_tr, y_tr)
    test_pred = selected.predict(X_te)
    backtest = [{"date": d.strftime("%Y-%m-%d"), "predicted": str(p), "actual": str(a), "correct": bool(p == a)}
                for d, p, a in zip(X_te.index, test_pred, y_te)]
    importance = _feature_importance(selected)

    # Final model: refit on every labelled row so the live forecast uses the most recent data.
    final = candidate_models()[best_name].fit(X, y)
    meta = {
        "symbol": symbol, "model_name": best_name, "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "horizon_days": horizon, "threshold": threshold, "classes": list(final.classes_), "demo": demo,
        "n_train": int(len(X_tr)), "n_test": int(len(X_te)), "n_total": int(len(X)),
        "train_period": [X_tr.index[0].strftime("%Y-%m-%d"), X_tr.index[-1].strftime("%Y-%m-%d")],
        "test_period": [X_te.index[0].strftime("%Y-%m-%d"), X_te.index[-1].strftime("%Y-%m-%d")],
        "class_balance_train": {k: int(v) for k, v in y_tr.value_counts().items()},
        "test_metrics": comparison[[c["model"] for c in comparison].index(best_name)]["test"],
        "comparison": comparison, "baseline": baseline_metrics, "feature_importance": importance,
        "backtest": backtest,
        "sentiment_coverage_pct": round(float(X["sent_available"].mean() * 100), 1),
    }
    path = Path(model_dir)
    path.mkdir(parents=True, exist_ok=True)
    safe = symbol.replace("^", "_").replace("=", "_")
    joblib.dump({"pipeline": final, "feature_names": FEATURE_NAMES, "meta": meta}, path / f"{safe}.joblib")
    log.info("Trained %s for %s: acc=%.3f f1=%.3f (baseline acc=%.3f)", best_name, symbol,
             meta["test_metrics"]["accuracy"], meta["test_metrics"]["f1_macro"], baseline_metrics["accuracy"])
    return meta


def load(symbol: str, model_dir: str) -> dict | None:
    safe = symbol.replace("^", "_").replace("=", "_")
    p = Path(model_dir) / f"{safe}.joblib"
    if not p.exists():
        return None
    try:
        return joblib.load(p)
    except Exception as exc:
        raise ModelError(f"Saved model for {symbol} could not be loaded ({type(exc).__name__}). It will be retrained.") from exc
