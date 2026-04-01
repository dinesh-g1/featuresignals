package com.featuresignals.sdk;

import java.time.Duration;

public class ClientOptions {
    private String envKey;
    private String baseURL = "https://api.featuresignals.com";
    private Duration pollingInterval = Duration.ofSeconds(30);
    private boolean streaming = false;
    private Duration sseRetry = Duration.ofSeconds(5);
    private Duration timeout = Duration.ofSeconds(10);
    private EvalContext context = new EvalContext("server");

    public ClientOptions(String envKey) {
        if (envKey == null || envKey.isEmpty()) throw new IllegalArgumentException("envKey is required");
        this.envKey = envKey;
    }

    public String getEnvKey() { return envKey; }
    public String getBaseURL() { return baseURL; }
    public Duration getPollingInterval() { return pollingInterval; }
    public boolean isStreaming() { return streaming; }
    public Duration getSseRetry() { return sseRetry; }
    public Duration getTimeout() { return timeout; }
    public EvalContext getContext() { return context; }

    public ClientOptions baseURL(String url) { this.baseURL = url; return this; }
    public ClientOptions pollingInterval(Duration d) { this.pollingInterval = d; return this; }
    public ClientOptions streaming(boolean s) { this.streaming = s; return this; }
    public ClientOptions sseRetry(Duration d) { this.sseRetry = d; return this; }
    public ClientOptions timeout(Duration d) { this.timeout = d; return this; }
    public ClientOptions context(EvalContext ctx) { this.context = ctx; return this; }
}
