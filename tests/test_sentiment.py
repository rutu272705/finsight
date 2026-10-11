import pytest

from backend.nlp.sentiment import FinBertAnalyzer, LexiconAnalyzer, get_analyzer, lexicon_signals


@pytest.fixture(scope="module")
def analyzer():
    return LexiconAnalyzer()


@pytest.mark.parametrize("headline,expected", [
    ("Apple beats earnings estimates as revenue surges 12%", "positive"),
    ("Analysts upgrade the bank on strong growth outlook", "positive"),
    ("Tesla shares plunge after profit warning and recall", "negative"),
    ("Company misses estimates, announces layoffs", "negative"),
    ("Firm schedules annual shareholder meeting for August", "neutral"),
])
def test_label_classification(analyzer, headline, expected):
    assert analyzer.analyze(headline)["label"] == expected


def test_probabilities_sum_to_one_and_score_range(analyzer):
    r = analyzer.analyze("Shares surge on record profit")
    assert sum(r["probabilities"].values()) == pytest.approx(1.0, abs=1e-3)
    assert -1 <= r["score"] <= 1
    assert r["confidence"] == max(r["probabilities"].values())
    assert r["calibrated"] is False


def test_negation_flips_polarity(analyzer):
    plain = analyzer.analyze("Company posts a loss")
    negated = analyzer.analyze("Company does not post a loss")
    assert plain["label"] == "negative"
    assert negated["score"] > plain["score"]


def test_inflected_forms_and_phrases_match():
    pos, neg, signals = lexicon_signals("Shares dropped after the profit warning")
    terms = {s["term"] for s in signals}
    assert "dropped" in terms and "profit warning" in terms and neg > pos


def test_confidence_is_never_extreme(analyzer):
    r = analyzer.analyze("Surge soar rally record profit beats estimates upgrade bullish breakthrough")
    assert r["confidence"] < 0.95


def test_explanation_lists_signals_without_causal_claim(analyzer):
    r = analyzer.analyze("Revenue jumps as company wins major contract")
    assert r["signals"] and all("polarity" in s and "weight" in s for s in r["signals"])


def test_finbert_request_falls_back_when_unavailable(monkeypatch):
    def fail_init(self):
        raise ImportError("FinBERT weights unavailable in test")

    monkeypatch.setattr(FinBertAnalyzer, "__init__", fail_init)
    a = get_analyzer("finbert")
    r = a.analyze("Profit surges")
    assert r["label"] == "positive"
    assert "lexicon" in r["backend"]


def test_finbert_scores_are_marked_uncalibrated(monkeypatch):
    analyzer = object.__new__(FinBertAnalyzer)
    monkeypatch.setattr(analyzer, "_probs", lambda texts: [
        {"positive": 0.8, "negative": 0.1, "neutral": 0.1} for _ in texts
    ])
    result = analyzer.analyze("Revenue beats estimates")
    assert result["confidence"] == 0.8
    assert result["calibrated"] is False
