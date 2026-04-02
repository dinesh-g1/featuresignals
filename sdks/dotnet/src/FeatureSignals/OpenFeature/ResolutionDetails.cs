namespace FeatureSignals.OpenFeature;

public enum ErrorCode
{
    None,
    FlagNotFound,
    TypeMismatch,
    General
}

/// <summary>
/// Result of an OpenFeature flag evaluation.
/// </summary>
public sealed class ResolutionDetails<T>
{
    public required T Value { get; init; }
    public string Reason { get; init; } = "CACHED";
    public ErrorCode ErrorCode { get; init; } = ErrorCode.None;
    public string? ErrorMessage { get; init; }
}
