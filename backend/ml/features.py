"""Feature engineering. Every feature at row t uses only information available at the close of day t:
rolling windows look backwards only, and news enters only if its trading session is <= t."""
from __future__ import annotations

import numpy as np
import pandas as pd

PRICE_FEATURES = [
    "ret_1", "ret_5", "ret_10", "ret_20", "sma5_vs_sma20", "close_vs_sma20", "close_vs_sma50",
    "volatility_10", "volatility_20", "volume_ratio_20", "volume_chg_1", "rsi_14", "macd_hist", "bb_position", "hl_range_5",
]
SENTIMENT_FEATURES = ["sent_mean_5", "sent_count_5", "sent_available"]
FEATURE_NAMES = PRICE_FEATURES + SENTIMENT_FEATURES
MIN_ROWS_FOR_FEATURES = 60


def rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0).ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    rs = gain / loss.replace(0, np.nan)
    out = 100 - 100 / (1 + rs)
    return out.where(loss != 0, 100.0)


def align_sentiment(index: pd.DatetimeIndex, daily: list[dict] | None) -> pd.DataFrame:
    """Place per-session sentiment on the price calendar. Sessions that fall on non-trading days roll
    forward to the next trading day (never backward)."""
    sums = pd.Series(0.0, index=index)
    counts = pd.Series(0.0, index=index)
    for row in daily or []:
        d = pd.Timestamp(row["date"])
        pos = index.searchsorted(d)  # first trading day >= d
        if pos >= len(index):
            continue  # news from after the last price bar: not usable yet
        sums.iloc[pos] += row["score"] * row["count"]
        counts.iloc[pos] += row["count"]
    return pd.DataFrame({"sent_sum": sums, "sent_n": counts})


def build_features(prices: pd.DataFrame, sentiment_daily: list[dict] | None = None) -> pd.DataFrame:
    close, vol = prices["Close"], prices["Volume"].astype(float)
    f = pd.DataFrame(index=prices.index)
    r1 = close.pct_change()
    for n in (1, 5, 10, 20):
        f[f"ret_{n}"] = close.pct_change(n)
    sma5, sma20, sma50 = (close.rolling(n).mean() for n in (5, 20, 50))
    f["sma5_vs_sma20"] = sma5 / sma20 - 1
    f["close_vs_sma20"] = close / sma20 - 1
    f["close_vs_sma50"] = close / sma50 - 1
    f["volatility_10"] = r1.rolling(10).std()
    f["volatility_20"] = r1.rolling(20).std()
    f["volume_ratio_20"] = (vol / vol.rolling(20).mean().replace(0, np.nan)) - 1
    f["volume_chg_1"] = vol.pct_change().replace([np.inf, -np.inf], np.nan).clip(-3, 3)
    f["rsi_14"] = rsi(close)
    macd = close.ewm(span=12, adjust=False).mean() - close.ewm(span=26, adjust=False).mean()
    f["macd_hist"] = (macd - macd.ewm(span=9, adjust=False).mean()) / close
    sd20 = close.rolling(20).std()
    f["bb_position"] = (close - sma20) / (2 * sd20.replace(0, np.nan))
    f["hl_range_5"] = ((prices["High"] - prices["Low"]) / close).rolling(5).mean()

    s = align_sentiment(prices.index, sentiment_daily)
    n5 = s["sent_n"].rolling(5, min_periods=1).sum()
    f["sent_count_5"] = n5
    f["sent_mean_5"] = (s["sent_sum"].rolling(5, min_periods=1).sum() / n5.replace(0, np.nan)).fillna(0.0)
    f["sent_available"] = (n5 > 0).astype(float)
    return f[FEATURE_NAMES].replace([np.inf, -np.inf], np.nan)
