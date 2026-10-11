"""Financial entity and topic extraction.

* People / organisations: spaCy (``en_core_web_sm``) when installed, otherwise conservative regex rules.
* Money amounts, percentages and tickers: regular expressions, because the surface patterns are regular.
* Each figure is only labelled with a financial metric (revenue, profit, ...) when a cue word appears
  right next to it. Otherwise it stays "unlabelled", so a stray number is never presented as a price.
"""
from __future__ import annotations

import logging
import re
import threading

log = logging.getLogger(__name__)

# ----------------------------------------------------------------------------- topics
TOPICS: dict[str, re.Pattern] = {k: re.compile(v, re.I) for k, v in {
    "Earnings": r"\b(earnings|quarterly results|q[1-4]\b|eps|results)\b",
    "Revenue": r"\b(revenue|revenues|sales|turnover|top[- ]line)\b",
    "Profit": r"\b(profit|profits|profitability|net income|ebitda|margin|margins)\b",
    "Losses": r"\b(loss|losses|net loss|write[- ]?down|impairment|deficit)\b",
    "Mergers & Acquisitions": r"\b(merger|merge[sd]?|acquisition|acquire[sd]?|takeover|buyout|stake sale|divest\w*)\b",
    "Dividends & Buybacks": r"\b(dividend|dividends|buyback|share repurchase|payout)\b",
    "Inflation": r"\b(inflation|cpi|wpi|price pressures?)\b",
    "Interest Rates": r"\b(interest rates?|rate (cut|hike|decision)|repo rate|fed funds|monetary policy|basis points?|bps)\b",
    "Regulation": r"\b(regulat\w+|sebi|sec\b|antitrust|compliance|probe|investigation|fine[sd]?|penalty|lawsuit|court)\b",
    "Analyst Ratings": r"\b(upgrade[sd]?|downgrade[sd]?|price target|analysts?|overweight|underweight|outperform|buy rating)\b",
    "Guidance & Outlook": r"\b(guidance|outlook|forecast|expects?|projection|target)\b",
    "Layoffs & Hiring": r"\b(layoffs?|job cuts|hiring|headcount|workforce|retrench\w*)\b",
    "IPO & Funding": r"\b(ipo|listing|fundrais\w*|funding round|raises? \$?\d|private placement|stock split)\b",
    "Supply Chain": r"\b(supply chain|shortage|logistics|disruption|tariffs?|export|import)\b",
    "Product & Innovation": r"\b(launch\w*|unveil\w*|new product|innovation|ai\b|artificial intelligence|patent|approval)\b",
    "Market Movement": r"\b(shares?|stock|stocks|rally|surge[sd]?|plunge[sd]?|slump\w*|sensex|nifty|nasdaq|dow|s&p)\b",
}.items()}

# ---------------------------------------------------------------------------- figures
_CURRENCY = r"(?:US\$|\$|₹|Rs\.?|INR|€|£|USD|EUR|GBP)"
_SCALE = r"(?:trillion|billion|million|thousand|crore|crores|lakh|lakhs|bn|mn|tn|cr|[mbk])\b"
MONEY_RE = re.compile(rf"(?<![\w])({_CURRENCY}\s?\d[\d,]*(?:\.\d+)?(?:\s?{_SCALE})?)|(\d[\d,]*(?:\.\d+)?\s?(?:{_SCALE})\s?(?:dollars|rupees|euros|pounds))", re.I)
PERCENT_RE = re.compile(r"(?<![\w.])([-+]?\d{1,3}(?:\.\d+)?\s?(?:%|per\s?cent|percent))", re.I)
TICKER_RES = [
    re.compile(r"\$([A-Z]{1,5})\b"),
    re.compile(r"\((?:NSE|BSE|NYSE|NASDAQ|LSE|NYSE Arca)\s*[:\-]\s*([A-Z0-9.&-]{1,12})\)"),
]
FIGURE_CUES: list[tuple[str, re.Pattern]] = [(k, re.compile(v, re.I)) for k, v in [
    ("revenue", r"revenues?|sales|turnover"),
    ("profit", r"profits?|net income|earnings|ebitda|margin"),
    ("loss", r"loss(?:es)?|deficit"),
    ("deal value", r"deal|acquisition|acquire|merger|stake|buyout|takeover|valued|bid"),
    ("dividend", r"dividend|payout"),
    ("guidance", r"guidance|forecast|outlook|expects?|target"),
    ("market cap", r"market cap(?:italization)?|valuation|worth"),
    ("share price", r"shares?|stock|trading at|closed at|opened at|price"),
    ("funding", r"raise[sd]?|funding|invest(?:ment|s|ed)?|ipo"),
    ("debt", r"debt|loan|borrow\w*|bond"),
    ("inflation / rates", r"inflation|cpi|interest|rate|yield|bps|basis points?"),
    ("price move", r"up|down|rose|rise|fell|fall|gain(?:ed)?|drop(?:ped)?|jump(?:ed)?|surge[sd]?|slump(?:ed)?|plunge[sd]?|slid|climb(?:ed)?"),
]]

# ------------------------------------------------------------------- orgs and people
ORG_WORDS = {"inc", "ltd", "limited", "corp", "corporation", "plc", "llc", "group", "holdings", "bank", "capital",
             "technologies", "motors", "industries", "services", "partners", "fund", "authority", "commission",
             "reserve", "exchange", "ventures", "energy", "pharma", "airlines", "airways", "systems", "labs",
             "consultancy", "financial", "insurance", "foods", "steel", "telecom", "electric", "oil", "gas", "mining"}
KNOWN_ORGS = {"SEBI", "RBI", "SEC", "FDA", "IMF", "NSE", "BSE", "OPEC", "FOMC", "ECB", "Fed", "Federal Reserve",
              "Reserve Bank of India", "Nasdaq", "NYSE", "Moody's", "S&P Global", "Fitch", "Goldman Sachs",
              "Morgan Stanley", "JPMorgan", "Citi", "Citigroup", "BlackRock", "Reuters", "Bloomberg"}
ROLE = r"(?:CEO|CFO|COO|CTO|Chairman|Chairperson|Chair|President|Governor|Secretary|Founder|Co-founder|Managing Director|MD|Chief [A-Z][a-z]+ Officer|analyst|Analyst)"
_NAME = r"[A-Z][a-z]+(?:\s[A-Z]\.)?(?:\s[A-Z][a-z']+){1,2}"
PERSON_RES = [
    re.compile(rf"\b{ROLE}\s({_NAME})"),
    re.compile(rf"\b({_NAME}),?\s(?:the\s|its\s|who is\s)?(?:{ROLE}|said|says|told|stated|added|noted)\b"),
    re.compile(rf"\b(?:Mr|Ms|Mrs|Dr)\.?\s({_NAME}|[A-Z][a-z]+)"),
]
CAP_SEQ_RE = re.compile(r"\b(?:[A-Z][A-Za-z&'.\-]+)(?:\s(?:of|and|&)?\s?[A-Z][A-Za-z&'.\-]+){0,4}\b")
STOP_CAPS = {"The", "A", "An", "In", "On", "At", "As", "It", "Its", "This", "That", "These", "Those", "But", "And", "For",
             "With", "After", "Before", "Amid", "Over", "How", "Why", "What", "When", "Who", "Here", "Monday", "Tuesday",
             "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "January", "February", "March", "April", "May",
             "June", "July", "August", "September", "October", "November", "December", "Q1", "Q2", "Q3", "Q4", "CEO",
             "CFO", "IPO", "AI", "US", "UK", "EPS", "GDP", "CPI", "EBITDA", "Rs", "USD", "INR", "Stock", "Shares", "Market"}

_spacy_lock = threading.Lock()
_spacy_nlp = None
_spacy_tried = False


def _get_spacy(backend: str):
    global _spacy_nlp, _spacy_tried
    if backend == "regex":
        return None
    with _spacy_lock:
        if not _spacy_tried:
            _spacy_tried = True
            try:
                import spacy

                _spacy_nlp = spacy.load("en_core_web_sm", disable=["lemmatizer"])
                log.info("spaCy en_core_web_sm loaded for entity extraction.")
            except Exception as exc:
                log.info("spaCy unavailable (%s); using regex entity rules.", type(exc).__name__)
        return _spacy_nlp


def _dedupe_keep_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out = []
    for i in items:
        k = i.lower()
        if k not in seen:
            seen.add(k)
            out.append(i)
    return out


def _figure_context(text: str, start: int, end: int) -> str | None:
    """Return a financial label only when a cue word sits within ~6 words around the figure."""
    before = " ".join(text[:start].split()[-6:])
    after = " ".join(text[end:].split()[:6])
    window_before, window_after = before, after
    for label, rx in FIGURE_CUES:
        if label == "price move":
            continue  # ambiguous; checked last
        if rx.search(window_before) or rx.search(window_after):
            return label
    if FIGURE_CUES[-1][1].search(window_before) or FIGURE_CUES[-1][1].search(window_after):
        return "price move"
    return None


def extract_figures(text: str) -> tuple[list[dict], list[dict]]:
    money, pct = [], []
    for m in MONEY_RE.finditer(text):
        money.append({"text": m.group(0).strip(), "context": _figure_context(text, m.start(), m.end())})
    for m in PERCENT_RE.finditer(text):
        pct.append({"text": m.group(1).strip(), "context": _figure_context(text, m.start(), m.end())})
    return money[:6], pct[:6]


def extract_topics(text: str) -> list[str]:
    return [name for name, rx in TOPICS.items() if rx.search(text)]


def _regex_orgs_people(text: str) -> tuple[list[str], list[str]]:
    people: list[str] = []
    for rx in PERSON_RES:
        people += [m.group(1).strip() for m in rx.finditer(text)]
    orgs: list[str] = [k for k in KNOWN_ORGS if re.search(rf"\b{re.escape(k)}\b", text)]
    for m in CAP_SEQ_RE.finditer(text):
        seq = m.group(0).strip(" .'-")
        words = seq.split()
        if not words or seq in STOP_CAPS or seq in people:
            continue
        low = {w.lower().strip(".,") for w in words}
        if (low & ORG_WORDS and len(words) >= 2) or (len(words) == 1 and seq.isupper() and 3 <= len(seq) <= 6 and seq not in STOP_CAPS):
            orgs.append(seq)
    return _dedupe_keep_order(orgs), _dedupe_keep_order(people)


def extract_entities(title: str, description: str = "", symbol: str = "", company: str = "", backend: str = "auto") -> dict:
    text = f"{title}. {description}".strip(". ")
    money, pct = extract_figures(text)
    tickers: list[str] = []
    for rx in TICKER_RES:
        tickers += [m.group(1) for m in rx.finditer(text)]
    base = symbol.split(".")[0]
    if base and len(base) >= 2 and re.search(rf"\b{re.escape(base)}\b", text):
        tickers.append(symbol)

    nlp = _get_spacy(backend)
    if nlp is not None:
        doc = nlp(text[:1500])
        orgs = _dedupe_keep_order([e.text.strip() for e in doc.ents if e.label_ == "ORG" and len(e.text.strip()) > 1])
        people = _dedupe_keep_order([e.text.strip() for e in doc.ents if e.label_ == "PERSON"])
        method = "spacy"
    else:
        orgs, people = _regex_orgs_people(text)
        method = "rules"
    if company and company.lower().split(",")[0] in text.lower() and company not in orgs:
        orgs.insert(0, company)
    return {
        "companies": orgs[:8], "people": people[:6], "tickers": _dedupe_keep_order(tickers)[:5],
        "money": money, "percentages": pct, "topics": extract_topics(text), "method": method,
    }
