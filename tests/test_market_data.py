import pandas as pd
import pytest

from backend.services import market_data
from backend.utils.errors import InsufficientDataError, NotFoundError, RateLimitError, UpstreamError, ValidationError
from backend.utils.symbols import normalize_symbol


def _frame(n=30):
    idx = pd.date_range("2024-01-01", periods=n, freq="B", tz="America/New_York")
    return pd.DataFrame({"Open": 10.0, "High": 11.0, "Low": 9.0, "Close": [10 + i * 0.1 for i in range(n)],
                         "Volume": 1000, "Dividends": 0.0}, index=idx)


def test_history_is_cleaned_and_cached(live_cfg, monkeypatch):
    calls = []
    monkeypatch.setattr(market_data, "_download", lambda s, p, attempts=3: calls.append(s) or _frame())
    df = market_data.get_history("AAPL", "1mo", live_cfg)
    assert list(df.columns) == ["Open", "High", "Low", "Close", "Volume"] and df.index.tz is None
    market_data.get_history("AAPL", "1mo", live_cfg)
    assert len(calls) == 1  # second call served from cache


def test_unknown_ticker_raises_not_found(live_cfg, monkeypatch):
    monkeypatch.setattr(market_data, "_download", lambda s, p, attempts=3: pd.DataFrame())
    with pytest.raises(NotFoundError):
        market_data.get_history("ZZZZ", "1mo", live_cfg)


def test_provider_failure_is_not_replaced_by_fake_data(live_cfg, monkeypatch):
    def boom(*a, **k):
        raise UpstreamError("down")
    monkeypatch.setattr(market_data, "_download", boom)
    with pytest.raises(UpstreamError):
        market_data.get_history("AAPL", "1mo", live_cfg)


def test_rate_limit_is_reported(live_cfg, monkeypatch):
    class YFRateLimitError(Exception):
        pass

    class FakeTicker:
        def __init__(self, s): pass
        def history(self, **k): raise YFRateLimitError("Too Many Requests")

    import yfinance
    monkeypatch.setattr(yfinance, "Ticker", FakeTicker)
    with pytest.raises(RateLimitError):
        market_data._download("AAPL", "1mo")


def test_quote_math():
    df = pd.DataFrame({"Close": [100.0, 103.0], "Volume": [10, 20]}, index=pd.to_datetime(["2024-01-02", "2024-01-03"]))
    q = market_data.get_quote(df)
    assert q["price"] == 103.0 and q["change"] == 3.0 and q["change_pct"] == 3.0 and q["as_of"] == "2024-01-03"


def test_quote_needs_two_rows():
    with pytest.raises(InsufficientDataError):
        market_data.get_quote(pd.DataFrame({"Close": [1.0], "Volume": [1]}, index=pd.to_datetime(["2024-01-02"])))


def test_period_and_symbol_validation():
    with pytest.raises(ValidationError):
        market_data.validate_period("10y")
    assert normalize_symbol(" tcs.ns ") == "TCS.NS"
    for bad in ["", "A B", "DROP TABLE;", "x" * 40, "../etc"]:
        with pytest.raises(ValidationError):
            normalize_symbol(bad)


def test_demo_mode_is_explicit_and_deterministic(cfg):
    a, b = market_data.get_history("AAPL", "1y", cfg), market_data.get_history("AAPL", "1y", cfg)
    pd.testing.assert_frame_equal(a, b)
    assert market_data.get_profile("AAPL", cfg)["name"] == "Apple Inc."
