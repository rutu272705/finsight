import numpy as np
import pandas as pd
import pytest

from backend.ml.features import FEATURE_NAMES, align_sentiment, build_features, rsi
from backend.ml.labels import make_labels
from backend.utils.symbols import session_date
from datetime import datetime, timezone
from tests.conftest import make_prices


def test_trend_labels_follow_thresholds():
    # horizon 2, threshold 2%: label[t] compares close[t+2] with close[t]
    close = pd.Series([100, 100, 100, 103, 100, 97, 100, 100.5, 100, 100],
                      index=pd.bdate_range("2024-01-01", periods=10), dtype=float)
    labels = make_labels(close, horizon=2, threshold=0.02)
    assert labels.iloc[1] == "Upward"      # 100 -> 103 (+3.0%)
    assert labels.iloc[3] == "Downward"    # 103 -> 97  (-5.8%)
    assert labels.iloc[4] == "Stable"      # 100 -> 100 (0.0%)
    assert labels.iloc[5] == "Upward"      # 97  -> 100.5 (+3.6%)
    assert labels.iloc[-2:].isna().all()   # the last `horizon` rows have no known future


def test_labels_exact_boundaries():
    close = pd.Series([100.0, 101.0, 100.0, 99.0, 100.0], index=pd.bdate_range("2024-01-01", periods=5))
    labels = make_labels(close, 1, 0.01)
    assert labels.iloc[0] == "Stable"      # exactly +1% is not strictly greater than the threshold
    assert labels.iloc[1] == "Stable"      # -0.99%
    assert labels.iloc[2] == "Stable"      # exactly -1%
    assert labels.iloc[3] == "Upward"      # 99 -> 100 is +1.01%


def test_invalid_label_parameters():
    s = pd.Series([1.0, 2.0])
    with pytest.raises(ValueError):
        make_labels(s, 0, 0.01)
    with pytest.raises(ValueError):
        make_labels(s, 1, -0.01)


def test_features_do_not_look_ahead():
    """Features for day t must be identical whether or not later prices exist."""
    full = make_prices(300)
    k = 200
    f_full = build_features(full)
    f_trunc = build_features(full.iloc[:k])
    pd.testing.assert_frame_equal(f_full.iloc[:k], f_trunc, check_exact=False, rtol=1e-9, atol=1e-12)


def test_sentiment_features_exclude_future_news():
    prices = make_prices(120)
    d = prices.index[80].strftime("%Y-%m-%d")
    f = build_features(prices, [{"date": d, "score": 0.9, "count": 3}])
    assert f["sent_available"].iloc[:80].sum() == 0
    assert f["sent_mean_5"].iloc[79] == 0
    assert f["sent_mean_5"].iloc[80] == pytest.approx(0.9)
    assert f["sent_available"].iloc[85] == 0  # outside the 5-session window


def test_news_on_non_trading_day_rolls_forward():
    idx = pd.bdate_range("2024-01-01", periods=10)
    saturday = "2024-01-06"
    s = align_sentiment(idx, [{"date": saturday, "score": 0.5, "count": 2}])
    assert s.loc["2024-01-08", "sent_n"] == 2 and s.loc["2024-01-05", "sent_n"] == 0


def test_all_expected_features_present_and_rsi_bounded():
    f = build_features(make_prices(200))
    assert list(f.columns) == FEATURE_NAMES
    r = rsi(make_prices(200)["Close"]).dropna()
    assert ((r >= 0) & (r <= 100)).all()


def test_session_alignment_after_close_and_weekend():
    # Friday 18:00 New York is after the 16:00 close -> next session is Monday
    fri_evening = datetime(2024, 1, 5, 23, 0, tzinfo=timezone.utc)  # 18:00 ET
    assert session_date(fri_evening, "AAPL").strftime("%Y-%m-%d") == "2024-01-08"
    tue_midday = datetime(2024, 1, 9, 17, 0, tzinfo=timezone.utc)    # 12:00 ET
    assert session_date(tue_midday, "AAPL").strftime("%Y-%m-%d") == "2024-01-09"
    # 11:00 UTC = 16:30 IST, after the 15:30 NSE close
    assert session_date(datetime(2024, 1, 9, 11, 0, tzinfo=timezone.utc), "TCS.NS").strftime("%Y-%m-%d") == "2024-01-10"
    assert session_date(datetime(2024, 1, 7, 12, 0, tzinfo=timezone.utc), "AAPL").strftime("%Y-%m-%d") == "2024-01-08"
