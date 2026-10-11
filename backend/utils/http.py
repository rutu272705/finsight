"""HTTP helper with timeouts, retries with exponential backoff, and rate-limit detection."""
from __future__ import annotations

import logging
import time

import requests

from .errors import RateLimitError, UpstreamError

log = logging.getLogger(__name__)
USER_AGENT = "Mozilla/5.0 (compatible; FinSight/1.0; educational project)"


def http_get(url: str, *, params: dict | None = None, headers: dict | None = None,
             timeout: int = 10, retries: int = 2, backoff: float = 0.8) -> requests.Response:
    hdrs = {"User-Agent": USER_AGENT, **(headers or {})}
    last_exc: Exception | None = None
    for attempt in range(retries + 1):
        try:
            resp = requests.get(url, params=params, headers=hdrs, timeout=timeout)
            if resp.status_code == 429:
                raise RateLimitError("The data provider is rate limiting requests. Try again later.")
            if resp.status_code >= 500:
                raise UpstreamError(f"Provider returned HTTP {resp.status_code}.")
            return resp
        except RateLimitError:
            raise  # retrying immediately only makes it worse
        except (requests.Timeout, requests.ConnectionError, UpstreamError) as exc:
            last_exc = exc
            log.warning("GET %s failed (attempt %d/%d): %s", url, attempt + 1, retries + 1, exc)
            if attempt < retries:
                time.sleep(backoff * (2 ** attempt))
    raise UpstreamError(f"Could not reach the data provider ({type(last_exc).__name__}).") from last_exc
