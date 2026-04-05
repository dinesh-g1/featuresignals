"""FeatureSignals Python SDK client.

Fetches flag values from the server, caches locally, and keeps them
up-to-date via polling or SSE streaming.  All flag reads are local —
zero network calls per evaluation after init.
"""

from __future__ import annotations

import json
import logging
import random
import threading
from dataclasses import dataclass, field
from typing import Any, Callable
from urllib.request import Request, urlopen
from urllib.parse import quote

from .context import EvalContext

logger = logging.getLogger("featuresignals")

_BACKOFF_BASE = 1.0
_BACKOFF_MULTIPLIER = 2.0
_BACKOFF_MAX = 30.0
_BACKOFF_JITTER_FACTOR = 0.25


class FeatureSignalsError(Exception):
    """Base exception for FeatureSignals SDK errors."""


class ConfigError(FeatureSignalsError):
    """Raised when the SDK is misconfigured."""


class APIError(FeatureSignalsError):
    """Raised when the FeatureSignals API returns a non-success response."""

    def __init__(self, status: int, message: str = "") -> None:
        self.status = status
        super().__init__(message or f"HTTP {status}")


def _backoff_delay(attempt: int) -> float:
    """Calculate exponential backoff delay with random jitter."""
    delay = min(_BACKOFF_BASE * (_BACKOFF_MULTIPLIER ** attempt), _BACKOFF_MAX)
    jitter = random.uniform(0, _BACKOFF_JITTER_FACTOR * delay)
    return delay + jitter


@dataclass
class ClientOptions:
    env_key: str
    base_url: str = "https://api.featuresignals.com"
    polling_interval: float = 30.0
    streaming: bool = False
    sse_retry: float = 5.0
    timeout: float = 10.0
    context: EvalContext = field(default_factory=lambda: EvalContext(key="server"))


class FeatureSignalsClient:
    def __init__(
        self,
        sdk_key: str,
        options: ClientOptions,
        *,
        on_ready: Callable[[], None] | None = None,
        on_error: Callable[[Exception], None] | None = None,
        on_update: Callable[[dict[str, Any]], None] | None = None,
    ) -> None:
        if not sdk_key:
            raise ConfigError("sdk_key is required")
        if not options.env_key:
            raise ConfigError("options.env_key is required")

        self._sdk_key = sdk_key
        self._options = options
        self._flags: dict[str, Any] = {}
        self._lock = threading.RLock()
        self._ready = threading.Event()
        self._stop_event = threading.Event()
        self._sse_response: Any = None
        self._sse_lock = threading.Lock()

        self._on_ready = on_ready
        self._on_error = on_error
        self._on_update = on_update

        try:
            self._refresh()
            self._mark_ready()
        except Exception as exc:
            self._emit_error(exc)

        if options.streaming:
            self._bg = threading.Thread(target=self._sse_loop, daemon=True)
        else:
            self._bg = threading.Thread(target=self._poll_loop, daemon=True)
        self._bg.start()

    # ── Flag access ─────────────────────────────────────────

    def bool_variation(self, key: str, ctx: EvalContext, fallback: bool) -> bool:
        val = self._get_flag(key)
        return val if isinstance(val, bool) else fallback

    def string_variation(self, key: str, ctx: EvalContext, fallback: str) -> str:
        val = self._get_flag(key)
        return val if isinstance(val, str) else fallback

    def number_variation(self, key: str, ctx: EvalContext, fallback: float) -> float:
        val = self._get_flag(key)
        return float(val) if isinstance(val, (int, float)) else fallback

    def json_variation(self, key: str, ctx: EvalContext, fallback: Any) -> Any:
        val = self._get_flag(key)
        return val if val is not None else fallback

    def all_flags(self) -> dict[str, Any]:
        with self._lock:
            return dict(self._flags)

    def is_ready(self) -> bool:
        return self._ready.is_set()

    def wait_for_ready(self, timeout: float = 10.0) -> bool:
        return self._ready.wait(timeout)

    def close(self) -> None:
        self._stop_event.set()
        with self._sse_lock:
            if self._sse_response is not None:
                try:
                    self._sse_response.close()
                except Exception:
                    pass

    # ── Internals ───────────────────────────────────────────

    def _get_flag(self, key: str) -> Any:
        with self._lock:
            return self._flags.get(key)

    def _set_flags(self, flags: dict[str, Any]) -> None:
        with self._lock:
            self._flags = flags
        if self._on_update:
            try:
                self._on_update(dict(flags))
            except Exception:
                pass

    def _mark_ready(self) -> None:
        if not self._ready.is_set():
            self._ready.set()
            if self._on_ready:
                try:
                    self._on_ready()
                except Exception:
                    pass

    def _emit_error(self, exc: Exception) -> None:
        logger.error("featuresignals: %s", exc)
        if self._on_error:
            try:
                self._on_error(exc)
            except Exception:
                pass

    def _refresh(self) -> None:
        env_key = quote(self._options.env_key, safe="")
        ctx_key = quote(self._options.context.key, safe="")
        url = f"{self._options.base_url}/v1/client/{env_key}/flags?key={ctx_key}"

        req = Request(url, headers={
            "X-API-Key": self._sdk_key,
            "Accept": "application/json",
        })
        with urlopen(req, timeout=self._options.timeout) as resp:
            if resp.status != 200:
                raise APIError(resp.status)
            data = json.loads(resp.read().decode())
        self._set_flags(data)

    def _poll_loop(self) -> None:
        attempt = 0
        while True:
            wait = self._options.polling_interval if attempt == 0 else _backoff_delay(attempt - 1)
            if self._stop_event.wait(wait):
                return
            try:
                self._refresh()
                self._mark_ready()
                attempt = 0
            except Exception as exc:
                self._emit_error(exc)
                attempt += 1

    def _sse_loop(self) -> None:
        attempt = 0
        while not self._stop_event.is_set():
            try:
                self._connect_sse()
                attempt = 0
            except Exception as exc:
                if self._stop_event.is_set():
                    return
                self._emit_error(exc)
            if self._stop_event.is_set():
                return
            delay = _backoff_delay(attempt)
            attempt += 1
            if self._stop_event.wait(delay):
                return

    def _connect_sse(self) -> None:
        env_key = quote(self._options.env_key, safe="")
        sdk_key = quote(self._sdk_key, safe="")
        url = f"{self._options.base_url}/v1/stream/{env_key}?api_key={sdk_key}"

        req = Request(url, headers={
            "Accept": "text/event-stream",
            "Cache-Control": "no-cache",
        })
        resp = urlopen(req, timeout=None)
        with self._sse_lock:
            self._sse_response = resp
        try:
            if resp.status != 200:
                raise APIError(resp.status, f"SSE HTTP {resp.status}")

            event_type = ""
            for raw_line in resp:
                if self._stop_event.is_set():
                    return
                line = raw_line.decode("utf-8").rstrip("\n\r")

                if line.startswith("event:"):
                    event_type = line[6:].strip()
                elif line.startswith("data:"):
                    if event_type == "flag-update":
                        try:
                            self._refresh()
                        except Exception as exc:
                            self._emit_error(exc)
                    event_type = ""
        finally:
            with self._sse_lock:
                self._sse_response = None
            try:
                resp.close()
            except Exception:
                pass
