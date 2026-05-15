package com.featuresignals.abm;

import com.google.gson.annotations.SerializedName;

import java.util.Collections;
import java.util.Map;

/**
 * Result of resolving a behavior.
 *
 * <p>The SDK MUST NOT throw on errors — it always returns a fallback response.
 * See ABM_SDK_SPECIFICATION.md §3.
 *
 * <p>JSON wire format uses snake_case; Java fields use camelCase with
 * {@link SerializedName} annotations for mapping.
 *
 * <p>PRS Requirement IDs: FS-S1-ABM-001 through FS-S1-ABM-008
 */
public final class ResolveResponse {

    @SerializedName("behavior_key")
    private final String behaviorKey;

    @SerializedName("variant")
    private final String variant;

    @SerializedName("configuration")
    private final Map<String, Object> configuration;

    @SerializedName("reason")
    private final String reason;

    @SerializedName("cache_ttl_seconds")
    private final int cacheTtlSeconds;

    @SerializedName("evaluated_at")
    private final String evaluatedAt;

    /** Creates a ResolveResponse with all fields. */
    public ResolveResponse(
            String behaviorKey,
            String variant,
            Map<String, Object> configuration,
            String reason,
            int cacheTtlSeconds,
            String evaluatedAt) {
        this.behaviorKey = behaviorKey;
        this.variant = variant;
        this.configuration = configuration != null
                ? Collections.unmodifiableMap(configuration)
                : Collections.emptyMap();
        this.reason = reason;
        this.cacheTtlSeconds = cacheTtlSeconds;
        this.evaluatedAt = evaluatedAt;
    }

    /** Creates a fallback response (used on errors per spec §3). */
    public static ResolveResponse fallback(String behaviorKey, String variant,
                                           Map<String, Object> configuration,
                                           String reason, int cacheTtlSeconds) {
        return new ResolveResponse(
                behaviorKey,
                variant != null ? variant : "",
                configuration != null ? configuration : Collections.emptyMap(),
                reason != null ? reason : "fallback",
                cacheTtlSeconds,
                java.time.Instant.now().toString()
        );
    }

    /** The behavior key that was resolved. */
    public String getBehaviorKey() { return behaviorKey; }

    /** The selected variant name. Empty string on 404/fallback. */
    public String getVariant() { return variant; }

    /** Arbitrary configuration for the variant (unmodifiable). */
    public Map<String, Object> getConfiguration() { return configuration; }

    /** Why this variant was selected. */
    public String getReason() { return reason; }

    /** Cache TTL in seconds, as recommended by the server. */
    public int getCacheTtlSeconds() { return cacheTtlSeconds; }

    /** UTC timestamp of resolution (RFC 3339). */
    public String getEvaluatedAt() { return evaluatedAt; }

    @Override
    public String toString() {
        return "ResolveResponse{" +
                "behaviorKey='" + behaviorKey + '\'' +
                ", variant='" + variant + '\'' +
                ", reason='" + reason + '\'' +
                ", cacheTtlSeconds=" + cacheTtlSeconds +
                ", evaluatedAt='" + evaluatedAt + '\'' +
                '}';
    }
}
