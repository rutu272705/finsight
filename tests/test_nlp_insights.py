from backend.nlp.insights import analyze_aspects, extract_events, extract_temporal_references
from backend.nlp.sentiment import LexiconAnalyzer


def test_aspect_sentiment_distinguishes_mixed_coverage():
    aspects = analyze_aspects(
        "Revenue beat expectations. Guidance was weak.",
        "",
        LexiconAnalyzer(),
    )
    by_name = {item["aspect"]: item for item in aspects}
    assert by_name["Revenue"]["label"] == "positive"
    assert by_name["Guidance & Outlook"]["label"] == "negative"
    assert by_name["Revenue"]["evidence"] == ["Revenue beat expectations."]


def test_temporal_references_resolve_against_publication_date():
    references = extract_temporal_references(
        "Results arrive tomorrow, with a review on March 4, 2027.",
        "2027-03-03T10:00:00+00:00",
    )
    assert [(item["text"], item["date"], item["kind"]) for item in references] == [
        ("tomorrow", "2027-03-04", "relative"),
        ("March 4, 2027", "2027-03-04", "explicit"),
    ]
    assert all(item["relation"] == "future" for item in references)


def test_temporal_extraction_ignores_invalid_dates_and_unanchored_relative_words():
    assert extract_temporal_references("Results on February 30, 2027 and tomorrow.", None) == []


def test_financial_events_include_evidence_and_single_linked_date():
    text = "On March 4, 2027, Acme raised its guidance after strong earnings."
    references = extract_temporal_references(text, "2027-03-01T10:00:00+00:00")
    events = extract_events(text, references)
    guidance = next(event for event in events if event["type"] == "Guidance update")
    assert guidance["trigger"] == "raised its guidance"
    assert guidance["event_date"] == "2027-03-04"
    assert "raised its guidance" in guidance["evidence"]
