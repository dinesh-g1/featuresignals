import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { FeatureSignalsClient } from "../client.ts";
import type { EvalContext } from "../context.ts";

// ── Test helpers ─────────────────────────────────────────────

/** Spin up a tiny HTTP server that returns JSON flags and optionally serves SSE. */
function createFlagServer(
  flags: Record<string, unknown>,
  options?: { sseEvents?: string[] }
): { server: http.Server; port: number; start: () => Promise<number> } {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url!, `http://localhost`);

    // SSE stream endpoint
    if (url.pathname.startsWith("/v1/stream/")) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write("event: connected\ndata: {}\n\n");
      if (options?.sseEvents) {
        for (const evt of options.sseEvents) {
          res.write(evt);
        }
      }
      // Keep connection open briefly then close
      setTimeout(() => res.end(), 200);
      return;
    }

    // Flag endpoint
    if (url.pathname.includes("/v1/client/")) {
      const apiKey = req.headers["x-api-key"];
      if (!apiKey) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: "missing api key" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(flags));
      return;
    }

    res.writeHead(404);
    res.end("not found");
  });

  let port = 0;
  return {
    server,
    get port() {
      return port;
    },
    start: () =>
      new Promise<number>((resolve) => {
        server.listen(0, () => {
          port = (server.address() as { port: number }).port;
          resolve(port);
        });
      }),
  };
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

const testCtx: EvalContext = { key: "user-123", attributes: { plan: "pro" } };

// ── Tests ────────────────────────────────────────────────────

describe("FeatureSignalsClient", () => {
  let server: http.Server;
  let port: number;

  afterEach(async () => {
    if (server) await closeServer(server);
  });

  describe("constructor", () => {
    it("throws when sdkKey is empty", () => {
      assert.throws(() => new FeatureSignalsClient(""), /sdkKey is required/);
    });
  });

  describe("flag variations", () => {
    let client: FeatureSignalsClient;

    beforeEach(async () => {
      const s = createFlagServer({
        "dark-mode": true,
        "banner-text": "hello",
        "max-items": 42,
        "config": { nested: true },
      });
      port = await s.start();
      server = s.server;

      client = new FeatureSignalsClient("fs_srv_test", {
        baseURL: `http://localhost:${port}`,
        pollingIntervalMs: 60_000,
      });
      await client.waitForReady();
    });

    afterEach(() => client?.close());

    it("boolVariation returns flag value", () => {
      assert.equal(client.boolVariation("dark-mode", testCtx, false), true);
    });

    it("boolVariation returns fallback for missing flag", () => {
      assert.equal(client.boolVariation("nonexistent", testCtx, false), false);
    });

    it("boolVariation returns fallback for wrong type", () => {
      assert.equal(client.boolVariation("banner-text", testCtx, true), true);
    });

    it("stringVariation returns flag value", () => {
      assert.equal(client.stringVariation("banner-text", testCtx, "default"), "hello");
    });

    it("stringVariation returns fallback for missing flag", () => {
      assert.equal(client.stringVariation("missing", testCtx, "default"), "default");
    });

    it("stringVariation returns fallback for wrong type", () => {
      assert.equal(client.stringVariation("dark-mode", testCtx, "fallback"), "fallback");
    });

    it("numberVariation returns flag value", () => {
      assert.equal(client.numberVariation("max-items", testCtx, 10), 42);
    });

    it("numberVariation returns fallback for missing flag", () => {
      assert.equal(client.numberVariation("missing", testCtx, 99), 99);
    });

    it("numberVariation returns fallback for wrong type", () => {
      assert.equal(client.numberVariation("dark-mode", testCtx, 5), 5);
    });

    it("jsonVariation returns object flag value", () => {
      const val = client.jsonVariation("config", testCtx, {});
      assert.deepEqual(val, { nested: true });
    });

    it("jsonVariation returns fallback for missing flag", () => {
      assert.deepEqual(client.jsonVariation("missing", testCtx, { x: 1 }), { x: 1 });
    });

    it("allFlags returns a copy of all flags", () => {
      const flags = client.allFlags();
      assert.equal(flags["dark-mode"], true);
      assert.equal(flags["banner-text"], "hello");
      assert.equal(Object.keys(flags).length, 4);

      // Mutating returned object should not affect internal state
      flags["dark-mode"] = false;
      assert.equal(client.boolVariation("dark-mode", testCtx, false), true);
    });
  });

  describe("ready state", () => {
    it("isReady returns true after successful fetch", async () => {
      const s = createFlagServer({ a: 1 });
      port = await s.start();
      server = s.server;

      const client = new FeatureSignalsClient("fs_srv_test", {
        baseURL: `http://localhost:${port}`,
        pollingIntervalMs: 60_000,
      });
      await client.waitForReady();
      assert.equal(client.isReady(), true);
      client.close();
    });

    it("emits ready event", async () => {
      const s = createFlagServer({ a: 1 });
      port = await s.start();
      server = s.server;

      const client = new FeatureSignalsClient("fs_srv_test", {
        baseURL: `http://localhost:${port}`,
        pollingIntervalMs: 60_000,
      });
      await new Promise<void>((resolve) => client.once("ready", resolve));
      assert.equal(client.isReady(), true);
      client.close();
    });

    it("waitForReady times out if server unreachable", async () => {
      const client = new FeatureSignalsClient("fs_srv_test", {
        baseURL: "http://localhost:1", // unreachable
        pollingIntervalMs: 60_000,
      });
      // Suppress error events
      client.on("error", () => {});

      await assert.rejects(
        () => client.waitForReady(500),
        /waitForReady timed out/
      );
      client.close();
    });
  });

  describe("error handling", () => {
    it("emits error on failed initial fetch", async () => {
      const client = new FeatureSignalsClient("fs_srv_test", {
        baseURL: "http://localhost:1",
        pollingIntervalMs: 60_000,
      });
      const err = await new Promise<Error>((resolve) =>
        client.once("error", resolve)
      );
      assert.ok(err instanceof Error);
      client.close();
    });

    it("emits error on non-200 response", async () => {
      const s = http.createServer((_, res) => {
        res.writeHead(500);
        res.end("internal error");
      });
      await new Promise<void>((resolve) => s.listen(0, resolve));
      port = (s.address() as { port: number }).port;
      server = s;

      const client = new FeatureSignalsClient("fs_srv_test", {
        baseURL: `http://localhost:${port}`,
        pollingIntervalMs: 60_000,
      });
      const err = await new Promise<Error>((resolve) =>
        client.once("error", resolve)
      );
      assert.ok(err.message.includes("500"));
      client.close();
    });
  });

  describe("polling", () => {
    it("updates flags on poll interval", async () => {
      let callCount = 0;
      const s = http.createServer((_, res) => {
        callCount++;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ counter: callCount }));
      });
      await new Promise<void>((resolve) => s.listen(0, resolve));
      port = (s.address() as { port: number }).port;
      server = s;

      const client = new FeatureSignalsClient("fs_srv_test", {
        baseURL: `http://localhost:${port}`,
        pollingIntervalMs: 100, // 100ms for fast test
      });
      await client.waitForReady();

      // Wait for at least 2 polls
      await new Promise((r) => setTimeout(r, 350));
      assert.ok(callCount >= 3, `expected >= 3 calls, got ${callCount}`);

      const flags = client.allFlags();
      assert.ok(typeof flags.counter === "number");
      client.close();
    });
  });

  describe("update events", () => {
    it("emits update on each flag refresh", async () => {
      const s = createFlagServer({ x: 1 });
      port = await s.start();
      server = s.server;

      const updates: Record<string, unknown>[] = [];
      const client = new FeatureSignalsClient("fs_srv_test", {
        baseURL: `http://localhost:${port}`,
        pollingIntervalMs: 100,
      });
      client.on("update", (flags) => updates.push(flags));
      await client.waitForReady();

      await new Promise((r) => setTimeout(r, 250));
      assert.ok(updates.length >= 2, `expected >= 2 updates, got ${updates.length}`);
      client.close();
    });
  });

  describe("close", () => {
    it("stops polling after close", async () => {
      const s = createFlagServer({ a: 1 });
      port = await s.start();
      server = s.server;

      const client = new FeatureSignalsClient("fs_srv_test", {
        baseURL: `http://localhost:${port}`,
        pollingIntervalMs: 50,
      });
      await client.waitForReady();
      client.close();

      // Close is idempotent
      client.close();
    });
  });

  describe("context key encoding", () => {
    it("encodes context key in URL", async () => {
      let receivedKey = "";
      const s = http.createServer((req, res) => {
        const url = new URL(req.url!, "http://localhost");
        receivedKey = url.searchParams.get("key") ?? "";
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end("{}");
      });
      await new Promise<void>((resolve) => s.listen(0, resolve));
      port = (s.address() as { port: number }).port;
      server = s;

      const client = new FeatureSignalsClient("fs_srv_test", {
        baseURL: `http://localhost:${port}`,
        pollingIntervalMs: 60_000,
        context: { key: "user with spaces" },
      });
      await client.waitForReady();
      assert.equal(receivedKey, "user with spaces");
      client.close();
    });
  });
});
