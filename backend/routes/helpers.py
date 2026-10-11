"""Shared helpers for route modules: response envelope, parameter parsing, accessors."""
from __future__ import annotations

from datetime import datetime, timezone

from flask import current_app, jsonify, request

from ..config import Config
from ..database.repository import Repository
from ..utils.errors import ValidationError


def cfg() -> Config:
    return current_app.extensions["finsight_cfg"]


def repo() -> Repository:
    return current_app.extensions["finsight_repo"]


def ok(data: dict | list, status: int = 200, **extra):
    body = {"data": data, "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "demo": cfg().DEMO_MODE}
    body.update(extra)
    return jsonify(body), status


def int_arg(name: str, default: int, lo: int, hi: int) -> int:
    raw = request.args.get(name)
    if raw in (None, ""):
        return default
    try:
        val = int(raw)
    except ValueError as exc:
        raise ValidationError(f"'{name}' must be a whole number.", details={name: raw}) from exc
    if not lo <= val <= hi:
        raise ValidationError(f"'{name}' must be between {lo} and {hi}.", details={name: raw})
    return val


def bool_arg(name: str) -> bool:
    return request.args.get(name, "").lower() in {"1", "true", "yes"}


def date_arg(name: str) -> str | None:
    raw = request.args.get(name)
    if not raw:
        return None
    try:
        datetime.strptime(raw, "%Y-%m-%d")
    except ValueError as exc:
        raise ValidationError(f"'{name}' must be a date in YYYY-MM-DD format.", details={name: raw}) from exc
    return raw


def json_body() -> dict:
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        raise ValidationError("Request body must be a JSON object.")
    return body
