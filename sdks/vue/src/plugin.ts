import { reactive } from "vue";
import type { InjectionKey, Plugin } from "vue";
import type { FeatureSignalsPluginOptions, FeatureSignalsState } from "./types";

export const FEATURE_SIGNALS_KEY: InjectionKey<FeatureSignalsState> =
  Symbol("FeatureSignalsState");

export const FeatureSignalsPlugin: Plugin<[FeatureSignalsPluginOptions]> = {
  install(app, options) {
    const {
      sdkKey,
      envKey,
      baseURL = "https://api.featuresignals.com",
      userKey = "anonymous",
      pollingIntervalMs = 30_000,
      streaming = false,
    } = options;

    const state: FeatureSignalsState = reactive({
      flags: {} as Record<string, unknown>,
      ready: false,
      error: null as Error | null,
    });

    let destroyed = false;
    let pollingTimer: ReturnType<typeof setInterval> | null = null;
    let eventSource: EventSource | null = null;

    async function fetchFlags() {
      try {
        const encodedEnv = encodeURIComponent(envKey);
        const encodedKey = encodeURIComponent(userKey);
        const res = await fetch(
          `${baseURL}/v1/client/${encodedEnv}/flags?key=${encodedKey}`,
          { headers: { "X-API-Key": sdkKey } },
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!destroyed) {
          state.flags = data;
          state.ready = true;
          state.error = null;
        }
      } catch (err) {
        if (!destroyed) {
          state.error = err instanceof Error ? err : new Error(String(err));
        }
      }
    }

    fetchFlags();

    if (streaming && typeof EventSource !== "undefined") {
      const encodedEnv = encodeURIComponent(envKey);
      const sseUrl = `${baseURL}/v1/stream/${encodedEnv}?api_key=${encodeURIComponent(sdkKey)}`;
      const es = new EventSource(sseUrl);
      eventSource = es;

      es.addEventListener("flag-update", () => {
        if (!destroyed) fetchFlags();
      });

      es.addEventListener("connected", () => {
        if (!destroyed) state.error = null;
      });

      es.onerror = () => {
        if (!destroyed) {
          state.error = new Error("SSE connection error");
        }
      };
    } else if (pollingIntervalMs > 0) {
      pollingTimer = setInterval(fetchFlags, pollingIntervalMs);
    }

    app.provide(FEATURE_SIGNALS_KEY, state);

    app.onUnmount(() => {
      destroyed = true;
      if (pollingTimer !== null) {
        clearInterval(pollingTimer);
        pollingTimer = null;
      }
      if (eventSource !== null) {
        eventSource.close();
        eventSource = null;
      }
    });
  },
};
