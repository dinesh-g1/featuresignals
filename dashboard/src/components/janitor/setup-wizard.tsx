"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JanitorIcon } from "@/components/icons/janitor-icon";
import {
  GitFork,
  GitBranch,
  GitPullRequest,
  ArrowRight,
  Check,
} from "lucide-react";

interface SetupWizardProps {
  onConnect: (provider: string) => void;
}

export function SetupWizard({ onConnect }: SetupWizardProps) {
  const [step, setStep] = useState(0);

  const providers = [
    {
      id: "github",
      name: "GitHub",
      icon: GitFork,
      color: "bg-gray-900 text-white hover:bg-gray-800",
    },
    {
      id: "gitlab",
      name: "GitLab",
      icon: GitBranch,
      color: "bg-orange-500 text-white hover:bg-orange-600",
    },
    {
      id: "bitbucket",
      name: "Bitbucket",
      icon: GitPullRequest,
      color: "bg-blue-600 text-white hover:bg-blue-700",
    },
  ];

  return (
    <Card className="border-2 border-dashed border-stone-300">
      <CardContent className="p-8">
        <div className="text-center max-w-md mx-auto">
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
            <JanitorIcon className="h-8 w-8 text-accent" />
          </div>

          <h3 className="text-lg font-bold text-stone-800 mb-2">
            Connect Your Git Provider
          </h3>
          <p className="text-sm text-stone-500 mb-6 leading-relaxed">
            The AI Janitor needs access to your repositories to scan for stale
            feature flags and generate cleanup pull requests. Choose your
            provider below to get started.
          </p>

          {/* Provider buttons */}
          <div className="space-y-3">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => onConnect(provider.id)}
                className={`w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${provider.color}`}
              >
                <provider.icon className="h-5 w-5" />
                Connect {provider.name}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 border-t border-stone-200" />
            <span className="text-xs text-stone-400">or connect manually</span>
            <div className="flex-1 border-t border-stone-200" />
          </div>

          {/* Manual token input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste a Personal Access Token..."
              className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <Button variant="secondary" className="shrink-0">
              Connect
            </Button>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {[0, 1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-2 rounded-full transition-all ${
                  s === 0 ? "bg-accent w-4" : "bg-stone-200"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-2">
            {["Connect", "Select Repos", "Configure", "Scan"].map(
              (label, i) => (
                <span
                  key={label}
                  className={`text-[10px] font-medium ${
                    i === 0 ? "text-accent" : "text-stone-400"
                  }`}
                >
                  {label}
                </span>
              ),
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
