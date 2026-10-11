"""Article summarisation.

Default: extractive. The headline states the main event; at most two additional sentences from the article
snippet are chosen by word-frequency, presence of figures/topics, and position. Sentences are copied
verbatim, so the summary cannot introduce facts that are not in the source.
Optional: abstractive distilbart through transformers (SUMMARIZER_BACKEND=transformers), with automatic
fallback to extractive when the model is not available.
"""
from __future__ import annotations

import logging
import re
import threading
from collections import Counter
from difflib import SequenceMatcher

from .entities import MONEY_RE, PERCENT_RE, TOPICS

log = logging.getLogger(__name__)
_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'“‘(])")
_WORD_RE = re.compile(r"[a-zA-Z][a-zA-Z'\-]+")
_STOP = set("""a an the and or but if then else of to in on at by for with from as is are was were be been being it its this that
these those he she they we you i his her their our your has have had do does did will would can could should may might
not no than so such also about into over after before up down out more most said says say new""".split())
_MAX_CHARS = 420


def split_sentences(text: str) -> list[str]:
    return [s.strip() for s in _SENT_SPLIT.split(text.strip()) if len(s.strip()) > 20]


def _similar(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def extractive_summary(title: str, description: str = "") -> dict:
    title = title.strip()
    sentences = [s for s in split_sentences(description or "") if _similar(s, title) < 0.75 and not s.lower().startswith(title.lower()[:40])]
    if not sentences:
        return {"text": title, "method": "extractive", "basis": "headline_only"}

    freq = Counter(w.lower() for w in _WORD_RE.findall(f"{title} {description}") if w.lower() not in _STOP)
    scored = []
    for pos, s in enumerate(sentences):
        words = [w.lower() for w in _WORD_RE.findall(s) if w.lower() not in _STOP]
        if not words:
            continue
        score = sum(freq[w] for w in words) / (len(words) ** 0.5)
        score += 1.5 if (MONEY_RE.search(s) or PERCENT_RE.search(s)) else 0
        score += 0.6 * sum(1 for rx in TOPICS.values() if rx.search(s))
        score += 1.0 if len(set(words) & set(w.lower() for w in _WORD_RE.findall(title))) >= 2 else 0
        score *= 1.0 / (1 + 0.15 * pos)
        scored.append((score, pos, s))
    chosen = sorted(sorted(scored, reverse=True)[:2], key=lambda x: x[1])
    text = title.rstrip(".") + "."
    for _, _, s in chosen:
        if len(text) + len(s) + 1 > _MAX_CHARS:
            break
        text += " " + s
    return {"text": text, "method": "extractive", "basis": "headline_and_snippet"}


_lock = threading.Lock()
_pipe = None
_pipe_failed = False


def _abstractive(text: str) -> str | None:
    global _pipe, _pipe_failed
    with _lock:
        if _pipe is None and not _pipe_failed:
            try:
                from transformers import pipeline

                _pipe = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")
            except Exception as exc:
                _pipe_failed = True
                log.warning("Abstractive summariser unavailable (%s); using extractive.", type(exc).__name__)
    if _pipe is None:
        return None
    try:
        return _pipe(text, max_length=70, min_length=20, do_sample=False, truncation=True)[0]["summary_text"].strip()
    except Exception as exc:  # pragma: no cover
        log.warning("Abstractive summarisation failed: %s", exc)
        return None


def summarize(title: str, description: str = "", backend: str = "extractive") -> dict:
    if backend == "transformers" and len((description or "").split()) >= 60:
        out = _abstractive(f"{title}. {description}")
        if out:
            return {"text": out, "method": "abstractive", "basis": "headline_and_snippet"}
    return extractive_summary(title, description)
