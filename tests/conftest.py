import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app import create_app  # noqa: E402
from backend.config import get_config  # noqa: E402
from backend.utils.cache import cache  # noqa: E402


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def cfg(tmp_path, monkeypatch):
    """Config in DEMO_MODE (synthetic data, no network) with an isolated database and model directory."""
    monkeypatch.setenv("DEMO_MODE", "true")
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "test.db"))
    monkeypatch.setenv("NEWSAPI_KEY", "")
    monkeypatch.setenv("SENTIMENT_BACKEND", "lexicon")
    c = get_config()
    c.MODEL_DIR = str(tmp_path / "models")
    return c


@pytest.fixture
def live_cfg(cfg):
    """Same isolation but with demo mode off, for tests that mock the network layer."""
    cfg.DEMO_MODE = False
    return cfg


@pytest.fixture
def app(cfg):
    return create_app(cfg)


@pytest.fixture
def client(app):
    return app.test_client()


def make_prices(n=400, seed=0, drift=0.0003, vol=0.012):
    rng = np.random.default_rng(seed)
    idx = pd.bdate_range("2023-01-02", periods=n)
    close = 100 * np.exp(np.cumsum(rng.normal(drift, vol, n)))
    return pd.DataFrame({"Open": close * 0.999, "High": close * 1.01, "Low": close * 0.99, "Close": close,
                         "Volume": rng.integers(1_000_000, 2_000_000, n)}, index=idx)


@pytest.fixture
def prices():
    return make_prices()
