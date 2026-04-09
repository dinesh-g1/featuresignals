---
sidebar_position: 1
title: Flag Engine Overview
description: "Overview of the FeatureSignals Flag Engine — the management UI for feature flags, segments, and environments."
---

# Flag Engine Overview

The FeatureSignals Flag Engine is a Next.js web application that provides a visual interface for managing feature flags, environments, team members, and more.

## Accessing the Flag Engine

After starting FeatureSignals, open [https://app.featuresignals.com](https://app.featuresignals.com).

## Navigation

The sidebar provides access to all major sections:

| Section | Description |
|---------|-------------|
| **Flags** | Create, view, and manage feature flags with category and status tracking |
| **Segments** | Define reusable user segments |
| **Environments** | View and manage deployment environments |
| **Eval Metrics** | Monitor flag evaluation statistics |
| **Flag Health** | Identify stale or problematic flags with category-aware thresholds |
| **Env Comparison** | Compare and sync flag states across environments |
| **Target Inspector** | See what a specific user experiences across all flags |
| **Target Comparison** | Compare flag evaluations between two users side-by-side |
| **Usage Insights** | View flag value distributions (true/false percentages) |
| **Webhooks** | Configure event notifications |
| **Audit Log** | Review change history |
| **Team** | Manage organization members and roles |
| **Approvals** | Review and approve pending changes |
| **Settings** | API keys and project configuration |

## Key Features

### Flag Management
- Create flags with different types (boolean, string, number, JSON, A/B)
- Classify flags by category (release, experiment, ops, permission) and track lifecycle status
- Toggle flags per environment
- Configure targeting rules with a visual editor
- Set percentage rollouts
- Configure A/B experiment variants
- Manage mutual exclusion groups
- Set up prerequisite dependencies
- Schedule enable/disable times
- Compare and sync flag states across environments
- Kill switch for emergency disable

### Flag Intelligence
- **Target Inspector** — See all flag evaluations for a specific user
- **Target Comparison** — Compare what two different users experience
- **Usage Insights** — View value distribution percentages per flag

### Real-Time Updates
The Flag Engine uses polling to keep flag states current. Changes made via API or by other team members appear automatically.

### Multi-Environment View
The flag detail page shows per-environment configuration in tabs, making it easy to compare dev, staging, and production settings side by side.
