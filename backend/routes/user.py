from __future__ import annotations

import csv
import io

from flask import Blueprint, Response, request

from ..services import market_data
from ..utils.errors import NotFoundError, ValidationError
from ..utils.symbols import normalize_symbol
from .helpers import cfg, json_body, ok, repo

bp = Blueprint("user", __name__)


# ------------------------------------------------------------------ watchlist
@bp.get("/watchlist")
def get_watchlist():
    items = repo().watchlist()
    for it in items:
        try:
            it["quote"] = market_data.get_quote(market_data.get_history(it["symbol"], "1mo", cfg()))
        except Exception:  # one failing ticker must not break the list
            it["quote"] = None
    return ok(items)


@bp.post("/watchlist")
def add_watchlist():
    body = json_body()
    sym = normalize_symbol(body.get("symbol", ""))
    name, exchange = body.get("name"), body.get("exchange")
    if not name:
        try:
            prof = market_data.get_profile(sym, cfg())
            name, exchange = prof["name"], exchange or prof.get("exchange")
        except Exception:
            name = sym
    created = repo().add_watch(sym, str(name)[:120], (str(exchange)[:20] if exchange else None))
    return ok({"symbol": sym, "added": created}, status=201 if created else 200)


@bp.delete("/watchlist/<symbol>")
def remove_watchlist(symbol: str):
    sym = normalize_symbol(symbol)
    if not repo().remove_watch(sym):
        raise NotFoundError(f"{sym} is not on your watchlist.")
    return ok({"symbol": sym, "removed": True})


# -------------------------------------------------------------------- history
@bp.get("/history")
def history():
    return ok(repo().recent_searches(10))


@bp.delete("/history")
def clear_history():
    repo().clear_history()
    return ok({"cleared": True})


# --------------------------------------------------------------------- export
def _safe(v):
    """Neutralise spreadsheet formula injection in exported text cells."""
    if isinstance(v, str) and v[:1] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + v
    return v


def _csv_response(rows: list[list], header: list[str], filename: str) -> Response:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(header)
    for r in rows:
        w.writerow([_safe(c) for c in r])
    return Response("\ufeff" + buf.getvalue(), mimetype="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@bp.get("/export/<symbol>")
def export(symbol: str):
    sym = normalize_symbol(symbol)
    kind = request.args.get("type", "articles")
    if kind == "articles":
        arts = repo().load_articles(sym, 500)
        if not arts:
            raise NotFoundError(f"No analysed articles are stored for {sym} yet. Open its dashboard first.")
        rows = [[a["published_at"], a["source"], a["title"], a["url"], a["sentiment"]["label"],
                 a["sentiment"]["probabilities"]["positive"], a["sentiment"]["probabilities"]["negative"],
                 a["sentiment"]["probabilities"]["neutral"], a["sentiment"]["score"], a["summary"],
                 "; ".join(a["entities"].get("companies", [])), "; ".join(a["entities"].get("topics", [])),
                 "yes" if a["is_demo"] else "no"] for a in arts]
        return _csv_response(rows, ["published_at", "source", "title", "url", "sentiment", "p_positive", "p_negative",
                                    "p_neutral", "score", "summary", "companies", "topics", "demo_data"], f"{sym}_articles.csv")
    if kind == "prices":
        h = market_data.get_history(sym, "1y", cfg())
        rows = [[i.strftime("%Y-%m-%d"), r.Open, r.High, r.Low, r.Close, int(r.Volume)] for i, r in h.iterrows()]
        return _csv_response(rows, ["date", "open", "high", "low", "close", "volume"], f"{sym}_prices.csv")
    if kind == "predictions":
        ph = repo().prediction_history(sym, 200)
        if not ph:
            raise NotFoundError(f"No predictions have been stored for {sym} yet.")
        rows = [[p["predicted_at"], p["horizon_days"], p["label"], p["confidence"], p["model_name"],
                 "yes" if p["is_demo"] else "no"] for p in ph]
        return _csv_response(rows, ["predicted_at", "horizon_days", "label", "confidence", "model", "demo_data"], f"{sym}_predictions.csv")
    raise ValidationError("type must be articles, prices or predictions.")
