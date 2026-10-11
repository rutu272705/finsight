from backend.nlp.summarizer import extractive_summary, summarize


def test_headline_only_fallback():
    s = summarize("Infosys raises guidance", "")
    assert s["text"] == "Infosys raises guidance" and s["basis"] == "headline_only"


def test_summary_sentences_come_from_source_text():
    desc = ("Infosys raised its full-year revenue guidance to 4-5% after a strong quarter. "
            "The company will hold its annual meeting in June. "
            "Net profit climbed 8% to ₹6,300 crore on large deal wins.")
    s = extractive_summary("Infosys lifts outlook", desc)
    body = s["text"].split(". ", 1)[1] if ". " in s["text"] else ""
    for sentence in [x.strip() for x in body.split(". ") if x.strip()]:
        assert sentence.rstrip(".") in desc  # extractive: nothing invented
    assert len(s["text"]) <= 460


def test_prefers_sentences_with_figures():
    desc = "The firm said it was pleased with progress today. Net profit climbed 8% to ₹6,300 crore."
    s = extractive_summary("Firm reports results", desc)
    assert "6,300" in s["text"]


def test_transformers_backend_falls_back_cleanly():
    s = summarize("Title here", "A short snippet that is definitely long enough to be a sentence.", backend="transformers")
    assert s["method"] == "extractive"
