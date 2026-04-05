package com.featuresignals.sdk;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.lang.reflect.Type;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.function.Consumer;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.concurrent.ThreadLocalRandom;

/**
 * FeatureSignals Java SDK client.
 *
 * <p>Fetches flag values from the server, caches locally, and keeps them
 * up-to-date via polling or SSE streaming. All flag reads are local.
 */
public class FeatureSignalsClient implements AutoCloseable {
    private static final Logger log = Logger.getLogger(FeatureSignalsClient.class.getName());
    private static final Gson gson = new Gson();
    private static final Type FLAG_MAP_TYPE = new TypeToken<Map<String, Object>>() {}.getType();
    private static final long BACKOFF_INITIAL_MS = 1000;
    private static final long BACKOFF_MAX_MS = 30_000;
    private static final double BACKOFF_MULTIPLIER = 2.0;
    private static final double BACKOFF_JITTER_FACTOR = 0.25;

    private final String sdkKey;
    private final ClientOptions options;
    private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    private volatile Map<String, Object> flags = Collections.emptyMap();
    private final CountDownLatch readyLatch = new CountDownLatch(1);
    private final AtomicBoolean ready = new AtomicBoolean(false);
    private final AtomicBoolean closed = new AtomicBoolean(false);
    private final ScheduledExecutorService executor;

    private volatile Consumer<Void> onReady;
    private volatile Consumer<Exception> onError;
    private volatile Consumer<Map<String, Object>> onUpdate;

    public FeatureSignalsClient(String sdkKey, ClientOptions options) {
        if (sdkKey == null || sdkKey.isEmpty()) throw new IllegalArgumentException("sdkKey required");
        this.sdkKey = sdkKey;
        this.options = options;
        this.executor = Executors.newScheduledThreadPool(1, r -> {
            Thread t = new Thread(r, "fs-sdk-bg");
            t.setDaemon(true);
            return t;
        });

        try {
            refresh();
            markReady();
        } catch (Exception e) {
            emitError(e);
        }

        if (options.isStreaming()) {
            executor.submit(this::sseLoop);
        } else {
            executor.scheduleAtFixedRate(() -> {
                try {
                    refresh();
                    markReady();
                } catch (Exception e) {
                    emitError(e);
                }
            }, options.getPollingInterval().toMillis(), options.getPollingInterval().toMillis(), TimeUnit.MILLISECONDS);
        }
    }

    // ── Flag access ──────────────────────────────────────────

    public boolean boolVariation(String key, EvalContext ctx, boolean fallback) {
        Object val = getFlag(key);
        return val instanceof Boolean ? (Boolean) val : fallback;
    }

    public String stringVariation(String key, EvalContext ctx, String fallback) {
        Object val = getFlag(key);
        return val instanceof String ? (String) val : fallback;
    }

    public double numberVariation(String key, EvalContext ctx, double fallback) {
        Object val = getFlag(key);
        return val instanceof Number ? ((Number) val).doubleValue() : fallback;
    }

    // Safe because callers provide a typed fallback that constrains T at the call site.
    // Type erasure prevents a runtime check, but a ClassCastException at the call
    // site is the correct behavior if the stored value doesn't match the expected type.
    @SuppressWarnings("unchecked")
    public <T> T jsonVariation(String key, EvalContext ctx, T fallback) {
        Object val = getFlag(key);
        if (val == null) return fallback;
        try {
            return (T) val;
        } catch (ClassCastException e) {
            return fallback;
        }
    }

    public Map<String, Object> allFlags() {
        lock.readLock().lock();
        try {
            return Map.copyOf(flags);
        } finally {
            lock.readLock().unlock();
        }
    }

    public boolean isReady() { return ready.get(); }

    public boolean waitForReady(long timeoutMs) throws InterruptedException {
        return readyLatch.await(timeoutMs, TimeUnit.MILLISECONDS);
    }

    @Override
    public void close() {
        if (closed.compareAndSet(false, true)) {
            executor.shutdownNow();
        }
    }

    // ── Callbacks ────────────────────────────────────────────

    public void setOnReady(Consumer<Void> cb) { this.onReady = cb; }
    public void setOnError(Consumer<Exception> cb) { this.onError = cb; }
    public void setOnUpdate(Consumer<Map<String, Object>> cb) { this.onUpdate = cb; }

    // ── Internals ────────────────────────────────────────────

    private Object getFlag(String key) {
        lock.readLock().lock();
        try {
            return flags.get(key);
        } finally {
            lock.readLock().unlock();
        }
    }

    private void setFlags(Map<String, Object> newFlags) {
        lock.writeLock().lock();
        try {
            this.flags = newFlags;
        } finally {
            lock.writeLock().unlock();
        }
        if (onUpdate != null) {
            try { onUpdate.accept(Map.copyOf(newFlags)); } catch (Exception ignored) {}
        }
    }

    private void markReady() {
        if (ready.compareAndSet(false, true)) {
            readyLatch.countDown();
            if (onReady != null) {
                try { onReady.accept(null); } catch (Exception ignored) {}
            }
        }
    }

    private void emitError(Exception e) {
        log.log(Level.WARNING, "featuresignals: " + e.getMessage(), e);
        if (onError != null) {
            try { onError.accept(e); } catch (Exception ignored) {}
        }
    }

    void refresh() throws Exception {
        String envKey = URLEncoder.encode(options.getEnvKey(), StandardCharsets.UTF_8);
        String ctxKey = URLEncoder.encode(options.getContext().getKey(), StandardCharsets.UTF_8);
        String url = options.getBaseURL() + "/v1/client/" + envKey + "/flags?key=" + ctxKey;

        HttpURLConnection conn = (HttpURLConnection) URI.create(url).toURL().openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("X-API-Key", sdkKey);
        conn.setRequestProperty("Accept", "application/json");
        conn.setConnectTimeout((int) options.getTimeout().toMillis());
        conn.setReadTimeout((int) options.getTimeout().toMillis());

        try {
            int status = conn.getResponseCode();
            if (status != 200) {
                throw new FeatureSignalsException("flag refresh failed: HTTP " + status, status);
            }
            try (var reader = new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8)) {
                Map<String, Object> result = gson.fromJson(reader, FLAG_MAP_TYPE);
                setFlags(result != null ? result : Collections.emptyMap());
            }
        } finally {
            conn.disconnect();
        }
    }

    private void sseLoop() {
        long backoffMs = BACKOFF_INITIAL_MS;
        while (!closed.get()) {
            long connectedAtMs = System.nanoTime() / 1_000_000;
            try {
                connectSSE();
            } catch (Exception e) {
                if (closed.get()) return;
                emitError(e);
            }
            if (closed.get()) return;

            long connectionDurationMs = (System.nanoTime() / 1_000_000) - connectedAtMs;
            if (connectionDurationMs > BACKOFF_MAX_MS) {
                backoffMs = BACKOFF_INITIAL_MS;
            }

            long sleepMs = withJitter(backoffMs);
            try {
                Thread.sleep(sleepMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
            backoffMs = Math.min((long) (backoffMs * BACKOFF_MULTIPLIER), BACKOFF_MAX_MS);
        }
    }

    private static long withJitter(long baseMs) {
        long jitter = (long) (baseMs * BACKOFF_JITTER_FACTOR * ThreadLocalRandom.current().nextDouble());
        return baseMs + jitter;
    }

    private void connectSSE() throws Exception {
        String envKey = URLEncoder.encode(options.getEnvKey(), StandardCharsets.UTF_8);
        String apiKey = URLEncoder.encode(sdkKey, StandardCharsets.UTF_8);
        String url = options.getBaseURL() + "/v1/stream/" + envKey + "?api_key=" + apiKey;

        HttpURLConnection conn = (HttpURLConnection) URI.create(url).toURL().openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Accept", "text/event-stream");
        conn.setRequestProperty("Cache-Control", "no-cache");
        conn.setConnectTimeout((int) options.getTimeout().toMillis());
        conn.setReadTimeout(0);

        try {
            int status = conn.getResponseCode();
            if (status != 200) {
                throw new FeatureSignalsException("SSE connection failed: HTTP " + status, status);
            }

            try (var br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                String eventType = "";
                String line;
                while ((line = br.readLine()) != null) {
                    if (closed.get()) return;
                    if (line.startsWith("event:")) {
                        eventType = line.substring(6).trim();
                    } else if (line.startsWith("data:")) {
                        if ("flag-update".equals(eventType)) {
                            try {
                                refresh();
                            } catch (Exception e) {
                                emitError(e);
                            }
                        }
                        eventType = "";
                    }
                }
            }
        } finally {
            conn.disconnect();
        }
    }
}
