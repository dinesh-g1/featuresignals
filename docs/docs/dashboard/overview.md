---
sidebar_position: 1
title: Flag Engine Overview
---

# Flag Engine Overview

The FeatureSignals Flag Engine is a Next.js web application that provides a visual interface for managing feature flags, environments, team members, and more.

## Accessing the Flag Engine

After starting FeatureSignals, open [http://localhost:3000](http://localhost:3000).

## Navigation

The sidebar provides access to all major sections:

| Section | Description |
|---------|-------------|
| **Flags** | Create, view, and manage feature flags |
| **Segments** | Define reusable user segments |
| **Environments** | View and manage deployment environments |
| **Eval Metrics** | Monitor flag evaluation statistics |
| **Flag Health** | Identify stale or problematic flags |
| **Webhooks** | Configure event notifications |
| **Audit Log** | Review change history |
| **Team** | Manage organization members and roles |
| **Approvals** | Review and approve pending changes |
| **Settings** | API keys and project configuration |

## Key Features

### Flag Management
- Create flags with different types (boolean, string, number, JSON, A/B)
- Toggle flags per environment
- Configure targeting rules with a visual editor
- Set percentage rollouts
- Configure A/B experiment variants
- Manage mutual exclusion groups
- Set up prerequisite dependencies
- Schedule enable/disable times
- Promote configurations between environments
- Kill switch for emergency disable

### Real-Time Updates
The Flag Engine uses polling to keep flag states current. Changes made via API or by other team members appear automatically.

### Multi-Environment View
The flag detail page shows per-environment configuration in tabs, making it easy to compare dev, staging, and production settings side by side.
