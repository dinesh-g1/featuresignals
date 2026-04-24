---
title: AI Janitor
description: Automatically detect and clean up stale feature flags with AI-powered code analysis and PR generation.
sidebar_position: 1
---

# AI Janitor

The AI Janitor is FeatureSignals' intelligent stale flag detection and cleanup engine. It automatically identifies feature flags that are no longer needed, scans your source code for references, and generates pull requests to remove them — keeping your codebase clean and reducing technical debt.

## How It Works

1. **Scan:** The Janitor analyzes your feature flags and identifies stale candidates based on configurable criteria (evaluation inactivity, always-on/always-off behavior).
2. **Analyze:** It connects to your Git repositories and scans source code for references to each stale flag.
3. **Generate PR:** For flags safe to remove, it creates a pull request that removes the flag's conditional blocks while preserving the active code path.
4. **Review:** Your team reviews the generated PR just like any other code change.

## Supported Git Providers

- GitHub (cloud and GitHub Enterprise Server)
- GitLab (cloud and self-hosted)
- Bitbucket (cloud and Bitbucket Data Center)
- Azure DevOps (cloud and Azure DevOps Server)

## Getting Started

1. Navigate to **AI Janitor** in the sidebar
2. Connect your Git repository via the connection wizard
3. Click **Scan** to analyze your flags
4. Review the stale flags report
5. Click **Generate PR** for flags you want to remove
