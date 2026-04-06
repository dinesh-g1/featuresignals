/**
 * OpenFeature provider for FeatureSignals Node.js SDK.
 *
 * Requires `@openfeature/server-sdk` as a peer dependency. Install it with:
 *
 *   npm install @openfeature/server-sdk
 *
 * Usage:
 * ```ts
 * import { FeatureSignalsClient } from "@featuresignals/node";
 * import { FeatureSignalsProvider } from "@featuresignals/node/openfeature";
 * import { OpenFeature } from "@openfeature/server-sdk";
 *
 * const fsClient = new FeatureSignalsClient("fs_srv_...", { envKey: "production" });
 * await OpenFeature.setProviderAndWait(new FeatureSignalsProvider(fsClient));
 * const client = OpenFeature.getClient();
 * const enabled = await client.getBooleanValue("dark-mode", false);
 * ```
 */

import { EventEmitter } from "events";
import type { FeatureSignalsClient } from "./client.ts";

/**
 * Enum values matching @openfeature/server-sdk ErrorCode.
 * Defined locally to avoid a hard runtime dependency.
 */
const ErrorCode = {
  FLAG_NOT_FOUND: "FLAG_NOT_FOUND",
  TYPE_MISMATCH: "TYPE_MISMATCH",
} as const;

const Reason = {
  CACHED: "CACHED",
  ERROR: "ERROR",
} as const;

const ProviderEvents = {
  Ready: "PROVIDER_READY",
  Error: "PROVIDER_ERROR",
  ConfigurationChanged: "PROVIDER_CONFIGURATION_CHANGED",
  Stale: "PROVIDER_STALE",
} as const;

export interface ResolutionDetails<T> {
  value: T;
  variant?: string;
  reason?: string;
  errorCode?: string;
  errorMessage?: string;
  flagMetadata?: Record<string, unknown>;
}

export interface ProviderMetadata {
  readonly name: string;
}

/**
 * FeatureSignalsProvider wraps a FeatureSignalsClient and implements the
 * OpenFeature Provider interface for server-side Node.js usage.
 *
 * All evaluations are local lookups against the client's cached flags.
 * The provider emits OpenFeature lifecycle events by bridging the
 * underlying client's EventEmitter.
 */
export class FeatureSignalsProvider {
  readonly metadata: ProviderMetadata = { name: "FeatureSignals" };
  readonly events = new EventEmitter();
  readonly runsOn = "server" as const;

  private client: FeatureSignalsClient;

  constructor(client: FeatureSignalsClient) {
    this.client = client;

    this.client.on("update", () => {
      this.events.emit(ProviderEvents.ConfigurationChanged);
    });
    this.client.on("error", (err: Error) => {
      this.events.emit(ProviderEvents.Error, { message: err.message });
    });
  }

  async initialize(): Promise<void> {
    if (this.client.isReady()) return;
    await this.client.waitForReady();
  }

  async onClose(): Promise<void> {
    this.client.close();
  }

  async resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    _context?: unknown,
    _logger?: unknown,
  ): Promise<ResolutionDetails<boolean>> {
    const val = this.client.allFlags()[flagKey];
    if (val === undefined) {
      return {
        value: defaultValue,
        reason: Reason.ERROR,
        errorCode: ErrorCode.FLAG_NOT_FOUND,
        errorMessage: `Flag '${flagKey}' not found`,
      };
    }
    if (typeof val !== "boolean") {
      return {
        value: defaultValue,
        reason: Reason.ERROR,
        errorCode: ErrorCode.TYPE_MISMATCH,
        errorMessage: `Flag '${flagKey}' is not boolean`,
      };
    }
    return { value: val, reason: Reason.CACHED };
  }

  async resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    _context?: unknown,
    _logger?: unknown,
  ): Promise<ResolutionDetails<string>> {
    const val = this.client.allFlags()[flagKey];
    if (val === undefined) {
      return {
        value: defaultValue,
        reason: Reason.ERROR,
        errorCode: ErrorCode.FLAG_NOT_FOUND,
        errorMessage: `Flag '${flagKey}' not found`,
      };
    }
    if (typeof val !== "string") {
      return {
        value: defaultValue,
        reason: Reason.ERROR,
        errorCode: ErrorCode.TYPE_MISMATCH,
        errorMessage: `Flag '${flagKey}' is not a string`,
      };
    }
    return { value: val, reason: Reason.CACHED };
  }

  async resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    _context?: unknown,
    _logger?: unknown,
  ): Promise<ResolutionDetails<number>> {
    const val = this.client.allFlags()[flagKey];
    if (val === undefined) {
      return {
        value: defaultValue,
        reason: Reason.ERROR,
        errorCode: ErrorCode.FLAG_NOT_FOUND,
        errorMessage: `Flag '${flagKey}' not found`,
      };
    }
    if (typeof val !== "number") {
      return {
        value: defaultValue,
        reason: Reason.ERROR,
        errorCode: ErrorCode.TYPE_MISMATCH,
        errorMessage: `Flag '${flagKey}' is not a number`,
      };
    }
    return { value: val, reason: Reason.CACHED };
  }

  async resolveObjectEvaluation<T = unknown>(
    flagKey: string,
    defaultValue: T,
    _context?: unknown,
    _logger?: unknown,
  ): Promise<ResolutionDetails<T>> {
    const val = this.client.allFlags()[flagKey];
    if (val === undefined) {
      return {
        value: defaultValue,
        reason: Reason.ERROR,
        errorCode: ErrorCode.FLAG_NOT_FOUND,
        errorMessage: `Flag '${flagKey}' not found`,
      };
    }
    return { value: val as T, reason: Reason.CACHED };
  }
}
