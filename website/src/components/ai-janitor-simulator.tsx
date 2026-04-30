"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LightBulbIcon,
  CheckIcon,
  GitBranchIcon,
  ClockIcon,
  ArrowRightIcon,
} from "@primer/octicons-react";

/** A file in the sample codebase */
interface CodebaseFile {
  path: string;
  name: string;
  hasStaleFlag: boolean;
  /** Index of the stale flag this file reveals, if any */
  staleFlagIndex?: number;
}

/** A stale flag found during scanning */
interface StaleFlag {
  name: string;
  lastUsedDays: number;
  prNumber: number;
  detail: string;
}

const SAMPLE_FILES: CodebaseFile[] = [
  { path: "src/auth/", name: "login.ts", hasStaleFlag: false },
  {
    path: "src/checkout/",
    name: "payment.ts",
    hasStaleFlag: true,
    staleFlagIndex: 0,
  },
  {
    path: "src/dashboard/",
    name: "widgets.ts",
    hasStaleFlag: true,
    staleFlagIndex: 1,
  },
  { path: "src/notifications/", name: "email.ts", hasStaleFlag: false },
  {
    path: "src/profile/",
    name: "settings.ts",
    hasStaleFlag: true,
    staleFlagIndex: 2,
  },
  { path: "src/search/", name: "backend.ts", hasStaleFlag: false },
  { path: "src/billing/", name: "invoice.ts", hasStaleFlag: false },
  { path: "src/teams/", name: "members.ts", hasStaleFlag: false },
];

const STALE_FLAGS: StaleFlag[] = [
  {
    name: "legacy-auth-flow",
    lastUsedDays: 180,
    prNumber: 284,
    detail: "Replaced by new-auth-flow in v3.2. All users migrated.",
  },
  {
    name: "old-search-backend",
    lastUsedDays: 365,
    prNumber: 285,
    detail:
      "Deprecated after Elasticsearch migration. Zero traffic for 12 months.",
  },
  {
    name: "beta-feature-gate",
    lastUsedDays: 90,
    prNumber: 286,
    detail: "Feature fully rolled out to 100% of users. Gate no longer needed.",
  },
];

type ScanPhase = "idle" | "scanning" | "complete";

export function AiJanitorSimulator() {
  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle");
  const [scannedFiles, setScannedFiles] = useState<number>(0);
  const [revealedFlags, setRevealedFlags] = useState<number>(0);
  const [foundFlagIndices, setFoundFlagIndices] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
      }
    };
  }, []);

  const startScan = useCallback(() => {
    if (scanPhase !== "idle") return;
    setError(null);
    setScanPhase("scanning");
    setScannedFiles(0);
    setRevealedFlags(0);
    setFoundFlagIndices([]);

    let fileIndex = 0;
    scanTimerRef.current = setInterval(() => {
      if (fileIndex >= SAMPLE_FILES.length) {
        if (scanTimerRef.current) {
          clearInterval(scanTimerRef.current);
        }
        setScanPhase("complete");
        return;
      }

      const file = SAMPLE_FILES[fileIndex];
      setScannedFiles(fileIndex + 1);

      if (file.hasStaleFlag && file.staleFlagIndex !== undefined) {
        setRevealedFlags((prev) => prev + 1);
        setFoundFlagIndices((prev) => [...prev, file.staleFlagIndex as number]);
      }

      fileIndex++;
    }, 700);
  }, [scanPhase]);

  const resetScan = useCallback(() => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
    }
    setScanPhase("idle");
    setScannedFiles(0);
    setRevealedFlags(0);
    setFoundFlagIndices([]);
    setError(null);
  }, []);

  const progressPercent =
    SAMPLE_FILES.length > 0 ? (scannedFiles / SAMPLE_FILES.length) * 100 : 0;

  const totalDeadLines = revealedFlags > 0 ? revealedFlags * 62 : 0; // approximate lines

  return (
    <section
      id="ai-janitor"
      className="py-20 sm:py-28 bg-white border-y border-[var(--borderColor-muted)]"
      aria-labelledby="janitor-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2
            id="janitor-heading"
            className="text-3xl sm:text-4xl font-bold text-[var(--fgColor-default)] tracking-tight"
          >
            Your codebase has flags older than your last intern.
          </h2>
          <p className="text-lg text-[var(--fgColor-muted)] mt-3 max-w-2xl mx-auto">
            Stale flags are basically paying rent in your codebase. This
            simulator scans a sample repo, finds flags nobody&apos;s touched
            since the Obama administration, and shows you what automated cleanup
            looks like. The real AI Janitor opens PRs for you. Yes, really.
          </p>
        </div>

        {/* Split panel: Codebase + Scan Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Codebase file tree */}
          <div
            className="rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-inset)] overflow-hidden"
            style={{ boxShadow: "var(--shadow-resting-small)" }}
          >
            {/* Header */}
            <div className="px-5 py-3 border-b border-[var(--borderColor-muted)] bg-white/80 flex items-center gap-2">
              <GitBranchIcon size={16} fill="var(--fgColor-muted)" />
              <span className="text-sm font-semibold text-[var(--fgColor-default)]">
                src/
              </span>
              <span className="text-xs text-[var(--fgColor-subtle)] ml-auto">
                {scanPhase === "idle"
                  ? `${SAMPLE_FILES.length} files`
                  : `${scannedFiles}/${SAMPLE_FILES.length} scanned`}
              </span>
            </div>

            {/* File list */}
            <div className="divide-y divide-[var(--borderColor-muted)]">
              {SAMPLE_FILES.map((file, i) => {
                const isScanned = i < scannedFiles;
                const flagIdx = file.staleFlagIndex;
                const isFlagRevealed =
                  isScanned &&
                  flagIdx !== undefined &&
                  foundFlagIndices.includes(flagIdx);

                return (
                  <motion.div
                    key={file.name}
                    className={`flex items-center gap-3 px-5 py-3 transition-colors duration-300 ${
                      isScanned
                        ? isFlagRevealed
                          ? "bg-[var(--bgColor-attention-muted)]"
                          : "bg-white"
                        : "bg-transparent"
                    }`}
                    animate={
                      isScanned
                        ? {
                            backgroundColor: isFlagRevealed
                              ? "var(--bgColor-attention-muted)"
                              : "#ffffff",
                          }
                        : {}
                    }
                    transition={{ duration: 0.3 }}
                  >
                    {/* Folder icon */}
                    <span className="text-xs font-mono text-[var(--fgColor-subtle)] w-28 shrink-0 truncate">
                      {file.path}
                    </span>

                    {/* File name */}
                    <span className="text-sm font-mono text-[var(--fgColor-default)] flex-1">
                      {file.name}
                    </span>

                    {/* Status indicator */}
                    {isScanned ? (
                      isFlagRevealed ? (
                        <motion.span
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{
                            duration: 0.3,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bgColor-attention-muted)] text-[var(--fgColor-attention)] border border-[var(--borderColor-attention-muted)]"
                        >
                          <LightBulbIcon size={12} />
                          Stale
                        </motion.span>
                      ) : (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            duration: 0.2,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                        >
                          <CheckIcon size={16} fill="var(--fgColor-success)" />
                        </motion.span>
                      )
                    ) : (
                      <span className="w-4 h-4" />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Progress bar */}
            {scanPhase !== "idle" && (
              <div className="px-5 py-3 bg-white border-t border-[var(--borderColor-muted)]">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-[var(--borderColor-muted)] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-[var(--bgColor-accent-emphasis)]"
                      initial={{ width: "0%" }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <span className="text-xs font-mono font-semibold text-[var(--fgColor-muted)] tabular-nums min-w-[4ch]">
                    {Math.round(progressPercent)}%
                  </span>
                </div>
                <p className="text-xs text-[var(--fgColor-subtle)] mt-1.5">
                  Scanning... {scannedFiles} files scanned
                </p>
              </div>
            )}
          </div>

          {/* Right: Scan Results */}
          <div
            className="rounded-xl border border-[var(--borderColor-default)] bg-white p-6"
            style={{ boxShadow: "var(--shadow-resting-small)" }}
          >
            <h3 className="text-sm font-semibold text-[var(--fgColor-muted)] uppercase tracking-wider mb-5">
              Scan Results
            </h3>

            {scanPhase === "idle" && (
              <div className="text-center py-12">
                <LightBulbIcon
                  size={32}
                  fill="var(--fgColor-subtle)"
                  className="mx-auto mb-3"
                />
                <p className="text-sm text-[var(--fgColor-muted)] mb-4">
                  Run a scan to find stale feature flags in this sample
                  codebase.
                </p>
                <p className="text-xs text-[var(--fgColor-subtle)]">
                  No real repos connected — this is a local simulation.
                </p>
              </div>
            )}

            {scanPhase === "scanning" && (
              <div className="space-y-4">
                {revealedFlags > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <motion.span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--bgColor-attention-muted)] text-[var(--fgColor-attention)]"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <LightBulbIcon size={12} />
                      {revealedFlags} stale flag{revealedFlags !== 1 ? "s" : ""}{" "}
                      found
                    </motion.span>
                    <span className="text-xs text-[var(--fgColor-subtle)]">
                      {totalDeadLines} lines of dead code
                    </span>
                  </div>
                )}

                {/* Revealed flags */}
                <AnimatePresence>
                  {foundFlagIndices.map((flagIdx) => {
                    const flag = STALE_FLAGS[flagIdx];
                    if (!flag) return null;
                    return (
                      <motion.div
                        key={flag.name}
                        initial={{ opacity: 0, y: 12, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-inset)] p-4 overflow-hidden"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 shrink-0">
                            <div className="w-2.5 h-2.5 rounded-full bg-[var(--fgColor-danger)]" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-mono font-bold text-[var(--fgColor-default)] truncate">
                              {flag.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-[var(--fgColor-muted)]">
                              <ClockIcon size={12} />
                              <span>
                                Last used: {flag.lastUsedDays} days ago
                              </span>
                            </div>
                            <p className="text-xs text-[var(--fgColor-subtle)] mt-1">
                              {flag.detail}
                            </p>
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bgColor-done-muted)] text-[var(--fgColor-done)]">
                              <GitBranchIcon size={12} />
                              PR #{flag.prNumber} generated
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Scanning indicator */}
                {revealedFlags === 0 && (
                  <div className="text-center py-8">
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-sm text-[var(--fgColor-muted)]"
                    >
                      Scanning files...
                    </motion.div>
                  </div>
                )}
              </div>
            )}

            {scanPhase === "complete" && (
              <div>
                {/* Summary */}
                <motion.div
                  className="rounded-lg border border-[var(--borderColor-success-muted)] bg-[var(--bgColor-success-muted)] p-4 mb-4"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex items-center gap-2">
                    <CheckIcon size={16} fill="var(--fgColor-success)" />
                    <span className="text-sm font-semibold text-[var(--fgColor-success)]">
                      Scan complete
                    </span>
                  </div>
                  <div className="mt-2 flex gap-4 text-sm">
                    <div>
                      <span className="font-bold text-[var(--fgColor-default)]">
                        {revealedFlags}
                      </span>{" "}
                      <span className="text-[var(--fgColor-muted)]">
                        stale flags
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-[var(--fgColor-default)]">
                        {totalDeadLines}
                      </span>{" "}
                      <span className="text-[var(--fgColor-muted)]">
                        dead lines
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-[var(--fgColor-default)]">
                        {revealedFlags}
                      </span>{" "}
                      <span className="text-[var(--fgColor-muted)]">
                        PRs ready
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Flag details (all shown on complete) */}
                <div className="space-y-3">
                  {STALE_FLAGS.map((flag, idx) => (
                    <motion.div
                      key={flag.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.35,
                        delay: idx * 0.1,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-inset)] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 shrink-0">
                          <div className="w-2.5 h-2.5 rounded-full bg-[var(--fgColor-danger)]" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-mono font-bold text-[var(--fgColor-default)] truncate">
                            {flag.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-[var(--fgColor-muted)]">
                            <ClockIcon size={12} />
                            <span>Last used: {flag.lastUsedDays} days ago</span>
                          </div>
                          <p className="text-xs text-[var(--fgColor-subtle)] mt-1">
                            {flag.detail}
                          </p>
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bgColor-done-muted)] text-[var(--fgColor-done)]">
                            <GitBranchIcon size={12} />
                            PR #{flag.prNumber} generated
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="rounded-lg border border-[var(--borderColor-danger-emphasis)] bg-[var(--bgColor-danger-muted)] p-4 mt-4">
                <p className="text-sm text-[var(--fgColor-danger)]">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          {scanPhase === "idle" && (
            <motion.button
              onClick={startScan}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-[var(--bgColor-success-emphasis)] hover:bg-[#1c8139] active:bg-[#197935] transition-colors duration-150"
              style={{ boxShadow: "0 1px 0 0 #1f232826" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <LightBulbIcon size={16} />
              Try with a sample codebase
            </motion.button>
          )}

          {scanPhase === "complete" && (
            <motion.button
              onClick={resetScan}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-[var(--fgColor-default)] bg-[var(--bgColor-muted)] hover:bg-[#eff2f5] border border-[var(--borderColor-default)] transition-colors duration-150"
              style={{ boxShadow: "0 1px 0 0 #1f23280a" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              Run scan again
            </motion.button>
          )}

          <a
            href="https://github.com/dinesh-g1/featuresignals"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-[var(--fgColor-default)] bg-[var(--bgColor-muted)] hover:bg-[#eff2f5] border border-[var(--borderColor-default)] transition-colors duration-150"
            style={{ boxShadow: "0 1px 0 0 #1f23280a" }}
          >
            <GitBranchIcon size={16} />
            Connect your GitHub repo
            <ArrowRightIcon size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}
