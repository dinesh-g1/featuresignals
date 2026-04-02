using System.Text.Json;

namespace FeatureSignals.OpenFeature;

/// <summary>
/// OpenFeature-compatible provider backed by <see cref="FeatureSignalsClient"/>.
/// </summary>
public sealed class FeatureSignalsProvider : IDisposable
{
    private readonly FeatureSignalsClient _client;

    public FeatureSignalsProvider(string sdkKey, ClientOptions options)
    {
        _client = new FeatureSignalsClient(sdkKey, options);
    }

    public string Name => "featuresignals";

    public FeatureSignalsClient Client => _client;

    public ResolutionDetails<bool> ResolveBooleanEvaluation(
        string flagKey, bool defaultValue, EvalContext? context = null)
    {
        return Resolve(flagKey, defaultValue, val =>
            val is true or false ? (bool)val : throw new InvalidCastException());
    }

    public ResolutionDetails<string> ResolveStringEvaluation(
        string flagKey, string defaultValue, EvalContext? context = null)
    {
        return Resolve(flagKey, defaultValue, val =>
            val is string s ? s : throw new InvalidCastException());
    }

    public ResolutionDetails<double> ResolveNumberEvaluation(
        string flagKey, double defaultValue, EvalContext? context = null)
    {
        return Resolve(flagKey, defaultValue, val => val switch
        {
            long l => l,
            double d => d,
            int i => i,
            _ => throw new InvalidCastException()
        });
    }

    public ResolutionDetails<T> ResolveObjectEvaluation<T>(
        string flagKey, T defaultValue, EvalContext? context = null)
    {
        var flags = _client.AllFlags();
        if (!flags.TryGetValue(flagKey, out var raw))
        {
            return new ResolutionDetails<T>
            {
                Value = defaultValue,
                ErrorCode = ErrorCode.FlagNotFound,
                ErrorMessage = $"flag '{flagKey}' not found"
            };
        }

        try
        {
            if (raw is T typed)
                return new ResolutionDetails<T> { Value = typed };

            var json = JsonSerializer.Serialize(raw);
            var deserialized = JsonSerializer.Deserialize<T>(json);
            return new ResolutionDetails<T> { Value = deserialized! };
        }
        catch
        {
            return new ResolutionDetails<T>
            {
                Value = defaultValue,
                ErrorCode = ErrorCode.TypeMismatch,
                ErrorMessage = $"cannot convert to {typeof(T).Name}"
            };
        }
    }

    public void Shutdown() => _client.Dispose();

    public void Dispose() => Shutdown();

    private ResolutionDetails<T> Resolve<T>(
        string flagKey, T defaultValue, Func<object?, T> cast)
    {
        var flags = _client.AllFlags();
        if (!flags.TryGetValue(flagKey, out var raw))
        {
            return new ResolutionDetails<T>
            {
                Value = defaultValue,
                ErrorCode = ErrorCode.FlagNotFound,
                ErrorMessage = $"flag '{flagKey}' not found"
            };
        }

        try
        {
            return new ResolutionDetails<T> { Value = cast(raw) };
        }
        catch
        {
            return new ResolutionDetails<T>
            {
                Value = defaultValue,
                ErrorCode = ErrorCode.TypeMismatch,
                ErrorMessage = $"expected {typeof(T).Name}, got {raw?.GetType().Name ?? "null"}"
            };
        }
    }
}
