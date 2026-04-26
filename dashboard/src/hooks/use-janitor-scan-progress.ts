"use client";

import { useState, useEffect, useCallback } from "react";

interface RepoProgressState {
  name: string;
  filesScanned: number;
  totalFiles: number;
  status: "queued" | "scanning" | "complete" | "error";
  flagged: number;
}

interface FlagAnalysisState {
  flagKey: string;
  safeToRemove: boolean;
  referencesFound: number;
  confidence?: number;
  status: "queued" | "analyzing" | "completed" | "failed" | "skipped";
}

export interface ScanProgressState {
  phase:
    | "idle"
    | "pending"
    | "scanning_repos"
    | "analyzing_flags"
    | "generating_report"
    | "complete"
    | "error";
  progress: number;
  repos: RepoProgressState[];
  flags: FlagAnalysisState[];
  error?: string;
  scanId?: string;
}

export function useJanitorScanProgress(scanId: string | null) {
  const [state, setState] = useState<ScanProgressState>({
    phase: "idle",
    progress: 0,
    repos: [],
    flags: [],
  });

  const reset = useCallback(() => {
    setState({
      phase: "idle",
      progress: 0,
      repos: [],
      flags: [],
    });
  }, []);

  useEffect(() => {
    if (!scanId) {
      setState((prev) => ({ ...prev, phase: "idle", scanId: undefined }));
      return;
    }

    setState((prev) => ({
      ...prev,
      phase: "pending",
      scanId,
      progress: 0,
    }));

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const eventSource = new EventSource(
      `${apiUrl}/v1/janitor/scans/${scanId}/events`,
    );

    eventSource.addEventListener("scan.started", (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setState((prev) => ({
        ...prev,
        phase: "scanning_repos",
        progress: 5,
      }));
    });

    eventSource.addEventListener("scan.repo.progress", (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setState((prev) => {
        const repos = [...prev.repos];
        const idx = repos.findIndex((r) => r.name === data.repo);
        if (idx >= 0) {
          repos[idx] = {
            ...repos[idx],
            filesScanned: data.files_scanned,
            totalFiles: data.total_files,
          };
        } else {
          repos.push({
            name: data.repo,
            filesScanned: data.files_scanned,
            totalFiles: data.total_files,
            status: "scanning",
            flagged: 0,
          });
        }
        return { ...prev, repos, progress: Math.min(prev.progress + 2, 50) };
      });
    });

    eventSource.addEventListener("scan.repo.complete", (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setState((prev) => {
        const repos = prev.repos.map((r) =>
          r.name === data.repo
            ? { ...r, status: "complete" as const, flagged: data.flagged }
            : r,
        );
        return { ...prev, repos, progress: Math.min(prev.progress + 5, 60) };
      });
    });

    eventSource.addEventListener("scan.flag.analyzed", (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setState((prev) => {
        const flags = [
          ...prev.flags,
          {
            flagKey: data.flag_key,
            safeToRemove: data.safe_to_remove,
            referencesFound: data.references_found || 0,
            confidence: data.confidence,
            status: "completed" as const,
          },
        ];
        return {
          ...prev,
          flags,
          phase: "analyzing_flags" as const,
          progress: Math.min(prev.progress + 3, 85),
        };
      });
    });

    eventSource.addEventListener("scan.llm.analysis", (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setState((prev) => {
        const flags = prev.flags.map((f) =>
          f.flagKey === data.flag_key
            ? {
                ...f,
                status:
                  data.status === "completed"
                    ? ("completed" as const)
                    : ("analyzing" as const),
                confidence: data.confidence,
              }
            : f,
        );
        return { ...prev, flags };
      });
    });

    eventSource.addEventListener("scan.complete", (e: MessageEvent) => {
      setState((prev) => ({
        ...prev,
        phase: "complete",
        progress: 100,
      }));
      eventSource.close();
    });

    eventSource.addEventListener("scan.error", (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setState((prev) => ({
        ...prev,
        phase: "error",
        error: data.message || "Scan failed",
      }));
    });

    eventSource.onerror = () => {
      setState((prev) => ({
        ...prev,
        phase: "error",
        error: "Connection lost. Please try again.",
      }));
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [scanId]);

  return { ...state, reset };
}
