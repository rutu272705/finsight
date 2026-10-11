"""Ticker validation and market-session helpers."""
from __future__ import annotations

import re
from datetime import datetime, time
from zoneinfo import ZoneInfo

import pandas as pd

from .errors import ValidationError

_SYMBOL_RE = re.compile(r"^[A-Z0-9][A-Z0-9.\-=^]{0,19}$")


def normalize_symbol(raw: str) -> str:
    sym = (raw or "").strip().upper()
    if not sym or not _SYMBOL_RE.match(sym):
        raise ValidationError(
            "Enter a valid ticker such as AAPL, TSLA, TCS.NS or RELIANCE.NS.",
            details={"symbol": raw},
        )
    return sym


# (timezone, regular-session close) by exchange suffix. Default is US markets.
_MARKETS = {
    ".NS": ("Asia/Kolkata", time(15, 30)),
    ".BO": ("Asia/Kolkata", time(15, 30)),
    ".L": ("Europe/London", time(16, 30)),
    ".T": ("Asia/Tokyo", time(15, 0)),
    ".HK": ("Asia/Hong_Kong", time(16, 0)),
    ".TO": ("America/Toronto", time(16, 0)),
}
_DEFAULT_MARKET = ("America/New_York", time(16, 0))


def market_info(symbol: str) -> tuple[ZoneInfo, time]:
    for suffix, (tz, close) in _MARKETS.items():
        if symbol.endswith(suffix):
            return ZoneInfo(tz), close
    return ZoneInfo(_DEFAULT_MARKET[0]), _DEFAULT_MARKET[1]


def session_date(published: datetime, symbol: str) -> pd.Timestamp:
    """Map a publication time to the trading session whose price it can first influence.

    Articles published after the closing bell, or on a weekend, only affect the *next*
    business day's session; everything else belongs to the same day.
    """
    tz, close = market_info(symbol)
    if published.tzinfo is None:
        published = published.replace(tzinfo=ZoneInfo("UTC"))
    local = published.astimezone(tz)
    day = pd.Timestamp(local.date())
    if local.weekday() >= 5:  # Saturday/Sunday
        return day + pd.offsets.BDay(1)
    if local.time() >= close:
        return day + pd.offsets.BDay(1)
    return day
