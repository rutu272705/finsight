"""Target definition: the stock's return over the next N trading sessions, bucketed by a threshold."""
from __future__ import annotations

import numpy as np
import pandas as pd

CLASSES = ["Downward", "Stable", "Upward"]


def forward_return(close: pd.Series, horizon: int) -> pd.Series:
    """close[t+horizon] / close[t] - 1. The last `horizon` rows are NaN (the future is unknown)."""
    return close.shift(-horizon) / close - 1


def make_labels(close: pd.Series, horizon: int, threshold: float) -> pd.Series:
    """Upward if forward return > +threshold, Downward if < -threshold, else Stable. NaN where unknown."""
    if horizon < 1:
        raise ValueError("horizon must be >= 1")
    if threshold < 0:
        raise ValueError("threshold must be >= 0")
    # Round away float noise (101/100 - 1 == 0.010000000000000009) so exact-threshold moves are classed Stable.
    fr = forward_return(close, horizon).round(10)
    labels = pd.Series(np.where(fr > threshold, "Upward", np.where(fr < -threshold, "Downward", "Stable")),
                       index=close.index, dtype="object")
    labels[fr.isna()] = np.nan
    return labels
