"""Classification metrics for the three trend classes."""
from __future__ import annotations

import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support

from .labels import CLASSES


def evaluate(y_true, y_pred) -> dict:
    y_true, y_pred = np.asarray(y_true), np.asarray(y_pred)
    p, r, f, s = precision_recall_fscore_support(y_true, y_pred, labels=CLASSES, zero_division=0)
    pm, rm, fm, _ = precision_recall_fscore_support(y_true, y_pred, labels=CLASSES, average="macro", zero_division=0)
    cm = confusion_matrix(y_true, y_pred, labels=CLASSES)
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "precision_macro": round(float(pm), 4), "recall_macro": round(float(rm), 4), "f1_macro": round(float(fm), 4),
        "per_class": {c: {"precision": round(float(p[i]), 4), "recall": round(float(r[i]), 4),
                          "f1": round(float(f[i]), 4), "support": int(s[i])} for i, c in enumerate(CLASSES)},
        "confusion_matrix": {"labels": CLASSES, "matrix": cm.tolist()},
        "n": int(len(y_true)),
    }
