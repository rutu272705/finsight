# FinSight

**An NLP-based financial news sentiment and stock trend prediction system.**

FinSight pulls recent news and price history for a company, classifies each article's sentiment, extracts entities and
topics, summarises the story, and trains a small machine-learning model that gives an *experimental* forecast for the next
five trading sessions. Everything is shown on a dark analytics dashboard.

> **Not financial advice.** Short-term stock movements are close to random. The forecast is a learning exercise, and the
> app shows its accuracy next to a naive baseline so you can see how little signal there usually is.

## Contents
1. [Architecture](#architecture) 2. [Prerequisites](#prerequisites) 3. [Setup and run](#setup-and-run)
4. [Configuration](#configuration) 5. [Getting a news API key](#getting-a-news-api-key) 6. [Optional: FinBERT and spaCy](#optional-finbert-and-spacy)
7. [Demo mode](#demo-mode) 8. [Model training](#model-training) 9. [API reference](#api-reference) 10. [Testing](#testing)
11. [Design decisions](#design-decisions) 12. [Limitations](#limitations)

## Architecture

```
finsight/
├── run.py                     # starts Flask (also serves frontend/dist if built)
├── requirements.txt           # core Python dependencies
├── requirements-optional.txt  # FinBERT / spaCy / abstractive summaries
├── .env.example               # every environment variable, no secrets
├── backend/
│   ├── app.py, config.py      # app factory, env-driven configuration
│   ├── routes/                # HTTP layer: market, news, prediction, user (watchlist/history/export)
│   ├── services/              # market_data (yfinance), news_service (NewsAPI/Google News/Yahoo),
│   │                          # search_service, analysis_service (orchestration), demo_data
│   ├── nlp/                   # sentiment, entities, summarizer, pipeline (aggregation)
│   ├── ml/                    # labels, features, train, evaluate, predict
│   ├── database/              # schema.sql, db.py, repository.py (parameterised SQLite)
│   ├── models/                # saved trained models (*.joblib, created at run time)
│   └── utils/                 # errors, TTL cache, HTTP retries, symbols/market sessions
├── frontend/                  # React + Vite + Tailwind + Recharts
│   └── src/{pages,components,hooks,api.js,test}
└── tests/                     # pytest suite (77 tests)
```

Data flow for one dashboard request:
`yfinance prices` + `news providers → de-duplicate → sentiment → entities → summary → SQLite` → `aggregate score` →
`features + labels → chronological train/test → best model → forecast` → one JSON payload for the UI.

## Prerequisites
* Python 3.10+ (developed on 3.12)
* Node.js 18+ and npm
* Internet access for live data (not needed in [demo mode](#demo-mode))

## Setup and run

```bash
# 1. Backend
cd finsight
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                 # Windows: copy .env.example .env   (then edit .env)

# 2. Frontend
cd frontend
npm install
cd ..
```

**Development (two terminals, hot reload):**
```bash
# terminal 1: API on http://localhost:5000
python run.py

# terminal 2: UI on http://localhost:5173  (proxies /api to Flask)
cd frontend && npm run dev
```
Open **http://localhost:5173**.

**Single process (production-style):**
```bash
cd frontend && npm run build && cd ..
python run.py            # serves API and UI together on http://localhost:5000
```

Try `RELIANCE.NS`, `TCS.NS`, `AAPL`, `TSLA`. Indian stocks need the `.NS` (NSE) or `.BO` (BSE) suffix.
The first dashboard visit for a ticker trains its model (about 5–15 seconds); later visits reuse the saved model.

## Configuration
All settings are environment variables (see `.env.example`). Secrets stay on the server; the browser only calls `/api`.

| Variable | Default | Purpose |
|---|---|---|
| `NEWSAPI_KEY` | empty | NewsAPI key. Optional: without it, Google News and Yahoo feeds are used |
| `NEWS_PROVIDERS` | `newsapi,googlenews,yahoo` | Providers tried in order; failures fall through to the next |
| `SENTIMENT_BACKEND` | `finbert` | `finbert` or `lexicon` |
| `SUMMARIZER_BACKEND` | `extractive` | `extractive` or `transformers` |
| `ENTITY_BACKEND` | `auto` | `auto` (spaCy if installed) or `regex` |
| `FORECAST_HORIZON` | `5` | Trading sessions ahead |
| `TREND_THRESHOLD` | `0.01` | ±1% return separates Upward/Downward from Stable |
| `TRAIN_HISTORY_PERIOD` | `5y` | Price history used for training |
| `MODEL_MAX_AGE_DAYS` | `7` | Retrain when a saved model is older |
| `CACHE_TTL_SECONDS` | `300` | In-memory cache lifetime for prices and news |
| `DATABASE_PATH` | `backend/finsight.db` | SQLite file |
| `DEMO_MODE` | `false` | Synthetic offline data (see below) |

## Getting a news API key
1. Register at <https://newsapi.org/register> (free developer plan).
2. Copy the key into `.env` as `NEWSAPI_KEY=...`.
3. Restart `python run.py`. The sidebar will show “NewsAPI + free feeds”.

The free plan allows 100 requests/day and articles up to roughly a month old. FinSight caches results for 5 minutes, throttles
manual refreshes to one per minute per company, and reports rate-limit errors in the UI. It works without a key.

## FinBERT and optional NLP models
FinBERT is the default finance-specific sentiment classifier. Install the optional dependencies to enable it; the model
(about 440 MB) downloads on the first analysis. Until it is installed or if it cannot load, FinSight falls back to the
built-in financial lexicon and reports the active backend. Its confidence is a model score, not a calibrated probability.
```bash
pip install -r requirements-optional.txt
python -m spacy download en_core_web_sm
# in .env
SENTIMENT_BACKEND=finbert            # default; set lexicon for a lightweight offline alternative
SUMMARIZER_BACKEND=transformers      # optional abstractive summaries
```
If a model cannot load, FinSight logs the reason, falls back to the lexicon/extractive method, and the article card shows which
method actually produced the result.

## Demo mode
`DEMO_MODE=true` replaces live prices and headlines with **clearly labelled synthetic data** (seeded random walks and
templated headlines) so the whole application can be shown offline. A banner appears on every page, exports are marked
`demo_data=yes`, and the API sets `"demo": true`. Demo mode is never switched on automatically: with it off, a failed data
source produces an error message or an “unavailable” panel, never made-up numbers.

## Model training
* **Target:** return over the next *N* sessions (`FORECAST_HORIZON`, default 5), labelled **Upward** above `+TREND_THRESHOLD`,
  **Downward** below `-TREND_THRESHOLD`, otherwise **Stable**.
* **Features** (all computed from data available at the close of day *t*): 1/5/10/20-day returns, SMA ratios, 10/20-day
  volatility, volume ratios, RSI(14), MACD histogram, Bollinger position, high-low range, and 5-session news sentiment
  (mean, article count, availability flag).
* **Leakage controls:** rolling windows look backwards only (a unit test proves features are unchanged when future prices are
  removed); news counts only if its *trading session* is on or before day *t*, and articles published after the closing bell or
  on weekends are assigned to the next session; the test set starts `horizon` rows after the training set ends, so no training
  label overlaps test dates.
* **Selection:** Logistic Regression, Random Forest and Gradient Boosting are compared with walk-forward cross-validation
  (`TimeSeriesSplit` with a gap). The best by macro-F1 is evaluated once on the held-out last 20% (accuracy, precision, recall, F1,
  confusion matrix) next to a most-frequent-class baseline, then refit on all labelled data for the live forecast.
* Retrain on demand with `GET /api/prediction/<symbol>?retrain=true` (throttled).

## API reference
All responses use `{"data": ..., "generated_at": ..., "demo": bool, "warnings": [...]}`; errors use
`{"error": {"code", "message", "details"}}` with a meaningful HTTP status (400 invalid input, 404 unknown ticker, 422 not enough
data, 429 rate limited, 502 provider down).

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Status and active backends |
| GET | `/api/search?q=` | Company search by name or ticker |
| GET | `/api/stock/<symbol>?period=6mo` | Quote and OHLCV history (`1mo,3mo,6mo,1y,2y,5y,max`) |
| GET | `/api/news/<symbol>?days=14&sentiment=&source=&from=&to=&refresh=` | Analysed news with filters |
| POST | `/api/analyze` | `{symbol, articles?[{title, description}], days?}` sentiment + entities + summary |
| GET | `/api/prediction/<symbol>?retrain=` | Forecast with probabilities and evaluation |
| GET | `/api/dashboard/<symbol>?period=&days=&refresh=` | Combined dashboard payload |
| GET | `/api/analytics/<symbol>?start=&end=` | Aligned returns/sentiment series and correlations |
| GET/POST | `/api/watchlist` | List (with quotes) / add `{symbol}` |
| DELETE | `/api/watchlist/<symbol>` | Remove |
| GET/DELETE | `/api/history` | Recent searches / clear |
| GET | `/api/articles?symbol=` , `/api/articles/<id>` | Reopen stored analyses without calling external APIs |
| GET | `/api/export/<symbol>?type=articles\|prices\|predictions` | CSV download |

## Testing
```bash
pytest                    # 77 backend tests: sentiment, entities, summaries, retrieval, labels, leakage, models, DB, API
cd frontend && npm test   # 19 frontend tests: loading, error, empty and unavailable states, filters, watchlist
```
Backend tests run against deterministic demo data or mocked providers, so they need no network or API keys.

## Design decisions
* **No user accounts.** The spec makes authentication optional. This is a single-user local app, so the watchlist and history are
  global. Adding accounts would mean a `users` table, password hashing (`werkzeug.security`) and a user id on each row.
* **Per-company models** trained on demand rather than one global model, keeping the pipeline easy to follow.
* **Honest labelling.** Lexicon “probabilities” are flagged as heuristic scores; explanations list the terms seen and state they are
  not causal; the UI warns when the model does not beat the baseline; correlation views carry a causation caveat.
* **Extractive summaries** copy sentences from the source, so they cannot invent facts. Headline-only summaries are labelled.
* **Security:** API keys are read server-side only; all SQL is parameterised; symbols are validated against a strict pattern; CSV
  exports neutralise spreadsheet formula injection; article links open with `rel="noopener noreferrer"`.

## Limitations
* Free news APIs return only recent articles, so historical sentiment is sparse and the model mostly learns from prices
  (`sentiment_coverage_pct` is shown in the model panel).
* News text is usually a headline plus a short snippet, not the full article.
* The regex entity fallback has lower recall than spaCy and only labels people/organisations when there is a clear cue.
* Yahoo Finance is an unofficial source and may throttle or change without notice.
* Sentiment-versus-return relationships are shown as correlations over small samples and do not establish causation.
