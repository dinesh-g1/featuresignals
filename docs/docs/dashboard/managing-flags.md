---
sidebar_position: 2
title: Managing Flags
description: "Create, update, and manage feature flags with the Flag Engine UI including targeting rules and rollout configuration."
---

# Managing Flags

The flag management interface is the core of the FeatureSignals Flag Engine.

## Creating a Flag

1. Navigate to **Flags** in the sidebar
2. Click **Create Flag**
3. Fill in the form:
   - **Key**: Unique identifier used in code (e.g., `enable-dark-mode`)
   - **Name**: Human-readable label
   - **Description**: Optional description
   - **Type**: `boolean`, `string`, `number`, `json`, or `ab`
   - **Default Value**: Value when disabled
   - **Category**: `release`, `experiment`, `ops`, or `permission` (see [Toggle Categories](/core-concepts/toggle-categories))
   - **Status**: `active`, `rolled_out`, `deprecated`, or `archived` (defaults to `active`)
   - **Tags**: Optional tags for organization
4. Click **Create**

## Flag Detail Page

The flag detail page is organized into tabs:

### Overview Tab
- Flag metadata (key, name, type, description)
- Category and status badges
- Tags management
- Prerequisite flags configuration
- Mutual exclusion group editor
- Flag expiration date

### Environment Tabs
Each environment (dev, staging, production) has its own tab showing:
- **Enable/Disable toggle** — master switch
- **Targeting Rules** — conditional value delivery
- **Percentage Rollout** — gradual rollout slider
- **Variants** — A/B experiment configuration (for `ab` type flags)
- **Schedule** — planned enable/disable times

## Toggling Flags

Click the toggle switch in any environment tab to enable or disable a flag. This takes effect immediately and triggers:
- SSE notification to connected SDKs
- Webhook delivery to configured endpoints
- Audit log entry

## Adding Targeting Rules

1. Open a flag's environment tab
2. Click **Add Rule**
3. Configure:
   - **Conditions**: Attribute comparisons
   - **Segment references**: Link to reusable segments
   - **Value**: What to return when matched
   - **Percentage**: What percentage of matching users to include
   - **Priority**: Evaluation order
4. Save

## Mutual Exclusion Groups

In the **Overview** tab, find the **Mutual Exclusion Group** section:
1. Enter a group name (e.g., `checkout-experiments`)
2. Click **Save**
3. The Flag Engine shows how many other flags share this group

To remove from a group, click **Remove**.

## Filtering Flags

The flags list page provides filters to quickly find relevant flags:

- **Search** — Filter by flag key or name
- **Category filter** — Show only release, experiment, ops, or permission flags
- **Status filter** — Show only active, rolled_out, deprecated, or archived flags

Each flag in the list displays its category and status as color-coded badges for quick visual identification.

## Kill Switch

For emergency situations:
1. Open the flag detail page
2. In the target environment tab, click **Kill**
3. The flag is immediately disabled

This creates an audit entry with action `flag.killed`.

## Flag Promotion

Copy configuration from one environment to another:
1. Open the flag detail page
2. Use the **Promote** action
3. Select source and target environments
4. The target environment receives the source's rules, rollout percentage, and enabled state
