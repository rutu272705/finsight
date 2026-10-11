from __future__ import annotations

from flask import Blueprint, request

from ..nlp import pipeline as nlp
from ..services import analysis_service as svc
from ..services import market_data
from ..services.news_service import parse_datetime
from ..utils.errors import NotFoundError, ValidationError
from ..utils.symbols import normalize_symbol
from .helpers import bool_arg, cfg, date_arg, int_arg, json_body, ok, repo

bp = Blueprint("news", __name__)
_SENTIMENTS = {"positive", "negative", "neutral"}


def _apply_filters(articles: list[dict]) -> list[dict]:
    sentiment = request.args.get("sentiment", "").lower()
    if sentiment and sentiment not in _SENTIMENTS:
        raise ValidationError("sentiment must be positive, negative or neutral.")
    source = request.args.get("source", "").strip().lower()
    start, end = date_arg("from"), date_arg("to")
    out = []
    for a in articles:
        if sentiment and a["sentiment"]["label"] != sentiment:
            continue
        if source and source not in (a.get("source") or "").lower():
            continue
        day = (parse_datetime(a.get("published_at")) or parse_datetime("1970-01-01")).strftime("%Y-%m-%d")
        if (start and day < start) or (end and day > end):
            continue
        out.append(a)
    return out


@bp.get("/news/<symbol>")
def get_news(symbol: str):
    sym = normalize_symbol(symbol)
    days = int_arg("days", 14, 1, 30)
    refresh = svc.check_refresh_allowed(sym, bool_arg("refresh"))
    profile = market_data.get_profile(sym, cfg())
    result = svc.run_news_analysis(sym, profile, days, cfg(), repo(), refresh=refresh)
    filtered = _apply_filters(result["articles"])
    return ok({
        "symbol": sym, "profile": profile, "articles": filtered, "total_before_filters": len(result["articles"]),
        "sources": sorted({a["source"] for a in result["articles"] if a.get("source")}),
        "aggregate": result["aggregate"], "topics": result["topics"],
        "providers_used": result["providers_used"], "last_updated": svc.now_iso(),
    }, warnings=result["warnings"])


@bp.post("/analyze")
def analyze():
    """Analyse supplied text (``articles``) or, when omitted, fetch and analyse the latest news for ``symbol``."""
    body = json_body()
    sym = normalize_symbol(body.get("symbol", ""))
    profile = market_data.get_profile(sym, cfg())
    supplied = body.get("articles")
    if supplied is None:
        days = body.get("days", 14)
        if not isinstance(days, int) or not 1 <= days <= 30:
            raise ValidationError("'days' must be a whole number between 1 and 30.")
        result = svc.run_news_analysis(sym, profile, days, cfg(), repo(), refresh=False)
        return ok({"symbol": sym, "articles": result["articles"], "aggregate": result["aggregate"],
                   "topics": result["topics"]}, warnings=result["warnings"])

    if not isinstance(supplied, list) or not 1 <= len(supplied) <= 50:
        raise ValidationError("'articles' must be a list of 1 to 50 items.")
    clean = []
    for i, a in enumerate(supplied):
        if not isinstance(a, dict) or not isinstance(a.get("title"), str) or not a["title"].strip():
            raise ValidationError(f"articles[{i}] needs a non-empty 'title' string.")
        title = a["title"].strip()
        desc = a.get("description") or ""
        if len(title) > 300 or not isinstance(desc, str) or len(desc) > 5000:
            raise ValidationError(f"articles[{i}] is too long (title <= 300, description <= 5000 characters).")
        clean.append({"title": title, "description": desc, "source": a.get("source"), "url": a.get("url"),
                      "published_at": a.get("published_at") or svc.now_iso(), "relevance": 1.0})
    analyzed = nlp.analyze_articles(clean, sym, profile["name"], cfg())
    return ok({"symbol": sym, "articles": analyzed, "aggregate": nlp.aggregate(analyzed, cfg()),
               "topics": nlp.summarize_topics(analyzed), "stored": False})


@bp.get("/articles")
def stored_articles():
    """Previously analysed articles, read from SQLite without calling any external API."""
    sym = normalize_symbol(request.args.get("symbol", ""))
    limit = int_arg("limit", 100, 1, 500)
    return ok({"symbol": sym, "articles": _apply_filters(repo().load_articles(sym, limit))})


@bp.get("/articles/<int:article_id>")
def stored_article(article_id: int):
    art = repo().get_article(article_id)
    if art is None:
        raise NotFoundError("That article is no longer stored.", details={"id": article_id})
    return ok(art)
