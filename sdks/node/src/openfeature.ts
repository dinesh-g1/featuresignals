/**
 * OpenFeature provider for FeatureSignals Node.js SDK.
 *
 * Usage:
 * ```ts
 * import { FeatureSignalsClient } from "@featuresignals/node";
 * import { FeatureSignalsProvider } from "@featuresignals/node/openfeature";
 * import { OpenFeature } from "@openfeature/server-sdk";
 *
 * const fsClient = new FeatureSignalsClient("fs_srv_...", { envKey: "production" });
 * await fsClient.waitForReady();
 *
 * await OpenFeature.setProviderAndWait(new FeatureSignalsProvider(fsClient));
 * const client = OpenFeature.getClient();
 * const enabled = await client.getBooleanValue("dark-mode", false);
 * ```
 */

import type { FeatureSignalsClient } from "./client.ts";

export interface EvaluationContext {
  targetingKey?: string;
  [key: string]: unknown;
}

export interface ResolutionDetails<T> {
  value: T;
  reason?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface ProviderMetadata {
  name: string;
}

/**
 * FeatureSignalsProvider wraps a FeatureSignalsClient and exposes the
 * OpenFeature provider interface for server-side Node.js usage.
 *
 * All evaluations are local lookups against the client's cached flags.
 */
export class FeatureSignalsProvider {
  readonly metadata: ProviderMetadata = { name: "FeatureSignals" };
  private client: FeatureSignalsClient;

  constructor(client: FeatureSignalsClient) {
    this.client = client;
  }

  resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context?: EvaluationContext,
  ): ResolutionDetails<boolean> {
    const val = this.client.allFlags()[flagKey];
    if (val === undefined) {
      return {
        value: defaultValue,
        reason: "ERROR",
        errorCode: "FLAG_NOT_FOUND",
        errorMessage: `Flag '${flagKey}' not found`,
      };
    }
    if (typeof val !== "boolean") {
      return {
        value: defaultValue,
        reason: "ERROR",
        errorCode: "TYPE_MISMATCH",
        errorMessage: `Flag '${flagKey}' is not boolean`,
      };
    }
    return { value: val, reason: "CACHED" };
  }

  resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    context?: EvaluationContext,
  ): ResolutionDetails<string> {
    const val = this.client.allFlags()[flagKey];
    if (val === undefined) {
      return {
        value: defaultValue,
        reason: "ERROR",
        errorCode: "FLAG_NOT_FOUND",
        errorMessage: `Flag '${flagKey}' not found`,
      };
    }
    if (typeof val !== "string") {
      return {
        value: defaultValue,
        reason: "ERROR",
        errorCode: "TYPE_MISMATCH",
        errorMessage: `Flag '${flagKey}' is not a string`,
      };
    }
    return { value: val, reason: "CACHED" };
  }

  resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    context?: EvaluationContext,
  ): ResolutionDetails<number> {
    const val = this.client.allFlags()[flagKey];
    if (val === undefined) {
      return {
        value: defaultValue,
        reason: "ERROR",
        errorCode: "FLAG_NOT_FOUND",
        errorMessage: `Flag '${flagKey}' not found`,
      };
    }
    if (typeof val !== "number") {
      return {
        value: defaultValue,
        reason: "ERROR",
        errorCode: "TYPE_MISMATCH",
        errorMessage: `Flag '${flagKey}' is not a number`,
      };
    }
    return { value: val, reason: "CACHED" };
  }

  resolveObjectEvaluation<T>(
    flagKey: string,
    defaultValue: T,
    context?: EvaluationContext,
  ): ResolutionDetails<T> {
    const val = this.client.allFlags()[flagKey];
    if (val === undefined) {
      return {
        value: defaultValue,
        reason: "ERROR",
        errorCode: "FLAG_NOT_FOUND",
        errorMessage: `Flag '${flagKey}' not found`,
      };
    }
    return { value: val as T, reason: "CACHED" };
  }
}
