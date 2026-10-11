"""Produce the live forecast, retraining automatically when no fresh, compatible saved model exists."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import pandas as pd

from ..config import Config
from ..utils.errors import InsufficientDataError, ModelError
from . import train as trainer
from .features import FEATURE_NAMES, build_features

log = logging.getLogger(__name__)
DISCLAIMER = ("Experimental model forecast based on historical patterns. It does not guarantee future price "
              "movements and is not financial advice.")


def _is_fresh(meta: dict, cfg: Config) -> bool:
    age = datetime.now(timezone.utc) - datetime.fromisoformat(meta["trained_at"])
    return (age < timedelta(days=cfg.MODEL_MAX_AGE_DAYS)
            and meta["horizon_days"] == cfg.FORECAST_HORIZON
            and abs(meta["threshold"] - cfg.TREND_THRESHOLD) < 1e-9
            and bool(meta.get("demo")) == cfg.DEMO_MODE)


def get_or_train(symbol: str, train_prices: pd.DataFrame, sentiment_daily, cfg: Config, retrain: bool = False) -> dict:
    bundle = None
    if not retrain:
        try:
            bundle = trainer.load(symbol, cfg.MODEL_DIR)
        except ModelError as exc:
            log.warning("%s", exc.message)
    if bundle is None or not _is_fresh(bundle["meta"], cfg):
        trainer.train(symbol, train_prices, sentiment_daily, cfg.FORECAST_HORIZON, cfg.TREND_THRESHOLD, cfg.MODEL_DIR, demo=cfg.DEMO_MODE)
        bundle = trainer.load(symbol, cfg.MODEL_DIR)
    return bundle


def predict_latest(symbol: str, train_prices: pd.DataFrame, sentiment_daily, cfg: Config, retrain: bool = False) -> dict:
    bundle = get_or_train(symbol, train_prices, sentiment_daily, cfg, retrain)
    meta, pipe = bundle["meta"], bundle["pipeline"]
    feats = build_features(train_prices, sentiment_daily)
    price_cols = [c for c in FEATURE_NAMES if not c.startswith("sent_")]
    usable = feats.dropna(subset=price_cols)
    if usable.empty:
        raise InsufficientDataError("Not enough recent price history to compute model features.")
    row = usable.iloc[[-1]]
    try:
        proba = pipe.predict_proba(row[FEATURE_NAMES])[0]
    except Exception as exc:
        raise ModelError(f"The model could not produce a prediction ({type(exc).__name__}).") from exc
    probs = {c: round(float(p), 4) for c, p in zip(pipe.classes_, proba)}
    for c in ("Downward", "Stable", "Upward"):
        probs.setdefault(c, 0.0)
    label = max(probs, key=probs.get)
    return {
        "symbol": symbol, "label": label, "confidence": probs[label], "probabilities": probs,
        "predicted_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "as_of_date": usable.index[-1].strftime("%Y-%m-%d"),
        "horizon_days": meta["horizon_days"], "threshold": meta["threshold"],
        "model_name": meta["model_name"], "trained_at": meta["trained_at"],
        "test_metrics": meta["test_metrics"], "baseline": meta["baseline"], "comparison": meta["comparison"],
        "feature_importance": meta["feature_importance"], "backtest": meta["backtest"],
        "train_period": meta["train_period"], "test_period": meta["test_period"],
        "n_train": meta["n_train"], "n_test": meta["n_test"],
        "class_balance_train": meta["class_balance_train"], "sentiment_coverage_pct": meta["sentiment_coverage_pct"],
        "demo": bool(meta.get("demo")), "disclaimer": DISCLAIMER,
        "definition": (f"Upward: return over the next {meta['horizon_days']} sessions above +{meta['threshold']*100:.1f}%; "
                       f"Downward: below -{meta['threshold']*100:.1f}%; otherwise Stable."),
    }
