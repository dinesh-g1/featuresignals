---
title: AI Janitor Configuration
description: All configuration options for the AI Janitor
sidebar_position: 4
---

# AI Janitor Configuration

Fine-tune the AI Janitor to match your team's workflow and compliance requirements.

## Scan Settings

| Setting | Default | Options | Description |
|---------|---------|---------|-------------|
| Scan Schedule | `weekly` | `manual`, `daily`, `weekly`, `monthly` | How often automatic scans run |
| Stale Threshold | `90` days | `30`–`365` | Days a flag must be at 100% true/0% false before it's considered stale |
| Auto-generate PR | `false` | `true`/`false` | Automatically create cleanup PRs without manual approval |

## LLM Provider Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Provider | `deepseek` | Which LLM to use for code analysis |
| Model | `deepseek-chat` | Model name within the provider |
| Temperature | `0.10` | Lower = more deterministic output |
| Min Confidence | `0.85` | Below this threshold, flag PRs for manual review |

### Supported Providers

| Provider | Model | Best For |
|----------|-------|----------|
| DeepSeek | `deepseek-chat` | Cost-effective, 128K context, fast |
| OpenAI | `gpt-4o-mini` | High accuracy, broader language support |
| Azure OpenAI | `gpt-4o` | Enterprise compliance, data residency |
| Self-hosted | Configurable | Air-gapped environments, custom models |

## Compliance Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Compliance Mode | `approved` | How LLM processing is governed |
| Data Masking | `false` | Redact sensitive patterns before LLM analysis |
| Audit Log | `true` | Record all LLM interactions for compliance |
| Monthly Budget | `$0` (unlimited) | Max spend on LLM analysis per month |

### Compliance Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `approved` | Only use approved providers | Standard enterprise |
| `strict` | Approved + data masking + audit | Regulated industries |
| `byo` | Self-hosted LLM only | Air-gapped environments |
| `disabled` | No LLM analysis, regex only | Zero external data sharing |

## Branch Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Branch Prefix | `janitor/` | Prefix for generated branch names (e.g., `janitor/remove-feature-x`) |

## Notification Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Notifications | `true` | Send alerts for new stale flags and PR status |

## Environment Variables

For self-hosted deployments, configure via environment variables:

```bash
# LLM Provider (global default)
JANITOR_LLM_PROVIDER=deepseek

# DeepSeek
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Azure OpenAI
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_MODEL=gpt-4o

# Global LLM settings
JANITOR_LLM_TIMEOUT=30s
JANITOR_LLM_MAX_RETRIES=3
JANITOR_LLM_MIN_CONFIDENCE=0.85
```
