using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace FeatureSignals.ABM;

/// <summary>
/// Client for the FeatureSignals Agent Behavior Mesh (ABM).
/// </summary>
/// <remarks>
/// Resolves which behavior variant an agent should use and tracks agent
/// actions for analytics. Resolved behaviors are cached locally for fast access.
/// <para>
/// <b>Error Handling:</b> Per ABM_SDK_SPECIFICATION.md §3, this client MUST NOT
/// throw on resolve errors. All errors result in a fallback response with
/// <c>reason: "fallback"</c>.
/// </para>
/// <para>
/// <b>Thread Safety:</b> This client is thread-safe. Cache operations use
/// <see cref="ConcurrentDictionary{TKey,TValue}"/>. Track buffer is protected
/// by a lock.
/// </para>
/// <para>
/// See: product/wiki/public/ABM_SDK_SPECIFICATION.md
/// PRS Requirement IDs: FS-S1-ABM-001 through FS-S1-ABM-008
/// </para>
/// </remarks>
public sealed class ABMClient : IDisposable
{
    // Per ABM_SDK_SPECIFICATION.md §4.
    private const int BufferMaxSize = 256;
    private static readonly TimeSpan FlushInterval = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan[] RetryBackoff = [
        TimeSpan.FromMilliseconds(100),
        TimeSpan.FromMilliseconds(1000),
        TimeSpan.FromMilliseconds(10000)
    ];

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };

    private readonly ABMConfig _config;
    private readonly string _baseUrl;
    private readonly HttpClient _httpClient;
    private readonly int _cacheTtlSeconds;
    private readonly ILogger _logger;

    // LRU cache using ConcurrentDictionary + eviction tracking.
    // Key = "{behaviorKey}:{agentId}"
    private readonly ConcurrentDictionary<string, CacheEntry> _cache = new();
    private readonly ConcurrentQueue<string> _cacheKeys = new(); // Tracks insertion order.
    private readonly int _maxCacheEntries;

    // Event buffering (per ABM_SDK_SPECIFICATION.md §4).
    private readonly List<TrackEvent> _eventBuffer = new();
    private readonly object _bufferLock = new();
    private volatile bool _flushing;
    private volatile bool _disposed;
    private readonly Timer _flushTimer;

    /// <summary>
    /// Creates a new ABM client with the given configuration.
    /// </summary>
    /// <param name="config">ABM configuration (environmentKey is required).</param>
    /// <param name="logger">Optional logger for diagnostics.</param>
    /// <exception cref="ArgumentException">If environmentKey is empty.</exception>
    public ABMClient(ABMConfig config, ILogger<ABMClient>? logger = null)
    {
        _config = config;
        _baseUrl = config.BaseUrl.TrimEnd('/');
        _cacheTtlSeconds = config.CacheTtlSeconds;
        _maxCacheEntries = config.MaxCacheEntries;
        _logger = logger ?? NullLogger<ABMClient>.Instance;

        _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromMilliseconds(config.TimeoutMs)
        };
        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", config.EnvironmentKey);

        // Start periodic flush timer.
        _flushTimer = new Timer(_ => FlushBuffer(), null,
            FlushInterval, FlushInterval);
    }

    // ── Resolve (per contract) ────────────────────────────────────────────

    /// <summary>
    /// Resolve which variant an agent should use for a behavior.
    /// </summary>
    /// <remarks>
    /// Results are cached locally. Use <see cref="ResolveFreshAsync"/> to bypass cache.
    /// <b>Never throws</b> — returns a fallback response on error.
    /// </remarks>
    /// <param name="behaviorKey">The behavior to resolve (e.g., "model-selection").</param>
    /// <param name="agentId">Unique identifier for the agent instance.</param>
    /// <param name="attributes">Optional targeting attributes (may be null).</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>ResolveResponse with the variant and configuration.</returns>
    public async Task<ResolveResponse> ResolveAsync(
        string behaviorKey,
        string agentId,
        IReadOnlyDictionary<string, object?>? attributes = null,
        CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{behaviorKey}:{agentId}";

        // Check cache first.
        if (_cacheTtlSeconds > 0 &&
            _cache.TryGetValue(cacheKey, out var entry) &&
            DateTime.UtcNow < entry.ExpiresAt)
        {
            return entry.Response;
        }

        return await ResolveRemoteAsync(behaviorKey, agentId, attributes, cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Resolve a behavior bypassing the local cache.
    /// </summary>
    /// <remarks>
    /// Always fetches from the server. Use this when you need the latest
    /// configuration regardless of cache state.
    /// <b>Never throws</b> — returns a fallback response on error.
    /// </remarks>
    public async Task<ResolveResponse> ResolveFreshAsync(
        string behaviorKey,
        string agentId,
        IReadOnlyDictionary<string, object?>? attributes = null,
        CancellationToken cancellationToken = default)
    {
        return await ResolveRemoteAsync(behaviorKey, agentId, attributes, cancellationToken)
            .ConfigureAwait(false);
    }

    private async Task<ResolveResponse> ResolveRemoteAsync(
        string behaviorKey,
        string agentId,
        IReadOnlyDictionary<string, object?>? attributes,
        CancellationToken cancellationToken)
    {
        var url = $"{_baseUrl}/v1/client/{Uri.EscapeDataString(_config.EnvironmentKey)}/abm/resolve";

        var requestBody = new Dictionary<string, object?>
        {
            ["behavior_key"] = behaviorKey,
            ["agent_id"] = agentId,
            ["attributes"] = attributes ?? new Dictionary<string, object?>()
        };

        try
        {
            var json = JsonSerializer.Serialize(requestBody, JsonOptions);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            using var response = await _httpClient.PostAsync(url, content, cancellationToken)
                .ConfigureAwait(false);

            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return ResolveResponse.Fallback(behaviorKey, reason: "default",
                    cacheTtlSeconds: _cacheTtlSeconds);
            }

            if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            {
                var cacheKey = $"{behaviorKey}:{agentId}";
                if (_cache.TryGetValue(cacheKey, out var cached))
                {
                    return ResolveResponse.Fallback(behaviorKey, cached.Response.Variant,
                        cached.Response.Configuration, "fallback", _cacheTtlSeconds);
                }
                return ResolveResponse.Fallback(behaviorKey, reason: "fallback",
                    cacheTtlSeconds: _cacheTtlSeconds);
            }

            if (!response.IsSuccessStatusCode)
            {
                // 5xx or other error — return fallback with cached if available.
                var cacheKey = $"{behaviorKey}:{agentId}";
                if (_cache.TryGetValue(cacheKey, out var cached))
                {
                    return ResolveResponse.Fallback(behaviorKey, cached.Response.Variant,
                        cached.Response.Configuration, "fallback", _cacheTtlSeconds);
                }
                return ResolveResponse.Fallback(behaviorKey, reason: "fallback",
                    cacheTtlSeconds: _cacheTtlSeconds);
            }

            // Parse successful response.
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken)
                .ConfigureAwait(false);

            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;

            var variant = GetStringProperty(root, "variant") ?? string.Empty;
            var reason = GetStringProperty(root, "reason") ?? "default";
            var ttlSeconds = GetIntProperty(root, "cache_ttl_seconds") ?? _cacheTtlSeconds;
            var evaluatedAt = GetStringProperty(root, "evaluated_at") ??
                              DateTime.UtcNow.ToString("O");

            var configuration = new Dictionary<string, object?>();
            if (root.TryGetProperty("configuration", out var configProp) &&
                configProp.ValueKind == JsonValueKind.Object)
            {
                foreach (var kvp in configProp.EnumerateObject())
                {
                    configuration[kvp.Name] = JsonElementToObject(kvp.Value);
                }
            }
            else if (root.TryGetProperty("config", out var altConfigProp) &&
                     altConfigProp.ValueKind == JsonValueKind.Object)
            {
                foreach (var kvp in altConfigProp.EnumerateObject())
                {
                    configuration[kvp.Name] = JsonElementToObject(kvp.Value);
                }
            }

            var result = new ResolveResponse(
                behaviorKey, variant, configuration, reason, ttlSeconds, evaluatedAt);

            // Update cache.
            if (_cacheTtlSeconds > 0)
            {
                var ttl = ttlSeconds > 0 ? ttlSeconds : _cacheTtlSeconds;
                var cacheKey = $"{behaviorKey}:{agentId}";
                var cacheEntry = new CacheEntry(result, DateTime.UtcNow.AddSeconds(ttl));

                // LRU eviction: track keys and evict oldest if needed.
                _cacheKeys.Enqueue(cacheKey);
                _cache[cacheKey] = cacheEntry;

                // Evict excess entries.
                while (_cacheKeys.Count > _maxCacheEntries &&
                       _cacheKeys.TryDequeue(out var oldestKey))
                {
                    _cache.TryRemove(oldestKey, out _);
                }
            }

            return result;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogDebug(ex, "ABM resolve error for {BehaviorKey}", behaviorKey);

            // Network error or timeout — return fallback with cached if available.
            var cacheKey = $"{behaviorKey}:{agentId}";
            if (_cache.TryGetValue(cacheKey, out var cached))
            {
                return ResolveResponse.Fallback(behaviorKey, cached.Response.Variant,
                    cached.Response.Configuration, "fallback", _cacheTtlSeconds);
            }
            return ResolveResponse.Fallback(behaviorKey, reason: "fallback",
                cacheTtlSeconds: _cacheTtlSeconds);
        }
    }

    // ── Track (per contract) ──────────────────────────────────────────────

    /// <summary>
    /// Record an agent behavior event for analytics and billing.
    /// </summary>
    /// <remarks>
    /// Events are queued in a local buffer and flushed periodically (every 5s)
    /// or when the buffer reaches 256 events — whichever comes first.
    /// Per ABM_SDK_SPECIFICATION.md §4. Tracking is fire-and-forget.
    /// </remarks>
    public void Track(
        string behaviorKey,
        string agentId,
        string variant,
        string @event,
        double? value = null)
    {
        var trackEvent = new TrackEvent(behaviorKey, agentId, variant, @event, value);
        Enqueue(trackEvent);
    }

    /// <summary>
    /// Record multiple events. They are added to the same buffer as
    /// <see cref="Track"/> and flushed together per ABM_SDK_SPECIFICATION.md §4.
    /// </summary>
    public void TrackBatch(IReadOnlyList<TrackEvent> events)
    {
        if (events.Count == 0) return;
        var now = DateTime.UtcNow.ToString("O");
        foreach (var evt in events)
        {
            if (string.IsNullOrEmpty(evt.Timestamp))
            {
                evt = new TrackEvent(evt.BehaviorKey, evt.AgentId, evt.Variant,
                    evt.Event, evt.Value, now);
            }
            Enqueue(evt);
        }
    }

    // ── Event Buffering (spec §4) ─────────────────────────────────────────

    private void Enqueue(TrackEvent evt)
    {
        if (_disposed) return;
        lock (_bufferLock)
        {
            _eventBuffer.Add(evt);
            if (_eventBuffer.Count >= BufferMaxSize)
            {
                FlushBuffer();
            }
        }
    }

    private void FlushBuffer()
    {
        List<TrackEvent> batch;
        lock (_bufferLock)
        {
            if (_eventBuffer.Count == 0 || _flushing) return;
            batch = new List<TrackEvent>(_eventBuffer);
            _eventBuffer.Clear();
            _flushing = true;
        }

        SendBatchWithRetry(batch, 0);
    }

    private void SendBatchWithRetry(List<TrackEvent> events, int attempt)
    {
        var url = $"{_baseUrl}/v1/client/{Uri.EscapeDataString(_config.EnvironmentKey)}/abm/track";

        try
        {
            var json = JsonSerializer.Serialize(events, JsonOptions);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = _httpClient.PostAsync(url, content).GetAwaiter().GetResult();

            _flushing = false;

            if (response.StatusCode != System.Net.HttpStatusCode.Accepted &&
                response.StatusCode != System.Net.HttpStatusCode.OK)
            {
                _logger.LogDebug("ABM track flush: status {StatusCode}", response.StatusCode);
                RetryOrDrop(events, attempt);
            }
        }
        catch (Exception ex)
        {
            _flushing = false;
            _logger.LogDebug(ex, "ABM track flush error");
            RetryOrDrop(events, attempt);
        }
    }

    private void RetryOrDrop(List<TrackEvent> events, int attempt)
    {
        if (attempt >= RetryBackoff.Length)
        {
            _logger.LogDebug("ABM dropping {Count} events after {Attempt} attempts",
                events.Count, attempt);
            return;
        }

        var delay = RetryBackoff[attempt];
        Task.Delay(delay).ContinueWith(_ => SendBatchWithRetry(events, attempt + 1));
    }

    // ── Cache Management ──────────────────────────────────────────────────

    /// <summary>
    /// Clear the local resolution cache for a specific behavior+agent pair.
    /// </summary>
    public void InvalidateCache(string behaviorKey, string agentId)
    {
        var cacheKey = $"{behaviorKey}:{agentId}";
        _cache.TryRemove(cacheKey, out _);
    }

    /// <summary>Clear all locally cached resolutions.</summary>
    public void InvalidateAllCache()
    {
        _cache.Clear();
        while (_cacheKeys.TryDequeue(out _)) { }
    }

    /// <summary>Current number of cached entries (for observability).</summary>
    public int CacheSize => _cache.Count;

    /// <summary>
    /// Clean up resources. Flushes pending events, stops the timer.
    /// Safe to call multiple times.
    /// </summary>
    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        _flushTimer.Dispose();
        FlushBuffer();
        _httpClient.Dispose();
        InvalidateAllCache();
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private static string? GetStringProperty(JsonElement el, string name) =>
        el.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.String
            ? prop.GetString()
            : null;

    private static int? GetIntProperty(JsonElement el, string name) =>
        el.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.Number &&
        prop.TryGetInt32(out var val)
            ? val
            : null;

    private static object? JsonElementToObject(JsonElement el) => el.ValueKind switch
    {
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        JsonValueKind.Number => el.TryGetInt64(out var l) ? l : el.GetDouble(),
        JsonValueKind.String => el.GetString(),
        JsonValueKind.Null or JsonValueKind.Undefined => null,
        _ => JsonSerializer.Deserialize<object>(el.GetRawText())
    };

    private sealed class CacheEntry
    {
        public ResolveResponse Response { get; }
        public DateTime ExpiresAt { get; }

        public CacheEntry(ResolveResponse response, DateTime expiresAt)
        {
            Response = response;
            ExpiresAt = expiresAt;
        }
    }
}
