---
title: Infrastructure as Code Overview
description: Manage FeatureSignals resources using your preferred IaC tool — Terraform, Pulumi, Ansible, Crossplane, or CDKTF.
sidebar_position: 1
---

# Infrastructure as Code (IaC) Overview

FeatureSignals supports multiple Infrastructure-as-Code providers, allowing you to manage feature flags, projects, environments, segments, and webhooks alongside your existing infrastructure.

## Supported Providers

| Provider | Status | Format | Use Case |
|---|---|---|---|
| **Terraform** | GA | HCL (.tf) | Ops teams, multi-cloud, IaC standard |
| **Pulumi** | GA | TypeScript (.ts), Go, Python, .NET | Developer-centric teams, programming languages |
| **Ansible** | GA | YAML (.yml) | SRE, platform engineering, config management |
| **Crossplane** | Alpha | Kubernetes CRDs | Cloud-native teams, GitOps workflows |
| **CDKTF** | Alpha | TypeScript (.ts) | AWS CDK users, Terraform bridge |

## Common Use Cases

- **GitOps workflows:** Declare flag state in Git and reconcile automatically
- **Disaster recovery:** Reproduce flag configurations across environments
- **Migration:** Export flags from one provider and import to another
- **Compliance:** Audit flag changes through code review processes
- **Multi-environment parity:** Ensure consistent flag configuration across dev, staging, and production

## Quick Start

1. Choose your preferred IaC tool from the sidebar
2. Configure authentication (API key or OAuth)
3. Define resources using the tool's native syntax
4. Apply your configuration to create/manage FeatureSignals resources

## Provider Comparison

| Feature | Terraform | Pulumi | Ansible |
|---|---|---|---|
| State Management | Native | Native | Agentless |
| Multi-language | HCL only | 5+ languages | YAML |
| Drift Detection | Yes | Yes | No |
| Import Existing | Yes | Yes | Limited |
| GitOps Native | Yes (via TF-Operator) | Yes (via Automation API) | Yes (via AWX) |