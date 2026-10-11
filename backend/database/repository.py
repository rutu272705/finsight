"""Data-access layer. Every statement is parameterised; nothing is string-formatted into SQL."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from .db import connect, init_db


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def url_hash(url: str | None, title: str) -> str:
    basis = (url or "").strip().lower() or title.strip().lower()
    return hashlib.sha1(basis.encode("utf-8")).hexdigest()


class Repository:
    def __init__(self, path: str):
        self.path = path
        init_db(path)

    # ---------------------------------------------------------------- history
    def add_search(self, symbol: str, name: str | None) -> None:
        with connect(self.path) as c:
            c.execute("INSERT INTO search_history(symbol, name, searched_at) VALUES (?,?,?)", (symbol, name, now_iso()))

    def recent_searches(self, limit: int = 10) -> list[dict]:
        with connect(self.path) as c:
            rows = c.execute(
                """SELECT symbol, MAX(name) AS name, MAX(searched_at) AS searched_at
                   FROM search_history GROUP BY symbol ORDER BY MAX(id) DESC LIMIT ?""",
                (limit,),
            ).fetchall()
        return [dict(r) for r in rows]

    def clear_history(self) -> None:
        with connect(self.path) as c:
            c.execute("DELETE FROM search_history")

    # -------------------------------------------------------------- watchlist
    def watchlist(self) -> list[dict]:
        with connect(self.path) as c:
            rows = c.execute("SELECT symbol, name, exchange, added_at FROM watchlist ORDER BY added_at DESC").fetchall()
        return [dict(r) for r in rows]

    def add_watch(self, symbol: str, name: str | None, exchange: str | None) -> bool:
        """Returns True if newly added, False if it was already present."""
        with connect(self.path) as c:
            cur = c.execute(
                "INSERT OR IGNORE INTO watchlist(symbol, name, exchange, added_at) VALUES (?,?,?,?)",
                (symbol, name, exchange, now_iso()),
            )
            return cur.rowcount > 0

    def remove_watch(self, symbol: str) -> bool:
        with connect(self.path) as c:
            cur = c.execute("DELETE FROM watchlist WHERE symbol = ?", (symbol,))
            return cur.rowcount > 0

    def in_watchlist(self, symbol: str) -> bool:
        with connect(self.path) as c:
            return c.execute("SELECT 1 FROM watchlist WHERE symbol = ?", (symbol,)).fetchone() is not None

    # --------------------------------------------------------------- articles
    def save_articles(self, symbol: str, articles: list[dict], is_demo: bool = False) -> None:
        with connect(self.path) as c:
            for a in articles:
                c.execute(
                    """INSERT INTO articles(symbol,url_hash,title,source,url,published_at,description,relevance,
                           sentiment_label,p_positive,p_negative,p_neutral,sentiment_score,summary,
                           entities_json,explanation_json,backend,is_demo,analyzed_at)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                       ON CONFLICT(symbol,url_hash) DO UPDATE SET
                           relevance=excluded.relevance, sentiment_label=excluded.sentiment_label,
                           p_positive=excluded.p_positive, p_negative=excluded.p_negative,
                           p_neutral=excluded.p_neutral, sentiment_score=excluded.sentiment_score,
                           summary=excluded.summary, entities_json=excluded.entities_json,
                           explanation_json=excluded.explanation_json, backend=excluded.backend,
                           is_demo=excluded.is_demo, analyzed_at=excluded.analyzed_at""",
                    (
                        symbol, url_hash(a.get("url"), a["title"]), a["title"], a.get("source"), a.get("url"),
                        a.get("published_at"), a.get("description"), a.get("relevance"),
                        a.get("sentiment", {}).get("label"),
                        a.get("sentiment", {}).get("probabilities", {}).get("positive"),
                        a.get("sentiment", {}).get("probabilities", {}).get("negative"),
                        a.get("sentiment", {}).get("probabilities", {}).get("neutral"),
                        a.get("sentiment", {}).get("score"),
                        a.get("summary"), json.dumps(a.get("entities", {})),
                        json.dumps(a.get("explanation", {})), a.get("sentiment", {}).get("backend"),
                        1 if is_demo else 0, now_iso(),
                    ),
                )

    def load_articles(self, symbol: str, limit: int = 200) -> list[dict]:
        with connect(self.path) as c:
            rows = c.execute(
                "SELECT * FROM articles WHERE symbol = ? ORDER BY published_at DESC LIMIT ?", (symbol, limit)
            ).fetchall()
        return [self._row_to_article(r) for r in rows]

    def get_article(self, article_id: int) -> dict | None:
        with connect(self.path) as c:
            r = c.execute("SELECT * FROM articles WHERE id = ?", (article_id,)).fetchone()
        return self._row_to_article(r) if r else None

    @staticmethod
    def _row_to_article(r) -> dict:
        return {
            "id": r["id"], "symbol": r["symbol"], "title": r["title"], "source": r["source"], "url": r["url"],
            "published_at": r["published_at"], "description": r["description"], "relevance": r["relevance"],
            "sentiment": {
                "label": r["sentiment_label"],
                "probabilities": {"positive": r["p_positive"], "negative": r["p_negative"], "neutral": r["p_neutral"]},
                "score": r["sentiment_score"], "backend": r["backend"],
            },
            "summary": r["summary"],
            "entities": json.loads(r["entities_json"] or "{}"),
            "explanation": json.loads(r["explanation_json"] or "{}"),
            "is_demo": bool(r["is_demo"]), "analyzed_at": r["analyzed_at"],
        }

    # ------------------------------------------------------------ predictions
    def save_prediction(self, symbol: str, pred: dict, is_demo: bool = False) -> None:
        with connect(self.path) as c:
            c.execute(
                """INSERT INTO predictions(symbol,predicted_at,horizon_days,label,confidence,probabilities_json,
                       model_name,metrics_json,is_demo) VALUES (?,?,?,?,?,?,?,?,?)""",
                (
                    symbol, pred["predicted_at"], pred["horizon_days"], pred["label"], pred.get("confidence"),
                    json.dumps(pred.get("probabilities", {})), pred.get("model_name"),
                    json.dumps(pred.get("test_metrics", {})), 1 if is_demo else 0,
                ),
            )

    def prediction_history(self, symbol: str, limit: int = 50) -> list[dict]:
        with connect(self.path) as c:
            rows = c.execute(
                "SELECT * FROM predictions WHERE symbol = ? ORDER BY predicted_at DESC LIMIT ?", (symbol, limit)
            ).fetchall()
        out: list[dict[str, Any]] = []
        for r in rows:
            out.append({
                "predicted_at": r["predicted_at"], "horizon_days": r["horizon_days"], "label": r["label"],
                "confidence": r["confidence"], "probabilities": json.loads(r["probabilities_json"] or "{}"),
                "model_name": r["model_name"], "is_demo": bool(r["is_demo"]),
            })
        return out
