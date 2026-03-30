import { EvalContext } from "./context";

export interface ClientOptions {
  baseURL: string;
  pollingIntervalMs: number;
}

const DEFAULT_OPTIONS: ClientOptions = {
  baseURL: "https://api.featuresignals.com",
  pollingIntervalMs: 30000,
};

export class FeatureSignalsClient {
  private sdkKey: string;
  private options: ClientOptions;
  private flags: Record<string, unknown> = {};
  private ready = false;
  private pollTimer?: ReturnType<typeof setInterval>;

  constructor(sdkKey: string, options?: Partial<ClientOptions>) {
    this.sdkKey = sdkKey;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.refresh().catch((err) => console.warn("[featuresignals] initial fetch failed:", err));
    this.pollTimer = setInterval(() => this.refresh().catch(() => {}), this.options.pollingIntervalMs);
  }

  boolVariation(key: string, ctx: EvalContext, fallback: boolean): boolean {
    const val = this.flags[key];
    return typeof val === "boolean" ? val : fallback;
  }

  stringVariation(key: string, ctx: EvalContext, fallback: string): string {
    const val = this.flags[key];
    return typeof val === "string" ? val : fallback;
  }

  numberVariation(key: string, ctx: EvalContext, fallback: number): number {
    const val = this.flags[key];
    return typeof val === "number" ? val : fallback;
  }

  jsonVariation(key: string, ctx: EvalContext, fallback: unknown): unknown {
    return this.flags[key] ?? fallback;
  }

  allFlags(): Record<string, unknown> {
    return { ...this.flags };
  }

  isReady(): boolean {
    return this.ready;
  }

  close(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  private async refresh(): Promise<void> {
    const url = `${this.options.baseURL}/v1/client/env/flags?key=server`;
    const res = await fetch(url, {
      headers: { "X-API-Key": this.sdkKey },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    this.flags = await res.json();
    this.ready = true;
  }
}
