using System.Text.Json.Serialization;

namespace FeatureSignals.ABM;

/// <summary>
/// An agent behavior event for analytics and billing.
/// </summary>
/// <remarks>
/// JSON wire format uses snake_case; C# properties use PascalCase with
/// <see cref="JsonPropertyNameAttribute"/> for mapping.
/// <para>
/// PRS Requirement IDs: FS-S1-ABM-001 through FS-S1-ABM-008
/// </para>
/// </remarks>
public sealed class TrackEvent
{
    /// <summary>The behavior key this event relates to.</summary>
    [JsonPropertyName("behavior_key")]
    public string BehaviorKey { get; }

    /// <summary>Unique identifier for the agent instance.</summary>
    [JsonPropertyName("agent_id")]
    public string AgentId { get; }

    /// <summary>The variant that was applied.</summary>
    [JsonPropertyName("variant")]
    public string Variant { get; }

    /// <summary>The event name (e.g., "behavior.applied", "behavior.error").</summary>
    [JsonPropertyName("event")]
    public string Event { get; }

    /// <summary>Optional numeric value (e.g., cost, latency, tokens).</summary>
    [JsonPropertyName("value")]
    public double? Value { get; }

    /// <summary>UTC timestamp (RFC 3339). Set by SDK if not provided.</summary>
    [JsonPropertyName("timestamp")]
    public string Timestamp { get; }

    /// <summary>Creates a TrackEvent.</summary>
    public TrackEvent(
        string behaviorKey,
        string agentId,
        string variant,
        string @event,
        double? value = null,
        string? timestamp = null)
    {
        BehaviorKey = behaviorKey;
        AgentId = agentId;
        Variant = variant;
        Event = @event;
        Value = value;
        Timestamp = timestamp ?? DateTime.UtcNow.ToString("O");
    }

    /// <inheritdoc />
    public override string ToString() =>
        $"TrackEvent {{ BehaviorKey = {BehaviorKey}, AgentId = {AgentId}, " +
        $"Variant = {Variant}, Event = {Event}, Value = {Value} }}";
}
