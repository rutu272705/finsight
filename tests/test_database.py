import sqlite3

import pytest

from backend.database.repository import Repository


@pytest.fixture
def repo(tmp_path):
    return Repository(str(tmp_path / "t.db"))


def article(title="Apple beats estimates", url="https://x.com/1"):
    return {"title": title, "url": url, "source": "Reuters", "published_at": "2026-01-05T10:00:00+00:00",
            "description": "d", "relevance": 1.0, "summary": "s", "entities": {"companies": ["Apple"]},
            "explanation": {"signals": []},
            "sentiment": {"label": "positive", "probabilities": {"positive": .8, "negative": .05, "neutral": .15},
                          "score": .75, "backend": "lexicon"}}


def test_watchlist_add_remove_idempotent(repo):
    assert repo.add_watch("AAPL", "Apple", "NASDAQ") is True
    assert repo.add_watch("AAPL", "Apple", "NASDAQ") is False
    assert [w["symbol"] for w in repo.watchlist()] == ["AAPL"] and repo.in_watchlist("AAPL")
    assert repo.remove_watch("AAPL") is True and repo.remove_watch("AAPL") is False


def test_search_history_groups_recent_first(repo):
    for s in ["AAPL", "TSLA", "AAPL"]:
        repo.add_search(s, s)
    recent = repo.recent_searches()
    assert [r["symbol"] for r in recent][0] == "AAPL" and len(recent) == 2
    repo.clear_history()
    assert repo.recent_searches() == []


def test_articles_upsert_and_roundtrip(repo):
    repo.save_articles("AAPL", [article()])
    repo.save_articles("AAPL", [article()])  # same URL: updated, not duplicated
    rows = repo.load_articles("AAPL")
    assert len(rows) == 1 and rows[0]["sentiment"]["label"] == "positive"
    assert rows[0]["entities"]["companies"] == ["Apple"]
    assert repo.get_article(rows[0]["id"])["title"] == "Apple beats estimates"
    assert repo.get_article(9999) is None


def test_prediction_history(repo):
    repo.save_prediction("AAPL", {"predicted_at": "2026-01-05T10:00:00+00:00", "horizon_days": 5, "label": "Upward",
                                  "confidence": .5, "probabilities": {"Upward": .5}, "model_name": "RF", "test_metrics": {}})
    h = repo.prediction_history("AAPL")
    assert h[0]["label"] == "Upward" and h[0]["probabilities"]["Upward"] == .5


def test_sql_injection_is_inert(repo):
    evil = "AAPL'; DROP TABLE watchlist; --"
    repo.add_watch(evil, "x", None)
    assert [w["symbol"] for w in repo.watchlist()] == [evil]  # stored as plain text
    with sqlite3.connect(repo.path) as c:
        assert c.execute("SELECT count(*) FROM watchlist").fetchone()[0] == 1
