"""FeatureSignals Python SDK client.

Fetches flag values from the server, caches locally, and keeps them
up-to-date via polling or SSE streaming.  All flag reads are local —
zero network calls per evaluation after init.
"""

from __future__ import annotations

import json
import logging
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Callable
from urllib.request import Request, urlopen
from urllib.parse import quote, urlencode
from urllib.error import URLError

from .context import EvalContext

logger = logging.getLogger("featuresignals")


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
            raise ValueError("sdk_key is required")
        if not options.env_key:
            raise ValueError("options.env_key is required")

        self._sdk_key = sdk_key
        self._options = options
        self._flags: dict[str, Any] = {}
        self._lock = threading.RLock()
        self._ready = threading.Event()
        self._closed = threading.Event()

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
        self._closed.set()

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
                raise RuntimeError(f"HTTP {resp.status}")
            data = json.loads(resp.read().decode())
        self._set_flags(data)

    def _poll_loop(self) -> None:
        while not self._closed.wait(self._options.polling_interval):
            try:
                self._refresh()
                self._mark_ready()
            except Exception as exc:
                self._emit_error(exc)

    def _sse_loop(self) -> None:
        while not self._closed.is_set():
            try:
                self._connect_sse()
            except Exception as exc:
                if self._closed.is_set():
                    return
                self._emit_error(exc)
            if self._closed.is_set():
                return
            self._closed.wait(self._options.sse_retry)

    def _connect_sse(self) -> None:
        env_key = quote(self._options.env_key, safe="")
        sdk_key = quote(self._sdk_key, safe="")
        url = f"{self._options.base_url}/v1/stream/{env_key}?api_key={sdk_key}"

        req = Request(url, headers={
            "Accept": "text/event-stream",
            "Cache-Control": "no-cache",
        })
        with urlopen(req, timeout=None) as resp:
            if resp.status != 200:
                raise RuntimeError(f"SSE HTTP {resp.status}")

            event_type = ""
            for raw_line in resp:
                if self._closed.is_set():
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
