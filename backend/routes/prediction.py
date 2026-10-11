from __future__ import annotations

from flask import Blueprint

from ..services import analysis_service as svc
from ..utils.symbols import normalize_symbol
from .helpers import bool_arg, cfg, ok, repo

bp = Blueprint("prediction", __name__)


@bp.get("/prediction/<symbol>")
def prediction(symbol: str):
    sym = normalize_symbol(symbol)
    retrain = svc.check_refresh_allowed(f"{sym}:train", bool_arg("retrain"))
    return ok(svc.build_prediction(sym, cfg(), repo(), retrain=retrain))
