PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS search_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol      TEXT NOT NULL,
    name        TEXT,
    searched_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_search_history_time ON search_history(searched_at DESC);

CREATE TABLE IF NOT EXISTS watchlist (
    symbol   TEXT PRIMARY KEY,
    name     TEXT,
    exchange TEXT,
    added_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS articles (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol          TEXT NOT NULL,
    url_hash        TEXT NOT NULL,
    title           TEXT NOT NULL,
    source          TEXT,
    url             TEXT,
    published_at    TEXT,
    description     TEXT,
    relevance       REAL,
    sentiment_label TEXT,
    p_positive      REAL,
    p_negative      REAL,
    p_neutral       REAL,
    sentiment_score REAL,
    summary         TEXT,
    entities_json   TEXT,
    explanation_json TEXT,
    backend         TEXT,
    is_demo         INTEGER NOT NULL DEFAULT 0,
    analyzed_at     TEXT NOT NULL,
    UNIQUE(symbol, url_hash)
);
CREATE INDEX IF NOT EXISTS idx_articles_symbol_time ON articles(symbol, published_at DESC);

CREATE TABLE IF NOT EXISTS predictions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol        TEXT NOT NULL,
    predicted_at  TEXT NOT NULL,
    horizon_days  INTEGER NOT NULL,
    label         TEXT NOT NULL,
    confidence    REAL,
    probabilities_json TEXT,
    model_name    TEXT,
    metrics_json  TEXT,
    is_demo       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_predictions_symbol_time ON predictions(symbol, predicted_at DESC);
