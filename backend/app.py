"""Flask application factory."""
from __future__ import annotations

import logging
from pathlib import Path

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from .config import Config, get_config
from .database.repository import Repository
from .routes import market, news, prediction, user
from .utils.errors import AppError
from .utils.logging_setup import setup_logging

log = logging.getLogger(__name__)
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"


def create_app(config: Config | None = None) -> Flask:
    cfg = config or get_config()
    setup_logging(cfg.DEBUG)
    app = Flask(__name__, static_folder=None)
    app.extensions["finsight_cfg"] = cfg
    app.extensions["finsight_repo"] = Repository(cfg.DATABASE_PATH)
    CORS(app, resources={r"/api/*": {"origins": cfg.CORS_ORIGINS}})

    for bp in (market.bp, news.bp, prediction.bp, user.bp):
        app.register_blueprint(bp, url_prefix="/api")

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "demo_mode": cfg.DEMO_MODE, "sentiment_backend": cfg.SENTIMENT_BACKEND,
                        "news_providers": cfg.NEWS_PROVIDERS, "newsapi_configured": bool(cfg.NEWSAPI_KEY)})

    @app.errorhandler(AppError)
    def handle_app_error(exc: AppError):
        return jsonify({"error": {"code": exc.code, "message": exc.message, "details": exc.details}}), exc.status_code

    @app.errorhandler(HTTPException)
    def handle_http(exc: HTTPException):
        return jsonify({"error": {"code": exc.name.lower().replace(" ", "_"), "message": exc.description, "details": {}}}), exc.code

    @app.errorhandler(Exception)
    def handle_unexpected(exc: Exception):
        log.exception("Unhandled error")
        return jsonify({"error": {"code": "internal_error", "message": "Something went wrong on the server. Check the server log for details.", "details": {}}}), 500

    if FRONTEND_DIST.exists():  # `npm run build` output is served by Flask for one-process deployments
        @app.get("/", defaults={"path": ""})
        @app.get("/<path:path>")
        def spa(path: str):
            if path.startswith("api/"):
                return jsonify({"error": {"code": "not_found", "message": "Unknown API route.", "details": {}}}), 404
            target = FRONTEND_DIST / path
            if path and target.is_file():
                return send_from_directory(FRONTEND_DIST, path)
            return send_from_directory(FRONTEND_DIST, "index.html")

    return app


def main() -> None:  # pragma: no cover
    cfg = get_config()
    create_app(cfg).run(host="0.0.0.0", port=cfg.PORT, debug=False)


if __name__ == "__main__":  # pragma: no cover
    main()
