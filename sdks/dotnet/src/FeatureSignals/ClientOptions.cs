namespace FeatureSignals;

/// <summary>
/// Configuration options for <see cref="FeatureSignalsClient"/>.
/// </summary>
public sealed class ClientOptions
{
    /// <summary>Environment key identifying the flag environment.</summary>
    public required string EnvKey { get; init; }

    /// <summary>Base URL of the FeatureSignals API.</summary>
    public string BaseUrl { get; init; } = "https://api.featuresignals.com";

    /// <summary>How often to poll for flag updates when not using SSE.</summary>
    public TimeSpan PollingInterval { get; init; } = TimeSpan.FromSeconds(30);

    /// <summary>Enable Server-Sent Events streaming instead of polling.</summary>
    public bool Streaming { get; init; }

    /// <summary>Delay before reconnecting after an SSE connection drop.</summary>
    public TimeSpan SseRetry { get; init; } = TimeSpan.FromSeconds(5);

    /// <summary>HTTP request timeout.</summary>
    public TimeSpan Timeout { get; init; } = TimeSpan.FromSeconds(10);

    /// <summary>Default evaluation context used for flag fetches.</summary>
    public EvalContext? DefaultContext { get; init; }
}
