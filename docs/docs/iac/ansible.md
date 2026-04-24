---
title: Ansible Collection
description: Manage FeatureSignals resources with the official Ansible collection. Playbook-driven feature flag management for SRE and platform engineering teams.
sidebar_position: 4
---

# Ansible Collection

The FeatureSignals Ansible collection (`featuresignals.feature_flags`) allows you to manage feature flags, projects, environments, segments, webhooks, and API keys through Ansible playbooks. It's designed for SRE and platform engineering teams who want to integrate feature flag management into their existing automation workflows.

## Installation

```bash
# Install from Ansible Galaxy
ansible-galaxy collection install featuresignals.feature_flags

# Or via requirements.yml
---
collections:
  - name: featuresignals.feature_flags
    version: ">=1.0.0"
```

## Requirements

- Ansible 8.0+ (core 2.15+)
- Python 3.10+
- FeatureSignals API key with appropriate permissions

## Modules

### fs_project

Manage projects.

```yaml
- name: Create a project
  fs_project:
    state: present
    api_key: "{{ fs_api_key }}"
    host: "{{ fs_host | default('https://api.featuresignals.com') }}"
    name: "My Application"
    slug: "my-app"
    description: "Main application project"
```

### fs_environment

Manage environments.

```yaml
- name: Create environments
  fs_environment:
    state: present
    api_key: "{{ fs_api_key }}"
    project_slug: "my-app"
    name: "{{ item.name }}"
    slug: "{{ item.slug }}"
    color: "{{ item.color }}"
  loop:
    - { name: "Production", slug: "production", color: "#ef4444" }
    - { name: "Staging", slug: "staging", color: "#f59e0b" }
```

### fs_flag

Manage feature flags with per-environment configuration.

```yaml
- name: Create a feature flag
  fs_flag:
    state: present
    api_key: "{{ fs_api_key }}"
    project_slug: "my-app"
    key: "dark-mode"
    name: "Dark Mode"
    flag_type: "boolean"
    default_value: "false"
    tags:
      - "team:frontend"
      - "ui"
    environments:
      - key: "production"
        enabled: false
      - key: "staging"
        enabled: true
```

### fs_segment

Manage segments with targeting rules.

```yaml
- name: Create a segment
  fs_segment:
    state: present
    api_key: "{{ fs_api_key }}"
    project_slug: "my-app"
    key: "beta-users"
    name: "Beta Users"
    match_type: "all"
    rules:
      - attribute: "user.email"
        operator: "ENDS_WITH"
        values:
          - "@acmecorp.com"
```

### fs_webhook

Manage webhook notifications.

```yaml
- name: Create a webhook
  fs_webhook:
    state: present
    api_key: "{{ fs_api_key }}"
    project_slug: "my-app"
    name: "Slack Notifications"
    url: "https://hooks.slack.com/services/..."
    enabled: true
    event_types:
      - "flag.created"
      - "flag.updated"
      - "flag.toggled"
```

### fs_api_key

Manage API keys per environment.

```yaml
- name: Create an API key
  fs_api_key:
    state: present
    api_key: "{{ fs_api_key }}"
    environment_slug: "production"
    name: "Mobile App Key"
    key_type: "client"
    expires_at: "2027-01-01T00:00:00Z"
```

## Roles

### feature-flag-setup

Complete feature flag lifecycle management in a single role.

```yaml
- hosts: localhost
  roles:
    - role: feature-flag-setup
      vars:
        fs_project:
          name: "My App"
          slug: "my-app"
        fs_environments:
          - name: "Production"
            slug: "production"
          - name: "Staging"
            slug: "staging"
        fs_flags:
          - key: "dark-mode"
            name: "Dark Mode"
            defaults:
              production: false
              staging: true
```

### migration

Automates migration from LaunchDarkly, Unleash, or Flagsmith.

```yaml
- hosts: localhost
  roles:
    - role: migration
      vars:
        fs_source: launchdarkly
        fs_source_api_key: "{{ ld_api_key }}"
        fs_export_format: terraform
```

## Testing

```bash
# Unit tests
ansible-test units

# Integration tests against mock API
ansible-test integration

# Molecule scenarios for end-to-end testing
molecule test
```

## Publishing

The collection is published to [Ansible Galaxy](https://galaxy.ansible.com/featuresignals/feature_flags). Releases follow Semantic Versioning.

```bash
# Build the collection
ansible-galaxy collection build

# Publish to Galaxy
ansible-galaxy collection publish ./featuresignals-feature_flags-1.0.0.tar.gz
```
