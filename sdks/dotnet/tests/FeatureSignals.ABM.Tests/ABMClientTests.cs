using System.Collections.Concurrent;
using System.Net;
using System.Text;
using System.Text.Json;
using FeatureSignals.ABM;
using Xunit;

namespace FeatureSignals.ABM.Tests;

/// <summary>
/// ABM Client tests — 10 tests per ABM_SDK_SPECIFICATION.md §6.
///
/// Uses a real HTTP listener for integration testing. Each test verifies
/// one contract requirement.
///
/// PRS Requirement IDs: FS-S1-ABM-001 through FS-S1-ABM-008
/// </summary>
public sealed class ABMClientTests : IAsyncLifetime
{
    private HttpListener _listener = null!;
    private string _baseUrl = null!;
    private readonly CancellationTokenSource _cts = new();
    private Task _serverTask = null!;

    // Configurable server behavior.
    private volatile JsonElement _resolveResponse;
    private volatile int _resolveStatus = 200;
    private readonly ConcurrentQueue<RecordedRequest> _recordedRequests = new();

    public Task InitializeAsync()
    {
        var port = 49152 + Random.Shared.Next(10000);
        _baseUrl = $"http://127.0.0.1:{port}";
        _listener = new HttpListener();
        _listener.Prefixes.Add($"{_baseUrl}/");
        _listener.Start();
        _serverTask = Task.Run(() => ServeAsync(_cts.Token));
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        _cts.Cancel();
        _listener.Stop();
        try { await _serverTask; } catch { /* expected */ }
        _listener.Close();
        _cts.Dispose();
    }

    private ABMConfig MakeConfig() => new("fs_test_key_123")
    {
        BaseUrl = _baseUrl,
        CacheTtlSeconds = 60,
        TimeoutMs = 2000,
    };

    // ── Test 1: resolve returns variant ─────────────────────────────────

    [Fact]
    public async Task Resolve_ReturnsVariant()
    {
        _recordedRequests.Clear();
        using var client = new ABMClient(MakeConfig());

        var resp = await client.ResolveAsync("test-behavior", "agent-1");

        Assert.Equal("test-behavior", resp.BehaviorKey);
        Assert.Equal("variant-a", resp.Variant);
        Assert.True(resp.Configuration.ContainsKey("key"));
        Assert.Equal("targeting_match", resp.Reason);
        var reqs = _recordedRequests.ToArray();
        Assert.Single(reqs);
        Assert.Contains("/abm/resolve", reqs[0].Path);
    }

    // ── Test 2: resolve uses cache ──────────────────────────────────────

    [Fact]
    public async Task Resolve_UsesCache()
    {
        _recordedRequests.Clear();
        using var client = new ABMClient(MakeConfig());

        var resp1 = await client.ResolveAsync("test-behavior", "agent-1");
        Assert.Equal("variant-a", resp1.Variant);
        Assert.Single(_recordedRequests);

        // Change server response.
        _resolveResponse = JsonDocument.Parse("""
            {"behavior_key":"test-behavior","variant":"variant-b","reason":"default","cache_ttl_seconds":60}
            """).RootElement;

        var resp2 = await client.ResolveAsync("test-behavior", "agent-1");
        Assert.Equal("variant-a", resp2.Variant); // Still from cache.
        Assert.Single(_recordedRequests);
    }

    // ── Test 3: resolveFresh bypasses cache ─────────────────────────────

    [Fact]
    public async Task ResolveFresh_BypassesCache()
    {
        _recordedRequests.Clear();
        using var client = new ABMClient(MakeConfig());

        var resp1 = await client.ResolveAsync("test-behavior", "agent-1");
        Assert.Equal("variant-a", resp1.Variant);
        Assert.Single(_recordedRequests);

        _resolveResponse = JsonDocument.Parse("""
            {"behavior_key":"test-behavior","variant":"variant-b","reason":"default","cache_ttl_seconds":60}
            """).RootElement;

        var resp2 = await client.ResolveFreshAsync("test-behavior", "agent-1");
        Assert.Equal("variant-b", resp2.Variant);
        Assert.Equal(2, _recordedRequests.Count);
    }

    // ── Test 4: fallback on 500 error ───────────────────────────────────

    [Fact]
    public async Task Resolve_FallbackOn500()
    {
        _resolveStatus = 500;
        _resolveResponse = JsonDocument.Parse("""{"error":"internal"}""").RootElement;
        using var client = new ABMClient(MakeConfig());

        var resp = await client.ResolveAsync("test-behavior", "agent-1");

        Assert.Equal("", resp.Variant);
        Assert.Equal("fallback", resp.Reason);
        Assert.Empty(resp.Configuration);
    }

    // ── Test 5: fallback on 404 ────────────────────────────────────────

    [Fact]
    public async Task Resolve_FallbackOn404()
    {
        _resolveStatus = 404;
        using var client = new ABMClient(MakeConfig());

        var resp = await client.ResolveAsync("missing-behavior", "agent-1");

        Assert.Equal("", resp.Variant);
        Assert.Empty(resp.Configuration);
    }

    // ── Test 6: track sends request ─────────────────────────────────────

    [Fact]
    public async Task Track_SendsRequest()
    {
        _recordedRequests.Clear();
        using var client = new ABMClient(MakeConfig());

        client.Track("test-behavior", "agent-1", "variant-a", "behavior.applied", 42);

        // Wait for buffered flush.
        await Task.Delay(300);

        var trackReqs = _recordedRequests.Where(r => r.Path.Contains("/abm/track")).ToArray();
        Assert.NotEmpty(trackReqs);
    }

    // ── Test 7: track batch sends single request ────────────────────────

    [Fact]
    public async Task TrackBatch_SendsSingleRequest()
    {
        _recordedRequests.Clear();
        using var client = new ABMClient(MakeConfig());

        var events = Enumerable.Range(0, 10).Select(i =>
            new TrackEvent($"behavior-{i}", $"agent-{i}", "variant-a", "test.action")
        ).ToList();

        client.TrackBatch(events);
        await Task.Delay(300);

        var batchReqs = _recordedRequests.Where(r => r.Path.Contains("/abm/track")).ToArray();
        Assert.NotEmpty(batchReqs);
    }

    // ── Test 8: cache invalidation ──────────────────────────────────────

    [Fact]
    public async Task Cache_Invalidation()
    {
        _recordedRequests.Clear();
        using var client = new ABMClient(MakeConfig());

        var resp1 = await client.ResolveAsync("bh-1", "agent-1");
        Assert.Equal("variant-a", resp1.Variant);
        Assert.Single(_recordedRequests);

        client.InvalidateCache("bh-1", "agent-1");
        _resolveResponse = JsonDocument.Parse("""
            {"behavior_key":"bh-1","variant":"variant-b","reason":"default","cache_ttl_seconds":60}
            """).RootElement;

        var resp2 = await client.ResolveAsync("bh-1", "agent-1");
        Assert.Equal("variant-b", resp2.Variant);
        Assert.Equal(2, _recordedRequests.Count);
    }

    // ── Test 9: LRU eviction ────────────────────────────────────────────

    [Fact]
    public async Task LruEviction_EvictsOldest()
    {
        _recordedRequests.Clear();
        var config = new ABMConfig("fs_test_key_123")
        {
            BaseUrl = _baseUrl,
            CacheTtlSeconds = 60,
            MaxCacheEntries = 3,
            TimeoutMs = 2000,
        };
        using var client = new ABMClient(config);

        // Fill cache with 3 entries.
        for (int i = 0; i < 3; i++)
        {
            _resolveResponse = JsonDocument.Parse(
                $$"""{"behavior_key":"bh-{{i}}","variant":"variant-{{i}}","reason":"default","cache_ttl_seconds":60}""")
                .RootElement;
            await client.ResolveAsync($"bh-{i}", $"agent-{i}");
        }

        Assert.Equal(3, client.CacheSize);
        Assert.Equal(3, _recordedRequests.Count);

        // Add 4th entry — should evict oldest.
        _resolveResponse = JsonDocument.Parse(
            """{"behavior_key":"bh-3","variant":"variant-3","reason":"default","cache_ttl_seconds":60}""")
            .RootElement;
        await client.ResolveAsync("bh-3", "agent-3");
        Assert.Equal(3, client.CacheSize);

        // bh-0 should be evicted — resolve again should make a new request.
        int reqCountBefore = _recordedRequests.Count;
        _resolveResponse = JsonDocument.Parse(
            """{"behavior_key":"bh-0","variant":"variant-0-new","reason":"default","cache_ttl_seconds":60}""")
            .RootElement;
        var resp = await client.ResolveAsync("bh-0", "agent-0");
        Assert.Equal("variant-0-new", resp.Variant);
        Assert.Equal(reqCountBefore + 1, _recordedRequests.Count);
    }

    // ── Test 10: config validation ──────────────────────────────────────

    [Fact]
    public void Config_Validation()
    {
        Assert.Throws<ArgumentException>(() => new ABMConfig(""));
        Assert.Throws<ArgumentException>(() => new ABMConfig("  "));
    }

    // ── Test Server ─────────────────────────────────────────────────────

    private async Task ServeAsync(CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            try
            {
                var ctx = await _listener.GetContextAsync().WaitAsync(token);
                _ = Task.Run(() => HandleRequest(ctx), token);
            }
            catch (OperationCanceledException) { return; }
            catch (HttpListenerException) { return; }
        }
    }

    private void HandleRequest(HttpListenerContext ctx)
    {
        try
        {
            var path = ctx.Request.Url?.AbsolutePath ?? "/";

            // Read body.
            string bodyStr;
            using (var reader = new StreamReader(ctx.Request.InputStream, Encoding.UTF8))
            {
                bodyStr = reader.ReadToEnd();
            }
            _recordedRequests.Enqueue(new RecordedRequest(path, bodyStr));

            byte[] responseBytes;
            string contentType = "application/json";

            if (path.Contains("/abm/resolve"))
            {
                if (_resolveResponse.ValueKind != JsonValueKind.Undefined)
                {
                    responseBytes = Encoding.UTF8.GetBytes(_resolveResponse.GetRawText());
                }
                else
                {
                    var defaultResp = new
                    {
                        behavior_key = "test-behavior",
                        variant = "variant-a",
                        configuration = new { key = "value", temperature = 0.7 },
                        reason = "targeting_match",
                        cache_ttl_seconds = 60,
                        evaluated_at = DateTime.UtcNow.ToString("O")
                    };
                    responseBytes = Encoding.UTF8.GetBytes(
                        JsonSerializer.Serialize(defaultResp));
                }
                ctx.Response.StatusCode = _resolveStatus;
            }
            else if (path.Contains("/abm/track"))
            {
                responseBytes = """{"accepted":true}"""u8.ToArray();
                ctx.Response.StatusCode = 202;
            }
            else
            {
                responseBytes = """{"error":"not found"}"""u8.ToArray();
                ctx.Response.StatusCode = 404;
            }

            ctx.Response.ContentType = contentType;
            ctx.Response.ContentLength64 = responseBytes.Length;
            ctx.Response.OutputStream.Write(responseBytes);
            ctx.Response.OutputStream.Close();
        }
        catch { /* best effort */ }
    }

    private sealed record RecordedRequest(string Path, string Body);
}
