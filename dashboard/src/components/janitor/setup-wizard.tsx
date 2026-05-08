"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JanitorIcon } from "@/components/icons/janitor-icon";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

interface ConnectRepoResult {
  id?: string;
  full_name?: string;
  status?: string;
  select_required?: boolean;
  message?: string;
  repositories?: { name: string; full_name: string }[];
}
import {
  GitForkIcon, GitBranchIcon, GitPullRequestIcon, ArrowRightIcon, LoaderIcon, AlertIcon, CheckCircleFillIcon, ChevronLeftIcon
} from "@/components/icons/nav-icons";

interface RepositoryOption {
  name: string;
  full_name: string;
}

interface SetupWizardProps {
  onRepoConnected: (repo: { id: string; full_name: string }) => void;
  onCancel: () => void;
}

type Step =
  | "select-provider"
  | "enter-token"
  | "select-repo"
  | "connecting"
  | "connected"
  | "error";

export function SetupWizard({ onRepoConnected, onCancel }: SetupWizardProps) {
  const token = useAppStore((s) => s.token);
  const [step, setStep] = useState<Step>("select-provider");
  const [provider, setProvider] = useState<
    "github" | "gitlab" | "bitbucket" | null
  >(null);
  const [gitToken, setGitToken] = useState("");
  const [orgName, setOrgName] = useState("");
  const [repoName, setRepoName] = useState("");
  const [repoList, setRepoList] = useState<RepositoryOption[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const providers = [
    {
      id: "github" as const,
      name: "GitHub",
      icon: GitForkIcon,
      color: "bg-gray-900 text-white hover:bg-gray-800",
      tokenHint: "Personal Access Token with repo and pull_requests scopes",
    },
    {
      id: "gitlab" as const,
      name: "GitLab",
      icon: GitBranchIcon,
      color: "bg-orange-500 text-white hover:bg-orange-600",
      tokenHint: "Personal Access Token with api scope",
    },
    {
      id: "bitbucket" as const,
      name: "Bitbucket",
      icon: GitPullRequestIcon,
      color: "bg-blue-600 text-white hover:bg-blue-700",
      tokenHint: "App password with repository and pullrequest access",
    },
  ];

  const handleSelectProvider = (p: typeof provider) => {
    setProvider(p);
    setGitToken("");
    setErrorMsg(null);
    setStep("enter-token");
  };

  const handleValidateAndConnect = async () => {
    if (!provider || !gitToken.trim()) return;
    setConnecting(true);
    setErrorMsg(null);

    try {
      const result = (await api.connectRepository(token ?? "", {
        provider: provider,
        token: gitToken.trim(),
        org_or_group: orgName.trim() || undefined,
        repo_name: repoName || undefined,
      })) as unknown as ConnectRepoResult;
      if (result.select_required && result.repositories) {
        setRepoList(result.repositories!);
        if (result.message) {
          setErrorMsg(result.message);
        }
        setStep("select-repo");
        setConnecting(false);
        return;
      }

      setStep("connected");
      setTimeout(() => {
        onRepoConnected(result as { id: string; full_name: string });
      }, 1000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to connect repository";
      setErrorMsg(msg);
      setStep("error");
    } finally {
      setConnecting(false);
    }
  };

  const handleSelectRepo = async (selected: RepositoryOption) => {
    if (!provider || !gitToken.trim()) return;
    setConnecting(true);
    setErrorMsg(null);

    try {
      const result = (await api.connectRepository(token ?? "", {
        provider: provider,
        token: gitToken.trim(),
        repo_name: selected.full_name,
      })) as unknown as ConnectRepoResult;

      setStep("connected");
      setTimeout(() => {
        onRepoConnected(result as { id: string; full_name: string });
      }, 1000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to connect repository";
      setErrorMsg(msg);
      setStep("error");
    } finally {
      setConnecting(false);
    }
  };

  const reset = () => {
    setStep("select-provider");
    setProvider(null);
    setGitToken("");
    setOrgName("");
    setRepoName("");
    setRepoList([]);
    setErrorMsg(null);
    setConnecting(false);
  };

  return (
    <Card className="border-2 border-dashed border-[var(--signal-border-emphasis)]">
      <CardContent className="p-8">
        <div className="text-center max-w-md mx-auto">
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--signal-bg-accent-muted)]">
            <JanitorIcon className="h-8 w-8 text-[var(--signal-fg-accent)]" />
          </div>

          {/* Step: Select Provider */}
          {step === "select-provider" && (
            <>
              <h3 className="text-lg font-bold text-[var(--signal-fg-primary)] mb-2">
                Connect Your Git Provider
              </h3>
              <p className="text-sm text-[var(--signal-fg-secondary)] mb-6 leading-relaxed">
                The AI Janitor needs access to your repositories to scan for
                stale feature flags and generate cleanup pull requests.
              </p>

              <div className="space-y-3">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProvider(p.id)}
                    className={`w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${p.color}`}
                  >
                    <p.icon className="h-5 w-5" />
                    Connect {p.name}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <button
                  onClick={onCancel}
                  className="text-xs text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-secondary)] underline"
                >
                  Skip — I&apos;ll do this later
                </button>
              </div>
            </>
          )}

          {/* Step: Enter Token */}
          {step === "enter-token" && provider && (
            <>
              <div className="flex items-center justify-center gap-2 mb-4">
                <button
                  onClick={() => setStep("select-provider")}
                  className="text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-secondary)]"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <h3 className="text-lg font-bold text-[var(--signal-fg-primary)]">
                  Connect {providers.find((p) => p.id === provider)?.name}
                </h3>
              </div>

              <p className="text-sm text-[var(--signal-fg-secondary)] mb-4 leading-relaxed">
                {providers.find((p) => p.id === provider)?.tokenHint}
              </p>

              <div className="space-y-4">
                <div className="text-left">
                  <label className="block text-xs font-medium text-[var(--signal-fg-secondary)] mb-1">
                    Personal Access Token
                  </label>
                  <input
                    type="password"
                    value={gitToken}
                    onChange={(e) => setGitToken(e.target.value)}
                    placeholder={"ghp_..."}
                    className="w-full rounded-xl border border-[var(--signal-border-emphasis)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)] autofill:bg-white"
                  />
                </div>

                <div className="text-left">
                  <label className="block text-xs font-medium text-[var(--signal-fg-secondary)] mb-1">
                    GitHub Organization (optional)
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g., my-org"
                    className="w-full rounded-xl border border-[var(--signal-border-emphasis)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)]"
                  />
                  <p className="text-xs text-[var(--signal-fg-tertiary)] mt-1">
                    Scope to a specific org. Leave empty to list repos from all
                    orgs and your personal account.
                  </p>
                </div>

                <div className="text-left">
                  <label className="block text-xs font-medium text-[var(--signal-fg-secondary)] mb-1">
                    Repository Name (optional)
                  </label>
                  <input
                    type="text"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    placeholder="e.g., owner/ChatBot"
                    className="w-full rounded-xl border border-[var(--signal-border-emphasis)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)]"
                  />
                  <p className="text-xs text-[var(--signal-fg-tertiary)] mt-1">
                    Use{" "}
                    <code className="text-xs bg-[var(--signal-bg-secondary)] px-1 rounded">
                      owner/repo-name
                    </code>{" "}
                    format when org is empty. If org is set, just the repo name
                    works. Leave both empty to browse all repos.
                  </p>
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-2 rounded-lg bg-[var(--signal-bg-danger-muted)] border border-red-200 p-3 text-left">
                    <AlertIcon className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-xs text-red-700">{errorMsg}</p>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleValidateAndConnect}
                  disabled={!gitToken.trim() || connecting}
                >
                  {connecting ? (
                    <>
                      <LoaderIcon className="h-4 w-4 animate-spin mr-2" />
                      Validating...
                    </>
                  ) : (
                    <>
                      Validate & Connect
                      <ArrowRightIcon className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Step: Select Repository */}
          {step === "select-repo" && provider && (
            <>
              <h3 className="text-lg font-bold text-[var(--signal-fg-primary)] mb-2">
                Select Repository
              </h3>
              <p className="text-sm text-[var(--signal-fg-secondary)] mb-4 leading-relaxed">
                Multiple repositories are available. Choose one to connect:
              </p>

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4 text-left">
                  <AlertIcon className="h-4 w-4 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700">{errorMsg}</p>
                </div>
              )}

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {repoList.map((r) => (
                  <button
                    key={r.full_name}
                    onClick={() => handleSelectRepo(r)}
                    disabled={connecting}
                    className="w-full flex items-center justify-between rounded-xl border border-[var(--signal-border-default)] px-4 py-3 text-sm hover:border-[var(--signal-fg-accent)] hover:bg-[var(--signal-bg-accent-muted)] transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <GitForkIcon className="h-4 w-4 text-[var(--signal-fg-tertiary)]" />
                      <span className="font-medium text-[var(--signal-fg-primary)]">
                        {r.full_name}
                      </span>
                    </div>
                    {connecting ? (
                      <LoaderIcon className="h-4 w-4 animate-spin text-[var(--signal-fg-tertiary)]" />
                    ) : (
                      <ArrowRightIcon className="h-4 w-4 text-[var(--signal-fg-tertiary)]" />
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={reset}
                className="mt-4 text-xs text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-secondary)] underline"
              >
                Start over
              </button>
            </>
          )}

          {/* Step: Connecting */}
          {step === "connecting" && (
            <div className="py-8">
              <LoaderIcon className="h-10 w-10 animate-spin text-[var(--signal-fg-accent)] mx-auto mb-4" />
              <p className="text-sm text-[var(--signal-fg-secondary)]">Connecting repository...</p>
            </div>
          )}

          {/* Step: Connected */}
          {step === "connected" && (
            <div className="py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
                <CheckCircleFillIcon className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-[var(--signal-fg-primary)] mb-2">
                Repository Connected!
              </h3>
              <p className="text-sm text-[var(--signal-fg-secondary)]">
                You can now scan for stale flags.
              </p>
            </div>
          )}

          {/* Step: Error */}
          {step === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--signal-bg-danger-muted)]">
                <AlertIcon className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-[var(--signal-fg-primary)] mb-2">
                Connection Failed
              </h3>
              <p className="text-sm text-red-600 mb-4">{errorMsg}</p>
              <div className="flex gap-2 justify-center">
                <Button variant="default" onClick={reset}>
                  Try Again
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setStep("enter-token")}
                >
                  Edit Token
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
