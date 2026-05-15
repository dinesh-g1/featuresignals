package com.featuresignals.abm;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.logging.Logger;

/**
 * Client for the FeatureSignals Agent Behavior Mesh (ABM).
 *
 * <p>Resolves which behavior variant an agent should use and tracks agent
 * actions for analytics. Resolved behaviors are cached locally for fast access.
 *
 * <h3>Error Handling</h3>
 * Per ABM_SDK_SPECIFICATION.md §3, this client MUST NOT throw on resolve
 * errors. All errors result in a fallback response with
 * {@code reason: "fallback"}.
 *
 * <h3>Thread Safety</h3>
 * This client is thread-safe. Resolve operations use a {@link ReentrantReadWriteLock}
 * for the cache. Track operations use a concurrent buffer protected by
 * synchronization.
 *
 * <h3>Usage</h3>
 * <pre>{@code
 * ABMClient client = new ABMClient(ABMConfig.builder()
 *     .environmentKey("fs_env_abc123")
 *     .build());
 *
 * ResolveResponse resp = client.resolve("model-selection", "agent-123", null);
 * System.out.println("Variant: " + resp.getVariant());
 *
 * client.track("model-selection", "agent-123", resp.getVariant(),
 *              "behavior.applied", null);
 *
 * client.close();
 * }</pre>
 *
 * <p>See: product/wiki/public/ABM_SDK_SPECIFICATION.md
 * PRS Requirement IDs: FS-S1-ABM-001 through FS-S1-ABM-008
 */
public final class ABMClient implements AutoCloseable {

    private static final Logger LOG = Logger.getLogger(ABMClient.class.getName());
    private static final Gson GSON = new Gson();

    // Per ABM_SDK_SPECIFICATION.md §4.
    private static final int BUFFER_MAX_SIZE = 256;
    private static final long FLUSH_INTERVAL_MS = 5_000;
    private static final long[] RETRY_BACKOFF_MS = {100, 1_000, 10_000};

    private final ABMConfig config;
    private final String baseUrl;
    private final HttpClient httpClient;
    private final int cacheTtlSeconds;

    // LRU cache: access-order LinkedHashMap with removeEldestEntry.
    // Key = "{behaviorKey}:{agentId}"
    private final LinkedHashMap<String, CacheEntry> cache;
    private final ReentrantReadWriteLock cacheLock = new ReentrantReadWriteLock();

    // Event buffering (per ABM_SDK_SPECIFICATION.md §4).
    private final List<TrackEvent> eventBuffer = new ArrayList<>();
    private final Object bufferLock = new Object();
    private volatile boolean flushing = false;
    private volatile boolean closed = false;
    private final ScheduledExecutorService flushScheduler;

    /**
     * Creates a new ABM client with the given configuration.
     *
     * @param config ABM configuration (environmentKey is required).
     * @throws IllegalArgumentException if environmentKey is empty.
     */
    public ABMClient(ABMConfig config) {
        this.config = config;
        this.baseUrl = config.getBaseUrl().replaceAll("/+$", "");
        this.cacheTtlSeconds = config.getCacheTtlSeconds();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(config.getTimeoutMs()))
                .build();

        // LRU cache using LinkedHashMap with access-order.
        int maxEntries = config.getMaxCacheEntries();
        this.cache = new LinkedHashMap<>(16, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, CacheEntry> eldest) {
                return size() > maxEntries;
            }
        };

        // Start periodic flush scheduler.
        this.flushScheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "fs-abm-flush");
            t.setDaemon(true);
            return t;
        });
        this.flushScheduler.scheduleWithFixedDelay(
                this::flushBuffer, FLUSH_INTERVAL_MS, FLUSH_INTERVAL_MS, TimeUnit.MILLISECONDS);
    }

    // ── Resolve (per contract) ────────────────────────────────────────────

    /**
     * Resolve which variant an agent should use for a behavior.
     *
     * <p>Results are cached locally. Use {@link #resolveFresh} to bypass cache.
     * <strong>Never throws</strong> — returns a fallback response on error.
     *
     * @param behaviorKey the behavior to resolve (e.g., "model-selection")
     * @param agentId     unique identifier for the agent instance
     * @param attributes  optional targeting attributes (may be null)
     * @return ResolveResponse with the variant and configuration
     */
    public ResolveResponse resolve(String behaviorKey, String agentId,
                                    Map<String, Object> attributes) {
        String cacheKey = behaviorKey + ":" + agentId;

        // Check cache first.
        if (cacheTtlSeconds > 0) {
            cacheLock.readLock().lock();
            try {
                CacheEntry entry = cache.get(cacheKey);
                if (entry != null && Instant.now().isBefore(entry.expiresAt)) {
                    return entry.response;
                }
            } finally {
                cacheLock.readLock().unlock();
            }
        }

        return resolveRemote(behaviorKey, agentId, attributes);
    }

    /**
     * Resolve a behavior bypassing the local cache.
     *
     * <p>Always fetches from the server. Use this when you need the latest
     * configuration regardless of cache state.
     * <strong>Never throws</strong> — returns a fallback response on error.
     */
    public ResolveResponse resolveFresh(String behaviorKey, String agentId,
                                         Map<String, Object> attributes) {
        return resolveRemote(behaviorKey, agentId, attributes);
    }

    private ResolveResponse resolveRemote(String behaviorKey, String agentId,
                                           Map<String, Object> attributes) {
        String url = baseUrl + "/v1/client/" + urlEncode(config.getEnvironmentKey()) + "/abm/resolve";

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("behavior_key", behaviorKey);
        requestBody.put("agent_id", agentId);
        requestBody.put("attributes", attributes != null ? attributes : Collections.emptyMap());

        String jsonBody = GSON.toJson(requestBody);

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofMillis(config.getTimeoutMs()))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + config.getEnvironmentKey())
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 404) {
                return ResolveResponse.fallback(behaviorKey, "", Collections.emptyMap(),
                        "default", cacheTtlSeconds);
            }

            if (response.statusCode() == 429) {
                String cacheKey = behaviorKey + ":" + agentId;
                cacheLock.readLock().lock();
                try {
                    CacheEntry cached = cache.get(cacheKey);
                    if (cached != null) {
                        return ResolveResponse.fallback(behaviorKey, cached.response.getVariant(),
                                cached.response.getConfiguration(), "fallback", cacheTtlSeconds);
                    }
                } finally {
                    cacheLock.readLock().unlock();
                }
                return ResolveResponse.fallback(behaviorKey, "", Collections.emptyMap(),
                        "fallback", cacheTtlSeconds);
            }

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                // 5xx or other error — return fallback with cached if available.
                String cacheKey = behaviorKey + ":" + agentId;
                cacheLock.readLock().lock();
                try {
                    CacheEntry cached = cache.get(cacheKey);
                    if (cached != null) {
                        return ResolveResponse.fallback(behaviorKey, cached.response.getVariant(),
                                cached.response.getConfiguration(), "fallback", cacheTtlSeconds);
                    }
                } finally {
                    cacheLock.readLock().unlock();
                }
                return ResolveResponse.fallback(behaviorKey, "", Collections.emptyMap(),
                        "fallback", cacheTtlSeconds);
            }

            // Parse successful response.
            Type mapType = new TypeToken<Map<String, Object>>() {}.getType();
            Map<String, Object> data = GSON.fromJson(response.body(), mapType);

            Object configObj = data.get("configuration");
            if (configObj == null) {
                configObj = data.get("config"); // Accept either wire format.
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> configuration = configObj instanceof Map
                    ? (Map<String, Object>) configObj
                    : Collections.emptyMap();

            String variant = data.get("variant") instanceof String
                    ? (String) data.get("variant") : "";
            String reason = data.get("reason") instanceof String
                    ? (String) data.get("reason") : "default";
            int ttlSeconds = data.get("cache_ttl_seconds") instanceof Number
                    ? ((Number) data.get("cache_ttl_seconds")).intValue()
                    : cacheTtlSeconds;
            String evaluatedAt = data.get("evaluated_at") instanceof String
                    ? (String) data.get("evaluated_at")
                    : Instant.now().toString();

            ResolveResponse result = new ResolveResponse(
                    behaviorKey, variant, configuration, reason, ttlSeconds, evaluatedAt);

            // Update cache.
            if (cacheTtlSeconds > 0) {
                int ttl = ttlSeconds > 0 ? ttlSeconds : cacheTtlSeconds;
                String cacheKey = behaviorKey + ":" + agentId;
                cacheLock.writeLock().lock();
                try {
                    cache.put(cacheKey, new CacheEntry(result, Instant.now().plusSeconds(ttl)));
                } finally {
                    cacheLock.writeLock().unlock();
                }
            }

            return result;
        } catch (Exception e) {
            // Network error or timeout — return fallback with cached if available.
            LOG.fine(() -> "ABM resolve error for " + behaviorKey + ": " + e.getMessage());
            String cacheKey = behaviorKey + ":" + agentId;
            cacheLock.readLock().lock();
            try {
                CacheEntry cached = cache.get(cacheKey);
                if (cached != null) {
                    return ResolveResponse.fallback(behaviorKey, cached.response.getVariant(),
                            cached.response.getConfiguration(), "fallback", cacheTtlSeconds);
                }
            } finally {
                cacheLock.readLock().unlock();
            }
            return ResolveResponse.fallback(behaviorKey, "", Collections.emptyMap(),
                    "fallback", cacheTtlSeconds);
        }
    }

    // ── Track (per contract) ──────────────────────────────────────────────

    /**
     * Record an agent behavior event for analytics and billing.
     *
     * <p>Events are queued in a local buffer and flushed periodically (every 5s)
     * or when the buffer reaches 256 events — whichever comes first.
     * Per ABM_SDK_SPECIFICATION.md §4. Tracking is fire-and-forget.
     *
     * @param behaviorKey the behavior key
     * @param agentId     the agent identifier
     * @param variant     the variant being tracked
     * @param event       the event name (e.g., "behavior.applied")
     * @param value       optional numeric value (may be null)
     */
    public void track(String behaviorKey, String agentId, String variant,
                       String event, Double value) {
        TrackEvent trackEvent = new TrackEvent(
                behaviorKey, agentId, variant, event, value, Instant.now().toString());
        enqueue(trackEvent);
    }

    /**
     * Record multiple events. They are added to the same buffer and flushed
     * together. Per ABM_SDK_SPECIFICATION.md §4.
     *
     * @param events list of TrackEvent objects
     */
    public void trackBatch(List<TrackEvent> events) {
        if (events == null || events.isEmpty()) return;
        String now = Instant.now().toString();
        for (TrackEvent evt : events) {
            // If timestamp not set, use now.
            if (evt.getTimestamp() == null) {
                evt = new TrackEvent(evt.getBehaviorKey(), evt.getAgentId(),
                        evt.getVariant(), evt.getEvent(), evt.getValue(), now);
            }
            enqueue(evt);
        }
    }

    // ── Event Buffering (spec §4) ─────────────────────────────────────────

    private void enqueue(TrackEvent event) {
        if (closed) return;
        synchronized (bufferLock) {
            eventBuffer.add(event);
            if (eventBuffer.size() >= BUFFER_MAX_SIZE) {
                flushBuffer();
            }
        }
    }

    private void flushBuffer() {
        List<TrackEvent> batch;
        synchronized (bufferLock) {
            if (eventBuffer.isEmpty() || flushing) return;
            batch = new ArrayList<>(eventBuffer);
            eventBuffer.clear();
            flushing = true;
        }
        sendBatchWithRetry(batch, 0);
    }

    private void sendBatchWithRetry(List<TrackEvent> events, int attempt) {
        String url = baseUrl + "/v1/client/" + urlEncode(config.getEnvironmentKey()) + "/abm/track";

        try {
            String jsonBody = GSON.toJson(events);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofMillis(config.getTimeoutMs()))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + config.getEnvironmentKey())
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString());

            flushing = false;

            if (response.statusCode() != 202 && response.statusCode() != 200) {
                LOG.fine(() -> "ABM track flush: status " + response.statusCode());
                retryOrDrop(events, attempt);
            }
        } catch (Exception e) {
            flushing = false;
            LOG.fine(() -> "ABM track flush error: " + e.getMessage());
            retryOrDrop(events, attempt);
        }
    }

    private void retryOrDrop(List<TrackEvent> events, int attempt) {
        if (attempt >= RETRY_BACKOFF_MS.length) {
            LOG.fine(() -> "ABM dropping " + events.size() + " events after " + attempt + " attempts");
            return;
        }
        long delay = RETRY_BACKOFF_MS[attempt];
        flushScheduler.schedule(() -> sendBatchWithRetry(events, attempt + 1),
                delay, TimeUnit.MILLISECONDS);
    }

    // ── Cache Management ──────────────────────────────────────────────────

    /**
     * Clear the local resolution cache for a specific behavior+agent pair.
     *
     * @param behaviorKey the behavior key to invalidate
     * @param agentId     the agent ID to invalidate
     */
    public void invalidateCache(String behaviorKey, String agentId) {
        String cacheKey = behaviorKey + ":" + agentId;
        cacheLock.writeLock().lock();
        try {
            cache.remove(cacheKey);
        } finally {
            cacheLock.writeLock().unlock();
        }
    }

    /** Clear all locally cached resolutions. */
    public void invalidateAllCache() {
        cacheLock.writeLock().lock();
        try {
            cache.clear();
        } finally {
            cacheLock.writeLock().unlock();
        }
    }

    /** Return the current number of cached entries (for observability). */
    public int cacheSize() {
        cacheLock.readLock().lock();
        try {
            return cache.size();
        } finally {
            cacheLock.readLock().unlock();
        }
    }

    /**
     * Clean up resources. Flushes pending events, shuts down the flush
     * scheduler. Safe to call multiple times. After close, the client
     * should not be used.
     */
    @Override
    public void close() {
        closed = true;
        flushScheduler.shutdown();
        try {
            if (!flushScheduler.awaitTermination(2, TimeUnit.SECONDS)) {
                flushScheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            flushScheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
        // Final flush.
        flushBuffer();
        invalidateAllCache();
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private static String urlEncode(String value) {
        // Basic URL encoding — sufficient for environment keys.
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8)
                .replace("+", "%20");
    }

    /** Cache entry with expiration. */
    private static final class CacheEntry {
        final ResolveResponse response;
        final Instant expiresAt;

        CacheEntry(ResolveResponse response, Instant expiresAt) {
            this.response = response;
            this.expiresAt = expiresAt;
        }
    }
}
