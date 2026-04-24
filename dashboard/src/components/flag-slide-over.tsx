"use client";

import { useState, useEffect, useCallback } from "react";
import { X, GripVertical, Trash2, Plus, ChevronDown, ChevronRight, GitPullRequest, Shield, Clock, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { Flag, FlagState, TargetingRule } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────

interface FlagSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  flag?: Flag;
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
      name: "Enterprise Users",
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
        className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-Over Panel */}
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-stone-200 animate-in slide-in-from-right duration-300">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="px-6 py-5 border-b border-stone-100 bg-stone-50/80 flex items-start justify-between shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-stone-900 tracking-tight truncate">
                {flagName}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Operational
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-500 font-mono">
              <span className="text-stone-400 font-sans font-medium uppercase text-[10px] tracking-wider">
                Key:
              </span>
              <code className="bg-stone-200/80 px-1.5 py-0.5 rounded text-stone-700 select-all text-[11px]">
                {flagKey}
              </code>
              <span className="text-stone-300">·</span>
              <span className="text-stone-400 font-sans font-medium uppercase text-[10px] tracking-wider">
                Type:
              </span>
              <span className="text-stone-600 capitalize">{flagType}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Master toggle */}
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">
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
              className="rounded-full p-2 text-stone-400 hover:text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 transition-all shadow-sm"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </header>

        {/* ── Tab Navigation ─────────────────────────────────────── */}
        <div className="flex border-b border-stone-200 bg-white shrink-0 px-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "py-3.5 px-4 text-sm font-semibold capitalize tracking-wide transition-all border-b-2 flex items-center gap-2",
                activeTab === tab.id
                  ? "border-accent text-accent"
                  : "border-transparent text-stone-400 hover:text-stone-700",
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
                    <GitPullRequest className="h-3.5 w-3.5" />
                    Generate PR
                  </button>
                </div>
              </div>

              {/* Rules Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    Targeting Rules
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Evaluated top-to-bottom. First matching rule applies.
                    {rules.length > 0 && (
                      <span className="ml-1 text-accent font-medium">
                        {rules.length} rule{rules.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={addRule}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent-dark hover:bg-accent/20 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Rule
                </button>
              </div>

              {/* Rules List */}
              <div className="space-y-3">
                {rules.map((rule, index) => (
                  <div
                    key={rule.id}
                    className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden transition-all hover:border-stone-300"
                  >
                    {/* Rule Header */}
                    <div className="flex items-center justify-between bg-stone-50/80 border-b border-stone-100 px-4 py-2.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        <GripVertical className="h-3.5 w-3.5 text-stone-300 cursor-grab" />
                        <span>
                          Rule {index + 1}:{" "}
                          <input
                            type="text"
                            value={rule.name}
                            onChange={(e) =>
                              updateRule(rule.id, { name: e.target.value })
                            }
                            className="bg-transparent border-none outline-none text-stone-700 font-semibold normal-case focus:text-accent p-0"
                            placeholder="Rule name..."
                          />
                        </span>
                      </div>
                      <button
                        onClick={() => removeRule(rule.id)}
                        className="rounded p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>

                    {/* Rule Body */}
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Condition Builder */}
                      <div className="flex-1 flex flex-wrap items-center gap-1.5 text-sm">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                          IF
                        </span>
                        <select
                          value={rule.attribute}
                          onChange={(e) =>
                            updateRule(rule.id, {
                              attribute: e.target.value,
                            })
                          }
                          className="bg-accent/10 text-accent-dark text-xs font-mono border border-accent/20 rounded-md px-2 py-1.5 outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer"
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
                          className="bg-stone-50 text-stone-700 text-xs font-medium border border-stone-200 rounded-md px-2 py-1.5 outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer"
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
                          className="bg-stone-100 text-stone-800 text-xs font-mono border border-stone-200 rounded-md px-2.5 py-1.5 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 min-w-[100px] flex-1"
                        />
                      </div>

                      {/* Serve Decision */}
                      <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 shrink-0">
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
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
                            className="text-emerald-600"
                          >
                            True
                          </option>
                          <option
                            value="false"
                            className="text-red-500"
                          >
                            False
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Default Fallback Rule */}
                <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-stone-400 text-xs font-bold uppercase tracking-wider">
                        Default
                      </span>
                      <span className="text-stone-500">
                        All other traffic
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                        Serve
                      </span>
                      <span className="rounded-md bg-stone-200 px-2.5 py-1 text-xs font-bold text-stone-500">
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
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-6 text-center">
                <span className="text-3xl mb-3 block">🔀</span>
                <h3 className="text-base font-bold text-stone-900 mb-1">
                  Flag Variations
                </h3>
                <p className="text-sm text-stone-500 max-w-md mx-auto">
                  Configure multivariate flag variations with percentage-based
                  traffic splitting. Available in Pro plan.
                </p>
                <button className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-4 py-2 text-sm font-semibold text-accent-dark hover:bg-accent/20 transition-colors">
                  <Shield className="h-4 w-4" />
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
                <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-stone-800 mb-3">
                    <Clock className="h-4 w-4 text-accent" />
                    Scheduled Changes
                  </div>
                  <p className="text-xs text-stone-500 mb-3">
                    Schedule enable/disable times for this flag across
                    environments.
                  </p>
                  <button className="w-full rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200 transition-colors">
                    + Add Schedule
                  </button>
                </div>

                {/* Approval Workflow */}
                <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-stone-800 mb-3">
                    <Shield className="h-4 w-4 text-accent" />
                    CAB Approval
                  </div>
                  <p className="text-xs text-stone-500 mb-3">
                    Submit this change for Change Advisory Board review and
                    approval.
                  </p>
                  <button
                    onClick={onRequestApproval}
                    className="w-full rounded-lg bg-stone-900 px-3 py-2 text-xs font-bold text-white hover:bg-black transition-colors flex items-center justify-center gap-1.5"
                  >
                    Request CAB Approval
                  </button>
                </div>

                {/* Webhook Notifications */}
                <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-stone-800 mb-3">
                    <Bell className="h-4 w-4 text-accent" />
                    Notifications
                  </div>
                  <p className="text-xs text-stone-500 mb-3">
                    Configure Slack, webhook, or email alerts for flag
                    changes.
                  </p>
                  <button className="w-full rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200 transition-colors">
                    Configure Alerts
                  </button>
                </div>

                {/* Audit Trail */}
                <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-stone-800 mb-3">
                    <span className="text-base">📑</span>
                    Audit Trail
                  </div>
                  <p className="text-xs text-stone-500 mb-3">
                    View complete change history with actor, timestamp, and
                    diff.
                  </p>
                  <button className="w-full rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200 transition-colors">
                    View History
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <footer className="px-6 py-4 border-t border-stone-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-stone-400">
            {hasChanges && (
              <>
                <span className="h-2 w-2 rounded-full bg-accent" />
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
              className="rounded-lg px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
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
              <Shield className="h-4 w-4" />
              {onRequestApproval ? "Save & Request Approval" : "Save Changes"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
