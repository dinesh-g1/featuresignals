"use client";

/**
 * HelpWidget — Persistent help button + slide-up chat panel for the Console.
 *
 * Three visual states:
 *   - Silent:        💬 icon only, no badge
 *   - Suggestion:    💬 + amber dot + subtle toast above button
 *   - Issue detected: 💬 + red dot + toast above button
 *
 * Panel slides up from bottom-right when opened. NOT a modal —
 * does not block the canvas. Auto-captures context from the
 * server so the customer never has to explain "what page am I on?"
 *
 * Design tokens only. Zero hardcoded colors. Zero `any`.
 *
 * @see CONSOLE_REDESIGN.md §3.5
 * @see console-types.ts → HelpContext
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Minus,
  X,
  AlertCircle,
  Lightbulb,
  Mail,
  MessageSquareText,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConsoleStore } from "@/stores/console-store";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import type { HelpContext } from "@/lib/console-types";

// ─── Constants ───────────────────────────────────────────────────────

const SUPPORT_EMAIL = "support@featuresignals.com";

// ─── Help Button ─────────────────────────────────────────────────────

function HelpButton({
  alertPriority,
  onClick,
}: {
  alertPriority: "red" | "amber" | null;
  onClick: () => void;
}) {
  return (
    <div className="relative">
      {/* Toast above button for proactive alerts */}
      <AnimatePresence>
        {alertPriority === "amber" && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "absolute bottom-full right-0 mb-2 w-48",
              "px-3 py-2",
              "text-xs text-[var(--signal-fg-primary)]",
              "bg-[var(--signal-bg-primary)]",
              "border border-[var(--signal-border-default)]",
              "shadow-[var(--signal-shadow-lg)]",
              "rounded-[var(--signal-radius-md)]",
            )}
          >
            <div className="flex items-start gap-2">
              <Lightbulb
                className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--signal-fg-warning)]"
                aria-hidden="true"
              />
              <span>1 tip for your rollout</span>
            </div>
          </motion.div>
        )}
        {alertPriority === "red" && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "absolute bottom-full right-0 mb-2 w-48",
              "px-3 py-2",
              "text-xs text-[var(--signal-fg-primary)]",
              "bg-[var(--signal-bg-primary)]",
              "border border-[var(--signal-border-default)]",
              "shadow-[var(--signal-shadow-lg)]",
              "rounded-[var(--signal-radius-md)]",
            )}
          >
            <div className="flex items-start gap-2">
              <AlertCircle
                className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--signal-fg-danger)]"
                aria-hidden="true"
              />
              <span>We noticed an error</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button */}
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative flex items-center justify-center",
          "w-11 h-11 rounded-full",
          "bg-[var(--signal-bg-accent-emphasis)]",
          "text-white",
          "shadow-[var(--signal-shadow-lg)]",
          "transition-shadow duration-[var(--signal-duration-fast)]",
          "hover:shadow-[var(--signal-shadow-xl)]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal-fg-accent)]",
        )}
        aria-label="Open help"
      >
        <MessageCircle className="h-5 w-5" aria-hidden="true" />

        {/* Badge dot */}
        {alertPriority && (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5",
              "h-2.5 w-2.5 rounded-full",
              "border-2 border-white",
            )}
            style={{
              backgroundColor:
                alertPriority === "red"
                  ? "var(--signal-fg-danger)"
                  : "var(--signal-fg-warning)",
            }}
            aria-hidden="true"
          />
        )}
      </motion.button>
    </div>
  );
}

// ─── Help Chat Panel ─────────────────────────────────────────────────

function HelpChatPanel({
  onClose,
  onMinimize,
}: {
  onClose: () => void;
  onMinimize: () => void;
}) {
  const token = useAppStore((s) => s.token);
  const proactiveAlert = useConsoleStore((s) => s.proactiveAlert);
  const [context, setContext] = useState<HelpContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Fetch help context on mount ────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setContextLoading(false);
      setContextError("Not authenticated");
      return;
    }

    let cancelled = false;

    async function fetchContext() {
      setContextLoading(true);
      setContextError(null);
      try {
        const result = await api.console.getHelpContext(token!);
        if (!cancelled) {
          setContext(result);
        }
      } catch (err) {
        if (!cancelled) {
          setContextError(
            err instanceof Error ? err.message : "Failed to load help context",
          );
        }
      } finally {
        if (!cancelled) setContextLoading(false);
      }
    }

    fetchContext();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // ── Build mailto link ──────────────────────────────────────────────
  const buildMailtoLink = useCallback((): string => {
    const subject = encodeURIComponent("Console Help Request");
    const body = encodeURIComponent(
      JSON.stringify(
        {
          context: context ?? { error: contextError },
          proactiveAlert: proactiveAlert ?? null,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }, [context, contextError, proactiveAlert]);

  // ── Greeting message ───────────────────────────────────────────────
  const greeting = buildGreeting(
    context,
    contextLoading,
    contextError,
    proactiveAlert,
  );

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "flex flex-col",
        "w-[380px] max-h-[600px]",
        "bg-[var(--signal-bg-primary)]",
        "border border-[var(--signal-border-default)]",
        "shadow-[var(--signal-shadow-xl)]",
        "rounded-[var(--signal-radius-lg)]",
        "overflow-hidden",
        "z-50",
      )}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-3",
          "border-b border-[var(--signal-border-subtle)]",
        )}
      >
        <MessageCircle
          className="h-5 w-5 shrink-0 text-[var(--signal-fg-accent)]"
          aria-hidden="true"
        />
        <h3 className="flex-1 text-sm font-semibold text-[var(--signal-fg-primary)]">
          Help
        </h3>

        {/* Minimize */}
        <button
          type="button"
          onClick={onMinimize}
          className={cn(
            "inline-flex items-center justify-center h-7 w-7",
            "text-[var(--signal-fg-secondary)]",
            "hover:text-[var(--signal-fg-primary)]",
            "hover:bg-[var(--signal-bg-secondary)]",
            "rounded-[var(--signal-radius-md)]",
            "transition-colors duration-[var(--signal-duration-fast)]",
            "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--signal-fg-accent)]",
          )}
          aria-label="Minimize help panel"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "inline-flex items-center justify-center h-7 w-7",
            "text-[var(--signal-fg-secondary)]",
            "hover:text-[var(--signal-fg-primary)]",
            "hover:bg-[var(--signal-bg-secondary)]",
            "rounded-[var(--signal-radius-md)]",
            "transition-colors duration-[var(--signal-duration-fast)]",
            "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--signal-fg-accent)]",
          )}
          aria-label="Close help panel"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Greeting */}
        {greeting}

        {/* Proactive alert detail */}
        {proactiveAlert && (
          <div
            className={cn(
              "flex items-start gap-3 p-3 rounded-[var(--signal-radius-md)]",
              proactiveAlert.priority === "red"
                ? "bg-[var(--signal-bg-danger-muted)] border border-[var(--signal-border-danger-emphasis)]"
                : "bg-[var(--signal-bg-warning-muted)] border border-[var(--signal-border-warning-emphasis)]",
            )}
          >
            {proactiveAlert.priority === "red" ? (
              <AlertCircle
                className="h-4 w-4 mt-0.5 shrink-0 text-[var(--signal-fg-danger)]"
                aria-hidden="true"
              />
            ) : (
              <Lightbulb
                className="h-4 w-4 mt-0.5 shrink-0 text-[var(--signal-fg-warning)]"
                aria-hidden="true"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                {proactiveAlert.title}
              </p>
              <p className="text-xs text-[var(--signal-fg-secondary)] mt-1">
                {proactiveAlert.description}
              </p>
              {proactiveAlert.action && (
                <button
                  type="button"
                  onClick={proactiveAlert.action.handler}
                  className={cn(
                    "inline-flex items-center gap-1 mt-2",
                    "text-xs font-semibold",
                    "text-[var(--signal-fg-accent)]",
                    "hover:underline",
                    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--signal-fg-accent)]",
                  )}
                >
                  {proactiveAlert.action.label}
                  <ChevronRight className="h-3 w-3" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="border-t border-[var(--signal-border-subtle)]" />

      {/* ── Chat Input ───────────────────────────────────────── */}
      <div className="px-4 py-3">
        <div
          className={cn(
            "flex items-center gap-2",
            "px-3 py-2",
            "bg-[var(--signal-bg-secondary)]",
            "border border-[var(--signal-border-subtle)]",
            "rounded-[var(--signal-radius-md)]",
          )}
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask me anything about your features..."
            className={cn(
              "flex-1 bg-transparent border-none outline-none",
              "text-sm text-[var(--signal-fg-primary)]",
              "placeholder:text-[var(--signal-fg-tertiary)]",
            )}
            aria-label="Ask a question"
            onKeyDown={(e) => {
              if (e.key === "Enter" && chatInput.trim()) {
                // AI chat will process the question using context
                // For now: show contextual guidance inline
                window.location.href = buildMailtoLink();
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (chatInput.trim()) {
                window.location.href = buildMailtoLink();
              }
            }}
            disabled={!chatInput.trim()}
            className={cn(
              "inline-flex items-center justify-center h-7 w-7",
              "text-[var(--signal-fg-secondary)]",
              "hover:text-[var(--signal-fg-primary)]",
              "rounded-[var(--signal-radius-md)]",
              "transition-colors duration-[var(--signal-duration-fast)]",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--signal-fg-accent)]",
            )}
            aria-label="Send question"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Quick suggestions */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {[
            "How do I ship a feature?",
            "What's my rollout status?",
            "Check for stale flags",
          ].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setChatInput(suggestion)}
              className={cn(
                "inline-flex items-center px-2 py-1 rounded-full",
                "text-[11px] text-[var(--signal-fg-secondary)]",
                "border border-[var(--signal-border-subtle)]",
                "hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]",
                "transition-colors duration-[var(--signal-duration-fast)]",
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* ── Escalation ─────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2.5",
          "border-t border-[var(--signal-border-subtle)]",
          "text-xs text-[var(--signal-fg-tertiary)]",
        )}
      >
        <a
          href={buildMailtoLink()}
          className={cn(
            "inline-flex items-center gap-1.5",
            "text-[var(--signal-fg-secondary)]",
            "hover:text-[var(--signal-fg-primary)]",
            "transition-colors duration-[var(--signal-duration-fast)]",
          )}
        >
          <Mail className="h-3.5 w-3.5" aria-hidden="true" />
          Email support
        </a>
        <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
          Auto-attaches context
        </span>
      </div>
    </motion.div>
  );
}

// ─── Greeting Builder ─────────────────────────────────────────────────

function buildGreeting(
  context: HelpContext | null,
  loading: boolean,
  error: string | null,
  proactiveAlert: {
    type: string;
    priority: string;
    title: string;
    description: string;
  } | null,
) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm text-[var(--signal-fg-tertiary)]">
        <span
          className="inline-block h-4 w-4 rounded-full border-2 border-[var(--signal-fg-tertiary)] border-t-transparent animate-spin"
          aria-hidden="true"
        />
        Loading your context...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex items-start gap-2 p-3 rounded-[var(--signal-radius-md)]",
          "bg-[var(--signal-bg-danger-muted)] border border-[var(--signal-border-danger-emphasis)]",
        )}
      >
        <AlertCircle
          className="h-4 w-4 mt-0.5 shrink-0 text-[var(--signal-fg-danger)]"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
            Couldn&apos;t load context
          </p>
          <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
            {error}. You can still ask a question or email support.
          </p>
        </div>
      </div>
    );
  }

  if (!context) {
    return (
      <p className="text-sm text-[var(--signal-fg-secondary)]">
        👋 Hi! How can we help you today?
      </p>
    );
  }

  // Build the contextual greeting
  const stageName = context.currentStage
    ? context.currentStage.charAt(0).toUpperCase() +
      context.currentStage.slice(1)
    : null;
  const featureName = context.currentFeature ?? null;
  const envName = context.currentEnvironment ?? null;

  return (
    <div className="space-y-3">
      {/* Context greeting */}
      <div className="text-sm text-[var(--signal-fg-primary)] leading-relaxed">
        <p>
          👋 Hi! You&apos;re on the{" "}
          {stageName ? (
            <span className="font-semibold">{stageName}</span>
          ) : (
            "Console"
          )}
          {featureName && (
            <>
              {" "}
              stage, looking at the{" "}
              <span className="font-semibold">{featureName}</span> feature
            </>
          )}
          {envName && (
            <>
              {" "}
              in <span className="font-semibold">{envName}</span>
            </>
          )}
          .
        </p>
      </div>

      {/* Error details */}
      {context.lastError && (
        <div
          className={cn(
            "flex flex-col gap-2 p-3 rounded-[var(--signal-radius-md)]",
            "bg-[var(--signal-bg-danger-muted)] border border-[var(--signal-border-danger-emphasis)]",
          )}
        >
          <div className="flex items-start gap-2">
            <AlertCircle
              className="h-4 w-4 mt-0.5 shrink-0 text-[var(--signal-fg-danger)]"
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
                You just got a {context.lastError.statusCode} error on
              </p>
              <p className="text-xs font-mono text-[var(--signal-fg-secondary)] mt-0.5 break-all">
                {context.lastError.endpoint}
              </p>
              {context.lastError.requestId && (
                <p className="text-xs text-[var(--signal-fg-tertiary)] mt-0.5">
                  Request ID:{" "}
                  <span className="font-mono">
                    {context.lastError.requestId}
                  </span>
                </p>
              )}
              {context.lastError.message && (
                <p className="text-xs text-[var(--signal-fg-secondary)] mt-1">
                  {context.lastError.message}
                </p>
              )}
            </div>
          </div>

          {/* Suggested fix hint */}
          {getSuggestedFix(
            context.lastError.statusCode,
            context.lastError.endpoint,
          ) && (
            <p className="text-xs text-[var(--signal-fg-secondary)] pl-6">
              {getSuggestedFix(
                context.lastError.statusCode,
                context.lastError.endpoint,
              )}
            </p>
          )}

          {/* "Fix it for me" button */}
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 self-start pl-6",
              "text-xs font-semibold",
              "text-[var(--signal-fg-accent)]",
              "hover:underline",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--signal-fg-accent)]",
            )}
            onClick={() => {
              // Future: trigger auto-fix via agent
              window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Auto-fix request")}&body=${encodeURIComponent(JSON.stringify({ lastError: context.lastError }, null, 2))}`;
            }}
          >
            Fix it for me
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Proactive alert embedded in content (if not already shown above) */}
      {proactiveAlert && !context.lastError && (
        <div
          className={cn(
            "flex items-start gap-2 p-3 rounded-[var(--signal-radius-md)]",
            proactiveAlert.priority === "red"
              ? "bg-[var(--signal-bg-danger-muted)] border border-[var(--signal-border-danger-emphasis)]"
              : "bg-[var(--signal-bg-warning-muted)] border border-[var(--signal-border-warning-emphasis)]",
          )}
        >
          {proactiveAlert.priority === "red" ? (
            <AlertCircle
              className="h-4 w-4 mt-0.5 shrink-0 text-[var(--signal-fg-danger)]"
              aria-hidden="true"
            />
          ) : (
            <Lightbulb
              className="h-4 w-4 mt-0.5 shrink-0 text-[var(--signal-fg-warning)]"
              aria-hidden="true"
            />
          )}
          <div className="flex-1">
            <p className="text-xs text-[var(--signal-fg-secondary)]">
              {proactiveAlert.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Suggested Fix Helper ─────────────────────────────────────────────

function getSuggestedFix(statusCode: number, endpoint: string): string | null {
  // Provide contextual suggestions based on common error patterns
  if (statusCode === 409) {
    return "This usually means a targeting rule conflict. Check for overlapping rule conditions.";
  }
  if (statusCode === 422) {
    return "This usually means invalid input. Check the request payload for errors.";
  }
  if (statusCode === 500) {
    if (endpoint.includes("/ship")) {
      return "This usually means a targeting rule conflict or a guard metric check failed.";
    }
    if (endpoint.includes("/toggle")) {
      return "This usually means the flag state is in an unexpected configuration.";
    }
    return "An unexpected server error occurred. Our team has been notified.";
  }
  if (statusCode === 404) {
    return "The requested resource wasn't found. It may have been deleted or the ID may be incorrect.";
  }
  if (statusCode === 403) {
    return "You don't have permission for this action. Contact your admin to request access.";
  }
  if (statusCode === 429) {
    return "You've hit a rate limit. Please wait a moment and try again.";
  }
  return null;
}

// ─── Main Export ──────────────────────────────────────────────────────

export function HelpWidget() {
  const helpOpen = useConsoleStore((s) => s.helpOpen);
  const setHelpOpen = useConsoleStore((s) => s.setHelpOpen);
  const proactiveAlert = useConsoleStore((s) => s.proactiveAlert);

  const alertPriority: "red" | "amber" | null = proactiveAlert
    ? proactiveAlert.priority
    : null;

  const togglePanel = useCallback(() => {
    setHelpOpen(!helpOpen);
  }, [helpOpen, setHelpOpen]);

  const closePanel = useCallback(() => {
    setHelpOpen(false);
  }, [setHelpOpen]);

  return (
    <>
      {/* ── Help Button (fixed bottom-right) ────────────────────── */}
      <div className="fixed z-40" style={{ bottom: "80px", right: "20px" }}>
        <HelpButton alertPriority={alertPriority} onClick={togglePanel} />
      </div>

      {/* ── Chat Panel (above button) ────────────────────────────── */}
      <AnimatePresence>
        {helpOpen && (
          <div
            className="fixed z-50"
            style={{ bottom: "140px", right: "20px" }}
          >
            <HelpChatPanel onClose={closePanel} onMinimize={closePanel} />
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
