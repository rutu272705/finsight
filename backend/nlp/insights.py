"""Rule-guided financial aspects, events, and temporal references for news articles."""
from __future__ import annotations

import calendar
import re
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from .entities import TOPICS

_SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")
_ISO_DATE_RE = re.compile(r"\b(20\d{2})-(\d{1,2})-(\d{1,2})\b")
_MONTHS = "|".join(calendar.month_name[1:])
_MONTH_FIRST_RE = re.compile(
    rf"\b({_MONTHS})\s+(\d{{1,2}})(?:st|nd|rd|th)?(?:,?\s+(20\d{{2}}))?\b", re.I
)
_DAY_FIRST_RE = re.compile(
    rf"\b(\d{{1,2}})(?:st|nd|rd|th)?\s+({_MONTHS})(?:,?\s+(20\d{{2}}))?\b", re.I
)
_RELATIVE_RE = re.compile(
    r"\b(today|yesterday|tomorrow|(?:last|this|next)\s+"
    r"(?:week|month|quarter|year))\b",
    re.I,
)
_WEEKDAY_RE = re.compile(
    r"\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b", re.I
)

_EVENT_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = tuple(
    (name, re.compile(pattern, re.I))
    for name, pattern in (
        ("Earnings announcement", r"\b(?:reports?|announces?|posts?)\s+(?:quarterly\s+)?(?:earnings|results|revenue|profit|loss)\b|\bearnings (?:beat|miss|surprise)\b"),
        ("Merger or acquisition", r"\b(?:merger|acquisition|acquire[sd]?|buys?|takeover|buyout|divest\w*)\b"),
        ("Legal or regulatory action", r"\b(?:lawsuit|sued|court ruling|regulat\w+|probe|investigation|fine[sd]?|penalty|settlement)\b"),
        ("Guidance update", r"\b(?:guidance|outlook)\b.{0,45}\b(?:raise[sd]?|lower(?:ed)?|cut|increase[sd]?|reduce[sd]?|upgrad\w*|downgrad\w*)\b|\b(?:raise[sd]?|lower(?:ed)?|cut|increase[sd]?|reduce[sd]?|upgrad\w*|downgrad\w*)\b.{0,45}\b(?:guidance|outlook)\b"),
        ("Workforce change", r"\b(?:layoffs?|job cuts|cutting jobs|hiring freeze|workforce reduction|retrench\w*)\b"),
        ("Product launch or approval", r"\b(?:launch\w*|unveil\w*|product release|receives? approval|wins? approval|regulatory approval)\b"),
        ("Dividend or buyback", r"\b(?:dividend|share repurchase|buyback)\b"),
        ("Analyst rating change", r"\b(?:upgrade[sd]?|downgrade[sd]?|price target|rating raised|rating cut)\b"),
    )
)


def _parse_absolute_date(year: str | None, month: str, day: str, anchor: date | None) -> date | None:
    month_number = next((i for i in range(1, 13) if calendar.month_name[i].lower() == month.lower()), None)
    if month_number is None:
        return None
    resolved_year = int(year) if year else (anchor.year if anchor else None)
    if resolved_year is None:
        return None
    try:
        parsed = date(resolved_year, month_number, int(day))
    except ValueError:
        return None
    if not year and anchor and parsed < anchor - timedelta(days=180):
        try:
            parsed = date(resolved_year + 1, month_number, int(day))
        except ValueError:
            return None
    return parsed


def _shift_months(value: date, months: int) -> date:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def extract_temporal_references(text: str, published_at: str | datetime | None) -> list[dict]:
    """Extract explicit and relative dates, resolving relative language to a publication-date anchor."""
    if isinstance(published_at, datetime):
        anchor_dt = published_at
    elif published_at:
        try:
            anchor_dt = datetime.fromisoformat(str(published_at).replace("Z", "+00:00"))
        except ValueError:
            anchor_dt = None
    else:
        anchor_dt = None
    if anchor_dt and anchor_dt.tzinfo is None:
        anchor_dt = anchor_dt.replace(tzinfo=timezone.utc)
    anchor = anchor_dt.date() if anchor_dt else None

    found: list[tuple[int, int, dict]] = []
    for match in _ISO_DATE_RE.finditer(text):
        try:
            resolved = date(*(int(part) for part in match.groups()))
        except ValueError:
            continue
        found.append((match.start(), match.end(), {"text": match.group(0), "date": resolved.isoformat(), "kind": "explicit"}))

    for rx, month_group, day_group, year_group in (
        (_MONTH_FIRST_RE, 1, 2, 3),
        (_DAY_FIRST_RE, 2, 1, 3),
    ):
        for match in rx.finditer(text):
            resolved = _parse_absolute_date(match.group(year_group), match.group(month_group), match.group(day_group), anchor)
            if resolved:
                found.append((match.start(), match.end(), {"text": match.group(0), "date": resolved.isoformat(), "kind": "explicit"}))

    if anchor:
        for match in _RELATIVE_RE.finditer(text):
            phrase = match.group(0).lower()
            if phrase == "today":
                resolved = anchor
            elif phrase == "yesterday":
                resolved = anchor - timedelta(days=1)
            elif phrase == "tomorrow":
                resolved = anchor + timedelta(days=1)
            elif phrase.endswith("week"):
                offset = -7 if phrase.startswith("last") else 7 if phrase.startswith("next") else 0
                resolved = anchor + timedelta(days=offset)
            elif phrase.endswith("month"):
                offset = -1 if phrase.startswith("last") else 1 if phrase.startswith("next") else 0
                resolved = _shift_months(anchor, offset)
            elif phrase.endswith("quarter"):
                offset = -3 if phrase.startswith("last") else 3 if phrase.startswith("next") else 0
                resolved = _shift_months(anchor, offset)
            else:
                offset = -12 if phrase.startswith("last") else 12 if phrase.startswith("next") else 0
                resolved = _shift_months(anchor, offset)
            found.append((match.start(), match.end(), {
                "text": match.group(0), "date": resolved.isoformat(), "kind": "relative",
            }))

        for match in _WEEKDAY_RE.finditer(text):
            target = next(i for i in range(7) if calendar.day_name[i].lower() == match.group(1).lower())
            delta = (target - anchor.weekday()) % 7
            if delta == 0:
                delta = 7
            resolved = anchor + timedelta(days=delta)
            found.append((match.start(), match.end(), {
                "text": match.group(0), "date": resolved.isoformat(), "kind": "weekday_reference",
            }))

    found.sort(key=lambda item: item[0])
    results: list[dict] = []
    occupied_until = -1
    seen: set[tuple[str, str]] = set()
    for start, end, reference in found:
        if start < occupied_until:
            continue
        key = (reference["text"].lower(), reference["date"])
        if key in seen:
            continue
        seen.add(key)
        occupied_until = end
        if anchor:
            resolved = date.fromisoformat(reference["date"])
            reference["relation"] = "past" if resolved < anchor else "future" if resolved > anchor else "present"
        results.append(reference)
    return results


def analyze_aspects(title: str, description: str, analyzer) -> list[dict]:
    """Score topic-bearing sentences independently to preserve mixed article sentiment."""
    grouped: dict[str, list[str]] = defaultdict(list)
    text = ". ".join(part.strip() for part in (title, description) if part and part.strip())
    for sentence in _SENTENCE_RE.split(text):
        sentence = sentence.strip()
        if not sentence:
            continue
        for aspect, pattern in TOPICS.items():
            if pattern.search(sentence) and sentence not in grouped[aspect] and len(grouped[aspect]) < 3:
                grouped[aspect].append(sentence[:500])
    pairs = [(aspect, sentence) for aspect, sentences in grouped.items() for sentence in sentences]
    if not pairs:
        return []
    analyses = analyzer.analyze_batch([(sentence, "") for _, sentence in pairs])
    scores: dict[str, list[dict]] = defaultdict(list)
    for (aspect, sentence), result in zip(pairs, analyses):
        scores[aspect].append({"sentence": sentence, "result": result})

    output = []
    for aspect, items in scores.items():
        probabilities = {
            label: sum(item["result"]["probabilities"][label] for item in items) / len(items)
            for label in ("positive", "negative", "neutral")
        }
        label = max(probabilities, key=lambda value: (probabilities[value], value == "neutral"))
        output.append({
            "aspect": aspect,
            "label": label,
            "score": round(sum(item["result"]["score"] for item in items) / len(items), 4),
            "confidence": round(probabilities[label], 4),
            "backend": items[0]["result"]["backend"],
            "evidence": [item["sentence"] for item in items[:2]],
        })
    return output


def extract_events(text: str, temporal_references: list[dict]) -> list[dict]:
    """Identify rule-matched financial events and retain the text that triggered each match."""
    events = []
    for event_type, pattern in _EVENT_PATTERNS:
        match = pattern.search(text)
        if not match:
            continue
        events.append({
            "type": event_type,
            "trigger": match.group(0),
            "evidence": text[max(0, match.start() - 70):min(len(text), match.end() + 70)].strip(),
            "event_date": temporal_references[0]["date"] if len(temporal_references) == 1 else None,
            "date_basis": temporal_references[0]["kind"] if len(temporal_references) == 1 else None,
        })
    return events
