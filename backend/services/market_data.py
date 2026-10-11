"""Market data retrieval through yfinance, with caching, retries and clear error mapping."""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

import pandas as pd

from ..config import Config
from ..utils.cache import cache
from ..utils.errors import InsufficientDataError, NotFoundError, RateLimitError, UpstreamError, ValidationError
from . import demo_data, directory

log = logging.getLogger(__name__)
VALID_PERIODS = ("1mo", "3mo", "6mo", "1y", "2y", "5y", "max")


def validate_period(period: str) -> str:
    if period not in VALID_PERIODS:
        raise ValidationError(f"period must be one of: {', '.join(VALID_PERIODS)}.", details={"period": period})
    return period


def _download(symbol: str, period: str, attempts: int = 3) -> pd.DataFrame:
    import yfinance as yf

    last: Exception | None = None
    for i in range(attempts):
        try:
            df = yf.Ticker(symbol).history(period=period, interval="1d", auto_adjust=True)
            return df
        except Exception as exc:  # yfinance raises a wide range of exception types
            last = exc
            name = type(exc).__name__
            if "RateLimit" in name or "429" in str(exc) or "Too Many Requests" in str(exc):
                raise RateLimitError("Yahoo Finance is rate limiting requests. Wait a minute and retry.") from exc
            log.warning("yfinance history failed for %s (attempt %d/%d): %s", symbol, i + 1, attempts, exc)
            time.sleep(0.8 * (2 ** i))
    raise UpstreamError(f"Yahoo Finance could not be reached for {symbol}.") from last


def get_history(symbol: str, period: str, cfg: Config, refresh: bool = False) -> pd.DataFrame:
    """Daily OHLCV with a tz-naive DatetimeIndex. Raises instead of returning fabricated data."""
    validate_period(period)
    if cfg.DEMO_MODE:
        return demo_data.demo_history(symbol, period)

    def load() -> pd.DataFrame:
        df = _download(symbol, period)
        if df is None or df.empty:
            raise NotFoundError(f"No price data found for '{symbol}'. Check the ticker (Indian stocks need .NS or .BO).",
                                details={"symbol": symbol})
        df = df[["Open", "High", "Low", "Close", "Volume"]].dropna(subset=["Close"]).copy()
        df.index = pd.to_datetime(df.index).tz_localize(None).normalize()
        return df

    return cache.get_or_set(f"hist:{symbol}:{period}", load, ttl=cfg.CACHE_TTL_SECONDS, bypass=refresh)


def get_profile(symbol: str, cfg: Config) -> dict:
    if cfg.DEMO_MODE:
        return demo_data.demo_profile(symbol)

    def load() -> dict:
        local = directory.lookup(symbol)
        prof = {"symbol": symbol, "name": local[0] if local else symbol, "exchange": local[1] if local else None, "currency": None}
        try:
            import yfinance as yf

            t = yf.Ticker(symbol)
            fi = t.fast_info
            prof["currency"] = getattr(fi, "currency", None)
            exch = getattr(fi, "exchange", None)
            if exch:
                prof["exchange"] = {"NMS": "NASDAQ", "NGM": "NASDAQ", "NCM": "NASDAQ", "NYQ": "NYSE", "NSI": "NSE", "BSE": "BSE"}.get(exch, exch)
            if not local:
                info = t.get_info()
                prof["name"] = info.get("longName") or info.get("shortName") or symbol
        except Exception as exc:  # profile enrichment is best-effort
            log.info("Profile enrichment failed for %s: %s", symbol, exc)
        return prof

    return cache.get_or_set(f"profile:{symbol}", load, ttl=3600)


def get_quote(history: pd.DataFrame) -> dict:
    """Latest close and daily change, computed from retrieved history."""
    if len(history) < 2:
        raise InsufficientDataError("Not enough price history to compute a daily change.")
    last, prev = history.iloc[-1], history.iloc[-2]
    change = float(last["Close"] - prev["Close"])
    return {
        "price": round(float(last["Close"]), 2),
        "previous_close": round(float(prev["Close"]), 2),
        "change": round(change, 2),
        "change_pct": round(change / float(prev["Close"]) * 100, 2),
        "volume": int(last["Volume"]) if pd.notna(last["Volume"]) else None,
        "as_of": history.index[-1].strftime("%Y-%m-%d"),
    }


def history_to_records(history: pd.DataFrame) -> list[dict]:
    pct = history["Close"].pct_change() * 100
    return [
        {
            "date": idx.strftime("%Y-%m-%d"),
            "open": round(float(r.Open), 2), "high": round(float(r.High), 2),
            "low": round(float(r.Low), 2), "close": round(float(r.Close), 2),
            "volume": int(r.Volume) if pd.notna(r.Volume) else 0,
            "change_pct": None if pd.isna(pct.loc[idx]) else round(float(pct.loc[idx]), 3),
        }
        for idx, r in history.iterrows()
    ]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")
