using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;

namespace FeatureSignals;

/// <summary>
/// FeatureSignals SDK client. Fetches flag values from the server, caches
/// locally, and keeps them up-to-date via polling or SSE streaming. All flag
/// reads are local — zero network calls per evaluation after init.
/// </summary>
public sealed class FeatureSignalsClient : IDisposable
{
    private readonly string _sdkKey;
    private readonly ClientOptions _options;
    private readonly EvalContext _context;
    private readonly HttpClient _httpClient;
    private readonly CancellationTokenSource _cts = new();
    private readonly ReaderWriterLockSlim _lock = new();
    private readonly TaskCompletionSource _readyTcs = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private Dictionary<string, JsonElement> _flags = new();
    private volatile bool _disposed;

    /// <summary>Fires once when the client has successfully fetched flags for the first time.</summary>
    public event Action? OnReady;

    /// <summary>Fires when a network or parsing error occurs.</summary>
    public event Action<Exception>? OnError;

    /// <summary>Fires whenever the local flag cache is updated.</summary>
    public event Action<IReadOnlyDictionary<string, object?>>? OnUpdate;

    public FeatureSignalsClient(string sdkKey, ClientOptions options)
    {
        if (string.IsNullOrWhiteSpace(sdkKey))
            throw new ArgumentException("sdkKey is required", nameof(sdkKey));
        if (string.IsNullOrWhiteSpace(options.EnvKey))
            throw new ArgumentException("options.EnvKey is required", nameof(options));

        _sdkKey = sdkKey;
        _options = options;
        _context = options.DefaultContext ?? new EvalContext("server");

        _httpClient = new HttpClient { Timeout = options.Timeout };

        try
        {
            Refresh();
            MarkReady();
        }
        catch (Exception ex)
        {
            EmitError(ex);
        }

        _ = _options.Streaming
            ? Task.Run(SseLoopAsync)
            : Task.Run(PollLoopAsync);
    }

    // ── Flag access ─────────────────────────────────────────

    public bool BoolVariation(string key, EvalContext? ctx = null, bool fallback = false)
    {
        var val = GetFlag(key);
        return val is { ValueKind: JsonValueKind.True or JsonValueKind.False }
            ? val.Value.GetBoolean()
            : fallback;
    }

    public string StringVariation(string key, EvalContext? ctx = null, string fallback = "")
    {
        var val = GetFlag(key);
        return val is { ValueKind: JsonValueKind.String }
            ? val.Value.GetString()!
            : fallback;
    }

    public double NumberVariation(string key, EvalContext? ctx = null, double fallback = 0)
    {
        var val = GetFlag(key);
        return val is { ValueKind: JsonValueKind.Number }
            ? val.Value.GetDouble()
            : fallback;
    }

    public T? JsonVariation<T>(string key, EvalContext? ctx = null, T? fallback = default)
    {
        var val = GetFlag(key);
        if (val is null)
            return fallback;
        try
        {
            return val.Value.Deserialize<T>();
        }
        catch
        {
            return fallback;
        }
    }

    public IReadOnlyDictionary<string, object?> AllFlags()
    {
        _lock.EnterReadLock();
        try
        {
            var result = new Dictionary<string, object?>(_flags.Count);
            foreach (var kvp in _flags)
                result[kvp.Key] = Unwrap(kvp.Value);
            return result;
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    public bool IsReady => _readyTcs.Task.IsCompletedSuccessfully;

    public Task WaitForReadyAsync(TimeSpan? timeout = null)
    {
        var t = timeout ?? TimeSpan.FromSeconds(10);
        return _readyTcs.Task.WaitAsync(t);
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _cts.Cancel();
        _cts.Dispose();
        _httpClient.Dispose();
        _lock.Dispose();
    }

    // ── Internals ───────────────────────────────────────────

    private JsonElement? GetFlag(string key)
    {
        _lock.EnterReadLock();
        try
        {
            return _flags.TryGetValue(key, out var val) ? val : null;
        }
        finally
        {
            _lock.ExitReadLock();
        }
    }

    private void SetFlags(Dictionary<string, JsonElement> flags)
    {
        _lock.EnterWriteLock();
        try
        {
            _flags = flags;
        }
        finally
        {
            _lock.ExitWriteLock();
        }

        try
        {
            var unwrapped = new Dictionary<string, object?>(flags.Count);
            foreach (var kvp in flags)
                unwrapped[kvp.Key] = Unwrap(kvp.Value);
            OnUpdate?.Invoke(unwrapped);
        }
        catch
        {
            // Swallow subscriber exceptions
        }
    }

    private void MarkReady()
    {
        if (_readyTcs.TrySetResult())
        {
            try { OnReady?.Invoke(); }
            catch { /* swallow */ }
        }
    }

    private void EmitError(Exception ex)
    {
        try { OnError?.Invoke(ex); }
        catch { /* swallow */ }
    }

    private void Refresh()
    {
        var envKey = Uri.EscapeDataString(_options.EnvKey);
        var ctxKey = Uri.EscapeDataString(_context.Key);
        var url = $"{_options.BaseUrl}/v1/client/{envKey}/flags?key={ctxKey}";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Add("X-API-Key", _sdkKey);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        using var response = _httpClient.Send(request, _cts.Token);
        response.EnsureSuccessStatusCode();

        using var stream = response.Content.ReadAsStream();
        using var doc = JsonDocument.Parse(stream);

        var flags = new Dictionary<string, JsonElement>();
        foreach (var prop in doc.RootElement.EnumerateObject())
            flags[prop.Name] = prop.Value.Clone();

        SetFlags(flags);
    }

    private async Task PollLoopAsync()
    {
        var token = _cts.Token;
        while (!token.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(_options.PollingInterval, token);
            }
            catch (OperationCanceledException)
            {
                return;
            }

            try
            {
                Refresh();
                MarkReady();
            }
            catch (Exception ex)
            {
                EmitError(ex);
            }
        }
    }

    private async Task SseLoopAsync()
    {
        var token = _cts.Token;
        while (!token.IsCancellationRequested)
        {
            try
            {
                await ConnectSseAsync(token);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                EmitError(ex);
            }
            catch (OperationCanceledException)
            {
                return;
            }

            if (token.IsCancellationRequested) return;

            try
            {
                await Task.Delay(_options.SseRetry, token);
            }
            catch (OperationCanceledException)
            {
                return;
            }
        }
    }

    private async Task ConnectSseAsync(CancellationToken token)
    {
        var envKey = Uri.EscapeDataString(_options.EnvKey);
        var apiKey = Uri.EscapeDataString(_sdkKey);
        var url = $"{_options.BaseUrl}/v1/stream/{envKey}?api_key={apiKey}";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("text/event-stream"));
        request.Headers.CacheControl = new CacheControlHeaderValue { NoCache = true };

        using var response = await _httpClient.SendAsync(
            request, HttpCompletionOption.ResponseHeadersRead, token);
        response.EnsureSuccessStatusCode();

        using var stream = await response.Content.ReadAsStreamAsync(token);
        using var reader = new StreamReader(stream);

        var eventType = "";
        while (!token.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(token);
            if (line is null) break; // stream closed

            if (line.StartsWith("event:", StringComparison.Ordinal))
            {
                eventType = line[6..].Trim();
            }
            else if (line.StartsWith("data:", StringComparison.Ordinal))
            {
                if (eventType == "flag-update")
                {
                    try { Refresh(); }
                    catch (Exception ex) { EmitError(ex); }
                }
                eventType = "";
            }
        }
    }

    private static object? Unwrap(JsonElement el) => el.ValueKind switch
    {
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        JsonValueKind.Number => el.TryGetInt64(out var l) ? l : el.GetDouble(),
        JsonValueKind.String => el.GetString(),
        JsonValueKind.Null or JsonValueKind.Undefined => null,
        _ => el.Deserialize<object>()
    };
}
