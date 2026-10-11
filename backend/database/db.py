"""SQLite connection handling. One short-lived connection per operation keeps threads safe."""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path

_SCHEMA = Path(__file__).with_name("schema.sql")


def init_db(path: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with connect(path) as conn:
        conn.executescript(_SCHEMA.read_text(encoding="utf-8"))


@contextmanager
def connect(path: str):
    conn = sqlite3.connect(path, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
