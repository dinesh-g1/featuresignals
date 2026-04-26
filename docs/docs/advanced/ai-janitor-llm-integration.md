---
title: LLM Integration
description: How AI-powered code analysis works and how to configure it
sidebar_position: 6
---

# LLM Integration

The AI Janitor uses Large Language Models (LLMs) to safely analyze and remove stale feature flags. This page explains how the analysis works, how we ensure correctness, and how to configure it for your compliance requirements.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    Analysis Pipeline                              │
│                                                                  │
│  Stale Flag → Provider Selector → Compliance Check → LLM Call   │
│                      │                    │                      │
│                      ▼                    ▼                      │
│               Org Policy?           Data Redaction?               │
│               Budget Left?          Audit Logging?                │
│               Region Match?         Budget Tracking?              │
│                                                                  │
│  LLM Response → Validation → PR Generation                      │
│                      │                                            │
│                      ▼                                            │
│              Confidence ≥ 0.85? → Auto-PR                        │
│              Confidence < 0.85? → Manual Review Needed            │
└──────────────────────────────────────────────────────────────────┘
```

## How Analysis Works

### 1. Multi-File Code Understanding

When analyzing a stale flag, the LLM receives:
- The flag key and metadata (days served, percentage)
- ALL files containing references to the flag
- The full content of each file (context window)

This allows the LLM to understand:
- How the flag is used across the codebase
- Whether the check is in an `if/else`, `if-only`, `ternary`, or `switch`
- Which branch to preserve (true branch for 100% true flags)
- Side effects and dependencies

### 2. Confidence Scoring

Each analysis returns a confidence score (0.0–1.0):

| Score | Meaning | Action |
|-------|---------|--------|
| 0.95–1.0 | Very high confidence | Auto-PR (if enabled) |
| 0.85–0.94 | High confidence | Generate PR, manual review |
| 0.70–0.84 | Medium confidence | Flag for review, manual PR |
| < 0.70 | Low confidence | Don't generate PR, explain why |

### 3. Validation Step

Before creating a PR, the LLM validates:
- Original code (with flag) vs. cleaned code (without flag)
- Semantic equivalence check
- Reports any issues found

If validation fails, the PR is NOT created and detailed errors are shown.

## Provider Selection

### How the Provider is Chosen

1. **Org compliance policy** — Check if LLM is allowed
2. **Per-org provider config** — Use the org's approved provider
3. **Environment variable** — Global default from server config
4. **Hard default** — DeepSeek (most cost-effective)

### What Happens When a Provider is Unavailable

The system degrades gracefully:

1. **Retry** — Automatically retries 3 times with exponential backoff
2. **Fallback provider** — Try next approved provider
3. **Regex fallback** — Use regex-based analysis (with warning)
4. **Skip** — Flag is marked as "needs manual analysis"

## Compliance & Data Privacy

### Data Sent to LLM

When analyzing a flag, the following data is sent:
- Source code files containing flag references
- Flag metadata (key, name, days served)
- Language and file paths

### What is NOT Sent
- Personal data (names, emails)
- API keys and secrets (redacted by default)
- Customer data not related to flag logic
- Entire repositories — only relevant files

### Data Residency

| Provider | Default Region | EU Option | Self-Hosted |
|----------|---------------|-----------|-------------|
| DeepSeek | US | ❌ | ✅ |
| OpenAI | US | ✅ (Azure) | ❌ |
| Azure OpenAI | Configurable | ✅ | ✅ (VNet) |
| Self-hosted | Your infra | ✅ | ✅ |

### Redaction

Sensitive patterns are automatically redacted before sending to any LLM:
- API keys (OpenAI, AWS, generic)
- Private keys (RSA, DSA, EC)
- Connection strings (PostgreSQL, MySQL, Redis, MongoDB)
- JWTs and bearer tokens
- Passwords and secrets

Custom redaction rules can be added in the compliance settings.

## Cost Tracking

| Provider | Input Cost | Output Cost | Per-Flag Estimate |
|----------|-----------|-------------|-------------------|
| DeepSeek | $0.28/M tokens | $1.10/M tokens | ~$0.001–0.005 |
| GPT-4o-mini | $0.15/M tokens | $0.60/M tokens | ~$0.001–0.003 |
| GPT-4o | $2.50/M tokens | $10.00/M tokens | ~$0.02–0.05 |

Monthly budgets can be set in the compliance settings to prevent unexpected costs.

## Supported Languages

The LLM analysis supports all major languages:
- JavaScript / TypeScript (React, Vue, Angular, Node.js)
- Go
- Python
- Java / Kotlin
- Ruby
- C# / .NET
- PHP
- Swift
- Rust
- Scala