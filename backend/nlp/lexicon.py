"""A compact financial sentiment lexicon (weights 1 = mild, 2 = clear, 3 = strong).

Hand-curated for news headlines in the spirit of finance-specific word lists (e.g. Loughran-McDonald),
because general-purpose lexicons mislabel words such as "liability", "tax" or "cut".
"""
from __future__ import annotations

POSITIVE: dict[str, float] = {
    # results & growth
    "beat": 2, "outperform": 2, "exceed": 2, "surpass": 2, "record": 2, "growth": 1.5, "grow": 1.5, "expand": 1.5,
    "profit": 1.5, "profitable": 2, "profitability": 1.5, "gain": 1.5, "rise": 1.5, "climb": 1.5, "increase": 1,
    "improve": 1.5, "improvement": 1.5, "recover": 1.5, "recovery": 1.5, "rebound": 2, "turnaround": 2,
    # price action
    "surge": 3, "soar": 3, "jump": 2, "rally": 2.5, "spike": 1.5, "skyrocket": 3, "advance": 1, "upside": 1.5,
    "high": 0.5, "peak": 1,
    # analyst & sentiment
    "upgrade": 2.5, "bullish": 2.5, "optimistic": 2, "optimism": 2, "confidence": 1, "buy": 1, "overweight": 1.5,
    "strong": 1.5, "stronger": 1.5, "robust": 2, "solid": 1.5, "resilient": 1.5, "positive": 1.5, "favorable": 1.5,
    "favourable": 1.5, "attractive": 1, "undervalued": 1.5,
    # corporate actions
    "dividend": 1, "buyback": 1.5, "repurchase": 1, "approval": 1.5, "approve": 1.5, "win": 2, "award": 1.5,
    "contract": 0.8, "partnership": 1, "launch": 1, "breakthrough": 2.5, "innovation": 1, "milestone": 1.5,
    "acquire": 0.8, "deal": 0.5, "raise": 1, "boost": 2, "lift": 1, "accelerate": 1.5, "demand": 0.7,
    "windfall": 2, "outlook": 0.3, "hire": 1, "stimulus": 1.5, "relief": 1.5, "benefit": 1,
}

NEGATIVE: dict[str, float] = {
    # results
    "miss": 2.5, "loss": 2, "deficit": 1.5, "shortfall": 2, "weak": 1.5, "weaker": 1.5, "weakness": 1.5,
    "decline": 2, "decrease": 1.5, "fall": 2, "drop": 2, "slump": 3, "slide": 2, "dip": 1, "tumble": 3,
    "plunge": 3, "plummet": 3, "crash": 3, "collapse": 3, "sink": 2, "slip": 1.5, "erode": 1.5,
    "slow": 1, "slowdown": 2, "contraction": 2, "shrink": 2, "stagnate": 1.5,
    # analyst & sentiment
    "downgrade": 2.5, "bearish": 2.5, "pessimistic": 2, "concern": 1.5, "worry": 1.5, "fear": 2, "risk": 1,
    "warn": 2, "warning": 2, "sell": 1, "selloff": 2.5, "underperform": 2, "underweight": 1.5, "negative": 1.5,
    "overvalued": 1.5, "volatile": 1, "volatility": 1, "uncertainty": 1.5, "pressure": 1.5, "headwind": 2,
    # trouble
    "lawsuit": 2, "sue": 2, "probe": 2, "investigation": 2, "investigate": 2, "fraud": 3, "scandal": 3,
    "penalty": 2, "fine": 1.5, "violation": 2, "recall": 2, "ban": 2, "sanction": 2, "halt": 1.5, "suspend": 2,
    "bankruptcy": 3.5, "insolvency": 3, "default": 3, "debt": 1, "layoff": 2.5, "layoffs": 2.5, "cut": 1.5,
    "downsize": 2, "restructuring": 1.5, "shutdown": 2, "disruption": 2, "shortage": 2, "delay": 1.5,
    "inflation": 1, "recession": 3, "crisis": 3, "tariff": 1.5, "strike": 1.5, "hack": 2.5, "breach": 2.5,
    "writedown": 2, "impairment": 2, "dilution": 1.5, "tension": 1.5, "attack": 2, "dispute": 1.5,
}

# Multi-word phrases are matched on the raw lowercase text before tokenising.
PHRASES: dict[str, float] = {
    "beats estimates": 3, "beat estimates": 3, "tops estimates": 3, "above estimates": 2, "beats expectations": 3,
    "misses estimates": -3, "missed estimates": -3, "below estimates": -2, "misses expectations": -3,
    "falls short": -2.5, "fell short": -2.5, "profit warning": -3.5, "record high": 3, "all-time high": 3,
    "record profit": 3, "record revenue": 3, "52-week high": 2, "52-week low": -2, "rate cut": 1.5, "rate hike": -1.5,
    "raises guidance": 2.5, "raised guidance": 2.5, "raises forecast": 2.5, "cuts guidance": -2.5,
    "cut guidance": -2.5, "lowers forecast": -2.5, "cuts forecast": -2.5, "price target raised": 2.5,
    "raises price target": 2.5, "price target cut": -2.5, "cuts price target": -2.5, "job cuts": -2.5,
    "stock split": 1, "share buyback": 2, "going concern": -3, "credit downgrade": -3, "credit upgrade": 3,
    "regulatory approval": 2.5, "fda approval": 3, "short seller": -2, "short squeeze": 1, "profit booking": -1,
}

NEGATORS = {"not", "no", "never", "without", "neither", "nor", "fails", "failed", "fail", "unable", "denies", "denied", "lack", "lacks"}
INTENSIFIERS = {"sharply": 1.4, "significantly": 1.4, "significant": 1.3, "massive": 1.4, "huge": 1.4, "steep": 1.4,
                "major": 1.3, "dramatically": 1.4, "heavily": 1.3, "strongly": 1.3, "record": 1.0, "biggest": 1.3}
DAMPENERS = {"slightly": 0.6, "marginally": 0.6, "modestly": 0.7, "mildly": 0.6, "minor": 0.6, "somewhat": 0.7}


def _variants(stem: str) -> set[str]:
    v = {stem, stem + "s", stem + "es", stem + "ed", stem + "d", stem + "ing", stem + "er", stem + "ers"}
    if stem.endswith("e"):
        v |= {stem[:-1] + "ing", stem[:-1] + "ed"}
    if stem.endswith("y"):
        v |= {stem[:-1] + "ies", stem[:-1] + "ied"}
    if len(stem) >= 3 and stem[-1] not in "aeiouwy" and stem[-2] in "aeiou" and stem[-3] not in "aeiou":
        v |= {stem + stem[-1] + "ed", stem + stem[-1] + "ing"}  # drop -> dropped / dropping
    irregular = {"fall": {"fell", "fallen"}, "rise": {"rose", "risen"}, "win": {"won"}, "sink": {"sank", "sunk"},
                 "slide": {"slid"}, "lose": {"lost"}, "beat": {"beaten"}, "cut": {"cutting"}, "loss": {"losses"},
                 "sell": {"sold"}, "grow": {"grew", "grown"}, "buy": {"bought"}, "sue": {"sued"}, "hack": {"hacked"}}
    return v | irregular.get(stem, set())


def build_index(table: dict[str, float]) -> dict[str, tuple[str, float]]:
    index: dict[str, tuple[str, float]] = {}
    for stem, weight in table.items():
        for form in _variants(stem):
            index.setdefault(form, (stem, weight))
    return index


POS_INDEX = build_index(POSITIVE)
NEG_INDEX = build_index(NEGATIVE)
