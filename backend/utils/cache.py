"""A tiny thread-safe in-memory TTL cache."""
from __future__ import annotations

import threading
import time
from typing import Any, Callable


class TTLCache:
    def __init__(self, default_ttl: int = 300, max_items: int = 512):
        self.default_ttl = default_ttl
        self.max_items = max_items
        self._data: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Any | None:
        with self._lock:
            item = self._data.get(key)
            if not item:
                return None
            expires, value = item
            if expires < time.time():
                self._data.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        with self._lock:
            if len(self._data) >= self.max_items:
                oldest = min(self._data, key=lambda k: self._data[k][0])
                self._data.pop(oldest, None)
            self._data[key] = (time.time() + (ttl if ttl is not None else self.default_ttl), value)

    def get_or_set(self, key: str, factory: Callable[[], Any], ttl: int | None = None, bypass: bool = False) -> Any:
        if not bypass:
            hit = self.get(key)
            if hit is not None:
                return hit
        value = factory()
        self.set(key, value, ttl)
        return value

    def clear(self) -> None:
        with self._lock:
            self._data.clear()


cache = TTLCache()
