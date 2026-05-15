/**
 * ABM Client tests — 8 required tests per ABM_SDK_SPECIFICATION.md §6.
 *
 * Uses Node.js built-in test runner (`node --test`).
 * Run: node --test --experimental-strip-types src/abm/__tests__/client.test.ts
 *
 * PRS Requirement IDs: FS-S1-ABM-001 through FS-S1-ABM-008
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import http from "node:http";

import { ABMClient, ABMError } from "../client.ts";
import type { ABMConfig, ResolveRequest, TrackEvent } from "../types.ts";

// ── Test Helpers ───────────────────────────────────────────────────────────

interface RecordedRequest {
  path: string;
  body: unknown;
}

let resolveResponse: Record<string, unknown> | null = null;
let resolveStatus = 200;
let trackStatus = 202;
let recordedRequests: RecordedRequest[] = [];

function createServer(): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let rawBody = "";
      req.on("data", (chunk: Buffer) => {
        rawBody += chunk.toString();
      });
      req.on("end", () => {
        const body = rawBody ? JSON.parse(rawBody) : {};
        recordedRequests.push({ path: req.url ?? "/", body });

        if (req.url === "/v1/abm/resolve") {
          const payload =
            resolveResponse ??
            {
              behavior_key: body.behavior_key ?? "test-behavior",
              variant: "variant-a",
              config: { key: "value" },
              reason: "targeting_match",
              resolved_at: new Date().toISOString(),
              is_sticky: false,
              ttl_seconds: 60,
            };
          res.writeHead(resolveStatus, { "Content-Type": "application/json" });
          res.end(JSON.stringify(payload));
        } else if (req.url === "/v1/abm/track") {
          res.writeHead(trackStatus, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ accepted: true }));
        } else if (req.url === "/v1/abm/track/batch") {
          res.writeHead(trackStatus, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ accepted: true, count: Array.isArray(body) ? body.length : 0 }));
        } else {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "not found" }));
        }
      });
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        throw new Error("Failed to get server address");
      }
      resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

function reset(): void {
  resolveResponse = null;
  resolveStatus = 200;
  trackStatus = 202;
  recordedRequests = [];
}

function makeClient(serverUrl: string, overrides?: Partial<ABMConfig>): ABMClient {
  return new ABMClient({
    environmentKey: "fs_test_key_123",
    baseUrl: serverUrl,
    ...overrides,
  });
}

function makeRequest(overrides?: Partial<ResolveRequest>): ResolveRequest {
  return {
    behaviorKey: "test-behavior",
    agentId: "agent-1",
    agentType: "test-agent",
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ABMClient", () => {
  let server: http.Server;
  let url: string;

  beforeEach(async () => {
    reset();
    const s = await createServer();
    server = s.server;
    url = s.url;
  });

  afterEach(() => {
    server.close();
  });

  // Test 1
  it("resolve returns variant", async () => {
    const client = makeClient(url);
    const resp = await client.resolve(makeRequest());
    assert.strictEqual(resp.behaviorKey, "test-behavior");
    assert.strictEqual(resp.variant, "variant-a");
    assert.deepStrictEqual(resp.config, { key: "value" });
    assert.strictEqual(resp.reason, "targeting_match");
    assert.strictEqual(recordedRequests.length, 1);
    assert.strictEqual(recordedRequests[0].path, "/v1/abm/resolve");
  });

  // Test 2
  it("resolve uses cache", async () => {
    const client = makeClient(url, { cacheTtlSeconds: 60 });
    const resp1 = await client.resolve(makeRequest());
    assert.strictEqual(resp1.variant, "variant-a");

    // Change server response to verify cache is used.
    resolveResponse = {
      behavior_key: "test-behavior",
      variant: "variant-b",
      reason: "default",
      ttl_seconds: 60,
    };

    const resp2 = await client.resolve(makeRequest());
    assert.strictEqual(resp2.variant, "variant-a");
    assert.strictEqual(recordedRequests.length, 1);
  });

  // Test 3
  it("resolveFresh bypasses cache", async () => {
    const client = makeClient(url, { cacheTtlSeconds: 60 });
    const resp1 = await client.resolve(makeRequest());
    assert.strictEqual(resp1.variant, "variant-a");

    // Change server response.
    resolveResponse = {
      behavior_key: "test-behavior",
      variant: "variant-b",
      reason: "default",
      ttl_seconds: 60,
    };

    const resp2 = await client.resolveFresh(makeRequest());
    assert.strictEqual(resp2.variant, "variant-b");
    assert.strictEqual(recordedRequests.length, 2);
  });

  // Test 4
  it("resolve fallback on error (non-200)", async () => {
    resolveStatus = 500;
    resolveResponse = { error: "internal" };
    const client = makeClient(url);
    await assert.rejects(
      () => client.resolve(makeRequest()),
      (err: unknown) => {
        assert.ok(err instanceof ABMError);
        assert.match((err as ABMError).message, /status 500/);
        return true;
      },
    );
  });

  // Test 5 — track is fire-and-forget, so we verify the request is made
  it("track sends request", async () => {
    const client = makeClient(url, { timeoutMs: 500 });
    client.track({
      behaviorKey: "test-behavior",
      agentId: "agent-1",
      agentType: "test-agent",
      variant: "variant-a",
      action: "test.action",
    });

    // Wait for fire-and-forget to complete.
    await new Promise((r) => setTimeout(r, 100));

    const trackReqs = recordedRequests.filter((r) => r.path === "/v1/abm/track");
    assert.ok(trackReqs.length >= 1);
    const body = trackReqs[0].body as Record<string, unknown>;
    assert.strictEqual(body.behavior_key, "test-behavior");
    assert.strictEqual(body.action, "test.action");
  });

  // Test 6
  it("trackBatch sends single request", async () => {
    const client = makeClient(url, { timeoutMs: 500 });
    const events: TrackEvent[] = Array.from({ length: 10 }, (_, i) => ({
      behaviorKey: `behavior-${i}`,
      agentId: `agent-${i}`,
      agentType: "test-agent",
      variant: "variant-a",
      action: "test.action",
    }));
    client.trackBatch(events);

    await new Promise((r) => setTimeout(r, 100));

    const batchReqs = recordedRequests.filter((r) => r.path === "/v1/abm/track/batch");
    assert.ok(batchReqs.length >= 1);
    const body = batchReqs[0].body as unknown[];
    assert.strictEqual(body.length, 10);
  });

  // Test 7
  it("cache invalidation", async () => {
    const client = makeClient(url, { cacheTtlSeconds: 60 });
    const resp1 = await client.resolve(makeRequest({ behaviorKey: "bh-1" }));
    assert.strictEqual(resp1.variant, "variant-a");

    // Invalidate and change response.
    client.invalidateCache("bh-1", "agent-1");
    resolveResponse = {
      behavior_key: "bh-1",
      variant: "variant-b",
      reason: "default",
      ttl_seconds: 60,
    };

    const resp2 = await client.resolve(makeRequest({ behaviorKey: "bh-1" }));
    assert.strictEqual(resp2.variant, "variant-b");
    assert.strictEqual(recordedRequests.length, 2);
  });

  // Test 8
  it("LRU eviction", async () => {
    const client = makeClient(url, { cacheTtlSeconds: 60, maxCacheEntries: 3 });

    // Fill cache with 3 entries.
    for (let i = 0; i < 3; i++) {
      resolveResponse = {
        behavior_key: `bh-${i}`,
        variant: `variant-${i}`,
        reason: "default",
        ttl_seconds: 60,
      };
      await client.resolve(makeRequest({ behaviorKey: `bh-${i}`, agentId: `agent-${i}` }));
    }

    assert.strictEqual(client.cacheSize, 3);
    assert.strictEqual(recordedRequests.length, 3);

    // Add 4th entry — should evict bh-0 (oldest).
    resolveResponse = {
      behavior_key: "bh-3",
      variant: "variant-3",
      reason: "default",
      ttl_seconds: 60,
    };
    const resp4 = await client.resolve(makeRequest({ behaviorKey: "bh-3", agentId: "agent-3" }));
    assert.strictEqual(resp4.variant, "variant-3");
    assert.strictEqual(client.cacheSize, 3);

    // bh-0 should be evicted — resolving again should make a new request.
    const reqCount = recordedRequests.length;
    resolveResponse = {
      behavior_key: "bh-0",
      variant: "variant-0-new",
      reason: "default",
      ttl_seconds: 60,
    };
    const resp5 = await client.resolve(makeRequest({ behaviorKey: "bh-0", agentId: "agent-0" }));
    assert.strictEqual(resp5.variant, "variant-0-new");
    assert.strictEqual(recordedRequests.length, reqCount + 1);
  });

  // Additional: network error
  it("resolve throws on network error", async () => {
    const client = makeClient("http://127.0.0.1:19999", { timeoutMs: 500 });
    await assert.rejects(
      () => client.resolve(makeRequest()),
      (err: unknown) => {
        assert.ok(err instanceof ABMError);
        assert.match((err as ABMError).message, /network error/);
        return true;
      },
    );
  });

  // Additional: constructor validation
  it("throws on empty environmentKey", () => {
    assert.throws(
      () => new ABMClient({ environmentKey: "" }),
      (err: unknown) => {
        assert.ok(err instanceof ABMError);
        assert.match((err as ABMError).message, /environmentKey/);
        return true;
      },
    );
  });
});
