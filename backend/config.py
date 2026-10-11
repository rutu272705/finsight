"""Central configuration, read from environment variables (and an optional .env file)."""
from __future__ import annotations

import os
from pathlib import Path

try:  # python-dotenv is optional at import time
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:  # pragma: no cover
    pass

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent


def _bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def _float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except ValueError:
        return default


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


class Config:
    """Read lazily so tests can change the environment before building the app."""

    def __init__(self) -> None:
        db_path = os.getenv("DATABASE_PATH", "backend/finsight.db")
        p = Path(db_path)
        self.DATABASE_PATH = str(p if p.is_absolute() else PROJECT_ROOT / p)
        self.MODEL_DIR = str(BASE_DIR / "models")
        self.PORT = _int("PORT", 5000)
        self.DEBUG = os.getenv("FLASK_ENV", "development") == "development"
        self.CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]

        self.NEWSAPI_KEY = os.getenv("NEWSAPI_KEY", "").strip()
        self.NEWS_PROVIDERS = [p.strip().lower() for p in os.getenv("NEWS_PROVIDERS", "newsapi,googlenews,yahoo").split(",") if p.strip()]

        self.SENTIMENT_BACKEND = os.getenv("SENTIMENT_BACKEND", "finbert").lower()
        self.SUMMARIZER_BACKEND = os.getenv("SUMMARIZER_BACKEND", "extractive").lower()
        self.ENTITY_BACKEND = os.getenv("ENTITY_BACKEND", "auto").lower()

        self.FORECAST_HORIZON = max(1, _int("FORECAST_HORIZON", 5))
        self.TREND_THRESHOLD = abs(_float("TREND_THRESHOLD", 0.01))
        self.TRAIN_HISTORY_PERIOD = os.getenv("TRAIN_HISTORY_PERIOD", "5y")
        self.MODEL_MAX_AGE_DAYS = _int("MODEL_MAX_AGE_DAYS", 7)

        self.CACHE_TTL_SECONDS = _int("CACHE_TTL_SECONDS", 300)
        self.HTTP_TIMEOUT_SECONDS = _int("HTTP_TIMEOUT_SECONDS", 10)
        self.DEMO_MODE = _bool("DEMO_MODE", False)

        # Sentiment aggregation
        self.SENTIMENT_HALF_LIFE_DAYS = _float("SENTIMENT_HALF_LIFE_DAYS", 3.0)
        self.SENTIMENT_LABEL_BAND = _float("SENTIMENT_LABEL_BAND", 0.15)


def get_config() -> Config:
    return Config()
