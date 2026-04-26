---
title: AI Janitor Quickstart
description: Get started with the AI Janitor in under 5 minutes
sidebar_position: 2
---

# AI Janitor Quickstart

Get the AI Janitor up and running in under 5 minutes. This guide walks you through connecting your Git provider, running your first scan, and generating a cleanup PR.

## Prerequisites

- A FeatureSignals account with a project
- Admin access to a Git repository (GitHub, GitLab, or Bitbucket)
- A Personal Access Token or OAuth App credentials

## Step 1: Connect Your Git Provider

1. Navigate to **Settings → Integrations**
2. Click **Connect** on your Git provider card (GitHub, GitLab, or Bitbucket)
3. Follow the OAuth flow or paste a Personal Access Token
4. Select which repositories to monitor

> 💡 **Tip:** Use a Personal Access Token for a faster setup. Use OAuth for team-managed access.

## Step 2: Configure Scan Settings

1. Go to **AI Janitor** in the sidebar
2. Click the **Settings** (⚙️) button
3. Configure your preferences:

| Setting | Default | Description |
|---------|---------|-------------|
| Scan schedule | Weekly | How often to scan for stale flags |
| Stale threshold | 90 days | Days at 100% true/0% false before flag is stale |
| Auto-generate PR | Off | Automatically create cleanup PRs (not recommended for first use) |
| Branch prefix | `janitor/` | Prefix for generated branch names |
| LLM Provider | DeepSeek | AI provider for code analysis |

## Step 3: Run Your First Scan

1. Click **Scan Now** on the AI Janitor page
2. Watch the real-time progress overlay as the Janitor:
   - Connects to your repositories
   - Scans code for flag references
   - Analyzes each flag for safe removal
3. When complete, review the stale flags report

## Step 4: Review Stale Flags

The scan results show:
- **Flag key & name** — Identifies the flag
- **Days at 100%** — How long it's been serving a single value
- **Environment** — Which environment the flag is in
- **Safe to remove** — Whether AI analysis confirms it's safe
- **Confidence score** — AI's confidence in the analysis (higher is better)

## Step 5: Generate a Cleanup PR

1. Find a flag marked **Safe to Remove**
2. Click **Generate PR**
3. The Janitor creates a PR on your Git provider that:
   - Removes the flag condition block
   - Preserves the active branch's code inline
   - Includes a detailed PR description with analysis metadata
4. Review the PR through your normal workflow

## Step 6: Merge and Celebrate 🎉

1. Review the generated PR (pay attention to the diff)
2. Run your test suite
3. Merge the PR
4. The Janitor automatically marks the flag as cleaned

## Next Steps

- [Configure advanced settings →](/docs/advanced/ai-janitor-configuration)
- [Learn about the PR workflow →](/docs/advanced/ai-janitor-pr-workflow)
- [Understand LLM analysis →](/docs/advanced/ai-janitor-llm-integration)