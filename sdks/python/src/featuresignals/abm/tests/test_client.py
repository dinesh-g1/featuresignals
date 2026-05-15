"""ABM Client tests — 8 required tests per ABM_SDK_SPECIFICATION.md §6.

PRS Requirement IDs: FS-S1-ABM-001 through FS-S1-ABM-008
"""

from __future__ import annotations

import json
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Thread
from unittest import mock

import pytest

from featuresignals.abm import (
    ABMClient,
    ABMConfig,
    ABMError,
    ResolveRequest,
    ResolveResponse,
    TrackEvent,
)

# ── Test Helpers ───────────────────────────────────────────────────────────


class _ABMHandler(BaseHTTPRequestHandler):
    """Tiny HTTP server that records requests and returns canned responses."""

    resolve_response: dict | None = None
    resolve_status: int = 200
    track_status: int = 202
    requests: list[dict] = []

    @classmethod
    def reset(cls) -> None:
        cls.resolve_response = None
        cls.resolve_status = 200
        cls.track_status = 202
        cls.requests = []

    def do_POST(self) -> None:
        content_len = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(content_len)) if content_len > 0 else {}
        _ABMHandler.requests.append({"path": self.path, "body": body})

        if self.path == "/v1/abm/resolve":
            if _ABMHandler.resolve_response is not None:
                self._send_json(
                    _ABMHandler.resolve_status, _ABMHandler.resolve_response
                )
            else:
                self._send_json(
                    200,
                    {
                        "behavior_key": body.get("behavior_key", "test-behavior"),
                        "variant": "variant-a",
                        "config": {"key": "value"},
                        "reason": "targeting_match",
                        "resolved_at": time.time(),
                        "is_sticky": False,
                        "ttl_seconds": 60,
                    },
                )
        elif self.path == "/v1/abm/track":
            self._send_json(_ABMHandler.track_status, {"accepted": True})
        elif self.path == "/v1/abm/track/batch":
            self._send_json(
                _ABMHandler.track_status, {"accepted": True, "count": len(body)}
            )
        else:
            self._send_json(404, {"error": "not found"})

    def _send_json(self, status: int, data: dict) -> None:
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass  # Suppress stderr logs during tests.


def _start_server() -> tuple[HTTPServer, str]:
    """Start a test HTTP server on a random port and return (server, base_url)."""
    server = HTTPServer(("127.0.0.1", 0), _ABMHandler)
    port = server.server_address[1]
    t = Thread(target=server.serve_forever, daemon=True)
    t.start()
    return server, f"http://127.0.0.1:{port}"


def _make_client(server_url: str, **kwargs) -> ABMClient:
    config = ABMConfig(
        environment_key="fs_test_key_123",
        base_url=server_url,
        **kwargs,
    )
    return ABMClient(config)


def _make_request(**kwargs) -> ResolveRequest:
    defaults = {
        "behavior_key": "test-behavior",
        "agent_id": "agent-1",
        "agent_type": "test-agent",
    }
    defaults.update(kwargs)
    return ResolveRequest(**defaults)


# ── Test 1: resolve returns variant ────────────────────────────────────────


def test_resolve_returns_variant():
    """Resolve a known behavior, verify variant + configuration."""
    _ABMHandler.reset()
    server, url = _start_server()
    try:
        client = _make_client(url)
        resp = client.resolve(_make_request())
        assert resp.behavior_key == "test-behavior"
        assert resp.variant == "variant-a"
        assert resp.config == {"key": "value"}
        assert resp.reason == "targeting_match"
        assert len(_ABMHandler.requests) == 1
        assert _ABMHandler.requests[0]["path"] == "/v1/abm/resolve"
    finally:
        server.shutdown()


# ── Test 2: resolve uses cache ─────────────────────────────────────────────


def test_resolve_uses_cache():
    """Two resolves within TTL → second hits cache."""
    _ABMHandler.reset()
    server, url = _start_server()
    try:
        client = _make_client(url, cache_ttl_seconds=60)
        resp1 = client.resolve(_make_request())
        assert resp1.variant == "variant-a"

        # Change server response to verify cache is used.
        _ABMHandler.resolve_response = {
            "behavior_key": "test-behavior",
            "variant": "variant-b",
            "reason": "default",
            "ttl_seconds": 60,
        }

        resp2 = client.resolve(_make_request())
        # Should still be variant-a from cache.
        assert resp2.variant == "variant-a"
        # Only one request should have been made.
        assert len(_ABMHandler.requests) == 1
    finally:
        server.shutdown()


# ── Test 3: resolve_fresh bypasses cache ───────────────────────────────────


def test_resolve_fresh_bypasses_cache():
    """resolveFresh after resolve → different HTTP request."""
    _ABMHandler.reset()
    server, url = _start_server()
    try:
        client = _make_client(url, cache_ttl_seconds=60)
        resp1 = client.resolve(_make_request())
        assert resp1.variant == "variant-a"

        # Change server response.
        _ABMHandler.resolve_response = {
            "behavior_key": "test-behavior",
            "variant": "variant-b",
            "reason": "default",
            "ttl_seconds": 60,
        }

        resp2 = client.resolve_fresh(_make_request())
        # resolve_fresh should get the new variant.
        assert resp2.variant == "variant-b"
        assert len(_ABMHandler.requests) == 2
    finally:
        server.shutdown()


# ── Test 4: resolve fallback on error ──────────────────────────────────────


def test_resolve_fallback_on_error():
    """Network error → ABMError raised. Caller handles fallback."""
    # Use a non-existent server to trigger a connection error.
    client = _make_client("http://127.0.0.1:19999", timeout_seconds=1)
    with pytest.raises(ABMError, match="network error"):
        client.resolve(_make_request())


# ── Test 5: track buffers and flushes ──────────────────────────────────────


def test_track_sends_request():
    """Track an event → POST to /v1/abm/track."""
    _ABMHandler.reset()
    server, url = _start_server()
    try:
        client = _make_client(url)
        event = TrackEvent(
            behavior_key="test-behavior",
            agent_id="agent-1",
            agent_type="test-agent",
            variant="variant-a",
            action="test.action",
        )
        client.track(event)

        # Allow fire-and-forget to complete (small sleep for thread).
        time.sleep(0.1)

        track_requests = [
            r for r in _ABMHandler.requests if r["path"] == "/v1/abm/track"
        ]
        assert len(track_requests) >= 1
        body = track_requests[0]["body"]
        assert body["behavior_key"] == "test-behavior"
        assert body["action"] == "test.action"
    finally:
        server.shutdown()


# ── Test 6: track batch sends single request ───────────────────────────────


def test_track_batch_sends_single_request():
    """Track multiple events → 1 batch request."""
    _ABMHandler.reset()
    server, url = _start_server()
    try:
        client = _make_client(url)
        events = [
            TrackEvent(
                behavior_key=f"behavior-{i}",
                agent_id=f"agent-{i}",
                agent_type="test-agent",
                variant="variant-a",
                action="test.action",
            )
            for i in range(10)
        ]
        client.track_batch(events)

        time.sleep(0.1)

        batch_requests = [
            r for r in _ABMHandler.requests if r["path"] == "/v1/abm/track/batch"
        ]
        assert len(batch_requests) >= 1
        body = batch_requests[0]["body"]
        assert isinstance(body, list)
        assert len(body) == 10
    finally:
        server.shutdown()


# ── Test 7: cache invalidation ─────────────────────────────────────────────


def test_cache_invalidation():
    """invalidateCache → next resolve fetches fresh."""
    _ABMHandler.reset()
    server, url = _start_server()
    try:
        client = _make_client(url, cache_ttl_seconds=60)
        resp1 = client.resolve(_make_request(behavior_key="bh-1"))
        assert resp1.variant == "variant-a"

        # Invalidate and change response.
        client.invalidate_cache("bh-1", "agent-1")
        _ABMHandler.resolve_response = {
            "behavior_key": "bh-1",
            "variant": "variant-b",
            "reason": "default",
            "ttl_seconds": 60,
        }

        resp2 = client.resolve(_make_request(behavior_key="bh-1"))
        assert resp2.variant == "variant-b"
        assert len(_ABMHandler.requests) == 2
    finally:
        server.shutdown()


# ── Test 8: LRU eviction ───────────────────────────────────────────────────


def test_lru_eviction():
    """Cache exceeding max entries → oldest evicted."""
    _ABMHandler.reset()
    server, url = _start_server()
    try:
        client = _make_client(url, cache_ttl_seconds=60, max_cache_entries=3)

        # Fill cache with 3 entries.
        for i in range(3):
            _ABMHandler.resolve_response = {
                "behavior_key": f"bh-{i}",
                "variant": f"variant-{i}",
                "reason": "default",
                "ttl_seconds": 60,
            }
            client.resolve(_make_request(behavior_key=f"bh-{i}", agent_id=f"agent-{i}"))

        assert client.cache_size == 3
        assert len(_ABMHandler.requests) == 3

        # Add 4th entry — should evict bh-0 (oldest).
        _ABMHandler.resolve_response = {
            "behavior_key": "bh-3",
            "variant": "variant-3",
            "reason": "default",
            "ttl_seconds": 60,
        }
        resp4 = client.resolve(_make_request(behavior_key="bh-3", agent_id="agent-3"))
        assert resp4.variant == "variant-3"

        # Cache should still be 3 (one evicted).
        assert client.cache_size == 3

        # bh-0 should be evicted — resolving again should make a new request.
        request_count_before = len(_ABMHandler.requests)
        _ABMHandler.resolve_response = {
            "behavior_key": "bh-0",
            "variant": "variant-0-new",
            "reason": "default",
            "ttl_seconds": 60,
        }
        resp5 = client.resolve(_make_request(behavior_key="bh-0", agent_id="agent-0"))
        assert resp5.variant == "variant-0-new"
        # One more request was made.
        assert len(_ABMHandler.requests) == request_count_before + 1
    finally:
        server.shutdown()


# ── Additional: resolve returns error on non-200 ───────────────────────────


def test_resolve_non_200_raises_error():
    """Server returns 500 → ABMError raised."""
    _ABMHandler.reset()
    _ABMHandler.resolve_status = 500
    _ABMHandler.resolve_response = {"error": "internal"}
    server, url = _start_server()
    try:
        client = _make_client(url)
        with pytest.raises(ABMError, match="status 500"):
            client.resolve(_make_request())
    finally:
        server.shutdown()
