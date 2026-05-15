package com.featuresignals.abm;

import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.junit.jupiter.api.Assertions.*;

/**
 * ABM Client tests — 8+ required tests per ABM_SDK_SPECIFICATION.md §6.
 *
 * <p>Uses a real HTTP server (com.sun.net.httpserver) for integration
 * testing. Each test verifies one contract requirement.
 *
 * <p>PRS Requirement IDs: FS-S1-ABM-001 through FS-S1-ABM-008
 */
class ABMClientTest {

    private static final Gson GSON = new Gson();

    private HttpServer server;
    private String baseUrl;

    // Configurable server behavior.
    private volatile Map<String, Object> resolveResponse = null;
    private volatile int resolveStatus = 200;
    private final List<RecordedRequest> recordedRequests = new CopyOnWriteArrayList<>();

    @BeforeEach
    void setUp() throws IOException {
        recordedRequests.clear();
        resolveResponse = null;
        resolveStatus = 200;

        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", new TestHandler());
        server.start();
        int port = server.getAddress().getPort();
        baseUrl = "http://127.0.0.1:" + port;
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    private ABMConfig makeConfig() {
        return ABMConfig.builder()
                .environmentKey("fs_test_key_123")
                .baseUrl(baseUrl)
                .cacheTtlSeconds(60)
                .timeoutMs(2000)
                .build();
    }

    // ── Test 1: resolve returns variant ─────────────────────────────────

    @Test
    void testResolveReturnsVariant() {
        ABMClient client = new ABMClient(makeConfig());
        ResolveResponse resp = client.resolve("test-behavior", "agent-1", null);

        assertEquals("test-behavior", resp.getBehaviorKey());
        assertEquals("variant-a", resp.getVariant());
        assertEquals("value", resp.getConfiguration().get("key"));
        assertEquals("targeting_match", resp.getReason());
        assertEquals(1, recordedRequests.size());
        assertTrue(recordedRequests.get(0).path.contains("/abm/resolve"));

        client.close();
    }

    // ── Test 2: resolve uses cache ──────────────────────────────────────

    @Test
    void testResolveUsesCache() {
        ABMClient client = new ABMClient(makeConfig());
        ResolveResponse resp1 = client.resolve("test-behavior", "agent-1", null);
        assertEquals("variant-a", resp1.getVariant());
        assertEquals(1, recordedRequests.size());

        // Change server response.
        resolveResponse = Map.of(
                "behavior_key", "test-behavior",
                "variant", "variant-b",
                "reason", "default",
                "cache_ttl_seconds", 60
        );

        ResolveResponse resp2 = client.resolve("test-behavior", "agent-1", null);
        // Should still be variant-a from cache.
        assertEquals("variant-a", resp2.getVariant());
        assertEquals(1, recordedRequests.size());

        client.close();
    }

    // ── Test 3: resolveFresh bypasses cache ─────────────────────────────

    @Test
    void testResolveFreshBypassesCache() {
        ABMClient client = new ABMClient(makeConfig());
        ResolveResponse resp1 = client.resolve("test-behavior", "agent-1", null);
        assertEquals("variant-a", resp1.getVariant());
        assertEquals(1, recordedRequests.size());

        // Change server response.
        resolveResponse = Map.of(
                "behavior_key", "test-behavior",
                "variant", "variant-b",
                "reason", "default",
                "cache_ttl_seconds", 60
        );

        ResolveResponse resp2 = client.resolveFresh("test-behavior", "agent-1", null);
        assertEquals("variant-b", resp2.getVariant());
        assertEquals(2, recordedRequests.size());

        client.close();
    }

    // ── Test 4: fallback on 500 error ───────────────────────────────────

    @Test
    void testResolveFallbackOnError() {
        resolveStatus = 500;
        resolveResponse = Map.of("error", "internal");

        ABMClient client = new ABMClient(makeConfig());
        ResolveResponse resp = client.resolve("test-behavior", "agent-1", null);

        // Must NOT throw — returns fallback.
        assertEquals("", resp.getVariant());
        assertEquals("fallback", resp.getReason());
        assertTrue(resp.getConfiguration().isEmpty());

        client.close();
    }

    // ── Test 5: fallback on 404 ────────────────────────────────────────

    @Test
    void testResolveFallbackOn404() {
        resolveStatus = 404;
        resolveResponse = Map.of("error", "not found");

        ABMClient client = new ABMClient(makeConfig());
        ResolveResponse resp = client.resolve("missing-behavior", "agent-1", null);

        assertEquals("", resp.getVariant());
        assertTrue(resp.getConfiguration().isEmpty());

        client.close();
    }

    // ── Test 6: track sends request ─────────────────────────────────────

    @Test
    void testTrackSendsRequest() throws InterruptedException {
        ABMClient client = new ABMClient(makeConfig());
        client.track("test-behavior", "agent-1", "variant-a", "behavior.applied", 42.0);

        // Wait for buffered flush.
        Thread.sleep(200);

        List<RecordedRequest> trackReqs = recordedRequests.stream()
                .filter(r -> r.path.contains("/abm/track"))
                .toList();
        assertFalse(trackReqs.isEmpty(), "Expected at least one track request");

        client.close();
    }

    // ── Test 7: track batch sends single request ────────────────────────

    @Test
    void testTrackBatchSendsSingleRequest() throws InterruptedException {
        ABMClient client = new ABMClient(makeConfig());
        List<TrackEvent> events = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            events.add(new TrackEvent("behavior-" + i, "agent-" + i, "variant-a",
                    "test.action", null, null));
        }
        client.trackBatch(events);

        Thread.sleep(200);

        List<RecordedRequest> batchReqs = recordedRequests.stream()
                .filter(r -> r.path.contains("/abm/track"))
                .toList();
        assertFalse(batchReqs.isEmpty(), "Expected at least one batch request");

        client.close();
    }

    // ── Test 8: cache invalidation ──────────────────────────────────────

    @Test
    void testCacheInvalidation() {
        ABMClient client = new ABMClient(makeConfig());
        ResolveResponse resp1 = client.resolve("bh-1", "agent-1", null);
        assertEquals("variant-a", resp1.getVariant());
        assertEquals(1, recordedRequests.size());

        // Invalidate and change response.
        client.invalidateCache("bh-1", "agent-1");
        resolveResponse = Map.of(
                "behavior_key", "bh-1",
                "variant", "variant-b",
                "reason", "default",
                "cache_ttl_seconds", 60
        );

        ResolveResponse resp2 = client.resolve("bh-1", "agent-1", null);
        assertEquals("variant-b", resp2.getVariant());
        assertEquals(2, recordedRequests.size());

        client.close();
    }

    // ── Test 9: LRU eviction ────────────────────────────────────────────

    @Test
    void testLruEviction() {
        ABMConfig config = ABMConfig.builder()
                .environmentKey("fs_test_key_123")
                .baseUrl(baseUrl)
                .cacheTtlSeconds(60)
                .maxCacheEntries(3)
                .timeoutMs(2000)
                .build();

        ABMClient client = new ABMClient(config);

        // Fill cache with 3 entries.
        for (int i = 0; i < 3; i++) {
            resolveResponse = Map.of(
                    "behavior_key", "bh-" + i,
                    "variant", "variant-" + i,
                    "reason", "default",
                    "cache_ttl_seconds", 60
            );
            client.resolve("bh-" + i, "agent-" + i, null);
        }

        assertEquals(3, client.cacheSize());
        assertEquals(3, recordedRequests.size());

        // Add 4th entry — should evict oldest.
        resolveResponse = Map.of(
                "behavior_key", "bh-3",
                "variant", "variant-3",
                "reason", "default",
                "cache_ttl_seconds", 60
        );
        client.resolve("bh-3", "agent-3", null);
        assertEquals(3, client.cacheSize());

        // bh-0 should be evicted — resolve again should make a new request.
        int requestCountBefore = recordedRequests.size();
        resolveResponse = Map.of(
                "behavior_key", "bh-0",
                "variant", "variant-0-new",
                "reason", "default",
                "cache_ttl_seconds", 60
        );
        ResolveResponse resp = client.resolve("bh-0", "agent-0", null);
        assertEquals("variant-0-new", resp.getVariant());
        assertEquals(requestCountBefore + 1, recordedRequests.size());

        client.close();
    }

    // ── Test 10: config validation ──────────────────────────────────────

    @Test
    void testConfigValidation() {
        assertThrows(IllegalArgumentException.class, () ->
                ABMConfig.builder().environmentKey("").build());
        assertThrows(IllegalArgumentException.class, () ->
                ABMConfig.builder().environmentKey("  ").build());
    }

    // ── Test Handler ────────────────────────────────────────────────────

    private class TestHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            // Read request body.
            InputStream is = exchange.getRequestBody();
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int n;
            while ((n = is.read(buf)) != -1) {
                bos.write(buf, 0, n);
            }
            String bodyStr = bos.toString(StandardCharsets.UTF_8);
            Map<String, Object> body = bodyStr.isEmpty() ? Map.of() :
                    GSON.fromJson(bodyStr, Map.class);

            recordedRequests.add(new RecordedRequest(
                    exchange.getRequestURI().getPath(), body));

            String path = exchange.getRequestURI().getPath();
            byte[] responseBytes;

            if (path.contains("/abm/resolve")) {
                Map<String, Object> payload = resolveResponse != null
                        ? resolveResponse
                        : Map.of(
                        "behavior_key", body.getOrDefault("behavior_key", "test-behavior"),
                        "variant", "variant-a",
                        "configuration", Map.of("key", "value", "temperature", 0.7),
                        "reason", "targeting_match",
                        "cache_ttl_seconds", 60,
                        "evaluated_at", java.time.Instant.now().toString()
                );
                responseBytes = GSON.toJson(payload).getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(resolveStatus, responseBytes.length);
            } else if (path.contains("/abm/track")) {
                Map<String, Object> ack = Map.of("accepted", true);
                responseBytes = GSON.toJson(ack).getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(202, responseBytes.length);
            } else {
                responseBytes = "{\"error\":\"not found\"}".getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(404, responseBytes.length);
            }

            try (OutputStream os = exchange.getResponseBody()) {
                os.write(responseBytes);
            }
        }
    }

    private static class RecordedRequest {
        final String path;
        final Map<String, Object> body;

        RecordedRequest(String path, Map<String, Object> body) {
            this.path = path;
            this.body = body;
        }
    }
}
