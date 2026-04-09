---
sidebar_position: 2
title: Enterprise Onboarding
description: "Enterprise onboarding guide for setting up FeatureSignals across teams with phased rollout steps."
---

# Enterprise Onboarding Guide

This guide walks enterprise teams through setting up FeatureSignals for organization-wide use. Follow these steps for a smooth rollout.

## Phase 1: Foundation (Week 1)

### 1. Create Your Organization
Sign up at [app.featuresignals.com](https://app.featuresignals.com/register) and create your organization. Choose your data region (US, EU, or IN).

### 2. Configure SSO
Navigate to **Settings → SSO** and configure your identity provider:
- Upload SAML metadata or enter IdP details manually
- Test the SSO connection
- Enable SSO enforcement for all users

### 3. Set Up Roles
Go to **Settings → Team** and invite your core team:
- **Owners** — Full administrative access
- **Admins** — Manage projects, environments, and team members
- **Developers** — Create and modify flags
- **Viewers** — Read-only access for stakeholders

### 4. Create Project Structure
Plan your project hierarchy:
- One project per application or service
- Environments per deployment stage (development, staging, production)
- API keys per environment

## Phase 2: Integration (Week 2)

### 5. Install SDKs
Choose the appropriate SDK for each service:
- [Go SDK](/sdks/go) | [Node.js SDK](/sdks/nodejs) | [Python SDK](/sdks/python)
- [Java SDK](/sdks/java) | [C# SDK](/sdks/dotnet) | [Ruby SDK](/sdks/ruby)
- [React SDK](/sdks/react) | [Vue SDK](/sdks/vue)

### 6. Create Your First Flag
Start with a low-risk feature flag:
1. Create a boolean flag in the Flag Engine
2. Integrate the SDK check in your code
3. Deploy with the flag off
4. Enable in development, then staging, then production

### 7. Set Up Webhooks
Configure webhooks to notify your team of flag changes:
- **Chat tools (e.g., Slack)** — FeatureSignals does not ship a native Slack app. Create a webhook in the Flag Engine that posts to your Slack **Incoming Webhook** URL (or any HTTPS endpoint); we deliver HTTP notifications to the URL you configure.
- CI/CD pipeline triggers
- Audit trail integration

## Phase 3: Governance (Week 3)

### 8. Enable Approval Workflows
For production environments, require peer review before flag changes:
- Navigate to **Approvals** in the Flag Engine
- Create approval policies per environment

### 9. Review Audit Logs
Verify that all changes are being tracked:
- Check the **Audit Log** for recent activity
- Verify before/after diffs are captured
- Set up log export if needed for compliance

### 10. Deploy Relay Proxy (Optional)
For edge caching and reduced latency:
- Deploy the relay proxy in each region
- Point SDKs to the relay instead of the API

## Phase 4: Scale (Week 4+)

### 11. Onboard Remaining Teams
- Create projects for additional services
- Invite team members with appropriate roles
- Conduct a training session on flag management best practices

### 12. Establish Flag Hygiene
- Define flag naming conventions
- Set up toggle categories (release, experiment, ops, permission)
- Schedule regular stale flag reviews

## Support

Enterprise customers receive:
- Dedicated support with 4-hour SLA
- Deployment assistance
- Custom integration guidance
- Training and onboarding sessions

Contact us at [support@featuresignals.com](mailto:support@featuresignals.com).
