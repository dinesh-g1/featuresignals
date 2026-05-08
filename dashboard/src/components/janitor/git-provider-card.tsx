"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GitForkIcon,
  GitBranchIcon,
  GitPullRequestIcon,
  SettingsIcon,
  ExternalLinkIcon,
  TrashIcon,
} from "@/components/icons/nav-icons";
import { cn, timeAgo } from "@/lib/utils";

interface GitProviderCardProps {
  provider: "github" | "gitlab" | "bitbucket";
  connected: boolean;
  name?: string;
  repoCount?: number;
  lastScanned?: string;
  onConnect: () => void;
  onDisconnect?: () => void;
  onManage?: () => void;
}

const providerConfig = {
  github: {
    name: "GitHub",
    icon: GitForkIcon,
    color: "bg-gray-900 text-white",
    lightColor: "bg-gray-100 text-gray-700",
  },
  gitlab: {
    name: "GitLab",
    icon: GitBranchIcon,
    color: "bg-orange-500 text-white",
    lightColor: "bg-orange-50 text-orange-700",
  },
  bitbucket: {
    name: "Bitbucket",
    icon: GitPullRequestIcon,
    color: "bg-blue-600 text-white",
    lightColor: "bg-blue-50 text-blue-700",
  },
};

export function GitProviderCard({
  provider,
  connected,
  name,
  repoCount,
  lastScanned,
  onConnect,
  onDisconnect,
  onManage,
}: GitProviderCardProps) {
  const config = providerConfig[provider];
  const Icon = config.icon;

  return (
    <div className="rounded-xl border border-[var(--signal-border-default)] bg-white p-5 transition-all hover:shadow-soft">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              connected ? config.color : config.lightColor,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-[var(--signal-fg-primary)]">
                {config.name}
              </h4>
              {connected ? (
                <Badge variant="success" className="text-[10px]">
                  Connected
                </Badge>
              ) : (
                <Badge
                  variant="default"
                  className="text-[10px] bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]"
                >
                  Not connected
                </Badge>
              )}
            </div>
            {connected && name && (
              <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
                Connected as "
                <span className="font-medium text-[var(--signal-fg-primary)]">
                  {name}
                </span>
                "
                {repoCount !== undefined && (
                  <span> — {repoCount} repos linked</span>
                )}
              </p>
            )}
          </div>
        </div>
        {connected && (
          <button
            className="rounded-lg p-1.5 text-[var(--signal-fg-tertiary)] hover:bg-[var(--signal-bg-secondary)]"
            title="Settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {connected && lastScanned && (
        <p className="mt-3 text-xs text-[var(--signal-fg-tertiary)]">
          Last scanned: {timeAgo(lastScanned)}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        {connected ? (
          <>
            {onManage && (
              <Button
                size="sm"
                variant="default"
                className="text-xs"
                onClick={onManage}
              >
                <ExternalLinkIcon className="h-3 w-3 mr-1" />
                Manage Repos
              </Button>
            )}
            {onDisconnect && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-red-600 hover:text-red-700 hover:bg-[var(--signal-bg-danger-muted)]"
                onClick={onDisconnect}
              >
                <TrashIcon className="h-3 w-3 mr-1" />
                Disconnect
              </Button>
            )}
          </>
        ) : (
          <Button
            size="sm"
            variant="primary"
            className="text-xs"
            onClick={onConnect}
          >
            Connect {config.name}
          </Button>
        )}
      </div>
    </div>
  );
}
