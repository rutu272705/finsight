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
FEATURE_LABELS = {
    "ret_1": "Price movement over the past day",
    "ret_5": "Price movement over the past 5 days",
    "ret_10": "Price movement over the past 10 days",
    "ret_20": "Price movement over the past 20 days",
    "sma5_vs_sma20": "Short-term compared with longer-term price trend",
    "close_vs_sma20": "Price compared with its 20-day average",
    "close_vs_sma50": "Price compared with its 50-day average",
    "volatility_10": "Price swings over the past 10 days",
    "volatility_20": "Price swings over the past 20 days",
    "volume_ratio_20": "Trading activity compared with its 20-day average",
    "volume_chg_1": "Change in trading activity",
    "rsi_14": "Recent buying and selling strength",
    "macd_hist": "Recent change in price momentum",
    "bb_position": "Price position within its recent range",
    "hl_range_5": "Typical daily price range",
    "sent_mean_5": "Average news tone over the past 5 days",
    "sent_count_5": "Number of news items over the past 5 days",
    "sent_available": "Whether news tone was available",
}


def _explain_prediction(pipe, row: pd.DataFrame, label: str, probability: float) -> list[dict]:
    """Rank single-feature changes against training medians for the predicted class."""
    medians = pipe.named_steps["imp"].statistics_
    ranked = []
    for index, feature in enumerate(FEATURE_NAMES):
        changed = row.copy()
        changed.loc[:, feature] = medians[index]
        altered_probability = pipe.predict_proba(changed)[0][list(pipe.classes_).index(label)]
        impact = probability - float(altered_probability)
        if abs(impact) >= 0.005:
            ranked.append({
                "feature": feature,
                "label": FEATURE_LABELS.get(feature, feature),
                "direction": "increased" if impact > 0 else "decreased",
                "impact_pp": round(abs(impact) * 100, 1),
            })
    return sorted(ranked, key=lambda item: item["impact_pp"], reverse=True)[:3]


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
    try:
        explanation = _explain_prediction(pipe, row, label, float(probs[label]))
    except Exception as exc:
        raise ModelError(f"The forecast explanation could not be produced ({type(exc).__name__}).") from exc
    return {
        "symbol": symbol, "label": label, "confidence": probs[label], "probabilities": probs,
        "explanation": explanation,
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
