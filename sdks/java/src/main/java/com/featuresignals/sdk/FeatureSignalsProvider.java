package com.featuresignals.sdk;

import java.util.Map;

/**
 * OpenFeature-compatible provider backed by FeatureSignalsClient.
 *
 * <p>Implements the resolution methods that the OpenFeature Java SDK expects.
 * Can be used directly without the OpenFeature dependency.
 */
public class FeatureSignalsProvider implements AutoCloseable {
    private final FeatureSignalsClient client;

    public FeatureSignalsProvider(String sdkKey, ClientOptions options) {
        this.client = new FeatureSignalsClient(sdkKey, options);
    }

    public FeatureSignalsClient getClient() { return client; }
    public String getName() { return "featuresignals"; }

    public ResolutionDetails<Boolean> resolveBooleanEvaluation(String flagKey, boolean defaultValue) {
        return resolve(flagKey, defaultValue, Boolean.class);
    }

    public ResolutionDetails<String> resolveStringEvaluation(String flagKey, String defaultValue) {
        return resolve(flagKey, defaultValue, String.class);
    }

    public ResolutionDetails<Double> resolveNumberEvaluation(String flagKey, double defaultValue) {
        Map<String, Object> flags = client.allFlags();
        Object val = flags.get(flagKey);
        if (val == null) {
            return new ResolutionDetails<>(defaultValue, "ERROR", "FLAG_NOT_FOUND");
        }
        if (val instanceof Number) {
            return new ResolutionDetails<>(((Number) val).doubleValue(), "CACHED", null);
        }
        return new ResolutionDetails<>(defaultValue, "ERROR", "TYPE_MISMATCH");
    }

    public ResolutionDetails<Object> resolveObjectEvaluation(String flagKey, Object defaultValue) {
        Map<String, Object> flags = client.allFlags();
        Object val = flags.get(flagKey);
        if (val == null) {
            return new ResolutionDetails<>(defaultValue, "ERROR", "FLAG_NOT_FOUND");
        }
        return new ResolutionDetails<>(val, "CACHED", null);
    }

    @Override
    public void close() {
        client.close();
    }

    @SuppressWarnings("unchecked")
    private <T> ResolutionDetails<T> resolve(String flagKey, T defaultValue, Class<T> type) {
        Map<String, Object> flags = client.allFlags();
        Object val = flags.get(flagKey);
        if (val == null) {
            return new ResolutionDetails<>(defaultValue, "ERROR", "FLAG_NOT_FOUND");
        }
        if (type.isInstance(val)) {
            return new ResolutionDetails<>((T) val, "CACHED", null);
        }
        return new ResolutionDetails<>(defaultValue, "ERROR", "TYPE_MISMATCH");
    }

    public record ResolutionDetails<T>(T value, String reason, String errorCode) {}
}
