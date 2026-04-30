"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckIcon,
  PlusIcon,
  ChevronRightIcon,
  RocketIcon,
  CodeIcon,
  InfoIcon,
  FileCodeIcon,
} from "@primer/octicons-react";

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
    icon: <RocketIcon size={14} fill="var(--fgColor-accent)" />,
  },
  {
    value: "string",
    label: "String",
    icon: <CodeIcon size={14} fill="var(--fgColor-accent)" />,
  },
  {
    value: "number",
    label: "Number",
    icon: <InfoIcon size={14} fill="var(--fgColor-accent)" />,
  },
  {
    value: "json",
    label: "JSON",
    icon: <FileCodeIcon size={14} fill="var(--fgColor-accent)" />,
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
      className="rounded-2xl border border-[var(--borderColor-default)] bg-white p-6 sm:p-8"
      style={{ boxShadow: "var(--shadow-floating-medium)" }}
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bgColor-accent-muted)]">
                <RocketIcon size={16} fill="var(--fgColor-accent)" />
              </div>
              <h3 className="text-lg font-bold text-[var(--fgColor-default)]">
                Create a Flag
              </h3>
            </div>

            {/* Name */}
            <div>
              <label
                htmlFor="flag-name"
                className="block text-sm font-semibold text-[var(--fgColor-default)] mb-1.5"
              >
                Name
              </label>
              <input
                id="flag-name"
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder='e.g. "New Checkout Flow"'
                className="w-full rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-3.5 py-2.5 text-sm text-[var(--fgColor-default)] placeholder:text-[var(--fgColor-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--borderColor-accent-muted)] focus:border-[var(--fgColor-accent)] transition-shadow"
              />
            </div>

            {/* Key */}
            <div>
              <label
                htmlFor="flag-key"
                className="block text-sm font-semibold text-[var(--fgColor-default)] mb-1.5"
              >
                Key
              </label>
              <input
                id="flag-key"
                type="text"
                value={flagKey}
                onChange={(e) => setFlagKey(e.target.value)}
                placeholder='e.g. "new-checkout-flow"'
                className="w-full rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-3.5 py-2.5 text-sm font-mono text-[var(--fgColor-default)] placeholder:text-[var(--fgColor-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--borderColor-accent-muted)] focus:border-[var(--fgColor-accent)] transition-shadow"
              />
              {name && flagKey === "" && (
                <p className="text-xs text-[var(--fgColor-subtle)] mt-1">
                  Suggested:{" "}
                  <button
                    type="button"
                    onClick={() => setFlagKey(autoGenerateKey(name))}
                    className="font-mono text-[var(--fgColor-accent)] hover:underline"
                  >
                    {autoGenerateKey(name)}
                  </button>
                </p>
              )}
            </div>

            {/* Type selector */}
            <div>
              <label className="block text-sm font-semibold text-[var(--fgColor-default)] mb-2">
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
                        ? "border-[var(--fgColor-accent)] bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)]"
                        : "border-[var(--borderColor-default)] text-[var(--fgColor-muted)] hover:border-[var(--borderColor-emphasis)] hover:text-[var(--fgColor-default)]"
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
                className="block text-sm font-semibold text-[var(--fgColor-default)] mb-1.5"
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
                        ? "border-[var(--borderColor-success-emphasis)] bg-[var(--bgColor-success-muted)] text-[var(--fgColor-success)]"
                        : "border-[var(--borderColor-default)] text-[var(--fgColor-muted)] hover:border-[var(--borderColor-emphasis)]"
                    }`}
                  >
                    True
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefaultValue("false")}
                    className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                      defaultValue === "false"
                        ? "border-[var(--borderColor-danger-emphasis)] bg-[var(--bgColor-danger-muted)] text-[var(--fgColor-danger)]"
                        : "border-[var(--borderColor-default)] text-[var(--fgColor-muted)] hover:border-[var(--borderColor-emphasis)]"
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
                  className="w-full rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-3.5 py-2.5 text-sm font-mono text-[var(--fgColor-default)] placeholder:text-[var(--fgColor-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--borderColor-accent-muted)] focus:border-[var(--fgColor-accent)] transition-shadow"
                />
              )}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="flag-desc"
                className="block text-sm font-semibold text-[var(--fgColor-default)] mb-1.5"
              >
                Description{" "}
                <span className="text-[var(--fgColor-subtle)] font-normal">
                  (optional)
                </span>
              </label>
              <textarea
                id="flag-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this flag control?"
                rows={2}
                className="w-full rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-3.5 py-2.5 text-sm text-[var(--fgColor-default)] placeholder:text-[var(--fgColor-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--borderColor-accent-muted)] focus:border-[var(--fgColor-accent)] transition-shadow resize-none"
              />
            </div>

            {/* Save button */}
            <button
              type="submit"
              disabled={!name.trim() || !flagKey.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--bgColor-success-emphasis)] hover:bg-[#1c8139] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
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
                  "linear-gradient(135deg, var(--bgColor-success-muted), var(--bgColor-accent-muted))",
              }}
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm mb-3">
                <CheckIcon size={24} fill="var(--fgColor-success)" />
              </div>
              <h3 className="text-lg font-bold text-[var(--fgColor-success)] mb-1">
                Flag Created
              </h3>
              <div className="text-sm text-[var(--fgColor-muted)] space-y-0.5">
                <div>
                  <span className="font-mono font-semibold text-[var(--fgColor-default)]">
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
            <div className="rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-inset)] p-4 mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--fgColor-subtle)] uppercase tracking-wider">
                  Flag Preview
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    savedFlag?.type === "boolean" &&
                    savedFlag?.defaultValue === "true"
                      ? "bg-[var(--bgColor-success-muted)] text-[var(--fgColor-success)]"
                      : "bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)]"
                  }`}
                >
                  {savedFlag?.type === "boolean" &&
                  savedFlag?.defaultValue === "true"
                    ? "ON"
                    : "OFF"}
                </span>
              </div>
              <div className="text-sm font-semibold text-[var(--fgColor-default)]">
                {savedFlag?.name}
              </div>
              <div className="text-xs font-mono text-[var(--fgColor-subtle)] mt-0.5">
                {savedFlag?.key}
              </div>
              {savedFlag?.description && (
                <div className="text-xs text-[var(--fgColor-muted)] mt-1.5">
                  {savedFlag.description}
                </div>
              )}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--borderColor-muted)]">
                <span className="text-[10px] text-[var(--fgColor-subtle)]">
                  Environments:{" "}
                  <span className="font-semibold text-[var(--fgColor-default)]">
                    0
                  </span>
                </span>
                <span className="text-[10px] text-[var(--fgColor-subtle)]">
                  Rules:{" "}
                  <span className="font-semibold text-[var(--fgColor-default)]">
                    0
                  </span>
                </span>
                <span className="text-[10px] text-[var(--fgColor-subtle)]">
                  Evaluations:{" "}
                  <span className="font-semibold text-[var(--fgColor-default)]">
                    0
                  </span>
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="/target"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--fgColor-accent)] hover:bg-[#0757ba] transition-colors duration-150 flex-1"
              >
                Now let&apos;s target it
                <ChevronRightIcon size={16} />
              </a>
              <button
                onClick={handleReset}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-[var(--fgColor-muted)] hover:text-[var(--fgColor-default)] bg-[var(--bgColor-muted)] hover:bg-[#eff2f5] border border-[var(--borderColor-default)] transition-colors duration-150"
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
