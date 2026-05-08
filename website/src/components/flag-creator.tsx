"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  PlusIcon,
  ChevronRight,
  Rocket,
  Code,
  InfoIcon,
  FileCode,
} from "lucide-react";

type FlagType = "boolean" | "string" | "number" | "json";

interface FlagDefinition {
  name: string;
  key: string;
  type: FlagType;
  defaultValue: string;
  description: string;
}

const TYPE_OPTIONS: {
  value: FlagType;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "boolean",
    label: "Boolean",
    icon: <Rocket size={14} fill="var(--signal-fg-accent)" />,
  },
  {
    value: "string",
    label: "String",
    icon: <Code size={14} fill="var(--signal-fg-accent)" />,
  },
  {
    value: "number",
    label: "Number",
    icon: <InfoIcon size={14} fill="var(--signal-fg-accent)" />,
  },
  {
    value: "json",
    label: "JSON",
    icon: <FileCode size={14} fill="var(--signal-fg-accent)" />,
  },
];

function getDefaultPlaceholder(type: FlagType): string {
  switch (type) {
    case "boolean":
      return "true";
    case "string":
      return '"variant-a"';
    case "number":
      return "42";
    case "json":
      return '{"color": "blue"}';
  }
}

function autoGenerateKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function FlagCreator() {
  const [name, setName] = useState("");
  const [flagKey, setFlagKey] = useState("");
  const [type, setType] = useState<FlagType>("boolean");
  const [defaultValue, setDefaultValue] = useState("true");
  const [description, setDescription] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedFlag, setSavedFlag] = useState<FlagDefinition | null>(null);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newName = e.target.value;
      setName(newName);
      if (!saved && flagKey === autoGenerateKey(name)) {
        setFlagKey(autoGenerateKey(newName));
      }
    },
    [name, flagKey, saved],
  );

  const handleTypeChange = useCallback((newType: FlagType) => {
    setType(newType);
    setDefaultValue(getDefaultPlaceholder(newType));
  }, []);

  const handleSave = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !flagKey.trim()) return;

      const def: FlagDefinition = {
        name: name.trim(),
        key: flagKey.trim(),
        type,
        defaultValue,
        description,
      };
      setSavedFlag(def);
      setSaved(true);
    },
    [name, flagKey, type, defaultValue, description],
  );

  const handleReset = useCallback(() => {
    setName("");
    setFlagKey("");
    setType("boolean");
    setDefaultValue("true");
    setDescription("");
    setSaved(false);
    setSavedFlag(null);
  }, []);

  return (
    <div
      className="rounded-2xl border border-[var(--signal-border-default)] bg-white p-6 sm:p-8"
      style={{ boxShadow: "var(--signal-shadow-lg)" }}
    >
      <AnimatePresence mode="wait">
        {!saved ? (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={handleSave}
            className="space-y-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--signal-bg-accent-muted)]">
                <Rocket size={16} fill="var(--signal-fg-accent)" />
              </div>
              <h3 className="text-lg font-bold text-[var(--signal-fg-primary)]">
                Create a Flag
              </h3>
            </div>

            {/* Name */}
            <div>
              <label
                htmlFor="flag-name"
                className="block text-sm font-semibold text-[var(--signal-fg-primary)] mb-1.5"
              >
                Name
              </label>
              <input
                id="flag-name"
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder='e.g. "New Checkout Flow"'
                className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3.5 py-2.5 text-sm text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)] focus:border-[var(--signal-fg-accent)] transition-shadow"
              />
            </div>

            {/* Key */}
            <div>
              <label
                htmlFor="flag-key"
                className="block text-sm font-semibold text-[var(--signal-fg-primary)] mb-1.5"
              >
                Key
              </label>
              <input
                id="flag-key"
                type="text"
                value={flagKey}
                onChange={(e) => setFlagKey(e.target.value)}
                placeholder='e.g. "new-checkout-flow"'
                className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3.5 py-2.5 text-sm font-mono text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)] focus:border-[var(--signal-fg-accent)] transition-shadow"
              />
              {name && flagKey === "" && (
                <p className="text-xs text-[var(--signal-fg-tertiary)] mt-1">
                  Suggested:{" "}
                  <button
                    type="button"
                    onClick={() => setFlagKey(autoGenerateKey(name))}
                    className="font-mono text-[var(--signal-fg-accent)] hover:underline"
                  >
                    {autoGenerateKey(name)}
                  </button>
                </p>
              )}
            </div>

            {/* Type selector */}
            <div>
              <label className="block text-sm font-semibold text-[var(--signal-fg-primary)] mb-2">
                Type
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleTypeChange(opt.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all duration-150 ${
                      type === opt.value
                        ? "border-[var(--signal-fg-accent)] bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]"
                        : "border-[var(--signal-border-default)] text-[var(--signal-fg-secondary)] hover:border-[var(--signal-border-emphasis)] hover:text-[var(--signal-fg-primary)]"
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Default value */}
            <div>
              <label
                htmlFor="flag-default"
                className="block text-sm font-semibold text-[var(--signal-fg-primary)] mb-1.5"
              >
                Default Value
              </label>
              {type === "boolean" ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDefaultValue("true")}
                    className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                      defaultValue === "true"
                        ? "border-[var(--signal-border-success-emphasis)] bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]"
                        : "border-[var(--signal-border-default)] text-[var(--signal-fg-secondary)] hover:border-[var(--signal-border-emphasis)]"
                    }`}
                  >
                    True
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefaultValue("false")}
                    className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                      defaultValue === "false"
                        ? "border-[var(--signal-border-danger-emphasis)] bg-[var(--signal-bg-danger-muted)] text-[var(--signal-fg-danger)]"
                        : "border-[var(--signal-border-default)] text-[var(--signal-fg-secondary)] hover:border-[var(--signal-border-emphasis)]"
                    }`}
                  >
                    False
                  </button>
                </div>
              ) : (
                <input
                  id="flag-default"
                  type="text"
                  value={defaultValue}
                  onChange={(e) => setDefaultValue(e.target.value)}
                  placeholder={getDefaultPlaceholder(type)}
                  className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3.5 py-2.5 text-sm font-mono text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)] focus:border-[var(--signal-fg-accent)] transition-shadow"
                />
              )}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="flag-desc"
                className="block text-sm font-semibold text-[var(--signal-fg-primary)] mb-1.5"
              >
                Description{" "}
                <span className="text-[var(--signal-fg-tertiary)] font-normal">
                  (optional)
                </span>
              </label>
              <textarea
                id="flag-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this flag control?"
                rows={2}
                className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3.5 py-2.5 text-sm text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)] focus:border-[var(--signal-fg-accent)] transition-shadow resize-none"
              />
            </div>

            {/* Save button */}
            <button
              type="submit"
              disabled={!name.trim() || !flagKey.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--signal-bg-success-emphasis)] hover:bg-[#1c8139] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              style={{ boxShadow: "0 1px 0 0 #1f232826" }}
            >
              <PlusIcon size={16} />
              Create Flag
            </button>
          </motion.form>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Success state */}
            <div
              className="rounded-xl p-5 mb-5 text-center"
              style={{
                background:
                  "linear-gradient(135deg, var(--signal-bg-success-muted), var(--signal-bg-accent-muted))",
              }}
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm mb-3">
                <Check size={24} fill="var(--signal-fg-success)" />
              </div>
              <h3 className="text-lg font-bold text-[var(--signal-fg-success)] mb-1">
                Flag Created
              </h3>
              <div className="text-sm text-[var(--signal-fg-secondary)] space-y-0.5">
                <div>
                  <span className="font-mono font-semibold text-[var(--signal-fg-primary)]">
                    {savedFlag?.key}
                  </span>
                </div>
                <div className="text-xs">
                  Type: {savedFlag?.type} · Default:{" "}
                  <span className="font-mono">{savedFlag?.defaultValue}</span>
                </div>
              </div>
            </div>

            {/* Flag preview card */}
            <div className="rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-4 mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--signal-fg-tertiary)] uppercase tracking-wider">
                  Flag Preview
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    savedFlag?.type === "boolean" &&
                    savedFlag?.defaultValue === "true"
                      ? "bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]"
                      : "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]"
                  }`}
                >
                  {savedFlag?.type === "boolean" &&
                  savedFlag?.defaultValue === "true"
                    ? "ON"
                    : "OFF"}
                </span>
              </div>
              <div className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                {savedFlag?.name}
              </div>
              <div className="text-xs font-mono text-[var(--signal-fg-tertiary)] mt-0.5">
                {savedFlag?.key}
              </div>
              {savedFlag?.description && (
                <div className="text-xs text-[var(--signal-fg-secondary)] mt-1.5">
                  {savedFlag.description}
                </div>
              )}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--signal-border-subtle)]">
                <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
                  Environments:{" "}
                  <span className="font-semibold text-[var(--signal-fg-primary)]">
                    0
                  </span>
                </span>
                <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
                  Rules:{" "}
                  <span className="font-semibold text-[var(--signal-fg-primary)]">
                    0
                  </span>
                </span>
                <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
                  Evaluations:{" "}
                  <span className="font-semibold text-[var(--signal-fg-primary)]">
                    0
                  </span>
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="/target"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--signal-fg-accent)] hover:bg-[#0757ba] transition-colors duration-150 flex-1"
              >
                Now let&apos;s target it
                <ChevronRight size={16} />
              </a>
              <button
                onClick={handleReset}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)] bg-[var(--signal-bg-secondary)] hover:bg-[#eff2f5] border border-[var(--signal-border-default)] transition-colors duration-150"
              >
                Create another
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
