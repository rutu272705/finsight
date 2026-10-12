import pytest

from backend.services import news_service
from backend.utils.errors import UpstreamError


def test_health(client):
    j = client.get("/api/health").get_json()
    assert j["status"] == "ok" and j["demo_mode"] is True


def test_search_returns_matches(client):
    j = client.get("/api/search?q=tcs").get_json()
    assert j["data"][0]["symbol"] == "TCS.NS"
    assert client.get("/api/search?q=").status_code == 400


def test_stock_endpoint_and_validation(client):
    r = client.get("/api/stock/aapl?period=3mo")
    d = r.get_json()["data"]
    assert r.status_code == 200 and d["symbol"] == "AAPL" and d["quote"]["price"] > 0 and len(d["history"]) > 30
    assert client.get("/api/stock/AAPL?period=forever").status_code == 400
    bad = client.get("/api/stock/bad%20ticker!")
    assert bad.status_code == 400 and bad.get_json()["error"]["code"] == "validation_error"


def test_news_filters(client):
    all_ = client.get("/api/news/AAPL").get_json()["data"]
    assert all_["articles"] and all_["aggregate"]["n_articles"] == len(all_["articles"])
    pos = client.get("/api/news/AAPL?sentiment=positive").get_json()["data"]["articles"]
    assert pos and all(a["sentiment"]["label"] == "positive" for a in pos)
    none = client.get("/api/news/AAPL?source=does-not-exist").get_json()["data"]
    assert none["articles"] == [] and none["total_before_filters"] > 0
    assert client.get("/api/news/AAPL?sentiment=wild").status_code == 400
    assert client.get("/api/news/AAPL?days=99").status_code == 400
    assert client.get("/api/news/AAPL?from=yesterday").status_code == 400


def test_analyze_custom_articles(client):
    body = {"symbol": "INFY.NS", "articles": [
        {"title": "Infosys raises revenue guidance after strong quarter",
         "description": "Net profit rose 8% to ₹6,300 crore. Results announced on October 12, 2026."},
        {"title": "Infosys faces regulatory probe over filing delays"}]}
    d = client.post("/api/analyze", json=body).get_json()["data"]
    labels = [a["sentiment"]["label"] for a in d["articles"]]
    assert labels == ["positive", "negative"] and d["stored"] is False
    assert d["articles"][0]["entities"]["percentages"][0]["context"] == "profit"
    assert d["articles"][0]["summary"] and d["articles"][0]["explanation"]["signals"]
    assert d["articles"][0]["explanation"]["aspects"]
    assert d["articles"][0]["explanation"]["events"]
    assert d["articles"][0]["explanation"]["temporal_references"][0]["date"] == "2026-10-12"


@pytest.mark.parametrize("payload", [
    {}, {"symbol": "AAPL", "articles": []}, {"symbol": "AAPL", "articles": [{"title": ""}]},
    {"symbol": "AAPL", "articles": "nope"}, {"symbol": "AAPL", "articles": [{"title": "x" * 400}]},
    {"symbol": "AAPL", "days": 100},
])
def test_analyze_rejects_bad_input(client, payload):
    assert client.post("/api/analyze", json=payload).status_code == 400


def test_analyze_requires_json(client):
    assert client.post("/api/analyze", data="not json").status_code == 400


def test_prediction_endpoint(client):
    r = client.get("/api/prediction/AAPL")
    d = r.get_json()["data"]
    assert r.status_code == 200 and d["label"] in {"Upward", "Downward", "Stable"}
    assert d["disclaimer"] and d["horizon_days"] == 5 and set(d["probabilities"]) == {"Upward", "Downward", "Stable"}


def test_dashboard_combines_everything(client):
    r = client.get("/api/dashboard/AAPL?period=3mo")
    d = r.get_json()
    data = d["data"]
    assert r.status_code == 200 and d["demo"] is True
    assert data["quote"] and data["history"] and data["news"]["aggregate"]["n_articles"] > 0
    assert data["prediction"]["label"] and data["last_updated"]
    assert data["news"]["topics"]["topics"]
    recent = client.get("/api/history").get_json()["data"]
    assert recent[0]["symbol"] == "AAPL"


def test_dashboard_news_outage_degrades_gracefully(live_cfg, monkeypatch):
    from backend.app import create_app
    from backend.services import market_data
    from tests.conftest import make_prices
    live_cfg.NEWS_PROVIDERS = ["googlenews"]
    monkeypatch.setattr(market_data, "_download", lambda *a, **k: make_prices(700).tz_localize("UTC"))
    def down(*a, **k): raise UpstreamError("timeout")
    monkeypatch.setitem(news_service._PROVIDERS, "googlenews", down)
    c = create_app(live_cfg).test_client()
    r = c.get("/api/dashboard/AAPL")
    data = r.get_json()["data"]
    assert r.status_code == 200 and r.get_json()["demo"] is False
    assert data["news"]["unavailable"] is True and "No news provider" in data["news"]["reason"]
    assert data["quote"]["price"] > 0  # price data still shown


def test_dashboard_unknown_ticker_is_clear_404(live_cfg, monkeypatch):
    import pandas as pd
    from backend.app import create_app
    from backend.services import market_data
    monkeypatch.setattr(market_data, "_download", lambda *a, **k: pd.DataFrame())
    r = create_app(live_cfg).test_client().get("/api/dashboard/NOPE")
    assert r.status_code == 404 and "No price data" in r.get_json()["error"]["message"]


def test_refresh_is_throttled(client):
    assert client.get("/api/dashboard/AAPL?refresh=true").status_code == 200
    r = client.get("/api/dashboard/AAPL?refresh=true")
    assert r.status_code == 429 and r.get_json()["error"]["code"] == "rate_limited"


def test_watchlist_lifecycle(client):
    assert client.get("/api/watchlist").get_json()["data"] == []
    assert client.post("/api/watchlist", json={"symbol": "tsla"}).status_code == 201
    assert client.post("/api/watchlist", json={"symbol": "TSLA"}).status_code == 200  # already present
    items = client.get("/api/watchlist").get_json()["data"]
    assert items[0]["symbol"] == "TSLA" and items[0]["quote"]["price"] > 0
    assert client.delete("/api/watchlist/TSLA").status_code == 200
    assert client.delete("/api/watchlist/TSLA").status_code == 404
    assert client.post("/api/watchlist", json={"symbol": "bad symbol"}).status_code == 400


def test_stored_articles_reopen_and_export(client):
    client.get("/api/dashboard/AAPL")
    arts = client.get("/api/articles?symbol=AAPL").get_json()["data"]["articles"]
    assert arts
    assert {"aspects", "events", "temporal_references", "coverage"} <= set(arts[0]["explanation"])
    one = client.get(f"/api/articles/{arts[0]['id']}")
    assert one.status_code == 200 and one.get_json()["data"]["title"] == arts[0]["title"]
    assert client.get("/api/articles/999999").status_code == 404
    csv_resp = client.get("/api/export/AAPL")
    assert csv_resp.mimetype == "text/csv" and b"published_at,source,title" in csv_resp.data
    assert b"demo_data" in csv_resp.data and b"yes" in csv_resp.data
    assert client.get("/api/export/AAPL?type=prices").status_code == 200
    assert client.get("/api/export/AAPL?type=nonsense").status_code == 400
    assert client.get("/api/export/NEVERSEEN").status_code == 404


def test_csv_formula_injection_is_neutralised():
    from backend.routes.user import _safe
    assert _safe("=HYPERLINK(\"x\")").startswith("'") and _safe("@cmd").startswith("'") and _safe("normal") == "normal"


def test_analytics_has_correlation_caveat(client):
    d = client.get("/api/analytics/AAPL").get_json()["data"]
    assert d["series"] and "not cause and effect" in d["correlation"]["note"]
    assert client.get("/api/analytics/AAPL?start=2025-13-45").status_code == 400


def test_unknown_route_returns_json(client):
    r = client.get("/api/nope")
    assert r.status_code == 404 and r.get_json()["error"]["code"] == "not_found"
