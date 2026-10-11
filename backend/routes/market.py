from __future__ import annotations

from flask import Blueprint

from ..services import analysis_service as svc
from ..services import market_data, search_service
from ..utils.symbols import normalize_symbol
from .helpers import bool_arg, cfg, date_arg, int_arg, ok, repo

bp = Blueprint("market", __name__)


@bp.get("/search")
def search():
    from flask import request

    result = search_service.search_companies(request.args.get("q", ""), cfg())
    return ok(result["results"], warnings=result["warnings"])


@bp.get("/stock/<symbol>")
def stock(symbol: str):
    from flask import request

    sym = normalize_symbol(symbol)
    period = market_data.validate_period(request.args.get("period", "6mo"))
    history = market_data.get_history(sym, period, cfg(), refresh=bool_arg("refresh"))
    return ok({"symbol": sym, "profile": market_data.get_profile(sym, cfg()), "quote": market_data.get_quote(history),
               "period": period, "history": market_data.history_to_records(history)})


@bp.get("/dashboard/<symbol>")
def dashboard(symbol: str):
    from flask import request

    sym = normalize_symbol(symbol)
    period = market_data.validate_period(request.args.get("period", "6mo"))
    days = int_arg("days", 14, 1, 30)
    return ok(svc.build_dashboard(sym, period, days, cfg(), repo(), refresh=bool_arg("refresh")))


@bp.get("/analytics/<symbol>")
def analytics(symbol: str):
    sym = normalize_symbol(symbol)
    return ok(svc.build_analytics(sym, date_arg("start"), date_arg("end"), cfg(), repo()))
