import "./setup";
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import React, { useContext } from "react";
import { renderHook, cleanup, act, waitFor } from "@testing-library/react";
import { FeatureSignalsProvider } from "../provider.tsx";
import { FeatureSignalsContext } from "../context.ts";

afterEach(cleanup);

function createFlagServer(flags: Record<string, unknown>) {
  const server = http.createServer((req, res) => {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "missing api key" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(flags));
  });
  return {
    server,
    start: () =>
      new Promise<number>((resolve) => {
        server.listen(0, () => {
          resolve((server.address() as { port: number }).port);
        });
      }),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

describe("FeatureSignalsProvider", () => {
  it("fetches flags and provides them via context", async () => {
    const s = createFlagServer({ "dark-mode": true, "banner": "hello" });
    const port = await s.start();

    function useTestContext() {
      return useContext(FeatureSignalsContext);
    }

    const providerWrapper = ({ children }: { children: React.ReactNode }) => (
      <FeatureSignalsProvider
        sdkKey="fs_cli_test"
        envKey="test"
        baseURL={`http://localhost:${port}`}
        pollingIntervalMs={0}
      >
        {children}
      </FeatureSignalsProvider>
    );

    const { result } = renderHook(() => useTestContext(), {
      wrapper: providerWrapper,
    });

    await waitFor(() => {
      assert.equal(result.current.ready, true);
    }, { timeout: 5000 });

    assert.equal(result.current.flags["dark-mode"], true);
    assert.equal(result.current.flags["banner"], "hello");

    await s.close();
  });

  it("sets error on failed fetch", async () => {
    function useTestContext() {
      return useContext(FeatureSignalsContext);
    }

    const providerWrapper = ({ children }: { children: React.ReactNode }) => (
      <FeatureSignalsProvider
        sdkKey="fs_cli_test"
        envKey="test"
        baseURL="http://localhost:1"
        pollingIntervalMs={0}
      >
        {children}
      </FeatureSignalsProvider>
    );

    const { result } = renderHook(() => useTestContext(), {
      wrapper: providerWrapper,
    });

    await waitFor(() => {
      assert.notEqual(result.current.error, null);
    }, { timeout: 5000 });

    assert.equal(result.current.ready, false);
  });

  it("defaults userKey to anonymous", async () => {
    let receivedKey = "";
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, "http://localhost");
      receivedKey = url.searchParams.get("key") ?? "";
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end("{}");
    });
    const port = await new Promise<number>((resolve) => {
      server.listen(0, () => {
        resolve((server.address() as { port: number }).port);
      });
    });

    function useTestContext() {
      return useContext(FeatureSignalsContext);
    }

    const providerWrapper = ({ children }: { children: React.ReactNode }) => (
      <FeatureSignalsProvider
        sdkKey="fs_cli_test"
        envKey="test"
        baseURL={`http://localhost:${port}`}
        pollingIntervalMs={0}
      >
        {children}
      </FeatureSignalsProvider>
    );

    const { result } = renderHook(() => useTestContext(), {
      wrapper: providerWrapper,
    });

    await waitFor(() => {
      assert.equal(result.current.ready, true);
    }, { timeout: 5000 });

    assert.equal(receivedKey, "anonymous");
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("passes custom userKey", async () => {
    let receivedKey = "";
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, "http://localhost");
      receivedKey = url.searchParams.get("key") ?? "";
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end("{}");
    });
    const port = await new Promise<number>((resolve) => {
      server.listen(0, () => {
        resolve((server.address() as { port: number }).port);
      });
    });

    function useTestContext() {
      return useContext(FeatureSignalsContext);
    }

    const providerWrapper = ({ children }: { children: React.ReactNode }) => (
      <FeatureSignalsProvider
        sdkKey="fs_cli_test"
        envKey="test"
        baseURL={`http://localhost:${port}`}
        userKey="user-42"
        pollingIntervalMs={0}
      >
        {children}
      </FeatureSignalsProvider>
    );

    const { result } = renderHook(() => useTestContext(), {
      wrapper: providerWrapper,
    });

    await waitFor(() => {
      assert.equal(result.current.ready, true);
    }, { timeout: 5000 });

    assert.equal(receivedKey, "user-42");
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
