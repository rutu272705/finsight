import pytest

from backend.services import news_service as ns
from backend.utils.errors import UpstreamError


def art(title, url, when="2099-01-01T10:00:00+00:00", desc=""):
    return {"title": title, "url": url, "published_at": when, "description": desc, "source": "X"}


def test_dedupe_by_url_title_and_fuzzy_match():
    items = [
        {**art("Apple beats earnings estimates", "https://a.com/1"), "source": "Reuters"},
        {**art("Apple Beats Earnings Estimates!", "https://b.com/2"), "source": "Bloomberg"},  # same headline
        {**art("Apple beats earnings estimate", "https://c.com/3"), "source": "CNBC"},  # near-identical
        art("Tesla recalls 100,000 cars", "https://d.com/4?utm=1"),
        art("Completely different headline about oil", "https://d.com/4"),  # same URL after stripping query
        art("Tesla expands factory in Berlin", "https://e.com/5"),
    ]
    out = ns.dedupe(items)
    titles = [a["title"] for a in out]
    assert len(out) == 3
    assert any("Tesla recalls" in t for t in titles) and any("Berlin" in t for t in titles)
    repeated = next(a for a in out if a["title"] == "Apple beats earnings estimates")
    assert repeated["coverage"]["article_count"] == 3
    assert set(repeated["coverage"]["sources"]) == {"Reuters", "Bloomberg", "CNBC"}


def test_relevance_levels():
    assert ns.relevance_score(art("Infosys wins deal", "u"), "INFY.NS", "Infosys Limited") == 1.0
    assert ns.relevance_score(art("IT stocks rally", "u", desc="Infosys led gains"), "INFY.NS", "Infosys Limited") == 0.6
    assert ns.relevance_score(art("Oil prices fall", "u"), "INFY.NS", "Infosys Limited") == 0.3


def test_short_name():
    assert ns.short_name("Tata Consultancy Services Limited") == "Tata Consultancy Services"
    assert ns.short_name("Apple Inc.") == "Apple"


def test_provider_failure_falls_through_to_next(live_cfg, monkeypatch):
    live_cfg.NEWS_PROVIDERS = ["googlenews", "yahoo"]
    def fail(*a, **k): raise UpstreamError("timeout")
    ok_items = [art("Apple announces new chip", "https://x.com/1", when="2099-01-01T00:00:00+00:00")]
    monkeypatch.setitem(ns._PROVIDERS, "googlenews", fail)
    monkeypatch.setitem(ns._PROVIDERS, "yahoo", lambda *a, **k: ok_items)
    # cutoff uses real "now"; far-future date keeps the article inside the window
    res = ns.fetch_news("AAPL", "Apple Inc.", 7, live_cfg)
    assert res["providers_used"] == ["yahoo"] and len(res["articles"]) == 1
    assert any("googlenews" in w for w in res["warnings"])


def test_all_providers_down_raises_instead_of_fabricating(live_cfg, monkeypatch):
    live_cfg.NEWS_PROVIDERS = ["googlenews", "yahoo"]
    def fail(*a, **k): raise UpstreamError("down")
    monkeypatch.setitem(ns._PROVIDERS, "googlenews", fail)
    monkeypatch.setitem(ns._PROVIDERS, "yahoo", fail)
    with pytest.raises(UpstreamError):
        ns.fetch_news("AAPL", "Apple Inc.", 7, live_cfg)


def test_working_provider_with_no_results_returns_empty_list(live_cfg, monkeypatch):
    live_cfg.NEWS_PROVIDERS = ["googlenews"]
    monkeypatch.setitem(ns._PROVIDERS, "googlenews", lambda *a, **k: [])
    res = ns.fetch_news("AAPL", "Apple Inc.", 7, live_cfg)
    assert res["articles"] == [] and res["providers_used"] == ["googlenews"]


def test_google_news_rss_parsing(live_cfg, monkeypatch):
    xml = b"""<rss><channel><item><title>Apple hits record - Reuters</title><link>https://n.google/1</link>
    <pubDate>Mon, 05 Jan 2026 10:00:00 GMT</pubDate><description>&lt;a&gt;Apple hits record&lt;/a&gt;</description>
    <source url="https://reuters.com">Reuters</source></item></channel></rss>"""
    class R: content = xml
    monkeypatch.setattr(ns, "http_get", lambda *a, **k: R())
    items = ns._from_google_news("AAPL", "Apple Inc.", 7, live_cfg)
    assert items[0]["title"] == "Apple hits record" and items[0]["source"] == "Reuters"
    assert items[0]["published_at"].startswith("2026-01-05T10:00:00")


def test_demo_news_is_flagged(cfg):
    res = ns.fetch_news("AAPL", "Apple Inc.", 14, cfg)
    assert res["demo"] is True and res["providers_used"] == ["demo"] and res["articles"]
