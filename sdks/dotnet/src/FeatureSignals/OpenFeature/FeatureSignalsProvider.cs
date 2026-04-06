using System.Text.Json;
using OpenFeature;
using OpenFeature.Model;

namespace FeatureSignals.OpenFeature;

/// <summary>
/// OpenFeature-compliant provider backed by <see cref="FeatureSignalsClient"/>.
///
/// All evaluations are local lookups against the client's cached flags.
///
/// <example>
/// <code>
/// var client = await FeatureSignalsClient.CreateAsync("sdk-key", new ClientOptions { EnvKey = "production" });
/// var provider = new FeatureSignalsProvider(client);
/// await Api.Instance.SetProviderAsync(provider);
/// var ofClient = Api.Instance.GetClient();
/// var enabled = await ofClient.GetBooleanValueAsync("dark-mode", false);
/// </code>
/// </example>
/// </summary>
public sealed class FeatureSignalsProvider : FeatureProvider, IDisposable
{
    private readonly FeatureSignalsClient _client;

    /// <summary>Creates a provider wrapping an existing client instance.</summary>
    public FeatureSignalsProvider(FeatureSignalsClient client)
    {
        _client = client;
    }

    /// <summary>Creates a provider that constructs its own client.</summary>
    public FeatureSignalsProvider(string sdkKey, ClientOptions options)
    {
        _client = new FeatureSignalsClient(sdkKey, options);
    }

    public FeatureSignalsClient Client => _client;

    public override Metadata GetMetadata() => new("FeatureSignals");

    public override async Task InitializeAsync(EvaluationContext context, CancellationToken cancellationToken = default)
    {
        await _client.WaitForReadyAsync(cancellationToken: cancellationToken);
    }

    public override Task ShutdownAsync(CancellationToken cancellationToken = default)
    {
        _client.Dispose();
        return Task.CompletedTask;
    }

    public override Task<ResolutionDetails<bool>> ResolveBooleanValueAsync(
        string flagKey, bool defaultValue, EvaluationContext? context = null, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(Resolve(flagKey, defaultValue, val =>
            val is true or false ? (bool)val : throw new InvalidCastException()));
    }

    public override Task<ResolutionDetails<string>> ResolveStringValueAsync(
        string flagKey, string defaultValue, EvaluationContext? context = null, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(Resolve(flagKey, defaultValue, val =>
            val is string s ? s : throw new InvalidCastException()));
    }

    public override Task<ResolutionDetails<int>> ResolveIntegerValueAsync(
        string flagKey, int defaultValue, EvaluationContext? context = null, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(Resolve(flagKey, defaultValue, val => val switch
        {
            int i => i,
            long l => (int)l,
            double d => (int)d,
            _ => throw new InvalidCastException()
        }));
    }

    public override Task<ResolutionDetails<double>> ResolveDoubleValueAsync(
        string flagKey, double defaultValue, EvaluationContext? context = null, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(Resolve(flagKey, defaultValue, val => val switch
        {
            double d => d,
            long l => l,
            int i => i,
            _ => throw new InvalidCastException()
        }));
    }

    public override Task<ResolutionDetails<Value>> ResolveStructureValueAsync(
        string flagKey, Value defaultValue, EvaluationContext? context = null, CancellationToken cancellationToken = default)
    {
        var flags = _client.AllFlags();
        if (!flags.TryGetValue(flagKey, out var raw))
        {
            return Task.FromResult(new ResolutionDetails<Value>(
                flagKey, defaultValue, reason: "ERROR", errorType: ErrorType.FlagNotFound,
                errorMessage: $"flag '{flagKey}' not found"));
        }

        try
        {
            var json = JsonSerializer.Serialize(raw);
            var structure = JsonSerializer.Deserialize<Value>(json) ?? defaultValue;
            return Task.FromResult(new ResolutionDetails<Value>(
                flagKey, structure, reason: "CACHED"));
        }
        catch
        {
            return Task.FromResult(new ResolutionDetails<Value>(
                flagKey, defaultValue, reason: "ERROR", errorType: ErrorType.TypeMismatch,
                errorMessage: $"cannot convert to Value"));
        }
    }

    public void Dispose() => _client.Dispose();

    private ResolutionDetails<T> Resolve<T>(
        string flagKey, T defaultValue, Func<object?, T> cast)
    {
        var flags = _client.AllFlags();
        if (!flags.TryGetValue(flagKey, out var raw))
        {
            return new ResolutionDetails<T>(
                flagKey, defaultValue, reason: "ERROR",
                errorType: ErrorType.FlagNotFound,
                errorMessage: $"flag '{flagKey}' not found");
        }

        try
        {
            return new ResolutionDetails<T>(
                flagKey, cast(raw), reason: "CACHED");
        }
        catch
        {
            return new ResolutionDetails<T>(
                flagKey, defaultValue, reason: "ERROR",
                errorType: ErrorType.TypeMismatch,
                errorMessage: $"expected {typeof(T).Name}, got {raw?.GetType().Name ?? "null"}");
        }
    }
}
