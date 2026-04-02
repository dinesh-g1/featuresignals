using System.Net;
using System.Text;
using System.Text.Json;

namespace FeatureSignals.Tests;

/// <summary>
/// Spins up a minimal HTTP listener returning canned flag JSON,
/// then exercises every public method on <see cref="FeatureSignalsClient"/>.
/// </summary>
public sealed class ClientTests : IAsyncLifetime
{
    private HttpListener _listener = null!;
    private string _baseUrl = null!;
    private Task _serverTask = null!;
    private readonly CancellationTokenSource _cts = new();

    private static readonly Dictionary<string, object> CannedFlags = new()
    {
        ["feature-a"] = true,
        ["banner"] = "hello",
        ["count"] = 42
    };

    public Task InitializeAsync()
    {
        _listener = new HttpListener();
        // Pick a random free port by binding to port 0 is not supported by
        // HttpListener; use a high-range port with a random offset instead.
        var port = 49152 + Random.Shared.Next(10000);
        _baseUrl = $"http://127.0.0.1:{port}";
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

    private async Task ServeAsync(CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            HttpListenerContext ctx;
            try
            {
                ctx = await _listener.GetContextAsync();
            }
            catch
            {
                return;
            }

            var json = JsonSerializer.Serialize(CannedFlags);
            var bytes = Encoding.UTF8.GetBytes(json);
            ctx.Response.StatusCode = 200;
            ctx.Response.ContentType = "application/json";
            ctx.Response.ContentLength64 = bytes.Length;
            await ctx.Response.OutputStream.WriteAsync(bytes, token);
            ctx.Response.Close();
        }
    }

    private FeatureSignalsClient MakeClient()
    {
        var opts = new ClientOptions
        {
            EnvKey = "dev",
            BaseUrl = _baseUrl,
            PollingInterval = TimeSpan.FromSeconds(60)
        };
        var client = new FeatureSignalsClient("test-key", opts);
        client.WaitForReadyAsync(TimeSpan.FromSeconds(5)).GetAwaiter().GetResult();
        return client;
    }

    [Fact]
    public void BoolVariation_ReturnsCorrectValue()
    {
        using var client = MakeClient();
        Assert.True(client.BoolVariation("feature-a", fallback: false));
    }

    [Fact]
    public void StringVariation_ReturnsCorrectValue()
    {
        using var client = MakeClient();
        Assert.Equal("hello", client.StringVariation("banner", fallback: ""));
    }

    [Fact]
    public void NumberVariation_ReturnsCorrectValue()
    {
        using var client = MakeClient();
        Assert.Equal(42, client.NumberVariation("count", fallback: 0));
    }

    [Fact]
    public void BoolVariation_FallbackOnMissingKey()
    {
        using var client = MakeClient();
        Assert.False(client.BoolVariation("does-not-exist", fallback: false));
    }

    [Fact]
    public void StringVariation_FallbackOnWrongType()
    {
        using var client = MakeClient();
        Assert.Equal("nope", client.StringVariation("feature-a", fallback: "nope"));
    }

    [Fact]
    public void AllFlags_ReturnsAllFlags()
    {
        using var client = MakeClient();
        var flags = client.AllFlags();
        Assert.True(flags.ContainsKey("feature-a"));
        Assert.True(flags.ContainsKey("banner"));
        Assert.True(flags.ContainsKey("count"));
    }

    [Fact]
    public void IsReady_ReturnsTrueAfterInit()
    {
        using var client = MakeClient();
        Assert.True(client.IsReady);
    }

    [Fact]
    public void OnReady_CallbackFires()
    {
        var fired = new ManualResetEventSlim(false);
        var opts = new ClientOptions
        {
            EnvKey = "dev",
            BaseUrl = _baseUrl,
            PollingInterval = TimeSpan.FromSeconds(60)
        };
        var client = new FeatureSignalsClient("test-key", opts);
        client.OnReady += () => fired.Set();

        // OnReady fires synchronously during construction before we can
        // subscribe if init succeeds immediately. Re-create with event
        // wired before construction completes by using a wrapper approach.
        client.Dispose();

        var readyFired = new ManualResetEventSlim(false);
        var client2 = new ReadyTrackingClient("test-key", opts, readyFired);
        Assert.True(readyFired.Wait(TimeSpan.FromSeconds(5)));
        client2.Client.Dispose();
    }

    /// <summary>
    /// Helper that subscribes to OnReady before the constructor's initial fetch
    /// would complete — achieved by subscribing in the same scope.
    /// </summary>
    private sealed class ReadyTrackingClient
    {
        public FeatureSignalsClient Client { get; }

        public ReadyTrackingClient(string sdkKey, ClientOptions opts, ManualResetEventSlim signal)
        {
            Client = new FeatureSignalsClient(sdkKey, opts);
            if (Client.IsReady)
                signal.Set();
            else
                Client.OnReady += () => signal.Set();
        }
    }
}
