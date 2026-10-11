"""Company search: Yahoo Finance search endpoint, backed by a local directory fallback."""
from __future__ import annotations

import logging

from ..config import Config
from ..utils.cache import cache
from ..utils.errors import ValidationError
from ..utils.http import http_get
from . import directory

log = logging.getLogger(__name__)
_EXCHANGE_NAMES = {"NMS": "NASDAQ", "NGM": "NASDAQ", "NCM": "NASDAQ", "NYQ": "NYSE", "NSI": "NSE", "BSE": "BSE", "LSE": "LSE"}


def search_companies(q: str, cfg: Config) -> dict:
    q = (q or "").strip()
    if len(q) < 1 or len(q) > 60:
        raise ValidationError("Search text must be between 1 and 60 characters.")
    local = directory.search_local(q)
    warnings: list[str] = []
    remote: list[dict] = []
    if not cfg.DEMO_MODE:
        try:
            def fetch():
                r = http_get(
                    "https://query2.finance.yahoo.com/v1/finance/search",
                    params={"q": q, "quotesCount": 8, "newsCount": 0},
                    timeout=cfg.HTTP_TIMEOUT_SECONDS, retries=1,
                )
                r.raise_for_status()
                return r.json().get("quotes", [])

            for item in cache.get_or_set(f"search:{q.lower()}", fetch, ttl=600):
                if item.get("quoteType") not in {"EQUITY", "ETF", "INDEX"} or not item.get("symbol"):
                    continue
                remote.append({
                    "symbol": item["symbol"].upper(),
                    "name": item.get("longname") or item.get("shortname") or item["symbol"],
                    "exchange": _EXCHANGE_NAMES.get(item.get("exchange"), item.get("exchDisp") or item.get("exchange")),
                    "type": item.get("quoteType"), "source": "yahoo",
                })
        except Exception as exc:
            log.info("Remote search unavailable: %s", exc)
            warnings.append("Live search is unavailable; showing matches from the built-in directory. "
                            "You can still type any ticker directly.")

    merged: dict[str, dict] = {}
    for r in remote + local:
        merged.setdefault(r["symbol"], r)
    return {"results": list(merged.values())[:10], "warnings": warnings}
