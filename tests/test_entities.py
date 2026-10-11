from backend.nlp.entities import extract_entities, extract_figures, extract_topics


def test_money_and_percent_extraction():
    money, pct = extract_figures("Revenue rose 12% to $9.5 billion while profit was ₹17,394 crore.")
    assert {m["text"] for m in money} >= {"$9.5 billion", "₹17,394 crore"}
    assert pct[0]["text"] == "12%"


def test_figures_are_only_labelled_when_context_exists():
    money, _ = extract_figures("The company reported net profit of $2 billion for the quarter.")
    assert money[0]["context"] == "profit"
    bare, _ = extract_figures("Mumbai office opens at 9 with $5 coffee")
    assert bare[0]["context"] is None  # not mistaken for a stock price or metric


def test_topics_detected():
    topics = extract_topics("Board approves dividend and share buyback after strong quarterly earnings")
    assert {"Dividends & Buybacks", "Earnings"} <= set(topics)


def test_people_orgs_and_tickers():
    e = extract_entities(
        "Infosys (NSE: INFY) raises guidance",
        "CEO Salil Parekh said demand is strong. SEBI has not commented. Goldman Sachs upgraded the stock.",
        symbol="INFY.NS", company="Infosys Limited", backend="regex")
    assert "INFY" in e["tickers"]
    assert "Salil Parekh" in e["people"]
    assert "SEBI" in e["companies"] and "Goldman Sachs" in e["companies"]
    assert e["method"] == "rules"


def test_empty_text_is_safe():
    e = extract_entities("", "", backend="regex")
    assert e["companies"] == [] and e["money"] == [] and e["topics"] == []
