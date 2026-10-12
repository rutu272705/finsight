"""Financial news retrieval from NewsAPI, Google News RSS and Yahoo Finance, with de-duplication."""
from __future__ import annotations

import html
import logging
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher
from email.utils import parsedate_to_datetime
from urllib.parse import quote_plus

from ..config import Config
from ..utils.cache import cache
from ..utils.errors import RateLimitError, UpstreamError
from ..utils.http import http_get
from . import demo_data

log = logging.getLogger(__name__)

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")
_SUFFIXES = re.compile(r"\b(limited|ltd\.?|inc\.?|corporation|corp\.?|plc|co\.?|company|holdings|the)\b", re.I)


def clean_text(s: str | None) -> str:
    if not s:
        return ""
    return _WS_RE.sub(" ", html.unescape(_TAG_RE.sub(" ", s))).strip()


def short_name(name: str) -> str:
    """'Tata Consultancy Services Limited' -> 'Tata Consultancy Services'."""
    cleaned = _SUFFIXES.sub("", name.split(",")[0])
    return _WS_RE.sub(" ", cleaned).strip(" .,-") or name


def base_ticker(symbol: str) -> str:
    return symbol.split(".")[0]


def parse_datetime(value) -> datetime | None:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc)
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        try:
            dt = parsedate_to_datetime(str(value))
        except (TypeError, ValueError):
            return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


# --------------------------------------------------------------------- providers
def _from_newsapi(symbol: str, name: str, days: int, cfg: Config) -> list[dict]:
    if not cfg.NEWSAPI_KEY:
        raise UpstreamError("NEWSAPI_KEY is not configured.")
    sn = short_name(name)
    q = f'"{sn}"' if sn.upper() == base_ticker(symbol) else f'"{sn}" OR "{base_ticker(symbol)}"'
    since = (datetime.now(timezone.utc) - timedelta(days=min(days, 30))).strftime("%Y-%m-%d")
    resp = http_get(
        "https://newsapi.org/v2/everything",
        params={"q": q, "from": since, "language": "en", "sortBy": "publishedAt", "pageSize": 50},
        headers={"X-Api-Key": cfg.NEWSAPI_KEY},
        timeout=cfg.HTTP_TIMEOUT_SECONDS,
    )
    body = resp.json()
    if resp.status_code == 429 or body.get("code") == "rateLimited":
        raise RateLimitError("NewsAPI daily request limit reached.")
    if resp.status_code in (401, 403) or body.get("status") == "error":
        raise UpstreamError(f"NewsAPI error: {body.get('message', resp.status_code)}")
    return [
        {
            "title": clean_text(a.get("title")),
            "source": (a.get("source") or {}).get("name"),
            "url": a.get("url"),
            "published_at": a.get("publishedAt"),
            "description": clean_text(" ".join(filter(None, [a.get("description"), a.get("content", "")[:400] if a.get("content") else ""]))),
        }
        for a in body.get("articles", [])
        if a.get("title") and a.get("title") != "[Removed]"
    ]


def _from_google_news(symbol: str, name: str, days: int, cfg: Config) -> list[dict]:
    region = "IN:en" if symbol.endswith((".NS", ".BO")) else "US:en"
    gl, ceid = region.split(":")[0], region
    q = quote_plus(f"{short_name(name)} stock when:{min(days, 30)}d")
    resp = http_get(
        f"https://news.google.com/rss/search?q={q}&hl=en-{gl}&gl={gl}&ceid={ceid}",
        timeout=cfg.HTTP_TIMEOUT_SECONDS,
    )
    try:
        root = ET.fromstring(resp.content)
    except ET.ParseError as exc:
        raise UpstreamError("Google News returned an unreadable feed.") from exc
    out = []
    for item in root.iter("item"):
        raw_title = clean_text(item.findtext("title"))
        source_el = item.find("source")
        source = clean_text(source_el.text) if source_el is not None else None
        title = raw_title
        if source and raw_title.endswith(f" - {source}"):
            title = raw_title[: -len(source) - 3]
        desc = clean_text(item.findtext("description"))
        out.append({
            "title": title, "source": source, "url": item.findtext("link"),
            "published_at": (parse_datetime(item.findtext("pubDate")) or datetime.now(timezone.utc)).isoformat(timespec="seconds"),
            # Google's description is usually just the headline repeated; drop it in that case.
            "description": "" if not desc or desc.startswith(title[:40]) else desc,
        })
    return out


def _from_yahoo(symbol: str, name: str, days: int, cfg: Config) -> list[dict]:
    import yfinance as yf

    try:
        items = yf.Ticker(symbol).news or []
    except Exception as exc:
        raise UpstreamError(f"Yahoo Finance news unavailable: {type(exc).__name__}") from exc
    out = []
    for it in items:
        c = it.get("content") or it  # newer yfinance nests fields under "content"
        title = clean_text(c.get("title"))
        if not title:
            continue
        url = ((c.get("canonicalUrl") or c.get("clickThroughUrl") or {}).get("url")) or c.get("link")
        provider = c.get("provider") or {}
        out.append({
            "title": title,
            "source": provider.get("displayName") if isinstance(provider, dict) else c.get("publisher"),
            "url": url,
            "published_at": (parse_datetime(c.get("pubDate") or c.get("providerPublishTime")) or datetime.now(timezone.utc)).isoformat(timespec="seconds"),
            "description": clean_text(c.get("summary") or c.get("description")),
        })
    return out


_PROVIDERS = {"newsapi": _from_newsapi, "googlenews": _from_google_news, "yahoo": _from_yahoo}


# ------------------------------------------------------------------ dedupe / rank
def _norm_title(t: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", t.lower()).strip()


def dedupe(articles: list[dict], threshold: float = 0.86) -> list[dict]:
    """Cluster repeats by URL or similar headlines, retaining the earliest with coverage metadata."""
    clusters: list[dict] = []
    for a in sorted(articles, key=lambda x: x.get("published_at") or ""):
        url = (a.get("url") or "").split("?")[0].rstrip("/").lower()
        nt = _norm_title(a["title"])
        if not nt:
            continue
        matching = next(
            (cluster for cluster in clusters
             if (url and url in cluster["urls"])
             or nt == cluster["normalized_title"]
             or SequenceMatcher(None, nt, cluster["normalized_title"]).ratio() >= threshold),
            None,
        )
        if matching is None:
            matching = {"article": dict(a), "normalized_title": nt, "urls": set(), "members": []}
            clusters.append(matching)
        if url:
            matching["urls"].add(url)
        matching["members"].append(a)

    kept = []
    for cluster in clusters:
        representative = cluster["article"]
        members = cluster["members"]
        sources = list(dict.fromkeys(a.get("source") for a in members if a.get("source")))
        representative["coverage"] = {
            "article_count": len(members),
            "sources": sources,
            "articles": [
                {
                    "title": a["title"],
                    "source": a.get("source"),
                    "url": a.get("url"),
                    "published_at": a.get("published_at"),
                }
                for a in members
            ],
        }
        kept.append(representative)
    return sorted(kept, key=lambda x: x.get("published_at") or "", reverse=True)


def relevance_score(article: dict, symbol: str, name: str) -> float:
    """1.0 = company/ticker in the headline, 0.6 = only in the description, 0.3 = neither."""
    sn, tick = short_name(name).lower(), base_ticker(symbol).lower()
    title, desc = article["title"].lower(), (article.get("description") or "").lower()

    def hit(text: str) -> bool:
        if sn and sn in text:
            return True
        return len(tick) >= 2 and re.search(rf"\b{re.escape(tick)}\b", text) is not None

    if hit(title):
        return 1.0
    if hit(desc):
        return 0.6
    return 0.3


# -------------------------------------------------------------------------- API
def fetch_news(symbol: str, name: str, days: int, cfg: Config, refresh: bool = False) -> dict:
    """Returns {"articles": [...], "providers_used": [...], "warnings": [...], "demo": bool}.

    Raises UpstreamError only when every provider failed. A provider that works but finds nothing
    yields an empty list, which the UI renders as an empty state.
    """
    if cfg.DEMO_MODE:
        arts = demo_data.demo_news(symbol, name, days)
        for a in arts:
            a["relevance"] = 1.0
        return {"articles": dedupe(arts), "providers_used": ["demo"], "warnings": [], "demo": True}

    key = f"news:{symbol}:{days}:{','.join(cfg.NEWS_PROVIDERS)}"
    if not refresh:
        hit = cache.get(key)
        if hit is not None:
            return hit

    collected: list[dict] = []
    used: list[str] = []
    warnings: list[str] = []
    errors: list[Exception] = []
    for provider in cfg.NEWS_PROVIDERS:
        fn = _PROVIDERS.get(provider)
        if fn is None:
            warnings.append(f"Unknown news provider '{provider}' ignored.")
            continue
        if provider == "newsapi" and not cfg.NEWSAPI_KEY:
            continue  # silently skip: key-free providers cover this case
        try:
            items = fn(symbol, name, days, cfg)
            used.append(provider)
            collected.extend(items)
            log.info("news provider %s returned %d items for %s", provider, len(items), symbol)
            if len(dedupe(collected)) >= 25:
                break
        except RateLimitError as exc:
            errors.append(exc)
            warnings.append(f"{provider}: {exc.message}")
        except UpstreamError as exc:
            errors.append(exc)
            warnings.append(f"{provider}: {exc.message}")
        except Exception as exc:  # never let one provider's bug take the dashboard down
            log.exception("news provider %s crashed", provider)
            errors.append(exc)
            warnings.append(f"{provider}: unexpected error ({type(exc).__name__}).")

    if not used:
        raise UpstreamError("No news provider is currently available. " + " ".join(warnings),
                            details={"warnings": warnings})

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    for a in collected:
        a["relevance"] = relevance_score(a, symbol, name)
    fresh = [a for a in collected if (parse_datetime(a.get("published_at")) or cutoff) >= cutoff]
    result = {"articles": dedupe(fresh), "providers_used": used, "warnings": warnings, "demo": False}
    cache.set(key, result, ttl=cfg.CACHE_TTL_SECONDS)
    return result
