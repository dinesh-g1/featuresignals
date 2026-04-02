import { describe, it, expect, vi, beforeEach } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { FeatureSignalsPlugin } from "../src/plugin";
import { useFlag, useFlags, useReady, useError } from "../src/composables";

const MOCK_FLAGS = { "dark-mode": true, banner: "hello", max: 42 };

function mockFetchSuccess(flags: Record<string, unknown> = MOCK_FLAGS) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(flags),
  });
}

function mockFetchFailure(status = 500) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: "server error" }),
  });
}

function createTestComponent(setup: () => Record<string, unknown>) {
  return defineComponent({
    setup,
    render() {
      return h("div");
    },
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("FeatureSignalsPlugin", () => {
  it("installs and provides state", async () => {
    globalThis.fetch = mockFetchSuccess();

    let readyVal = false;
    const TestComp = createTestComponent(() => {
      const ready = useReady();
      readyVal = ready.value;
      return { ready };
    });

    mount(TestComp, {
      global: {
        plugins: [
          [
            FeatureSignalsPlugin,
            { sdkKey: "fs_cli_test", envKey: "test", pollingIntervalMs: 0 },
          ],
        ],
      },
    });

    await flushPromises();
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it("useFlag returns correct value after flags load", async () => {
    globalThis.fetch = mockFetchSuccess();

    let flagVal: unknown;
    const TestComp = createTestComponent(() => {
      const flag = useFlag("dark-mode", false);
      return { flag };
    });

    const wrapper = mount(TestComp, {
      global: {
        plugins: [
          [
            FeatureSignalsPlugin,
            { sdkKey: "fs_cli_test", envKey: "test", pollingIntervalMs: 0 },
          ],
        ],
      },
    });

    await flushPromises();
    await nextTick();
    flagVal = (wrapper.vm as any).flag;
    expect(flagVal).toBe(true);
  });

  it("useFlag returns fallback when flag missing", async () => {
    globalThis.fetch = mockFetchSuccess();

    const TestComp = createTestComponent(() => {
      const flag = useFlag("nonexistent", "default-val");
      return { flag };
    });

    const wrapper = mount(TestComp, {
      global: {
        plugins: [
          [
            FeatureSignalsPlugin,
            { sdkKey: "fs_cli_test", envKey: "test", pollingIntervalMs: 0 },
          ],
        ],
      },
    });

    await flushPromises();
    await nextTick();
    expect((wrapper.vm as any).flag).toBe("default-val");
  });

  it("useFlags returns all flags", async () => {
    globalThis.fetch = mockFetchSuccess();

    const TestComp = createTestComponent(() => {
      const flags = useFlags();
      return { flags };
    });

    const wrapper = mount(TestComp, {
      global: {
        plugins: [
          [
            FeatureSignalsPlugin,
            { sdkKey: "fs_cli_test", envKey: "test", pollingIntervalMs: 0 },
          ],
        ],
      },
    });

    await flushPromises();
    await nextTick();
    expect((wrapper.vm as any).flags).toEqual(MOCK_FLAGS);
  });

  it("useReady returns false initially, true after fetch", async () => {
    let resolvePromise!: (value: unknown) => void;
    globalThis.fetch = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    let readyRef: ReturnType<typeof useReady>;
    const TestComp = createTestComponent(() => {
      readyRef = useReady();
      return { ready: readyRef };
    });

    mount(TestComp, {
      global: {
        plugins: [
          [
            FeatureSignalsPlugin,
            { sdkKey: "fs_cli_test", envKey: "test", pollingIntervalMs: 0 },
          ],
        ],
      },
    });

    expect(readyRef!.value).toBe(false);

    resolvePromise({
      ok: true,
      json: () => Promise.resolve(MOCK_FLAGS),
    });

    await flushPromises();
    await nextTick();
    expect(readyRef!.value).toBe(true);
  });

  it("useError returns null on success", async () => {
    globalThis.fetch = mockFetchSuccess();

    const TestComp = createTestComponent(() => {
      const error = useError();
      return { error };
    });

    const wrapper = mount(TestComp, {
      global: {
        plugins: [
          [
            FeatureSignalsPlugin,
            { sdkKey: "fs_cli_test", envKey: "test", pollingIntervalMs: 0 },
          ],
        ],
      },
    });

    await flushPromises();
    await nextTick();
    expect((wrapper.vm as any).error).toBeNull();
  });

  it("useError returns error on fetch failure", async () => {
    globalThis.fetch = mockFetchFailure(500);

    const TestComp = createTestComponent(() => {
      const error = useError();
      return { error };
    });

    const wrapper = mount(TestComp, {
      global: {
        plugins: [
          [
            FeatureSignalsPlugin,
            { sdkKey: "fs_cli_test", envKey: "test", pollingIntervalMs: 0 },
          ],
        ],
      },
    });

    await flushPromises();
    await nextTick();
    const err = (wrapper.vm as any).error;
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("HTTP 500");
  });

  it("sends correct URL and headers", async () => {
    globalThis.fetch = mockFetchSuccess({});

    const TestComp = createTestComponent(() => {
      const ready = useReady();
      return { ready };
    });

    mount(TestComp, {
      global: {
        plugins: [
          [
            FeatureSignalsPlugin,
            {
              sdkKey: "fs_cli_mykey",
              envKey: "production",
              baseURL: "https://custom.api.com",
              userKey: "user-42",
              pollingIntervalMs: 0,
            },
          ],
        ],
      },
    });

    await flushPromises();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://custom.api.com/v1/client/production/flags?key=user-42",
      { headers: { "X-API-Key": "fs_cli_mykey" } },
    );
  });

  it("defaults userKey to anonymous", async () => {
    globalThis.fetch = mockFetchSuccess({});

    const TestComp = createTestComponent(() => {
      const ready = useReady();
      return { ready };
    });

    mount(TestComp, {
      global: {
        plugins: [
          [
            FeatureSignalsPlugin,
            { sdkKey: "fs_cli_test", envKey: "staging", pollingIntervalMs: 0 },
          ],
        ],
      },
    });

    await flushPromises();

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledUrl).toContain("key=anonymous");
  });
});
