"""Financial sentiment classification.

Two interchangeable backends share one output schema:

* ``lexicon`` (default): a transparent, dependency-free scorer built on a finance-specific lexicon with
  negation and intensity handling. Its class "probabilities" come from a softmax over lexicon evidence;
  they are heuristic scores, **not calibrated probabilities**.
* ``finbert``: ProsusAI/finbert through Hugging Face transformers (optional install). If it cannot be
  loaded, the app logs the reason and falls back to the lexicon backend, reporting that in ``backend``.
"""
from __future__ import annotations

import logging
import math
import re
import threading

from . import lexicon as L

log = logging.getLogger(__name__)
LABELS = ("positive", "negative", "neutral")
_TOKEN_RE = re.compile(r"[a-z0-9][a-z0-9'\-]*")
_NEUTRAL_LOGIT = 1.1
_SATURATION = 3.2


def _softmax(xs: list[float]) -> list[float]:
    m = max(xs)
    es = [math.exp(x - m) for x in xs]
    s = sum(es)
    return [e / s for e in es]


def lexicon_signals(text: str) -> tuple[float, float, list[dict]]:
    """Returns (positive_evidence, negative_evidence, matched_signals)."""
    lower = text.lower()
    signals: list[dict] = []
    pos = neg = 0.0

    # 1) multi-word phrases first, then blank them out so their words are not double counted
    for phrase, w in L.PHRASES.items():
        if phrase in lower:
            signals.append({"term": phrase, "polarity": "positive" if w > 0 else "negative", "weight": abs(w)})
            pos += max(w, 0)
            neg += max(-w, 0)
            lower = lower.replace(phrase, " ")

    # 2) single words with negation / intensity in a small preceding window
    tokens = _TOKEN_RE.findall(lower)
    for i, tok in enumerate(tokens):
        hit = L.POS_INDEX.get(tok)
        polarity = "positive"
        if hit is None:
            hit = L.NEG_INDEX.get(tok)
            polarity = "negative"
        if hit is None:
            continue
        stem, w = hit
        window = tokens[max(0, i - 3): i]
        if any(t in L.NEGATORS or t.endswith("n't") for t in window):
            polarity = "negative" if polarity == "positive" else "positive"
            w *= 0.8
            label = f"not {tok}"
        else:
            label = tok
        for t in window:
            w *= L.INTENSIFIERS.get(t, 1) * L.DAMPENERS.get(t, 1)
        signals.append({"term": label, "polarity": polarity, "weight": round(w, 2)})
        if polarity == "positive":
            pos += w
        else:
            neg += w
    return pos, neg, signals


class LexiconAnalyzer:
    name = "lexicon"
    calibrated = False

    def analyze(self, title: str, description: str = "") -> dict:
        # headline words count more than snippet words
        pos_t, neg_t, sig_t = lexicon_signals(title)
        pos_d, neg_d, sig_d = lexicon_signals(description[:400]) if description else (0.0, 0.0, [])
        pos, neg = pos_t * 1.5 + pos_d * 0.6, neg_t * 1.5 + neg_d * 0.6
        # saturate evidence so many matched words cannot push "confidence" to ~100%
        sat = lambda e: _SATURATION * (1 - math.exp(-e / _SATURATION))  # noqa: E731
        probs = _softmax([sat(pos), sat(neg), _NEUTRAL_LOGIT])
        return _result(dict(zip(LABELS, probs)), self.name, sig_t + sig_d, calibrated=False)

    def analyze_batch(self, items: list[tuple[str, str]]) -> list[dict]:
        return [self.analyze(t, d) for t, d in items]


class FinBertAnalyzer:
    name = "finbert"
    calibrated = True

    def __init__(self) -> None:
        from transformers import AutoModelForSequenceClassification, AutoTokenizer  # noqa: WPS433
        import torch

        self._torch = torch
        self.tokenizer = AutoTokenizer.from_pretrained("ProsusAI/finbert")
        self.model = AutoModelForSequenceClassification.from_pretrained("ProsusAI/finbert").eval()
        self.id2label = {int(k): v.lower() for k, v in self.model.config.id2label.items()}

    def _probs(self, texts: list[str]) -> list[dict]:
        out = []
        for i in range(0, len(texts), 16):
            batch = texts[i: i + 16]
            enc = self.tokenizer(batch, padding=True, truncation=True, max_length=256, return_tensors="pt")
            with self._torch.no_grad():
                p = self._torch.softmax(self.model(**enc).logits, dim=-1).tolist()
            out += [{self.id2label[j]: row[j] for j in range(len(row))} for row in p]
        return out

    def analyze_batch(self, items: list[tuple[str, str]]) -> list[dict]:
        texts = [f"{t}. {d[:300]}" if d else t for t, d in items]
        all_probs = self._probs(texts)
        results = []
        for (title, desc), text, probs in zip(items, texts, all_probs):
            # Explanation: FinBERT is a neural model, so show which finance terms were present and how much
            # removing each one moves the predicted class probability (occlusion). Associative, not causal.
            _, _, signals = lexicon_signals(f"{title}. {desc[:300]}")
            top = sorted(signals, key=lambda s: -s["weight"])[:4]
            label = max(probs, key=probs.get)
            if top:
                variants = [re.sub(re.escape(s["term"].replace("not ", "")), "", text, flags=re.I) for s in top]
                for s, p in zip(top, self._probs(variants)):
                    s["delta"] = round(probs[label] - p[label], 3)
            results.append(_result(probs, self.name, top, calibrated=True))
        return results

    def analyze(self, title: str, description: str = "") -> dict:
        return self.analyze_batch([(title, description)])[0]


def _result(probs: dict, backend: str, signals: list[dict], calibrated: bool) -> dict:
    probs = {k: round(float(probs.get(k, 0.0)), 4) for k in LABELS}
    label = max(LABELS, key=lambda k: (probs[k], k == "neutral"))
    top = sorted(signals, key=lambda s: -s["weight"])[:5]
    return {
        "label": label,
        "probabilities": probs,
        "confidence": probs[label],
        "score": round(probs["positive"] - probs["negative"], 4),  # in [-1, 1]
        "backend": backend,
        "calibrated": calibrated,
        "signals": top,
    }


_lock = threading.Lock()
_instances: dict[str, object] = {}


def get_analyzer(backend: str = "lexicon"):
    """Return a cached analyzer; FinBERT failures degrade gracefully to the lexicon backend."""
    with _lock:
        if backend in _instances:
            return _instances[backend]
        if backend == "finbert":
            try:
                inst = FinBertAnalyzer()
                log.info("Loaded FinBERT sentiment model.")
            except Exception as exc:  # ImportError, network, out-of-memory ...
                log.warning("FinBERT unavailable (%s: %s); using lexicon backend instead.", type(exc).__name__, exc)
                inst = LexiconAnalyzer()
                inst.name = "lexicon (FinBERT unavailable)"
        else:
            inst = LexiconAnalyzer()
        _instances[backend] = inst
        return inst
