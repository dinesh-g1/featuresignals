package com.featuresignals.sdk;

import dev.openfeature.sdk.EvaluationContext;
import dev.openfeature.sdk.FeatureProvider;
import dev.openfeature.sdk.Metadata;
import dev.openfeature.sdk.ProviderEvaluation;
import dev.openfeature.sdk.ErrorCode;
import dev.openfeature.sdk.Reason;
import dev.openfeature.sdk.Structure;
import dev.openfeature.sdk.Value;
import dev.openfeature.sdk.Hook;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * OpenFeature-compliant provider backed by {@link FeatureSignalsClient}.
 *
 * <p>Implements the OpenFeature {@link FeatureProvider} interface. All evaluations
 * are local lookups against the client's cached flags &mdash; no network calls per
 * evaluation.
 *
 * <pre>{@code
 * FeatureSignalsProvider provider = new FeatureSignalsProvider("sdk-key", options);
 * OpenFeatureAPI.getInstance().setProviderAndWait(provider);
 * Client client = OpenFeatureAPI.getInstance().getClient();
 * boolean enabled = client.getBooleanValue("dark-mode", false);
 * }</pre>
 */
public class FeatureSignalsProvider implements FeatureProvider, AutoCloseable {

    private final FeatureSignalsClient client;

    public FeatureSignalsProvider(String sdkKey, ClientOptions options) {
        this.client = new FeatureSignalsClient(sdkKey, options);
    }

    public FeatureSignalsClient getClient() {
        return client;
    }

    @Override
    public Metadata getMetadata() {
        return () -> "FeatureSignals";
    }

    @Override
    public List<Hook> getProviderHooks() {
        return Collections.emptyList();
    }

    @Override
    public void initialize(EvaluationContext evaluationContext) throws Exception {
        client.waitForReady(30_000);
    }

    @Override
    public void shutdown() {
        client.close();
    }

    @Override
    public ProviderEvaluation<Boolean> getBooleanEvaluation(
            String flagKey, Boolean defaultValue, EvaluationContext ctx) {
        return resolve(flagKey, defaultValue, Boolean.class);
    }

    @Override
    public ProviderEvaluation<String> getStringEvaluation(
            String flagKey, String defaultValue, EvaluationContext ctx) {
        return resolve(flagKey, defaultValue, String.class);
    }

    @Override
    public ProviderEvaluation<Integer> getIntegerEvaluation(
            String flagKey, Integer defaultValue, EvaluationContext ctx) {
        Map<String, Object> flags = client.allFlags();
        Object val = flags.get(flagKey);
        if (val == null && !flags.containsKey(flagKey)) {
            return ProviderEvaluation.<Integer>builder()
                    .value(defaultValue)
                    .reason(Reason.ERROR.toString())
                    .errorCode(ErrorCode.FLAG_NOT_FOUND)
                    .errorMessage("flag '" + flagKey + "' not found")
                    .build();
        }
        if (val instanceof Number) {
            return ProviderEvaluation.<Integer>builder()
                    .value(((Number) val).intValue())
                    .reason(Reason.CACHED.toString())
                    .build();
        }
        return ProviderEvaluation.<Integer>builder()
                .value(defaultValue)
                .reason(Reason.ERROR.toString())
                .errorCode(ErrorCode.TYPE_MISMATCH)
                .errorMessage("expected numeric, got " + (val == null ? "null" : val.getClass().getSimpleName()))
                .build();
    }

    @Override
    public ProviderEvaluation<Double> getDoubleEvaluation(
            String flagKey, Double defaultValue, EvaluationContext ctx) {
        Map<String, Object> flags = client.allFlags();
        Object val = flags.get(flagKey);
        if (val == null && !flags.containsKey(flagKey)) {
            return ProviderEvaluation.<Double>builder()
                    .value(defaultValue)
                    .reason(Reason.ERROR.toString())
                    .errorCode(ErrorCode.FLAG_NOT_FOUND)
                    .errorMessage("flag '" + flagKey + "' not found")
                    .build();
        }
        if (val instanceof Number) {
            return ProviderEvaluation.<Double>builder()
                    .value(((Number) val).doubleValue())
                    .reason(Reason.CACHED.toString())
                    .build();
        }
        return ProviderEvaluation.<Double>builder()
                .value(defaultValue)
                .reason(Reason.ERROR.toString())
                .errorCode(ErrorCode.TYPE_MISMATCH)
                .errorMessage("expected numeric, got " + (val == null ? "null" : val.getClass().getSimpleName()))
                .build();
    }

    @Override
    public ProviderEvaluation<Value> getObjectEvaluation(
            String flagKey, Value defaultValue, EvaluationContext ctx) {
        Map<String, Object> flags = client.allFlags();
        Object val = flags.get(flagKey);
        if (val == null && !flags.containsKey(flagKey)) {
            return ProviderEvaluation.<Value>builder()
                    .value(defaultValue)
                    .reason(Reason.ERROR.toString())
                    .errorCode(ErrorCode.FLAG_NOT_FOUND)
                    .errorMessage("flag '" + flagKey + "' not found")
                    .build();
        }
        try {
            return ProviderEvaluation.<Value>builder()
                    .value(new Value(val))
                    .reason(Reason.CACHED.toString())
                    .build();
        } catch (InstantiationException e) {
            return ProviderEvaluation.<Value>builder()
                    .value(defaultValue)
                    .reason(Reason.ERROR.toString())
                    .errorCode(ErrorCode.TYPE_MISMATCH)
                    .errorMessage("unsupported value type: " +
                            (val == null ? "null" : val.getClass().getSimpleName()))
                    .build();
        }
    }

    @Override
    public void close() {
        shutdown();
    }

    @SuppressWarnings("unchecked")
    private <T> ProviderEvaluation<T> resolve(String flagKey, T defaultValue, Class<T> type) {
        Map<String, Object> flags = client.allFlags();
        Object val = flags.get(flagKey);
        if (val == null && !flags.containsKey(flagKey)) {
            return ProviderEvaluation.<T>builder()
                    .value(defaultValue)
                    .reason(Reason.ERROR.toString())
                    .errorCode(ErrorCode.FLAG_NOT_FOUND)
                    .errorMessage("flag '" + flagKey + "' not found")
                    .build();
        }
        if (type.isInstance(val)) {
            return ProviderEvaluation.<T>builder()
                    .value((T) val)
                    .reason(Reason.CACHED.toString())
                    .build();
        }
        return ProviderEvaluation.<T>builder()
                .value(defaultValue)
                .reason(Reason.ERROR.toString())
                .errorCode(ErrorCode.TYPE_MISMATCH)
                .errorMessage("expected " + type.getSimpleName() + ", got " +
                        (val == null ? "null" : val.getClass().getSimpleName()))
                .build();
    }
}
