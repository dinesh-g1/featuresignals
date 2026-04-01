import "./setup";
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderHook, cleanup, act } from "@testing-library/react";
import { FeatureSignalsContext } from "../context.ts";
import { useFlag, useFlags, useReady, useError } from "../hooks.ts";

afterEach(cleanup);

function wrapper(
  flags: Record<string, unknown>,
  ready = true,
  error: Error | null = null
) {
  return ({ children }: { children: React.ReactNode }) => (
    <FeatureSignalsContext.Provider value={{ flags, ready, error }}>
      {children}
    </FeatureSignalsContext.Provider>
  );
}

describe("useFlag", () => {
  it("returns boolean flag value", () => {
    const { result } = renderHook(() => useFlag("dark-mode", false), {
      wrapper: wrapper({ "dark-mode": true }),
    });
    assert.equal(result.current, true);
  });

  it("returns fallback for missing flag", () => {
    const { result } = renderHook(() => useFlag("missing", "default"), {
      wrapper: wrapper({}),
    });
    assert.equal(result.current, "default");
  });

  it("returns fallback for null flag", () => {
    const { result } = renderHook(() => useFlag("key", 42), {
      wrapper: wrapper({ key: null }),
    });
    assert.equal(result.current, 42);
  });

  it("returns string flag value", () => {
    const { result } = renderHook(() => useFlag("banner", "fallback"), {
      wrapper: wrapper({ banner: "hello" }),
    });
    assert.equal(result.current, "hello");
  });

  it("returns number flag value", () => {
    const { result } = renderHook(() => useFlag("max", 10), {
      wrapper: wrapper({ max: 99 }),
    });
    assert.equal(result.current, 99);
  });

  it("returns object flag value", () => {
    const { result } = renderHook(
      () => useFlag("config", { x: 1 }),
      { wrapper: wrapper({ config: { nested: true } }) }
    );
    assert.deepEqual(result.current, { nested: true });
  });
});

describe("useFlags", () => {
  it("returns all flags", () => {
    const flags = { a: true, b: "hello", c: 42 };
    const { result } = renderHook(() => useFlags(), {
      wrapper: wrapper(flags),
    });
    assert.deepEqual(result.current, flags);
  });

  it("returns empty object when no flags", () => {
    const { result } = renderHook(() => useFlags(), {
      wrapper: wrapper({}),
    });
    assert.deepEqual(result.current, {});
  });
});

describe("useReady", () => {
  it("returns true when ready", () => {
    const { result } = renderHook(() => useReady(), {
      wrapper: wrapper({}, true),
    });
    assert.equal(result.current, true);
  });

  it("returns false when not ready", () => {
    const { result } = renderHook(() => useReady(), {
      wrapper: wrapper({}, false),
    });
    assert.equal(result.current, false);
  });
});

describe("useError", () => {
  it("returns null when no error", () => {
    const { result } = renderHook(() => useError(), {
      wrapper: wrapper({}, true, null),
    });
    assert.equal(result.current, null);
  });

  it("returns error when present", () => {
    const err = new Error("fetch failed");
    const { result } = renderHook(() => useError(), {
      wrapper: wrapper({}, false, err),
    });
    assert.equal(result.current, err);
    assert.equal(result.current?.message, "fetch failed");
  });
});

describe("useFlag outside provider", () => {
  it("returns fallback when no provider wraps component", () => {
    const { result } = renderHook(() => useFlag("key", "default"));
    assert.equal(result.current, "default");
  });
});
