"""Unit tests for the FeatureSignals Python SDK."""

from __future__ import annotations

import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from unittest import TestCase

from featuresignals import FeatureSignalsClient, ClientOptions, EvalContext


class FlagHandler(BaseHTTPRequestHandler):
    """Minimal HTTP handler that returns canned flag values."""

    flags: dict = {"feature-a": True, "banner": "hello", "count": 42}

    def do_GET(self, *_: object) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(self.flags).encode())

    def log_message(self, *_: object) -> None:
        pass


def _start_server() -> tuple[HTTPServer, str]:
    server = HTTPServer(("127.0.0.1", 0), FlagHandler)
    port = server.server_address[1]
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    return server, f"http://127.0.0.1:{port}"


class TestClient(TestCase):
    server: HTTPServer
    base_url: str

    @classmethod
    def setUpClass(cls) -> None:
        cls.server, cls.base_url = _start_server()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.shutdown()

    def _make_client(self) -> FeatureSignalsClient:
        opts = ClientOptions(env_key="dev", base_url=self.base_url, polling_interval=60.0)
        client = FeatureSignalsClient("test-key", opts)
        client.wait_for_ready(5.0)
        return client

    def test_bool_variation(self) -> None:
        c = self._make_client()
        self.assertTrue(c.bool_variation("feature-a", EvalContext("u1"), False))
        c.close()

    def test_string_variation(self) -> None:
        c = self._make_client()
        self.assertEqual(c.string_variation("banner", EvalContext("u1"), ""), "hello")
        c.close()

    def test_number_variation(self) -> None:
        c = self._make_client()
        self.assertEqual(c.number_variation("count", EvalContext("u1"), 0), 42)
        c.close()

    def test_fallback_on_missing_key(self) -> None:
        c = self._make_client()
        self.assertFalse(c.bool_variation("missing", EvalContext("u1"), False))
        c.close()

    def test_fallback_on_wrong_type(self) -> None:
        c = self._make_client()
        self.assertEqual(c.string_variation("feature-a", EvalContext("u1"), "nope"), "nope")
        c.close()

    def test_all_flags(self) -> None:
        c = self._make_client()
        flags = c.all_flags()
        self.assertIn("feature-a", flags)
        self.assertIn("banner", flags)
        c.close()

    def test_is_ready(self) -> None:
        c = self._make_client()
        self.assertTrue(c.is_ready())
        c.close()

    def test_on_ready_callback(self) -> None:
        called = threading.Event()
        opts = ClientOptions(env_key="dev", base_url=self.base_url, polling_interval=60.0)
        c = FeatureSignalsClient("test-key", opts, on_ready=called.set)
        self.assertTrue(called.wait(5.0))
        c.close()
