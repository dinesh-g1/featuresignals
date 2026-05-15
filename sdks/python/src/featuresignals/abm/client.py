"""ABM Client — the main entry point for resolving agent behaviors and tracking events.

Implements the cross-language contract defined in ABM_SDK_SPECIFICATION.md.
Mirrors the Go reference implementation at sdks/go/abm/client.go.

See: product/wiki/public/ABM_SDK_SPECIFICATION.md
PRS Requirement IDs: FS-S1-ABM-001 through FS-S1-ABM-008

Wire format: JSON field names use snake_case (behavior_key, agent_id, etc.)
because the FeatureSignals API uses snake_case. Language-idiomatic names
(camelCase in TS/Go, snake_case in Python dataclasses) are used in the
public API types for each language. See ABM_SDK_SPECIFICATION.md §2.
"""

from __future__ import annotations

import json as json_mod
import logging
import threading
import time
from collections import OrderedDict
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from featuresignals.abm.types import (
    ABMConfig,
    ResolveRequest,
    ResolveResponse,
    TrackEvent,
)

logger = logging.getLogger("featuresignals.abm")

# Per ABM_SDK_SPECIFICATION.md §4.
_BUFFER_MAX_SIZE = 256
_FLUSH_INTERVAL_SEC = 5.0
_RETRY_BACKOFF_SEC = [0.1, 1.0, 10.0]  # 100ms → 1s → 10s → drop


class _CacheEntry:
    """A single cache entry with expiration."""

    __slots__ = ("response", "expires_at")

    def __init__(self, response: ResolveResponse, expires_at: float) -> None:
        self.response = response
        self.expires_at = expires_at


class ABMClient:
    """Client for the FeatureSignals Agent Behavior Mesh (ABM).

    Resolves which behavior variant an agent should use and tracks agent
    actions for analytics. Resolved behaviors are cached locally for fast access.

    Basic usage::

        import os
        from featuresignals.abm import ABMClient, ResolveRequest, TrackEvent

        client = ABMClient(
            environment_key=os.environ["FS_ENVIRONMENT_KEY"],
        )

        resp = client.resolve(ResolveRequest(
            behavior_key="search-ranking",
            agent_id="recommender-v2",
            agent_type="recommender",
        ))

        client.track(TrackEvent(
            behavior_key="search-ranking",
            agent_id="recommender-v2",
            variant=resp.variant,
            action="search.ranked",
        ))
    """

    def __init__(self, config: ABMConfig) -> None:
        """Create a new ABM client.

        Args:
            config: ABMConfig with at minimum environment_key set.

        Raises:
            ValueError: If environment_key is empty.
        """
        if not config.environment_key:
            raise ValueError("environment_key is required")

        self._config = config
        self._base_url = config.base_url.rstrip("/")
        self._cache_ttl = config.cache_ttl_seconds
        self._max_cache_entries = config.max_cache_entries

        # LRU-ordered cache: OrderedDict with most-recently-used at end.
        # key = "{behavior_key}:{agent_id}"
        self._cache: OrderedDict[str, _CacheEntry] = OrderedDict()
        self._cache_lock = threading.RLock()

        self._timeout = config.timeout_seconds

        # Event buffering (per ABM_SDK_SPECIFICATION.md §4).
        self._event_buffer: list[TrackEvent] = []
        self._buffer_lock = threading.Lock()
        self._flushing = False
        self._flush_timer: threading.Timer | None = None
        self._closed = False
        self._start_flush_timer()

    # ── Resolve ───────────────────────────────────────────────────────────

    def resolve(self, req: ResolveRequest) -> ResolveResponse:
        """Resolve which variant an agent should use for a behavior.

        Results are cached locally based on cache_ttl_seconds. Use
        resolve_fresh to bypass the cache.

        Args:
            req: ResolveRequest with at minimum behavior_key, agent_id,
                and agent_type.

        Returns:
            ResolveResponse with the selected variant and configuration.

        Raises:
            ABMError: On network errors, non-200 responses, or JSON decode
                failures. The caller should always have a fallback path.
        """
        cache_key = f"{req.behavior_key}:{req.agent_id}"

        # Check cache first.
        if self._cache_ttl > 0:
            with self._cache_lock:
                entry = self._cache.get(cache_key)
                if entry is not None and time.time() < entry.expires_at:
                    # Move to end (most recently used).
                    self._cache.move_to_end(cache_key)
                    return entry.response

        return self._resolve_remote(req)

    def resolve_fresh(self, req: ResolveRequest) -> ResolveResponse:
        """Resolve a behavior bypassing the local cache.

        Always fetches from the server. Use this when you need the latest
        configuration regardless of cache state.

        Args:
            req: ResolveRequest with at minimum behavior_key, agent_id,
                and agent_type.

        Returns:
            ResolveResponse with the selected variant and configuration.
        """
        return self._resolve_remote(req)

    def _resolve_remote(self, req: ResolveRequest) -> ResolveResponse:
        """Fetch resolution from the server and update cache."""
        url = f"{self._base_url}/v1/abm/resolve"
        body = json_mod.dumps(self._req_to_dict(req)).encode("utf-8")
        http_req = Request(url, data=body, method="POST")
        http_req.add_header("Content-Type", "application/json")
        http_req.add_header("Authorization", f"Bearer {self._config.environment_key}")
        http_req.add_header("User-Agent", "FeatureSignals-ABM-Python/0.1.0")

        try:
            resp = urlopen(http_req, timeout=self._timeout)
            raw_body = resp.read()
        except HTTPError as exc:
            body_text = exc.read().decode("utf-8", errors="replace")
            raise ABMError(
                f"resolve {req.behavior_key!r}: status {exc.code}: {body_text}"
            ) from exc
        except URLError as exc:
            raise ABMError(
                f"resolve {req.behavior_key!r}: network error: {exc.reason}"
            ) from exc

        if resp.status != 200:
            body_text = raw_body.decode("utf-8", errors="replace")
            raise ABMError(
                f"resolve {req.behavior_key!r}: status {resp.status}: {body_text}"
            )

        try:
            data = json_mod.loads(raw_body)
        except json_mod.JSONDecodeError as exc:
            raise ABMError(
                f"resolve {req.behavior_key!r}: invalid JSON response: {exc}"
            ) from exc

        result = ResolveResponse(
            behavior_key=data.get("behavior_key", req.behavior_key),
            variant=data.get("variant", ""),
            config=data.get("config"),
            reason=data.get("reason", "default"),
            resolved_at=data.get("resolved_at", time.time()),
            is_sticky=data.get("is_sticky", False),
            ttl_seconds=data.get("ttl_seconds", self._cache_ttl),
        )

        # Update cache.
        if self._cache_ttl > 0:
            ttl = self._cache_ttl
            if result.ttl_seconds > 0:
                ttl = result.ttl_seconds

            cache_key = f"{req.behavior_key}:{req.agent_id}"
            with self._cache_lock:
                # LRU eviction if at capacity.
                while len(self._cache) >= self._max_cache_entries:
                    self._cache.popitem(last=False)

                self._cache[cache_key] = _CacheEntry(
                    response=result,
                    expires_at=time.time() + ttl,
                )
                # Mark as most recently used.
                self._cache.move_to_end(cache_key)

        return result

    # ── Track ─────────────────────────────────────────────────────────────

    def track(self, event: TrackEvent) -> None:
        """Record an agent behavior event for analytics and billing.

        Events are queued in a local buffer and flushed periodically (every 5s)
        or when the buffer reaches 256 events — whichever comes first.
        Per ABM_SDK_SPECIFICATION.md §4. Tracking is fire-and-forget.

        Args:
            event: TrackEvent describing what happened.
        """
        if event.recorded_at is None:
            event.recorded_at = time.time()
        self._enqueue(event)

    def track_batch(self, events: list[TrackEvent]) -> None:
        """Record multiple events.

        Events are queued in the same buffer as track() and flushed together.
        Per ABM_SDK_SPECIFICATION.md §4.

        Args:
            events: List of TrackEvent objects.
        """
        if not events:
            return
        now = time.time()
        for evt in events:
            if evt.recorded_at is None:
                evt.recorded_at = now
            self._enqueue(evt)

    # ── Event Buffering (spec §4) ─────────────────────────────────────────

    def _enqueue(self, event: TrackEvent) -> None:
        """Add a single event to the buffer; flush immediately if full."""
        with self._buffer_lock:
            self._event_buffer.append(event)
            if len(self._event_buffer) >= _BUFFER_MAX_SIZE:
                self._flush_buffer()

    def _start_flush_timer(self) -> None:
        """Schedule the next periodic flush."""
        if self._closed:
            return
        self._flush_timer = threading.Timer(_FLUSH_INTERVAL_SEC, self._on_flush_timer)
        self._flush_timer.daemon = True
        self._flush_timer.start()

    def _on_flush_timer(self) -> None:
        """Called by the flush timer; flushes and reschedules."""
        self._flush_buffer()
        self._start_flush_timer()

    def _flush_buffer(self) -> None:
        """Drain the buffer and send events to the server via batch endpoint."""
        with self._buffer_lock:
            if not self._event_buffer or self._flushing:
                return
            batch = list(self._event_buffer)
            self._event_buffer.clear()
            self._flushing = True

        self._send_batch_with_retry(batch, 0)

    def _send_batch_with_retry(self, events: list[TrackEvent], attempt: int) -> None:
        """Send a batch of events with exponential backoff retry."""
        url = f"{self._base_url}/v1/abm/track/batch"
        body = json_mod.dumps([self._event_to_dict(e) for e in events]).encode("utf-8")
        http_req = Request(url, data=body, method="POST")
        http_req.add_header("Content-Type", "application/json")
        http_req.add_header("Authorization", f"Bearer {self._config.environment_key}")

        try:
            resp = urlopen(http_req, timeout=self._timeout)
            if resp.status != 202:
                body_text = resp.read().decode("utf-8", errors="replace")
                logger.warning("flush buffer: status %d: %s", resp.status, body_text)
                self._retry_or_drop(events, attempt)
                return
            # Success.
            with self._buffer_lock:
                self._flushing = False
        except HTTPError as exc:
            body_text = exc.read().decode("utf-8", errors="replace")
            logger.warning("flush buffer: status %d: %s", exc.code, body_text)
            self._retry_or_drop(events, attempt)
        except URLError as exc:
            logger.warning("flush buffer: network error: %s", exc.reason)
            self._retry_or_drop(events, attempt)

    def _retry_or_drop(self, events: list[TrackEvent], attempt: int) -> None:
        """Retry with exponential backoff or drop events after max retries."""
        if attempt >= len(_RETRY_BACKOFF_SEC):
            logger.warning(
                "dropping %d events after %d failed attempts",
                len(events),
                attempt,
            )
            with self._buffer_lock:
                self._flushing = False
            return
        delay = _RETRY_BACKOFF_SEC[attempt]
        timer = threading.Timer(
            delay, self._send_batch_with_retry, args=[events, attempt + 1]
        )
        timer.daemon = True
        timer.start()

    # ── Cache Management ──────────────────────────────────────────────────

    def invalidate_cache(self, behavior_key: str, agent_id: str) -> None:
        """Clear the local resolution cache for a specific behavior+agent pair.

        Args:
            behavior_key: The behavior key to invalidate.
            agent_id: The agent ID to invalidate.
        """
        cache_key = f"{behavior_key}:{agent_id}"
        with self._cache_lock:
            self._cache.pop(cache_key, None)

    def invalidate_all_cache(self) -> None:
        """Clear all locally cached resolutions."""
        with self._cache_lock:
            self._cache.clear()

    @property
    def cache_size(self) -> int:
        """Return the current number of cached entries (for observability)."""
        with self._cache_lock:
            return len(self._cache)

    def close(self) -> None:
        """Clean up resources. Cancels the flush timer and performs a final flush."""
        self._closed = True
        if self._flush_timer is not None:
            self._flush_timer.cancel()
            self._flush_timer = None
        self._flush_buffer()

    # ── Helpers ───────────────────────────────────────────────────────────

    @staticmethod
    def _req_to_dict(req: ResolveRequest) -> dict[str, Any]:
        """Convert a ResolveRequest to a JSON-safe dict, omitting None values."""
        d: dict[str, Any] = {
            "behavior_key": req.behavior_key,
            "agent_id": req.agent_id,
            "agent_type": req.agent_type,
        }
        if req.user_id is not None:
            d["user_id"] = req.user_id
        if req.attributes is not None:
            d["attributes"] = req.attributes
        if req.session_id is not None:
            d["session_id"] = req.session_id
        return d

    @staticmethod
    def _event_to_dict(event: TrackEvent) -> dict[str, Any]:
        """Convert a TrackEvent to a JSON-safe dict, omitting None values."""
        d: dict[str, Any] = {
            "behavior_key": event.behavior_key,
            "agent_id": event.agent_id,
            "agent_type": event.agent_type,
            "variant": event.variant,
            "action": event.action,
        }
        if event.outcome is not None:
            d["outcome"] = event.outcome
        if event.value is not None:
            d["value"] = event.value
        if event.metadata is not None:
            d["metadata"] = event.metadata
        if event.user_id is not None:
            d["user_id"] = event.user_id
        if event.session_id is not None:
            d["session_id"] = event.session_id
        if event.recorded_at is not None:
            d["recorded_at"] = event.recorded_at
        return d


class ABMError(Exception):
    """Base exception for all ABM SDK errors.

    The ABM SDK does not throw on tracking failures (those are logged).
    Resolve failures raise ABMError — callers should handle with a fallback.
    """

    pass
