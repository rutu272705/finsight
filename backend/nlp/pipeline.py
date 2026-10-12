"""Glue: analyse articles (sentiment + entities + summary) and aggregate them for a company."""
from __future__ import annotations

import math
from collections import Counter
from datetime import datetime, timezone

from ..config import Config
from ..services.news_service import parse_datetime
from . import entities as ent
from . import insights
from . import sentiment as sent
from . import summarizer

METHODOLOGY = (
    "Each article gets a score = P(positive) - P(negative), from -1 to +1. The company score is a weighted mean "
    "of article scores. Each weight = relevance x recency, where relevance is 1.0 when the company or ticker is "
    "in the headline, 0.6 when only in the snippet and 0.3 otherwise, and recency halves every {half_life:g} days. "
    "The score is labelled Positive above +{band:g}, Negative below -{band:g}, otherwise Neutral. "
    "It summarises tone of coverage, not a price forecast."
)


def analyze_articles(articles: list[dict], symbol: str, company: str, cfg: Config) -> list[dict]:
    """Return new article dicts enriched with sentiment, summary, entities and an explanation block."""
    if not articles:
        return []
    analyzer = sent.get_analyzer(cfg.SENTIMENT_BACKEND)
    results = analyzer.analyze_batch([(a["title"], a.get("description") or "") for a in articles])
    out = []
    for a, s in zip(articles, results):
        summ = summarizer.summarize(a["title"], a.get("description") or "", cfg.SUMMARIZER_BACKEND)
        entities = ent.extract_entities(a["title"], a.get("description") or "", symbol, company, cfg.ENTITY_BACKEND)
        text = ". ".join(part.strip() for part in (a["title"], a.get("description") or "") if part and part.strip())
        temporal_references = insights.extract_temporal_references(text, a.get("published_at"))
        coverage = a.get("coverage")
        enriched = dict(a)
        enriched.update({
            "sentiment": {k: s[k] for k in ("label", "probabilities", "confidence", "score", "backend", "calibrated")},
            "summary": summ["text"],
            "entities": entities,
            "explanation": {
                "signals": s["signals"],
                "aspects": insights.analyze_aspects(a["title"], a.get("description") or "", analyzer),
                "events": insights.extract_events(text, temporal_references),
                "temporal_references": temporal_references,
                "coverage": coverage,
                "note": ("Terms in the text that are associated with this label. They indicate what the "
                         "classifier saw, not a proven cause of the result."),
                "summary_method": summ["method"], "summary_basis": summ["basis"],
            },
        })
        out.append(enriched)
    return out


def aggregate(articles: list[dict], cfg: Config, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    counts = Counter(a["sentiment"]["label"] for a in articles)
    n = len(articles)
    dist = {k: counts.get(k, 0) for k in ("positive", "negative", "neutral")}
    method = METHODOLOGY.format(half_life=cfg.SENTIMENT_HALF_LIFE_DAYS, band=cfg.SENTIMENT_LABEL_BAND)
    if n == 0:
        return {"score": None, "label": None, "n_articles": 0, "distribution": dist, "effective_sample_size": 0,
                "methodology": method, "low_sample": True}
    weights, scores = [], []
    for a in articles:
        dt = parse_datetime(a.get("published_at")) or now
        age_days = max((now - dt).total_seconds() / 86400, 0)
        w = (a.get("relevance") or 0.3) * 0.5 ** (age_days / cfg.SENTIMENT_HALF_LIFE_DAYS)
        weights.append(w)
        scores.append(a["sentiment"]["score"])
    total = sum(weights) or 1e-9
    score = sum(w * s for w, s in zip(weights, scores)) / total
    ess = (total ** 2) / (sum(w * w for w in weights) or 1e-9)
    band = cfg.SENTIMENT_LABEL_BAND
    label = "positive" if score > band else "negative" if score < -band else "neutral"
    return {
        "score": round(score, 4), "label": label, "n_articles": n, "distribution": dist,
        "distribution_pct": {k: round(v / n * 100, 1) for k, v in dist.items()},
        "effective_sample_size": round(ess, 1), "low_sample": n < 5,
        "methodology": method,
    }


def summarize_topics(articles: list[dict], top: int = 10) -> dict:
    topics: Counter = Counter()
    companies: Counter = Counter()
    people: Counter = Counter()
    for a in articles:
        e = a.get("entities") or {}
        topics.update(e.get("topics", []))
        companies.update(e.get("companies", []))
        people.update(e.get("people", []))
    fmt = lambda c: [{"name": k, "count": v} for k, v in c.most_common(top)]  # noqa: E731
    return {"topics": fmt(topics), "companies": fmt(companies), "people": fmt(people)}


def daily_sentiment(articles: list[dict], symbol: str) -> list[dict]:
    """Per trading session mean sentiment. Out-of-hours articles are assigned to the next session."""
    from ..utils.symbols import session_date

    buckets: dict[str, list[float]] = {}
    for a in articles:
        dt = parse_datetime(a.get("published_at"))
        if dt is None:
            continue
        day = session_date(dt, symbol).strftime("%Y-%m-%d")
        buckets.setdefault(day, []).append(a["sentiment"]["score"])
    return [{"date": d, "score": round(sum(v) / len(v), 4), "count": len(v)} for d, v in sorted(buckets.items())]
