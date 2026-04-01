package com.featuresignals.sdk;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.time.Duration;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ClientTest {
    static HttpServer server;
    static String baseURL;

    static final String FLAGS_JSON = """
            {"feature-a": true, "banner": "hello", "count": 42}
            """;

    @BeforeAll
    static void startServer() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            byte[] body = FLAGS_JSON.getBytes();
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(body);
            }
        });
        server.start();
        baseURL = "http://127.0.0.1:" + server.getAddress().getPort();
    }

    @AfterAll
    static void stopServer() {
        server.stop(0);
    }

    FeatureSignalsClient makeClient() throws InterruptedException {
        ClientOptions opts = new ClientOptions("dev")
                .baseURL(baseURL)
                .pollingInterval(Duration.ofMinutes(5));
        FeatureSignalsClient client = new FeatureSignalsClient("test-key", opts);
        client.waitForReady(5000);
        return client;
    }

    @Test
    void boolVariation() throws Exception {
        try (var client = makeClient()) {
            assertTrue(client.boolVariation("feature-a", new EvalContext("u1"), false));
        }
    }

    @Test
    void stringVariation() throws Exception {
        try (var client = makeClient()) {
            assertEquals("hello", client.stringVariation("banner", new EvalContext("u1"), ""));
        }
    }

    @Test
    void numberVariation() throws Exception {
        try (var client = makeClient()) {
            assertEquals(42.0, client.numberVariation("count", new EvalContext("u1"), 0));
        }
    }

    @Test
    void fallbackOnMissing() throws Exception {
        try (var client = makeClient()) {
            assertFalse(client.boolVariation("no-such-flag", new EvalContext("u1"), false));
        }
    }

    @Test
    void fallbackOnWrongType() throws Exception {
        try (var client = makeClient()) {
            assertEquals("nope", client.stringVariation("feature-a", new EvalContext("u1"), "nope"));
        }
    }

    @Test
    void allFlags() throws Exception {
        try (var client = makeClient()) {
            Map<String, Object> flags = client.allFlags();
            assertTrue(flags.containsKey("feature-a"));
            assertTrue(flags.containsKey("banner"));
        }
    }

    @Test
    void isReady() throws Exception {
        try (var client = makeClient()) {
            assertTrue(client.isReady());
        }
    }
}
