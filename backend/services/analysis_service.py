"""Orchestration: combines market data, news, NLP and ML into the payloads the API returns."""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

import pandas as pd

from ..config import Config
from ..database.repository import Repository
from ..ml import predict as ml_predict
from ..nlp import pipeline as nlp
from ..utils.cache import cache
from ..utils.errors import AppError, RateLimitError, UpstreamError
from . import market_data, news_service

log = logging.getLogger(__name__)
REFRESH_COOLDOWN_SECONDS = 60


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def check_refresh_allowed(symbol: str, refresh: bool) -> bool:
    """Throttle manual refreshes so users cannot burn through API quotas. Returns the effective refresh flag."""
    if not refresh:
        return False
    key = f"refresh:{symbol}"
    last = cache.get(key)
    if last is not None:
        wait = int(REFRESH_COOLDOWN_SECONDS - (time.time() - last))
        raise RateLimitError(f"Data for {symbol} was refreshed moments ago. Try again in {max(wait, 1)} seconds.")
    cache.set(key, time.time(), ttl=REFRESH_COOLDOWN_SECONDS)
    return True


def unavailable(exc: Exception) -> dict:
    msg = exc.message if isinstance(exc, AppError) else "An unexpected error occurred."
    return {"unavailable": True, "reason": msg}


def run_news_analysis(symbol: str, profile: dict, days: int, cfg: Config, repo: Repository, refresh: bool = False) -> dict:
    """Cached wrapper so the dashboard and the news page share one analysis per symbol/window."""
    key = f"analysis:{symbol}:{days}:{cfg.SENTIMENT_BACKEND}:{cfg.DEMO_MODE}"
    if not refresh:
        hit = cache.get(key)
        if hit is not None:
            return hit
    result = _run_news_analysis(symbol, profile, days, cfg, repo, refresh)
    cache.set(key, result, ttl=cfg.CACHE_TTL_SECONDS)
    return result


def _run_news_analysis(symbol: str, profile: dict, days: int, cfg: Config, repo: Repository, refresh: bool = False) -> dict:
    """Fetch -> analyse -> store. Returns {articles, aggregate, topics, providers_used, warnings, demo}."""
    fetched = news_service.fetch_news(symbol, profile["name"], days, cfg, refresh=refresh)
    analyzed = nlp.analyze_articles(fetched["articles"], symbol, profile["name"], cfg)
    if analyzed:
        repo.save_articles(symbol, analyzed, is_demo=fetched["demo"])
    stored = repo.load_articles(symbol, limit=len(analyzed) or 1) if analyzed else []
    by_hash = {a["url"] or a["title"]: a for a in stored}
    for a in analyzed:  # attach database ids so the UI can reopen articles later
        match = by_hash.get(a.get("url") or a["title"])
        if match:
            a["id"] = match["id"]
    return {
        "articles": analyzed,
        "aggregate": nlp.aggregate(analyzed, cfg),
        "topics": nlp.summarize_topics(analyzed),
        "providers_used": fetched["providers_used"],
        "warnings": fetched["warnings"],
        "demo": fetched["demo"],
    }


def stored_sentiment_daily(symbol: str, repo: Repository) -> list[dict]:
    arts = [a for a in repo.load_articles(symbol, limit=500) if a["sentiment"]["label"]]
    return nlp.daily_sentiment(arts, symbol)


def build_prediction(symbol: str, cfg: Config, repo: Repository, retrain: bool = False) -> dict:
    prices = market_data.get_history(symbol, cfg.TRAIN_HISTORY_PERIOD, cfg)
    pred = ml_predict.predict_latest(symbol, prices, stored_sentiment_daily(symbol, repo), cfg, retrain=retrain)
    repo.save_prediction(symbol, pred, is_demo=cfg.DEMO_MODE)
    return pred


def build_dashboard(symbol: str, period: str, days: int, cfg: Config, repo: Repository, refresh: bool = False) -> dict:
    market_data.validate_period(period)
    refresh = check_refresh_allowed(symbol, refresh)
    history = market_data.get_history(symbol, period, cfg, refresh=refresh)  # raises -> whole dashboard errors
    profile = market_data.get_profile(symbol, cfg)
    quote = market_data.get_quote(history)
    repo.add_search(symbol, profile["name"])

    sections: dict[str, dict] = {}
    try:
        sections["news"] = run_news_analysis(symbol, profile, days, cfg, repo, refresh=refresh)
    except AppError as exc:
        log.warning("News unavailable for %s: %s", symbol, exc.message)
        sections["news"] = unavailable(exc)
    try:
        sections["prediction"] = build_prediction(symbol, cfg, repo)
    except AppError as exc:
        log.warning("Prediction unavailable for %s: %s", symbol, exc.message)
        sections["prediction"] = unavailable(exc)
    except Exception as exc:  # defensive: sklearn/pandas errors must not blank the dashboard
        log.exception("Prediction crashed for %s", symbol)
        sections["prediction"] = {"unavailable": True, "reason": f"The prediction model failed ({type(exc).__name__})."}

    news = sections["news"]
    return {
        "symbol": symbol, "profile": profile, "quote": quote,
        "in_watchlist": repo.in_watchlist(symbol),
        "history": market_data.history_to_records(history), "period": period,
        "news": news, "prediction": sections["prediction"],
        "sentiment_daily": nlp.daily_sentiment(news["articles"], symbol) if not news.get("unavailable") else [],
        "demo": cfg.DEMO_MODE, "last_updated": now_iso(),
    }


def build_analytics(symbol: str, start: str | None, end: str | None, cfg: Config, repo: Repository) -> dict:
    history = market_data.get_history(symbol, "2y", cfg)
    profile = market_data.get_profile(symbol, cfg)
    if not repo.load_articles(symbol, limit=1):
        try:
            run_news_analysis(symbol, profile, 30, cfg, repo)
        except AppError as exc:
            log.info("Analytics proceeding without news: %s", exc.message)
    daily = pd.DataFrame(stored_sentiment_daily(symbol, repo))

    df = pd.DataFrame({"close": history["Close"]})
    df["return_pct"] = df["close"].pct_change() * 100
    if not daily.empty:
        daily["date"] = pd.to_datetime(daily["date"])
        # a session that is not a trading day rolls forward to the next trading day
        daily["date"] = [df.index[min(df.index.searchsorted(d), len(df) - 1)] for d in daily["date"]]
        g = daily.groupby("date").apply(lambda x: pd.Series({"sentiment": (x["score"] * x["count"]).sum() / x["count"].sum(), "articles": x["count"].sum()}), include_groups=False)
        df = df.join(g)
    else:
        df["sentiment"], df["articles"] = float("nan"), float("nan")
    df["next_return_pct"] = df["return_pct"].shift(-1)

    lo = pd.Timestamp(start) if start else (df["sentiment"].first_valid_index() or df.index[-60]) - pd.Timedelta(days=10)
    hi = pd.Timestamp(end) if end else df.index[-1]
    view = df.loc[(df.index >= lo) & (df.index <= hi)]

    paired = view.dropna(subset=["sentiment", "return_pct"])
    result: dict = {"n_paired_days": int(len(paired))}
    for name, col in (("same_session", "return_pct"), ("next_session", "next_return_pct")):
        p = view.dropna(subset=["sentiment", col])
        if len(p) >= 8 and p["sentiment"].nunique() > 1 and p[col].nunique() > 1:
            result[name] = {"r": round(float(p["sentiment"].corr(p[col])), 3), "n": int(len(p))}
        else:
            result[name] = None
    result["note"] = ("Correlation measures co-movement, not cause and effect. Prices can move before articles "
                      "are written, and many factors besides news affect returns. News published after the market "
                      "close is matched to the next trading session. With few days of overlap these figures are unreliable.")
    series = [{
        "date": i.strftime("%Y-%m-%d"), "close": round(float(r.close), 2),
        "return_pct": None if pd.isna(r.return_pct) else round(float(r.return_pct), 3),
        "sentiment": None if pd.isna(r.sentiment) else round(float(r.sentiment), 4),
        "articles": 0 if pd.isna(r.articles) else int(r.articles),
    } for i, r in view.iterrows()]
    pred_hist = repo.prediction_history(symbol, 30)
    return {"symbol": symbol, "profile": profile, "range": [lo.strftime("%Y-%m-%d"), hi.strftime("%Y-%m-%d")],
            "series": series, "correlation": result, "prediction_history": pred_hist,
            "demo": cfg.DEMO_MODE, "last_updated": now_iso()}
