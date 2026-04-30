"use client";

import { useState, useEffect, useCallback } from "react";
import {
  XIcon,
  GripVerticalIcon,
  TrashIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  GitPullRequestIcon,
  ShieldIcon,
  ClockIcon,
  BellIcon,
} from "@/components/icons/nav-icons";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { Flag, FlagState, TargetingRule } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────

interface FlagSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  flag? : Flag;
  flagState?: FlagState;
  onToggle?: (enabled: boolean) => Promise<void>;
  onSaveRules?: (rules: TargetingRule[]) => Promise<void>;
  onRequestApproval?: () => void;
}

interface RuleEntry {
  id: string;
  name: string;
  attribute: string;
  operator: string;
  value: string;
  serve: string;
}

// ─── Operator Options ───────────────────────────────────────────────

const OPERATORS = [
  { value: "EQUALS", label: "equals" },
  { value: "NOT_EQUALS", label: "not equals" },
  { value: "CONTAINS", label: "contains" },
  { value: "STARTS_WITH", label: "starts with" },
  { value: "ENDS_WITH", label: "ends with" },
  { value: "IN", label: "in list" },
  { value: "NOT_IN", label: "not in list" },
  { value: "GREATER_THAN", label: ">" },
  { value: "LESS_THAN", label: "<" },
  { value: "MATCHES", label: "matches regex" },
];

// ─── Tab Config ─────────────────────────────────────────────────────

type TabId = "targeting" | "variations" | "governance";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "targeting", label: "Targeting", icon: "🎯" },
  { id: "variations", label: "Variations", icon: "🔀" },
  { id: "governance", label: "Governance", icon: "🛡️" },
];

// ─── Main Component ─────────────────────────────────────────────────

export function FlagSlideOver({
  isOpen,
  onClose,
  flag,
  flagState,
  onToggle,
  onSaveRules,
  onRequestApproval,
}: FlagSlideOverProps) {
  const [activeTab, setActiveTab] = useState<TabId>("targeting");
  const [isEnabled, setIsEnabled] = useState(flagState?.enabled ?? false);
  const [rules, setRules] = useState<RuleEntry[]>([
    {
      id: "1",
      name: "Internal Beta",
      attribute: "user.email",
      operator: "ENDS_WITH",
      value: "@acmecorp.com",
      serve: "true",
    },
    {
      id: "2",
      name: "Enterprise UsersIcon",
      attribute: "tenant.plan",
      operator: "EQUALS",
      value: "enterprise",
      serve: "true",
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync enabled state
  useEffect(() => {
    setIsEnabled(flagState?.enabled ?? false);
  }, [flagState?.enabled]);

  const handleToggle = useCallback(async () => {
    if (!onToggle) return;
    const next = !isEnabled;
    setIsEnabled(next);
    try {
      await onToggle(next);
    } catch {
      setIsEnabled(!next);
    }
  }, [isEnabled, onToggle]);

  const addRule = () => {
    const id = String(Date.now());
    setRules((prev) => [
      ...prev,
      {
        id,
        name: `Rule ${prev.length + 1}`,
        attribute: "",
        operator: "EQUALS",
        value: "",
        serve: "false",
      },
    ]);
    setHasChanges(true);
  };

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    setHasChanges(true);
  };

  const updateRule = (id: string, patch: Partial<RuleEntry>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!onSaveRules) return;
    setSaving(true);
    try {
      const mapped: TargetingRule[] = rules.map((r, i) => ({
        id: r.id,
        priority: i,
        description: r.name,
        conditions: [
          {
            attribute: r.attribute,
            operator: r.operator.toLowerCase(),
            values: [r.value],
          },
        ],
        percentage: 100,
        value: r.serve,
        match_type: "all",
      }));
      await onSaveRules(mapped);
      setHasChanges(false);
    } catch (e) {
      console.error("Failed to save rules:", e);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const flagName = flag?.name || "New Checkout Flow";
  const flagKey = flag?.key || "new-checkout-flow";
  const flagType = flag?.flag_type || "boolean";

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--bgColor-emphasis)]/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-Over Panel */}
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-[var(--borderColor-default)] animate-in slide-in-from-right duration-300">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="px-6 py-5 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-default)]/80 flex items-start justify-between shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-[var(--fgColor-default)] tracking-tight truncate">
                {flagName}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-[var(--borderColor-success-muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Operational
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--fgColor-muted)] font-mono">
              <span className="text-[var(--fgColor-subtle)] font-sans font-medium uppercase text-[10px] tracking-wider">
                KeyIcon:
              </span>
              <code className="bg-[var(--bgColor-muted)]/80 px-1.5 py-0.5 rounded text-[var(--fgColor-default)] select-all text-[11px]">
                {flagKey}
              </code>
              <span className="text-stone-300">·</span>
              <span className="text-[var(--fgColor-subtle)] font-sans font-medium uppercase text-[10px] tracking-wider">
                Type:
              </span>
              <span className="text-[var(--fgColor-muted)] capitalize">
                {flagType}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Master toggle */}
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[9px] font-bold text-[var(--fgColor-subtle)] uppercase tracking-wider">
                {isEnabled ? "Enabled" : "Disabled"}
              </span>
              <Switch
                checked={isEnabled}
                onCheckedChange={handleToggle}
                size="sm"
              />
            </div>
            {/* Close button */}
            <button
              onClick={onClose}
              className="rounded-full p-2 text-[var(--fgColor-subtle)] hover:text-[var(--fgColor-default)] bg-white hover:bg-[var(--bgColor-muted)] border border-[var(--borderColor-default)] transition-all shadow-sm"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* ── Tab Navigation ─────────────────────────────────────── */}
        <div className="flex border-b border-[var(--borderColor-default)] bg-white shrink-0 px-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "py-3.5 px-4 text-sm font-semibold capitalize tracking-wide transition-all border-b-2 flex items-center gap-2",
                activeTab === tab.id
                  ? "border-[var(--fgColor-accent)] text-[var(--fgColor-accent)]"
                  : "border-transparent text-[var(--fgColor-subtle)] hover:text-[var(--fgColor-default)]",
              )}
            >
              <span className="text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Scrollable Content ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {/* ── TARGETING TAB ──────────────────────────────────── */}
          {activeTab === "targeting" && (
            <div className="p-6 space-y-6">
              {/* AI Janitor Recommendation */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-lg shrink-0 mt-0.5">🤖</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-amber-900">
                      AI Janitor Recommendation
                    </h4>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                      This flag has served 100% <strong>"True"</strong> for 45
                      days in Production. It is safe to remove from code.
                    </p>
                  </div>
                  <button className="shrink-0 rounded-lg bg-white border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors shadow-sm flex items-center gap-1.5">
                    <GitPullRequestIcon className="h-3.5 w-3.5" />
                    Generate PR
                  </button>
                </div>
              </div>

              {/* Rules Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[var(--fgColor-default)]">
                    Targeting Rules
                  </h3>
                  <p className="text-xs text-[var(--fgColor-muted)] mt-0.5">
                    Evaluated top-to-bottom. First matching rule applies.
                    {rules.length > 0 && (
                      <span className="ml-1 text-[var(--fgColor-accent)] font-medium">
                        {rules.length} rule{rules.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={addRule}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bgColor-accent-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--fgColor-accent)] hover:bg-[var(--bgColor-accent-muted)] transition-colors"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add Rule
                </button>
              </div>

              {/* Rules List */}
              <div className="space-y-3">
                {rules.map((rule, index) => (
                  <div
                    key={rule.id}
                    className="rounded-xl border border-[var(--borderColor-default)] bg-white shadow-sm overflow-hidden transition-all hover:border-[var(--borderColor-emphasis)]"
                  >
                    {/* Rule Header */}
                    <div className="flex items-center justify-between bg-[var(--bgColor-default)]/80 border-b border-[var(--borderColor-muted)] px-4 py-2.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--fgColor-muted)] uppercase tracking-wider">
                        <GripVerticalIcon className="h-3.5 w-3.5 text-stone-300 cursor-grab" />
                        <span>
                          Rule {index + 1}:{" "}
                          <input
                            type="text"
                            value={rule.name}
                            onChange={(e) =>
                              updateRule(rule.id, { name: e.target.value })
                            }
                            className="bg-transparent border-none outline-none text-[var(--fgColor-default)] font-semibold normal-case focus:text-[var(--fgColor-accent)] p-0"
                            placeholder="Rule name..."
                          />
                        </span>
                      </div>
                      <button
                        onClick={() => removeRule(rule.id)}
                        className="rounded p-1 text-[var(--fgColor-subtle)] hover:text-red-500 hover:bg-[var(--bgColor-danger-muted)] transition-colors"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Rule Body */}
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Condition Builder */}
                      <div className="flex-1 flex flex-wrap items-center gap-1.5 text-sm">
                        <span className="text-[10px] font-bold text-[var(--fgColor-subtle)] uppercase tracking-wider">
                          IF
                        </span>
                        <select
                          value={rule.attribute}
                          onChange={(e) =>
                            updateRule(rule.id, {
                              attribute: e.target.value,
                            })
                          }
                          className="bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)] text-xs font-mono border border-[var(--borderColor-accent-muted)] rounded-md px-2 py-1.5 outline-none focus:ring-2 focus:ring-[var(--fgColor-accent)]/30 cursor-pointer"
                        >
                          <option value="">Select attribute...</option>
                          <option value="user.email">user.email</option>
                          <option value="user.id">user.id</option>
                          <option value="user.country">user.country</option>
                          <option value="tenant.plan">tenant.plan</option>
                          <option value="tenant.tier">tenant.tier</option>
                          <option value="device.type">device.type</option>
                          <option value="app.version">app.version</option>
                        </select>
                        <select
                          value={rule.operator}
                          onChange={(e) =>
                            updateRule(rule.id, {
                              operator: e.target.value,
                            })
                          }
                          className="bg-[var(--bgColor-default)] text-[var(--fgColor-default)] text-xs font-medium border border-[var(--borderColor-default)] rounded-md px-2 py-1.5 outline-none focus:ring-2 focus:ring-[var(--fgColor-accent)]/30 cursor-pointer"
                        >
                          {OPERATORS.map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={rule.value}
                          onChange={(e) =>
                            updateRule(rule.id, { value: e.target.value })
                          }
                          placeholder="value"
                          className="bg-[var(--bgColor-muted)] text-[var(--fgColor-default)] text-xs font-mono border border-[var(--borderColor-default)] rounded-md px-2.5 py-1.5 outline-none focus:border-[var(--fgColor-accent)] focus:ring-1 focus:ring-[var(--fgColor-accent)]/30 min-w-[100px] flex-1"
                        />
                      </div>

                      {/* Serve Decision */}
                      <div className="flex items-center gap-2 bg-[var(--bgColor-default)] border border-[var(--borderColor-default)] rounded-lg px-3 py-2 shrink-0">
                        <span className="text-[10px] font-bold text-[var(--fgColor-muted)] uppercase tracking-wider">
                          Serve
                        </span>
                        <select
                          value={rule.serve}
                          onChange={(e) =>
                            updateRule(rule.id, { serve: e.target.value })
                          }
                          className="font-bold text-sm bg-transparent outline-none cursor-pointer"
                        >
                          <option
                            value="true"
                            className="text-[var(--fgColor-success)]"
                          >
                            True
                          </option>
                          <option value="false" className="text-red-500">
                            False
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Default Fallback Rule */}
                <div className="rounded-xl border border-dashed border-[var(--borderColor-emphasis)] bg-[var(--bgColor-default)]/50 overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[var(--fgColor-subtle)] text-xs font-bold uppercase tracking-wider">
                        Default
                      </span>
                      <span className="text-[var(--fgColor-muted)]">
                        All other traffic
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[var(--fgColor-subtle)] uppercase tracking-wider">
                        Serve
                      </span>
                      <span className="rounded-md bg-[var(--bgColor-muted)] px-2.5 py-1 text-xs font-bold text-[var(--fgColor-muted)]">
                        {flagState?.default_value !== undefined
                          ? String(flagState.default_value)
                          : "false"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── VARIATIONS TAB ──────────────────────────────────── */}
          {activeTab === "variations" && (
            <div className="p-6 space-y-6">
              <div className="rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-6 text-center">
                <span className="text-3xl mb-3 block">🔀</span>
                <h3 className="text-base font-bold text-[var(--fgColor-default)] mb-1">
                  FlagIcon Variations
                </h3>
                <p className="text-sm text-[var(--fgColor-muted)] max-w-md mx-auto">
                  Configure multivariate flag variations with percentage-based
                  traffic splitting. Available in Pro plan.
                </p>
                <button className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--bgColor-accent-muted)] px-4 py-2 text-sm font-semibold text-[var(--fgColor-accent)] hover:bg-[var(--bgColor-accent-muted)] transition-colors">
                  <ShieldIcon className="h-4 w-4" />
                  Upgrade for Variations
                </button>
              </div>
            </div>
          )}

          {/* ── GOVERNANCE TAB ──────────────────────────────────── */}
          {activeTab === "governance" && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Scheduled Changes */}
                <div className="rounded-xl border border-[var(--borderColor-default)] bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--fgColor-default)] mb-3">
                    <ClockIcon className="h-4 w-4 text-[var(--fgColor-accent)]" />
                    Scheduled Changes
                  </div>
                  <p className="text-xs text-[var(--fgColor-muted)] mb-3">
                    Schedule enable/disable times for this flag across
                    environments.
                  </p>
                  <button className="w-full rounded-lg bg-[var(--bgColor-muted)] px-3 py-2 text-xs font-semibold text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] transition-colors">
                    + Add Schedule
                  </button>
                </div>

                {/* Approval Workflow */}
                <div className="rounded-xl border border-[var(--borderColor-default)] bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--fgColor-default)] mb-3">
                    <ShieldIcon className="h-4 w-4 text-[var(--fgColor-accent)]" />
                    CAB Approval
                  </div>
                  <p className="text-xs text-[var(--fgColor-muted)] mb-3">
                    Submit this change for Change Advisory Board review and
                    approval.
                  </p>
                  <button
                    onClick={onRequestApproval}
                    className="w-full rounded-lg bg-[var(--bgColor-emphasis)] px-3 py-2 text-xs font-bold text-white hover:bg-black transition-colors flex items-center justify-center gap-1.5"
                  >
                    Request CAB Approval
                  </button>
                </div>

                {/* Webhook Notifications */}
                <div className="rounded-xl border border-[var(--borderColor-default)] bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--fgColor-default)] mb-3">
                    <BellIcon className="h-4 w-4 text-[var(--fgColor-accent)]" />
                    Notifications
                  </div>
                  <p className="text-xs text-[var(--fgColor-muted)] mb-3">
                    Configure Slack, webhook, or email alerts for flag changes.
                  </p>
                  <button className="w-full rounded-lg bg-[var(--bgColor-muted)] px-3 py-2 text-xs font-semibold text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] transition-colors">
                    Configure Alerts
                  </button>
                </div>

                {/* Audit Trail */}
                <div className="rounded-xl border border-[var(--borderColor-default)] bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--fgColor-default)] mb-3">
                    <span className="text-base">📑</span>
                    Audit Trail
                  </div>
                  <p className="text-xs text-[var(--fgColor-muted)] mb-3">
                    View complete change history with actor, timestamp, and
                    diff.
                  </p>
                  <button className="w-full rounded-lg bg-[var(--bgColor-muted)] px-3 py-2 text-xs font-semibold text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] transition-colors">
                    View History
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <footer className="px-6 py-4 border-t border-[var(--borderColor-default)] bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-[var(--fgColor-subtle)]">
            {hasChanges && (
              <>
                <span className="h-2 w-2 rounded-full bg-[var(--bgColor-accent-emphasis)]" />
                <span>Unsaved changes</span>
              </>
            )}
            {!hasChanges && (
              <span className="text-stone-300">All changes saved</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] transition-colors"
            >
              Cancel
            </button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              loading={saving}
            >
              <ShieldIcon className="h-4 w-4" />
              {onRequestApproval ? "Save & Request Approval" : "Save Changes"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
