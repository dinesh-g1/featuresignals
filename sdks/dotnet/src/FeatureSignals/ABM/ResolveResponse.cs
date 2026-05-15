using System.Text.Json.Serialization;

namespace FeatureSignals.ABM;

/// <summary>
/// Result of resolving a behavior.
/// </summary>
/// <remarks>
/// The SDK MUST NOT throw on errors — it always returns a fallback response.
/// See ABM_SDK_SPECIFICATION.md §3.
/// <para>
/// JSON wire format uses snake_case; C# properties use PascalCase with
/// <see cref="JsonPropertyNameAttribute"/> for mapping.
/// </para>
/// <para>
/// PRS Requirement IDs: FS-S1-ABM-001 through FS-S1-ABM-008
/// </para>
/// </remarks>
public sealed class ResolveResponse
{
    /// <summary>The behavior key that was resolved.</summary>
    [JsonPropertyName("behavior_key")]
    public string BehaviorKey { get; }

    /// <summary>The selected variant name. Empty string on 404/fallback.</summary>
    [JsonPropertyName("variant")]
    public string Variant { get; }

    /// <summary>Arbitrary configuration for the variant.</summary>
    [JsonPropertyName("configuration")]
    public IReadOnlyDictionary<string, object?> Configuration { get; }

    /// <summary>Why this variant was selected.</summary>
    [JsonPropertyName("reason")]
    public string Reason { get; }

    /// <summary>Cache TTL in seconds, as recommended by the server.</summary>
    [JsonPropertyName("cache_ttl_seconds")]
    public int CacheTtlSeconds { get; }

    /// <summary>UTC timestamp of resolution (RFC 3339).</summary>
    [JsonPropertyName("evaluated_at")]
    public string EvaluatedAt { get; }

    /// <summary>Creates a ResolveResponse with all fields.</summary>
    public ResolveResponse(
        string behaviorKey,
        string variant,
        IReadOnlyDictionary<string, object?> configuration,
        string reason,
        int cacheTtlSeconds,
        string evaluatedAt)
    {
        BehaviorKey = behaviorKey;
        Variant = variant;
        Configuration = configuration ?? new Dictionary<string, object?>();
        Reason = reason;
        CacheTtlSeconds = cacheTtlSeconds;
        EvaluatedAt = evaluatedAt;
    }

    /// <summary>Creates a fallback response (used on errors per spec §3).</summary>
    public static ResolveResponse Fallback(
        string behaviorKey,
        string? variant = null,
        IReadOnlyDictionary<string, object?>? configuration = null,
        string? reason = null,
        int cacheTtlSeconds = 10)
    {
        return new ResolveResponse(
            behaviorKey,
            variant ?? string.Empty,
            configuration ?? new Dictionary<string, object?>(),
            reason ?? "fallback",
            cacheTtlSeconds,
            DateTime.UtcNow.ToString("O")
        );
    }

    /// <inheritdoc />
    public override string ToString() =>
        $"ResolveResponse {{ BehaviorKey = {BehaviorKey}, Variant = {Variant}, " +
        $"Reason = {Reason}, CacheTtlSeconds = {CacheTtlSeconds}, EvaluatedAt = {EvaluatedAt} }}";
}
