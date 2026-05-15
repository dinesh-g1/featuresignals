package com.featuresignals.abm;

/**
 * Configuration for the ABM client.
 *
 * <p>All configuration is via this class. Use the builder pattern or the
 * constructor for required fields. All time values are in seconds except
 * {@code timeoutMs} which is in milliseconds.
 *
 * <h3>Usage</h3>
 * <pre>{@code
 * ABMConfig config = ABMConfig.builder()
 *     .environmentKey("fs_env_abc123")
 *     .cacheTtlSeconds(10)
 *     .build();
 * }</pre>
 *
 * <p>See: product/wiki/public/ABM_SDK_SPECIFICATION.md §2.3
 * PRS Requirement IDs: FS-S1-ABM-001 through FS-S1-ABM-008
 */
public final class ABMConfig {

    private final String environmentKey;
    private final String baseUrl;
    private final int cacheTtlSeconds;
    private final int maxCacheEntries;
    private final long timeoutMs;

    private ABMConfig(Builder builder) {
        if (builder.environmentKey == null || builder.environmentKey.isBlank()) {
            throw new IllegalArgumentException("environmentKey is required");
        }
        this.environmentKey = builder.environmentKey;
        this.baseUrl = builder.baseUrl != null ? builder.baseUrl : "https://app.featuresignals.io";
        this.cacheTtlSeconds = builder.cacheTtlSeconds > 0 ? builder.cacheTtlSeconds : 10;
        this.maxCacheEntries = builder.maxCacheEntries > 0 ? builder.maxCacheEntries : 10_000;
        this.timeoutMs = builder.timeoutMs > 0 ? builder.timeoutMs : 5_000;
    }

    /** Server-side environment key for the ABM API. */
    public String getEnvironmentKey() {
        return environmentKey;
    }

    /** FeatureSignals API base URL. Default: {@code https://app.featuresignals.io} */
    public String getBaseUrl() {
        return baseUrl;
    }

    /** How long resolved behaviors are cached locally (seconds). Default: 10. */
    public int getCacheTtlSeconds() {
        return cacheTtlSeconds;
    }

    /** Maximum number of cache entries before LRU eviction. Default: 10,000. */
    public int getMaxCacheEntries() {
        return maxCacheEntries;
    }

    /** HTTP request timeout in milliseconds. Default: 5,000. */
    public long getTimeoutMs() {
        return timeoutMs;
    }

    /** Create a new {@link Builder}. */
    public static Builder builder() {
        return new Builder();
    }

    /** Builder for {@link ABMConfig}. */
    public static final class Builder {
        private String environmentKey;
        private String baseUrl;
        private int cacheTtlSeconds;
        private int maxCacheEntries;
        private long timeoutMs;

        /** @param environmentKey Server-side environment key (required). */
        public Builder environmentKey(String environmentKey) {
            this.environmentKey = environmentKey;
            return this;
        }

        /** @param baseUrl FeatureSignals API base URL. */
        public Builder baseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
            return this;
        }

        /** @param cacheTtlSeconds Cache TTL in seconds (default 10). */
        public Builder cacheTtlSeconds(int cacheTtlSeconds) {
            this.cacheTtlSeconds = cacheTtlSeconds;
            return this;
        }

        /** @param maxCacheEntries Max cache entries before LRU eviction (default 10000). */
        public Builder maxCacheEntries(int maxCacheEntries) {
            this.maxCacheEntries = maxCacheEntries;
            return this;
        }

        /** @param timeoutMs HTTP request timeout in ms (default 5000). */
        public Builder timeoutMs(long timeoutMs) {
            this.timeoutMs = timeoutMs;
            return this;
        }

        /** Build the immutable {@link ABMConfig}. */
        public ABMConfig build() {
            return new ABMConfig(this);
        }
    }
}
