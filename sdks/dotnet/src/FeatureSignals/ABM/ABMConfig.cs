namespace FeatureSignals.ABM;

/// <summary>
/// Configuration for the ABM client.
/// </summary>
/// <remarks>
/// All configuration is via this class. Use the constructor for required
/// fields and property initializers for optional ones.
/// <para>
/// See: product/wiki/public/ABM_SDK_SPECIFICATION.md §2.3
/// PRS Requirement IDs: FS-S1-ABM-001 through FS-S1-ABM-008
/// </para>
/// </remarks>
public sealed class ABMConfig
{
    /// <summary>
    /// Server-side environment key for the ABM API. Required.
    /// </summary>
    public string EnvironmentKey { get; }

    /// <summary>
    /// FeatureSignals API base URL. Default: "https://app.featuresignals.io"
    /// </summary>
    public string BaseUrl { get; init; } = "https://app.featuresignals.io";

    /// <summary>
    /// How long resolved behaviors are cached locally (seconds). Default: 10.
    /// Set to 0 to disable caching.
    /// </summary>
    public int CacheTtlSeconds { get; init; } = 10;

    /// <summary>
    /// Maximum number of cache entries before LRU eviction. Default: 10,000.
    /// </summary>
    public int MaxCacheEntries { get; init; } = 10_000;

    /// <summary>
    /// HTTP request timeout in milliseconds. Default: 5,000.
    /// </summary>
    public int TimeoutMs { get; init; } = 5_000;

    /// <summary>
    /// Creates a new ABM configuration.
    /// </summary>
    /// <param name="environmentKey">Server-side environment key (required).</param>
    /// <exception cref="ArgumentException">If environmentKey is null or empty.</exception>
    public ABMConfig(string environmentKey)
    {
        if (string.IsNullOrWhiteSpace(environmentKey))
            throw new ArgumentException("environmentKey is required", nameof(environmentKey));
        EnvironmentKey = environmentKey;
    }
}
