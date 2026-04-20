# FeatureSignals — Infrastructure Provisioning Architecture

> **Version:** 1.1.0  
> **Status:** Design Document — Pending Review  
> **Author:** Engineering  
> **Last Updated:** 2026-01-15  
> **Audience:** Engineering, DevOps, Infrastructure Team

---

## Table of Contents

1. [Core Principles](#1-core-principles)
2. [Infrastructure Stack Overview](#2-infrastructure-stack-overview)
3. [Environment Model: Persistent vs Ephemeral](#3-environment-model-persistent-vs-ephemeral)
4. [Provisioning Architecture](#4-provisioning-architecture)
5. [Terraform Modules](#5-terraform-modules)
6. [Ansible Configuration](#6-ansible-configuration)
7. [Docker Compose Templates](#7-docker-compose-templates)
8. [Configuration Strategy](#8-configuration-strategy)
9. [Multi-Region Provisioning](#9-multi-region-provisioning)
10. [DNS & TLS Automation](#10-dns--tls-automation)
11. [Secrets Management](#11-secrets-management)
12. [Resource Allocation & Sizing](#12-resource-allocation--sizing)
13. [Environment Lifecycle Management](#13-environment-lifecycle-management)
14. [Cost-Optimized Infrastructure](#14-cost-optimized-infrastructure)
15. [Scaling Path](#15-scaling-path)
16. [Disaster Recovery & Backup](#16-disaster-recovery--backup)
17. [Observability Integration](#17-observability-integration)
18. [Implementation Checklist](#18-implementation-checklist)

---

## 1. Core Principles

### 1.1 Non-Negotiable Rules

1. **Persistent vs Ephemeral environments** — Customer-facing environments (SaaS orgs, Dedicated VPS, On-Prem) are **persistent** and exist for the lifetime of the customer relationship. Internal environments (sandbox, perf, demo) are **ephemeral** with auto-expiry.
2. **Infrastructure is code** — Every resource is defined in Terraform/Ansible. No manual VPS setup.
3. **Provisioning is automated** — Triggered from Ops Portal or CI. No SSH-and-manual-configure.
4. **Single source of truth for configuration** — `.env.example` documents ALL variables for ALL deployment models. No hardcoded config in code, Dockerfiles, or compose files. Same config structure works locally, in CI, and in production.
5. **Data stays in region** — Each region has isolated PostgreSQL. No cross-region data transfer for customer data.
6. **Cost-aware provisioning** — Every environment has a cost attribution. Idle ephemeral environments are auto-suspended.
7. **Graceful degradation** — If non-critical services (webhooks, metrics) are down, flag evaluation still works.

### 1.2 What This Architecture Replaces

| Old Approach | New Approach |
|--------------|--------------|
| Hardcoded dev/stage/prod VPSes | Dynamic named environments (any branch, any name) |
| Manual SSH setup + docker compose | Terraform + Ansible + automated deploy |
| Single region (IN) | Multi-region (IN, US, EU, ASIA) with geo-routing |
| Shared secrets in `.env` files | SOPS + Age encrypted secrets, decrypted at deploy time |
| No cost tracking | Per-environment cost attribution + margin analysis |
| Manual DNS records | Cloudflare API automation |

---

## 2. Infrastructure Stack Overview

### 2.1 Technology Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| **DNS/CDN** | Cloudflare | Geo-routing, DDoS protection, TLS, DNS automation |
| **IaaS** | Hetzner (EU/US), Utho (IN), AWS/DigitalOcean (ASIA) | VPS provisioning, block storage |
| **Provisioning** | Terraform | VPS creation, networking, firewall, DNS records |
| **Configuration** | Ansible | OS hardening, Docker setup, app deployment |
| **Orchestration** | Docker Compose | Service lifecycle, health checks, log rotation |
| **Secrets** | SOPS + Age | Encrypted secrets in Git, decrypted at deploy time |
| **Reverse Proxy** | Caddy | Auto-HTTPS, per-environment routing |
| **Database** | PostgreSQL 16 | Per-region, isolated per dedicated VPS, shared for SaaS |
| **Monitoring** | SigNoz (cloud) | Traces, metrics, logs via OpenTelemetry |

### 2.2 Provider Selection by Region

| Region | Primary Provider | Backup Provider | Reason |
|--------|------------------|-----------------|--------|
| **IN (Mumbai)** | Utho | AWS ap-south-1 | Cost-effective, local data residency |
| **US (Virginia)** | Hetzner (ASH) | AWS us-east-1 | Low latency, ARM instances available |
| **EU (Frankfurt)** | Hetzner (FSN1) | AWS eu-central-1 | GDPR compliant, mature provider |
| **ASIA (Singapore)** | DigitalOcean / Vultr | AWS ap-southeast-1 | Regional coverage, good performance |

### 2.3 High-Level Architecture

```
                                    ┌─────────────────────────────────────────────┐
                                    │              Cloudflare                      │
                                    │  DNS + Geo-Routing + DDoS + CDN + WAF       │
                                    └──────────────────┬──────────────────────────┘
                                                       │
                    ┌──────────────────────────────────┼──────────────────────────────────┐
                    │                                  │                                  │
              ┌─────▼─────┐                    ┌──────▼──────┐                    ┌──────▼──────┐
              │ IN Region  │                    │ US Region   │                    │ EU Region   │
              │ Mumbai     │                    │ Virginia    │                    │ Frankfurt   │
              ├────────────┤                    ├─────────────┤                    ├─────────────┤
              │ Caddy      │                    │ Caddy       │                    │ Caddy       │
              │ API Server │                    │ API Server  │                    │ API Server  │
              │ Dashboard  │                    │ Dashboard   │                    │ Dashboard   │
              │ PostgreSQL │                    │ PostgreSQL  │                    │ PostgreSQL  │
              │ (local)    │                    │ (local)     │                    │ (local)     │
              └─────┬──────┘                    └──────┬──────┘                    └──────┬──────┘
                    │                                  │                                  │
                    └──────────────────────────────────┼──────────────────────────────────┘
                                                       │
                                    ┌──────────────────▼──────────────────────────────────┐
                                    │              Ops Portal (Central)                    │
                                    │  ops.featuresignals.com                              │
                                    │  IAM, Provisioning API, Cost Engine, Licenses        │
                                    └─────────────────────────────────────────────────────┘
```

---

## 3. Environment Model: Persistent vs Ephemeral

### 3.1 Environment Definition

An **environment** is a named, isolated deployment of FeatureSignals. It is NOT tied to dev/stage/prod.

**Critical distinction: Persistent vs Ephemeral environments.** Customer-facing environments exist for the lifetime of the customer relationship and are never auto-decommissioned. Internal environments have auto-expiry and are cleaned up automatically.

```typescript
interface Environment {
  id: string;                    // env_xxx
  name: string;                  // e.g., "dev", "staging", "acme-prod", "demo-q1"
  type: "shared" | "dedicated" | "onprem";
  category: "persistent" | "ephemeral" | "internal";  // Determines lifecycle
  region: "in" | "us" | "eu" | "asia";
  status: "requested" | "provisioning" | "active" | "maintenance" | "decommissioning" | "destroyed";
  
  // Lifecycle
  auto_expiry: boolean;          // false for persistent, true for ephemeral
  expiry_date: string | null;    // null = no expiry (persistent)
  
  // Deployment target
  git_ref: string;               // branch, tag, or SHA
  image_tag: string;             // sha-xxxxxxx or v1.2.3
  
  // Ownership
  customer_id: string | null;    // null = internal environment
  created_by: string;            // user_id
  created_at: string;            // ISO 8601
  
  // Resources
  resources: {
    vps_id: string;
    vps_ip: string;
    cpu_cores: number;
    memory_gb: number;
    disk_gb: number;
    db_connection: string;       // postgresql://... (stored encrypted)
  };
  
  // URLs
  urls: {
    api: string;                 // https://api-{env}.featuresignals.com
    dashboard: string;           // https://app-{env}.featuresignals.com
    ops: string;                 // https://ops-{env}.featuresignals.com (internal only)
  };
  
  // Cost tracking
  cost: {
    daily_usd: number;
    monthly_usd: number;
    attribution: "internal" | "customer-billable";
  };
}
```

### 3.2 Environment Classification

| Category | Types | Auto-Expiry | Destruction Trigger |
|----------|-------|-------------|---------------------|
| **Persistent** | SaaS org, Dedicated VPS, On-Prem | **Never** | Customer churn, explicit request, contract termination |
| **Ephemeral** | Sandbox (7d), Perf test (3d), Demo (30d) | Yes | Auto-decommission after expiry |
| **Internal** | Dev, Staging | No (manual) | Manual decommission |

**Rule:** Customer-facing environments (SaaS, Dedicated VPS, On-Prem) are **PERSISTENT**. They exist for the lifetime of the customer relationship. They are **never auto-decommissioned**. Only destroyed on explicit customer request or churn.

### 3.3 Environment Types

| Type | Category | Description | Use Case |
|------|----------|-------------|----------|
| **Shared** | Persistent | Multi-tenant VPS, isolated by `org_id` | Free/Pro/Enterprise SaaS customers |
| **Dedicated** | Persistent | Own VPS, own PostgreSQL, own Caddy | Enterprise customers, compliance-required |
| **On-Prem** | Persistent | Customer's infrastructure, license-validated | Regulated industries, air-gapped |
| **Sandbox** | Ephemeral | Auto-expiry 7 days | QA, personal testing, demos |
| **Perf Test** | Ephemeral | Auto-expiry 3 days | Performance/load testing |
| **Demo** | Ephemeral | Auto-expiry 30 days (extendable) | Sales demos |
| **Dev/Staging** | Internal | Manual management | Internal development |

### 3.4 Environment Naming Convention

```
Internal Environments:
  dev              — Primary development environment
  staging          — Pre-production validation
  sandbox-{user}   — Personal sandbox (auto-expiry 7 days)
  perf-{date}      — Performance testing (auto-expiry 3 days)
  demo-{quarter}   — Sales demo environment

Customer Environments:
  {customer}-prod  — Customer production
  {customer}-stage — Customer staging
  {customer}-dev   — Customer development
```

---

## 4. Provisioning Architecture

### 4.1 Provisioning Flow

**Persistent environments** follow the full provisioning flow (VPS → Ansible → Deploy → DNS). **Ephemeral environments** may reuse existing VPS resources (shared infra) to reduce cost and provisioning time.

```
Ops Portal User          Ops Portal API        Provisioning Service      Terraform        Ansible        Target VPS
     │                        │                        │                      │                │                │
     │── Create Env ─────────>│                        │                      │                │                │
     │   (name, type,         │                        │                      │                │                │
     │    region, git_ref)    │                        │                      │                │                │
     │                        │── Validate ───────────>│                      │                │                │
     │                        │   (quota, budget,      │                      │                │                │
     │                        │    region capacity)    │                      │                │                │
     │                        │                        │── Generate Secrets ──>│                │                │
     │                        │                        │   (DB pass, JWT)     │                │                │
     │                        │                        │                      │                │                │
     │                        │                        │── terraform apply ──────────────────>│                │
     │                        │                        │   (VPS, FW, vol, DNS)│                │                │
     │                        │                        │                      │                │                │
     │                        │                        │<── VPS IP ───────────│                │                │
     │                        │                        │                      │                │                │
     │                        │                        │── ansible-playbook ──────────────────────────────────>│
     │                        │                        │   (OS, Docker, Caddy)│                │                │
     │                        │                        │                      │                │                │
     │                        │                        │── docker compose up ────────────────────────────────>│
     │                        │                        │   (pull image, deploy)│               │                │
     │                        │                        │                      │                │                │
     │                        │                        │── Health Check ─────────────────────────────────────>│
     │                        │                        │   (GET /health)      │                │                │
     │                        │                        │                      │                │                │
     │                        │<── Env Ready ──────────│                      │                │                │
     │<── Env URL, Status ────│                        │                      │                │                │
```

### 4.2 Provisioning Time Targets

| Step | Target Time | Notes |
|------|-------------|-------|
| Validation + secret generation | < 10s | In-memory checks, crypto random |
| Terraform VPS creation | 2-4 minutes | Provider API latency |
| Ansible configuration | 1-2 minutes | OS updates, Docker install |
| Docker pull + deploy | 1-2 minutes | Image size ~200MB |
| Migrations + health check | 30 seconds | ~50 migrations |
| **Total** | **5-8 minutes** | End-to-end |

### 4.3 Provisioning Service API

```go
// server/internal/provisioning/service.go

type ProvisioningService struct {
    terraform   TerraformRunner
    ansible     AnsibleRunner
    secrets     SecretGenerator
    dns         DNSManager
    store       EnvironmentStore
    cost        CostCalculator
    logger      *slog.Logger
}

func (s *ProvisioningService) CreateEnvironment(ctx context.Context, req CreateEnvironmentRequest) (*Environment, error) {
    // 1. Validate request
    if err := s.validateRequest(req); err != nil {
        return nil, fmt.Errorf("validate request: %w", err)
    }

    // 2. Generate secrets
    secrets, err := s.secrets.Generate()
    if err != nil {
        return nil, fmt.Errorf("generate secrets: %w", err)
    }

    // 3. Provision VPS via Terraform
    vps, err := s.terraform.Provision(ctx, TerraformRequest{
        Region:     req.Region,
        Type:       req.Type,
        Plan:       s.selectPlan(req.Type),
        Hostname:   fmt.Sprintf("fs-%s-%s", req.Region, req.Name),
        Labels: map[string]string{
            "env_name":    req.Name,
            "env_type":    string(req.Type),
            "customer_id": req.CustomerID,
            "created_by":  req.CreatedBy,
        },
    })
    if err != nil {
        return nil, fmt.Errorf("provision vps: %w", err)
    }

    // 4. Configure VPS via Ansible
    if err := s.ansible.Configure(ctx, AnsibleRequest{
        Host:    vps.IP,
        Secrets: secrets,
        Env:     req,
    }); err != nil {
        // Rollback VPS
        s.terraform.Destroy(ctx, vps.ID)
        return nil, fmt.Errorf("configure vps: %w", err)
    }

    // 5. Deploy application
    if err := s.deploy(ctx, vps.IP, secrets, req); err != nil {
        return nil, fmt.Errorf("deploy application: %w", err)
    }

    // 6. Health check
    if err := s.healthCheck(ctx, vps.IP); err != nil {
        return nil, fmt.Errorf("health check: %w", err)
    }

    // 7. Create DNS records
    if err := s.dns.CreateRecords(ctx, DNSRequest{
        EnvName: req.Name,
        Region:  req.Region,
        VPSIP:   vps.IP,
    }); err != nil {
        s.logger.Warn("DNS creation failed, env still functional", "error", err)
    }

    // 8. Register in database
    env, err := s.store.Create(ctx, Environment{
        Name:       req.Name,
        Type:       req.Type,
        Region:     req.Region,
        Status:     "active",
        GitRef:     req.GitRef,
        ImageTag:   req.ImageTag,
        CustomerID: req.CustomerID,
        CreatedBy:  req.CreatedBy,
        Resources: EnvironmentResources{
            VPSID:        vps.ID,
            VPSIP:        vps.IP,
            CPUCores:     vps.CPUCores,
            MemoryGB:     vps.MemoryGB,
            DiskGB:       vps.DiskGB,
            DBConnection: secrets.DatabaseURL, // stored encrypted
        },
    })
    if err != nil {
        return nil, fmt.Errorf("register environment: %w", err)
    }

    // 9. Start cost tracking
    s.cost.StartTracking(env.ID, env.Resources)

    return env, nil
}
```

---

## 5. Terraform Modules

### 5.1 Module Structure

**Note:** Terraform is only used for **persistent** environments (Dedicated VPS, regional infrastructure). Ephemeral environments on shared infrastructure do not require Terraform — they are provisioned via Docker Compose on existing VPSes.

```
infra/terraform/
├── modules/
│   ├── vps/                     # Generic VPS module (provider-agnostic)
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── providers/
│   │       ├── hetzner.tf
│   │       ├── utho.tf
│   │       └── digitalocean.tf
│   ├── networking/              # VPC, subnets, firewall rules
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── dns/                     # Cloudflare DNS records
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── storage/                 # Block storage volumes
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── environments/
│   ├── in/                      # India region
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   ├── us/                      # US region
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   ├── eu/                      # EU region
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   └── asia/                    # Asia region
│       ├── main.tf
│       ├── variables.tf
│       └── terraform.tfvars
└── state/
    └── backend.tf               # Remote state configuration (S3/Terraform Cloud)
```

### 5.2 VPS Module (Hetzner Example)

```hcl
# infra/terraform/modules/vps/providers/hetzner.tf

terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.47"
    }
  }
}

variable "hcloud_token" {
  type      = string
  sensitive = true
}

variable "region" {
  type        = string
  description = "Hetzner location (ash, fsn1, hel1)"
}

variable "server_type" {
  type        = string
  default     = "cax21"
  description = "Server type (cax21=4 vCPU/8GB ARM, cpx31=4 vCPU/8GB x86)"
}

variable "volume_size" {
  type    = number
  default = 50
}

variable "ssh_key_id" {
  type    = string
}

variable "hostname" {
  type    = string
}

variable "labels" {
  type    = map(string)
  default = {}
}

provider "hcloud" {
  token = var.hcloud_token
}

# Firewall
resource "hcloud_firewall" "this" {
  name = "fs-${var.hostname}-fw"

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "udp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
}

# Persistent volume for PostgreSQL
resource "hcloud_volume" "data" {
  name     = "fs-${var.hostname}-data"
  size     = var.volume_size
  location = var.region
  format   = "ext4"

  labels = merge(var.labels, {
    service = "featuresignals"
    purpose = "database"
  })
}

# Server
resource "hcloud_server" "this" {
  name        = var.hostname
  server_type = var.server_type
  location    = var.region
  image       = "ubuntu-24.04"
  ssh_keys    = [var.ssh_key_id]
  firewall_ids = [hcloud_firewall.this.id]

  labels = merge(var.labels, {
    service = "featuresignals"
  })

  user_data = templatefile("${path.module}/templates/cloud-init.yaml", {
    hostname = var.hostname
  })
}

resource "hcloud_volume_attachment" "data" {
  volume_id = hcloud_volume.data.id
  server_id = hcloud_server.this.id
  automount = true
}

output "id" {
  value = hcloud_server.this.id
}

output "ip" {
  value = hcloud_server.this.ipv4_address
}

output "cpu_cores" {
  value = hcloud_server.this.server_type.cores
}

output "memory_gb" {
  value = hcloud_server.this.server_type.memory
}

output "volume_id" {
  value = hcloud_volume.data.id
}
```

### 5.3 Cloud Init Template

```yaml
# infra/terraform/modules/vps/templates/cloud-init.yaml

#cloud-config
hostname: ${hostname}
manage_etc_hosts: true

packages:
  - curl
  - git
  - ufw
  - fail2ban
  - unattended-upgrades
  - apt-listchanges
  - logrotate

package_update: true
package_upgrade: true

# Automatic security updates
apt:
  periodic:
    update_package_lists: 1
    unattended_upgrade: 1
    autoclean_interval: 7

# Firewall setup
write_files:
  - path: /etc/ufw/before.rules.d/99-custom.rules
    content: |
      # Allow HTTP/HTTPS
      -A ufw-before-input -p tcp --dport 80 -j ACCEPT
      -A ufw-before-input -p tcp --dport 443 -j ACCEPT

  - path: /etc/fail2ban/jail.local
    content: |
      [sshd]
      enabled = true
      maxretry = 3
      bantime = 3600
      findtime = 600

# SSH hardening
ssh_pwauth: false
disable_root: true

# Create deploy user
users:
  - name: deploy
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    ssh_authorized_keys:
      - ${ssh_public_key}

# Docker log rotation
write_files:
  - path: /etc/docker/daemon.json
    content: |
      {
        "log-driver": "json-file",
        "log-opts": {
          "max-size": "20m",
          "max-file": "5"
        }
      }

runcmd:
  # Install Docker
  - curl -fsSL https://get.docker.com | sh
  - systemctl enable docker
  - usermod -aG docker deploy

  # Enable firewall
  - ufw default deny incoming
  - ufw default allow outgoing
  - ufw allow 22/tcp
  - ufw allow 80/tcp
  - ufw allow 443/tcp
  - ufw allow 443/udp
  - ufw --force enable

  # Restart SSH with hardened config
  - systemctl restart sshd

  # Create app directory
  - mkdir -p /opt/featuresignals
  - chown deploy:deploy /opt/featuresignals

  # Mount persistent volume
  - mkdir -p /mnt/data
  - echo "/dev/disk/by-id/scsi-0HC_Volume_${volume_id} /mnt/data ext4 defaults,nofail 0 2" >> /etc/fstab
  - mount -a
  - mkdir -p /mnt/data/pgdata /mnt/data/backups
  - chown -R deploy:deploy /mnt/data
```

### 5.4 DNS Module (Cloudflare)

```hcl
# infra/terraform/modules/dns/main.tf

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "zone_id" {
  type    = string
}

variable "env_name" {
  type    = string
}

variable "region" {
  type    = string
}

variable "vps_ip" {
  type    = string
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# API subdomain
resource "cloudflare_record" "api" {
  zone_id = var.zone_id
  name    = "api-${var.env_name}-${var.region}"
  value   = var.vps_ip
  type    = "A"
  ttl     = 300
  proxied = true

  comment = "FeatureSignals API - ${var.env_name} (${var.region})"
}

# Dashboard subdomain
resource "cloudflare_record" "app" {
  zone_id = var.zone_id
  name    = "app-${var.env_name}-${var.region}"
  value   = var.vps_ip
  type    = "A"
  ttl     = 300
  proxied = true

  comment = "FeatureSignals Dashboard - ${var.env_name} (${var.region})"
}

# Wildcard for future services
resource "cloudflare_record" "wildcard" {
  zone_id = var.zone_id
  name    = "*.${var.env_name}-${var.region}"
  value   = var.vps_ip
  type    = "A"
  ttl     = 300
  proxied = true

  comment = "FeatureSignals Wildcard - ${var.env_name} (${var.region})"
}

output "api_url" {
  value = "https://${cloudflare_record.api.hostname}"
}

output "app_url" {
  value = "https://${cloudflare_record.app.hostname}"
}
```

---

## 6. Ansible Configuration

### 6.1 Playbook Structure

```
infra/ansible/
├── playbooks/
│   ├── vps-setup.yml            # Initial VPS setup (OS, Docker, users)
│   ├── app-deploy.yml           # Deploy FeatureSignals app
│   ├── app-update.yml           # Update app to new image
│   └── app-decommission.yml     # Clean up environment
├── roles/
│   ├── docker/                  # Docker installation + configuration
│   ├── caddy/                   # Caddy reverse proxy setup
│   ├── postgresql/              # PostgreSQL setup (if local)
│   ├── app/                     # FeatureSignals app deployment
│   └── monitoring/              # OpenTelemetry collector setup
├── inventory/
│   ├── dynamic/                 # Dynamic inventory from Ops Portal API
│   │   └── inventory.py
│   └── static/                  # Static inventory (for manual runs)
│       └── hosts.yml
└── vault/                       # Encrypted variables (SOPS)
    └── secrets.yml
```

### 6.2 VPS Setup Playbook

```yaml
# infra/ansible/playbooks/vps-setup.yml
---
- name: Setup FeatureSignals VPS
  hosts: all
  become: yes
  gather_facts: yes

  vars:
    app_user: deploy
    app_dir: /opt/featuresignals
    data_dir: /mnt/data
    pg_data_dir: "{{ data_dir }}/pgdata"
    backup_dir: "{{ data_dir }}/backups"

  roles:
    - role: docker
    - role: caddy
    - role: postgresql
    - role: app
    - role: monitoring

  tasks:
    - name: Create app directory
      file:
        path: "{{ app_dir }}"
        state: directory
        owner: "{{ app_user }}"
        group: "{{ app_user }}"
        mode: "0755"

    - name: Create data directories
      file:
        path: "{{ item }}"
        state: directory
        owner: "{{ app_user }}"
        group: "{{ app_user }}"
        mode: "0750"
      loop:
        - "{{ pg_data_dir }}"
        - "{{ backup_dir }}"

    - name: Set up backup cron
      cron:
        name: "FeatureSignals PostgreSQL backup"
        job: "cd {{ app_dir }} && bash deploy/pg-backup.sh >> {{ backup_dir }}/backup.log 2>&1"
        hour: "3"
        minute: "0"
        user: "{{ app_user }}"

    - name: Clone repository (for scripts)
      git:
        repo: "https://github.com/featuresignals/featuresignals.git"
        dest: "{{ app_dir }}"
        version: "{{ git_ref | default('main') }}"
        force: yes
      become_user: "{{ app_user }}"
```

### 6.3 App Deploy Role

```yaml
# infra/ansible/roles/app/tasks/main.yml
---
- name: Generate .env file
  template:
    src: env.j2
    dest: "{{ app_dir }}/.env"
    owner: "{{ app_user }}"
    group: "{{ app_user }}"
    mode: "0600"
  vars:
    env_template: |
      REGION={{ region }}
      DOMAIN_API={{ api_domain }}
      DOMAIN_APP={{ app_domain }}
      POSTGRES_PASSWORD={{ postgres_password }}
      JWT_SECRET={{ jwt_secret }}
      DATABASE_URL=postgresql://fs:{{ postgres_password }}@localhost:5432/featuresignals?sslmode=disable
      LOG_LEVEL={{ log_level | default('info') }}
      IMAGE_TAG={{ image_tag }}
      USE_REGISTRY=true
      CORS_ENABLED=true
      ALLOWED_ORIGINS=https://{{ app_domain }}

- name: Pull Docker images
  community.docker.docker_compose_v2:
    project_src: "{{ app_dir }}"
    files:
      - deploy/docker-compose.region.yml
    state: present
    pull: always
    env_file: "{{ app_dir }}/.env"
  become_user: "{{ app_user }}"

- name: Run database migrations
  community.docker.docker_compose_v2:
    project_src: "{{ app_dir }}"
    files:
      - deploy/docker-compose.region.yml
    services:
      - migrate
    state: present
    env_file: "{{ app_dir }}/.env"
  become_user: "{{ app_user }}"
  register: migration_result

- name: Start services
  community.docker.docker_compose_v2:
    project_src: "{{ app_dir }}"
    files:
      - deploy/docker-compose.region.yml
    state: present
    env_file: "{{ app_dir }}/.env"
  become_user: "{{ app_user }}"

- name: Wait for API health
  uri:
    url: "http://localhost:8080/health"
    status_code: 200
    timeout: 30
  register: health_result
  retries: 15
  delay: 4
  until: health_result.status == 200
```

---

## 7. Docker Compose Templates

### 7.1 Regional Compose Template

```yaml
# deploy/compose/region.yml
# Template for per-region, per-environment deployment

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: fs
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: featuresignals
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./deploy/pg-init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fs"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
    networks:
      - internal

  migrate:
    image: ghcr.io/featuresignals/server:${IMAGE_TAG:-latest}
    command: ["migrate", "up"]
    environment:
      DATABASE_URL: postgresql://fs:${POSTGRES_PASSWORD}@postgres:5432/featuresignals?sslmode=disable
    depends_on:
      postgres:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 256M
    networks:
      - internal

  server:
    image: ghcr.io/featuresignals/server:${IMAGE_TAG:-latest}
    environment:
      DATABASE_URL: postgresql://fs:${POSTGRES_PASSWORD}@postgres:5432/featuresignals?sslmode=disable
      JWT_SECRET: ${JWT_SECRET}
      PORT: "8080"
      LOG_LEVEL: ${LOG_LEVEL:-info}
      REGION: ${REGION}
      CORS_ENABLED: "true"
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
      OTEL_ENABLED: ${OTEL_ENABLED:-false}
      OTEL_EXPORTER_OTLP_ENDPOINT: ${OTEL_ENDPOINT:-}
      OTEL_INGESTION_KEY: ${OTEL_KEY:-}
    ports:
      - "8080:8080"
    depends_on:
      migrate:
        condition: service_completed_successfully
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "2.0"
        reservations:
          memory: 512M
          cpus: "0.5"
    networks:
      - internal
      - external

  dashboard:
    image: ghcr.io/featuresignals/dashboard:${IMAGE_TAG:-latest}
    environment:
      NEXT_PUBLIC_API_URL: https://${DOMAIN_API}
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.0"
    networks:
      - internal
      - external

  caddy:
    image: caddy:2-alpine
    volumes:
      - ./deploy/Caddyfile.region:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    environment:
      DOMAIN_API: ${DOMAIN_API}
      DOMAIN_APP: ${DOMAIN_APP}
      SERVER_HOST: server
      DASHBOARD_HOST: dashboard
    depends_on:
      - server
      - dashboard
    deploy:
      resources:
        limits:
          memory: 256M
    networks:
      - external

volumes:
  pgdata:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /mnt/data/pgdata
  caddy_data:
  caddy_config:

networks:
  internal:
    internal: true
  external:
```

### 7.2 Shared Environment Compose (Multi-Tenant)

For shared environments, multiple orgs share the same VPS and PostgreSQL:

```yaml
# deploy/compose/shared.yml
# Multi-tenant deployment - multiple orgs share one VPS

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: fs
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: featuresignals
    volumes:
      - pgdata:/var/lib/postgresql/data
    # ... same as region.yml ...

  server:
    image: ghcr.io/featuresignals/server:${IMAGE_TAG:-latest}
    environment:
      # Same config, but serves multiple orgs
      MULTI_TENANT: "true"
    # ... same as region.yml ...
```

---

## 8. Configuration Strategy

### 8.1 Single Source of Truth

**`.env.example` is the single source of truth** for ALL environment variables across ALL deployment models. No hardcoded config in code, Dockerfiles, or compose files.

```
.env.example (committed to git)
  ├── Documents ALL environment variables for ALL deployment models
  ├── Contains safe development defaults
  ├── Comments indicate deployment-specific variables
  └── Used by: developers, CI, documentation, ops team

.env (gitignored, local development)
  ├── Copied from .env.example
  ├── Contains actual local values
  └── Read by: docker compose, go run, npm run dev

deploy/secrets/*.enc.yaml (committed, SOPS-encrypted)
  ├── Production secrets (DB passwords, JWT secrets, API keys)
  ├── Encrypted with Age key
  └── Decrypted at deploy time by Ansible → writes .env on target VPS
```

### 8.2 Configuration by Deployment Model

| Variable | Community (Self-Hosted) | SaaS (Multi-Tenant) | Dedicated VPS | On-Prem |
|----------|------------------------|---------------------|---------------|---------|
| `DATABASE_URL` | `postgresql://fs:pass@localhost:5432/fs` | `postgresql://fs:pass@db-host:5432/fs` | `postgresql://fs:pass@localhost:5432/fs` | Customer's DB |
| `MULTI_TENANT` | `false` | `true` | `false` | `false` |
| `LICENSE_KEY` | *(empty)* | *(managed internally)* | `fs_lic_ent_xxx` | `fs_lic_ent_xxx` |
| `PAYMENT_GATEWAY` | `none` | `stripe` | `none` | `none` |
| `OTEL_ENABLED` | `false` | `true` | `true` | Customer's choice |
| `PHONE_HOME_ENDPOINT` | *(empty)* | *(empty)* | `https://license.featuresignals.com/...` | `https://license.featuresignals.com/...` |

**Multi-tenant specific variables** (only used when `MULTI_TENANT=true`):
```bash
MULTI_TENANT=true
BILLING_STRIPE_SECRET_KEY=sk_live_xxx
RATE_LIMIT_GLOBAL_RPS=10000
RATE_LIMIT_PER_ORG_RPS=1000
```

### 8.3 Enforcement Rules

| Rule | Enforcement |
|------|-------------|
| All env vars documented in `.env.example` | CI lint check validates completeness |
| No hardcoded config in code | Code review + grep check in CI |
| No hardcoded config in Dockerfiles | Hadolint + custom check for ENV with secrets |
| `.env` never committed | `.gitignore` + pre-commit hook |
| SOPS secrets encrypted | CI check validates encryption before merge |
| Same config structure everywhere | `.env.example` is the contract for local, CI, production |

### 8.4 Config Validation on Startup

Server validates required vars on startup and fails fast if missing:
- `DATABASE_URL` and `JWT_SECRET` required for all deployments
- `BILLING_STRIPE_SECRET_KEY` required when `MULTI_TENANT=true`
- `PHONE_HOME_ENDPOINT` required when `LICENSE_KEY` is set
- `LICENSE_KEY` should NOT be set for multi-tenant (managed internally)

---

## 9. Multi-Region Provisioning

### 8.1 Region Configuration

```yaml
# infra/config/regions.yaml
regions:
  in:
    name: "India"
    location: "Mumbai"
    provider: "utho"
    provider_config:
      location_id: "inmumbaizone2"
      plan_id: "10045"  # 4 vCPU / 8GB RAM / 160GB NVMe
    compliance:
      - "DPDP Act 2023"
    timezone: "Asia/Kolkata"
    currency: "INR"

  us:
    name: "United States"
    location: "Virginia"
    provider: "hetzner"
    provider_config:
      location: "ash"
      server_type: "cax21"  # 4 vCPU / 8GB RAM ARM
    compliance:
      - "SOC 2 Type II"
      - "CCPA"
    timezone: "America/New_York"
    currency: "USD"

  eu:
    name: "European Union"
    location: "Frankfurt"
    provider: "hetzner"
    provider_config:
      location: "fsn1"
      server_type: "cax21"
    compliance:
      - "GDPR"
      - "Schrems II"
    timezone: "Europe/Berlin"
    currency: "EUR"

  asia:
    name: "Asia Pacific"
    location: "Singapore"
    provider: "digitalocean"
    provider_config:
      region: "sgp1"
      size: "s-4vcpu-8gb"
    compliance:
      - "PDPA (Singapore)"
    timezone: "Asia/Singapore"
    currency: "USD"
```

### 8.2 Geo-Routing Configuration (Cloudflare)

```
Cloudflare Load Balancing Rules:

Rule 1: India Traffic
  IF client.country IN ["IN"]
  THEN route to pool: in-pool
  ELSE continue

Rule 2: US Traffic
  IF client.country IN ["US", "CA", "MX"]
  THEN route to pool: us-pool
  ELSE continue

Rule 3: EU Traffic
  IF client.country IN ["DE", "FR", "GB", "NL", "IT", "ES"]
  THEN route to pool: eu-pool
  ELSE continue

Rule 4: Asia Traffic
  IF client.country IN ["SG", "JP", "KR", "AU", "ID", "TH"]
  THEN route to pool: asia-pool
  ELSE continue

Default: Route to nearest healthy pool
```

### 8.3 Regional Data Confinement

```go
// server/internal/middleware/region.go

func RegionEnforcementMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        orgID := getOrgIDFromContext(r.Context())
        if orgID == "" {
            next.ServeHTTP(w, r)
            return
        }

        orgRegion := getOrgRegion(orgID)
        instanceRegion := config.Region.ID

        if orgRegion != instanceRegion && config.DataResidency == "strict" {
            logger.Warn("data residency violation",
                "org_id", orgID,
                "org_region", orgRegion,
                "instance_region", instanceRegion)
            httputil.Error(w, http.StatusForbidden, "data residency violation")
            return
        }

        next.ServeHTTP(w, r)
    })
}
```

---

## 10. DNS & TLS Automation

### 9.1 DNS Record Pattern

```
Pattern: {service}-{env}-{region}.featuresignals.com

Examples:
  api-dev-in.featuresignals.com     → Dev env, India region
  api-acme-prod-us.featuresignals.com → Acme Corp prod, US region
  app-demo-q1-eu.featuresignals.com   → Q1 demo, EU region

Wildcards:
  *.featuresignals.com              → Main site (Cloudflare proxied)
  *-{region}.featuresignals.com     → Regional wildcard
```

### 9.2 TLS Strategy

```
TLS Certificate Management:
  ├── Caddy handles automatic Let's Encrypt certificates
  ├── Cloudflare provides edge TLS (Full Strict mode)
  └── No manual certificate management needed

Certificate Renewal:
  ├── Caddy auto-renews 30 days before expiry
  ├── Cloudflare edge certs are managed by Cloudflare
  └── No downtime during renewal
```

### 9.3 DNS Automation Script

```bash
#!/usr/bin/env bash
# infra/scripts/dns-create.sh
#
# Creates DNS records for a new environment.
#
# Usage: dns-create.sh <env_name> <region> <vps_ip>

set -euo pipefail

ENV_NAME="${1:?env_name required}"
REGION="${2:?region required}"
VPS_IP="${3:?vps_ip required}"
ZONE_ID="${CF_ZONE_ID:?CF_ZONE_ID required}"
CF_TOKEN="${CF_API_TOKEN:?CF_API_TOKEN required}"

API_RECORD="api-${ENV_NAME}-${REGION}"
APP_RECORD="app-${ENV_NAME}-${REGION}"

echo "=== Creating DNS records for $ENV_NAME ($REGION) ==="

# Create API record
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"A\",
    \"name\": \"$API_RECORD\",
    \"content\": \"$VPS_IP\",
    \"ttl\": 300,
    \"proxied\": true,
    \"comment\": \"FeatureSignals API - $ENV_NAME ($REGION)\"
  }" > /dev/null

echo "✓ Created $API_RECORD.featuresignals.com → $VPS_IP"

# Create App record
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"A\",
    \"name\": \"$APP_RECORD\",
    \"content\": \"$VPS_IP\",
    \"ttl\": 300,
    \"proxied\": true,
    \"comment\": \"FeatureSignals Dashboard - $ENV_NAME ($REGION)\"
  }" > /dev/null

echo "✓ Created $APP_RECORD.featuresignals.com → $VPS_IP"
echo "=== DNS records created ==="
```

---

## 11. Secrets Management

### 10.1 SOPS + Age Architecture

```
Secrets Flow:
  1. Generate secrets locally with age key
  2. Encrypt with SOPS → commit to Git
  3. CI/CD decrypts with age key (stored in CI secrets)
  4. Deployed VPS receives decrypted secrets via Ansible vault

Secret Types:
  ├── Database passwords (per environment)
  ├── JWT secrets (per environment)
  ├── API keys (Stripe, ZeptoMail, etc.)
  ├── SSH keys (deploy user)
  └── TLS certificates (if not using Caddy auto-HTTPS)
```

### 10.2 SOPS Configuration

```yaml
# .sops.yaml
creation_rules:
  - path_regex: infra/vault/.*\.yaml$
    age: >-
      age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  - path_regex: deploy/secrets/.*\.yaml$
    age: >-
      age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 10.3 Secret Generation

```bash
#!/usr/bin/env bash
# infra/scripts/generate-secrets.sh
#
# Generates encrypted secrets for a new environment.
#
# Usage: generate-secrets.sh <env_name> <region>

set -euo pipefail

ENV_NAME="${1:?env_name required}"
REGION="${2:?region required}"

OUTPUT_FILE="deploy/secrets/${ENV_NAME}-${REGION}.yaml"

# Generate secrets
POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
DB_ADMIN_PASSWORD=$(openssl rand -hex 24)
DB_READONLY_PASSWORD=$(openssl rand -hex 24)

# Create unencrypted file
cat > "${OUTPUT_FILE}.tmp" <<EOF
postgres_password: "$POSTGRES_PASSWORD"
jwt_secret: "$JWT_SECRET"
db_admin_password: "$DB_ADMIN_PASSWORD"
db_readonly_password: "$DB_READONLY_PASSWORD"
EOF

# Encrypt with SOPS
sops --encrypt --in-place "${OUTPUT_FILE}.tmp"
mv "${OUTPUT_FILE}.tmp" "$OUTPUT_FILE"

echo "✓ Secrets generated and encrypted: $OUTPUT_FILE"
echo "  Postgres password: $POSTGRES_PASSWORD"
echo "  JWT secret: $JWT_SECRET"
```

---

## 12. Resource Allocation & Sizing

### 11.1 VPS Plans by Environment Type

| Environment Type | vCPU | RAM | Disk | Monthly Cost | Provider |
|------------------|------|-----|------|--------------|----------|
| **Shared (Internal)** | 2 | 4GB | 80GB | ~$6 | Hetzner CAX11 |
| **Shared (Free Tier)** | 2 | 4GB | 80GB | ~$6 | Hetzner CAX11 |
| **Dedicated (Pro)** | 4 | 8GB | 160GB | ~$12 | Hetzner CAX21 |
| **Dedicated (Enterprise)** | 8 | 16GB | 320GB | ~$25 | Hetzner CAX31 |
| **Performance Test** | 8 | 32GB | 320GB | ~$50 | Hetzner CCX23 |
| **Ops Portal** | 2 | 4GB | 80GB | ~$6 | Hetzner CAX11 |

### 11.2 Resource Limits per Service

```yaml
# Docker resource limits per service
service_limits:
  postgres:
    memory_limit: 1G
    memory_reservation: 512M
    cpu_limit: "2.0"
    cpu_reservation: "0.5"

  server:
    memory_limit: 1G
    memory_reservation: 512M
    cpu_limit: "2.0"
    cpu_reservation: "0.5"

  dashboard:
    memory_limit: 512M
    memory_reservation: 256M
    cpu_limit: "1.0"
    cpu_reservation: "0.25"

  caddy:
    memory_limit: 256M
    memory_reservation: 128M
    cpu_limit: "0.5"
    cpu_reservation: "0.1"

  migrate:
    memory_limit: 256M
    cpu_limit: "0.5"
```

### 11.3 Auto-Scaling Triggers

```
Scaling Triggers (Future - Phase 4):
  ├── CPU > 70% for 15 minutes → Scale up VPS plan
  ├── Memory > 80% for 15 minutes → Scale up VPS plan
  ├── Disk > 85% → Expand volume
  ├── API latency p99 > 100ms → Add read replica
  └── Concurrent connections > 500 → Add API server instance
```

---

## 13. Environment Lifecycle Management

### 13.1 State Machine

**Persistent environments** transition through: `requested → provisioning → active → maintenance → decommissioning → destroyed`. They are NEVER auto-decommissioned.

**Ephemeral environments** follow the same state machine but have an automatic transition from `active` to `decommissioning` when `expiry_date` is reached.

```
                    ┌─────────────┐
                    │  requested  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
             ┌─────│ provisioning│─────┐
             │     └──────┬──────┘     │
             │            │            │
             │     ┌──────▼──────┐     │
             │     │   active    │◀────┤
             │     └──────┬──────┘     │
             │            │            │
             │     ┌──────▼──────┐     │
             │     │ maintenance │     │
             │     └──────┬──────┘     │
             │            │            │
             │     ┌──────▼──────┐     │
             └────▶│decommissioning│   │
                   └──────┬──────┘     │
                          │            │
                   ┌──────▼──────┐     │
                   │  destroyed  │─────┘
                   └─────────────┘
```

### 13.2 Lifecycle Operations

```go
// server/internal/provisioning/lifecycle.go

type LifecycleManager struct {
    store       EnvironmentStore
    terraform   TerraformRunner
    dns         DNSManager
    cost        CostTracker
    logger      *slog.Logger
}

func (m *LifecycleManager) Decommission(ctx context.Context, envID string, reason string) error {
    env, err := m.store.Get(ctx, envID)
    if err != nil {
        return fmt.Errorf("get environment: %w", err)
    }

    if env.Status == "destroyed" {
        return domain.ErrConflict
    }

    // 1. Update status
    if err := m.store.UpdateStatus(ctx, envID, "decommissioning"); err != nil {
        return fmt.Errorf("update status: %w", err)
    }

    // 2. Create final backup
    if err := m.createFinalBackup(ctx, env); err != nil {
        m.logger.Warn("final backup failed, continuing decommission", "error", err)
    }

    // 3. Delete DNS records
    if err := m.dns.DeleteRecords(ctx, env.Name, env.Region); err != nil {
        m.logger.Warn("DNS deletion failed, continuing decommission", "error", err)
    }

    // 4. Destroy VPS via Terraform
    if err := m.terraform.Destroy(ctx, env.Resources.VPSID); err != nil {
        return fmt.Errorf("destroy vps: %w", err)
    }

    // 5. Stop cost tracking
    m.cost.StopTracking(envID)

    // 6. Update status to destroyed
    if err := m.store.UpdateStatus(ctx, envID, "destroyed"); err != nil {
        return fmt.Errorf("update status: %w", err)
    }

    // 7. Audit log
    m.logger.Info("environment decommissioned",
        "env_id", envID,
        "env_name", env.Name,
        "reason", reason)

    return nil
}

func (m *LifecycleManager) Suspend(ctx context.Context, envID string, reason string) error {
    // Stop Docker services, keep VPS running
    // Useful for idle environments to save compute costs
}

func (m *LifecycleManager) Resume(ctx context.Context, envID string) error {
    // Start Docker services, run health check
}
```

### 13.3 Auto-Expiry Rules

| Environment Type | Category | Expiry Policy | Action |
|------------------|----------|---------------|--------|
| Sandbox | Ephemeral | 7 days from creation | Auto-decommission, notify creator |
| Performance test | Ephemeral | 3 days from creation | Auto-decommission |
| Demo | Ephemeral | 30 days from creation | Notify sales, extend or decommission |
| Dev/Staging | Internal | No auto-expiry | Manual management |
| SaaS org | Persistent | No auto-expiry | Manual decommission only |
| Production (Dedicated) | Persistent | No auto-expiry | Manual decommission only |
| On-Prem | Persistent | No auto-expiry | Customer-controlled |

| Environment Type | Expiry Policy | Action |
|------------------|---------------|--------|
| Sandbox | 7 days from creation | Auto-decommission, notify creator |
| Performance test | 3 days from creation | Auto-decommission |
| Demo | 30 days from creation | Notify sales, extend or decommission |
| Dev/Staging | No auto-expiry | Manual management |
| Production | No auto-expiry | Manual decommission only |

---

## 14. Cost-Optimized Infrastructure

### 13.1 Cost Optimization Strategies

```
1. Right-Sizing
   ├── Monitor actual CPU/memory usage per environment
   ├── Downgrade VPS plan if utilization < 30% for 7 days
   └── Upgrade if utilization > 70% for 15 minutes

2. Idle Environment Detection
   ├── No API calls for 7 days → Notify owner
   ├── No API calls for 14 days → Auto-suspend
   ├── No API calls for 30 days → Auto-decommission
   └── Exclusions: production environments

3. Spot/Preemptible Instances
   ├── Use for sandbox, perf test, demo environments
   ├── Save 60-70% on compute costs
   └── Not suitable for production (can be terminated)

4. Shared Resources
   ├── Multiple dev environments share one VPS
   ├── Shared PostgreSQL with org_id isolation
   └── Caddy handles routing for multiple envs on same VPS

5. Backup Optimization
   ├── Daily backups retained for 7 days
   ├── Weekly backups retained for 4 weeks
   ├── Monthly backups retained for 1 year
   └── Compress with zstd (better ratio than gzip)
```

### 13.2 Cost Calculator

```go
// server/internal/cost/calculator.go

type CostCalculator struct {
    providerRates map[string]ProviderRates
    store         CostStore
}

type ProviderRates struct {
    VPSHourly      float64
    VolumeGBMonthly float64
    BandwidthGB    float64
    BackupGBMonthly float64
}

func (c *CostCalculator) CalculateDailyCost(env Environment) DailyCost {
    rates := c.providerRates[env.Region]
    
    vpsCost := rates.VPSHourly * 24
    volumeCost := (rates.VolumeGBMonthly / 30) * env.Resources.DiskGB
    backupCost := (rates.BackupGBMonthly / 30) * env.Resources.DiskGB * 0.5 // 50% compression
    
    return DailyCost{
        EnvID:    env.ID,
        Date:     time.Now().UTC().Truncate(24 * time.Hour),
        VPSCost:  vpsCost,
        VolumeCost: volumeCost,
        BackupCost: backupCost,
        Total:    vpsCost + volumeCost + backupCost,
    }
}
```

---

## 15. Scaling Path

### 14.1 Infrastructure Scaling Phases

```
Phase 1: Single VPS per region (Current)
  └── All services on one machine
  └── Cost: ~$12-25/month per region
  └── Capacity: ~1000 orgs, 10K users

Phase 2: Split Database (When DB CPU > 70%)
  └── Managed PostgreSQL (Supabase/Neon) per region
  └── VPS runs only API + Dashboard + Caddy
  └── Cost: ~$25-50/month per region
  └── Capacity: ~10K orgs, 100K users

Phase 3: Horizontal API Servers (When API CPU > 70%)
  └── Multiple API servers behind load balancer
  └── Shared PostgreSQL, in-memory cache with PG LISTEN/NOTIFY
  └── Cost: ~$50-100/month per region
  └── Capacity: ~50K orgs, 500K users

Phase 4: Kubernetes (When > 10 VPSes per region)
  └── Migrate from Docker Compose to Helm chart
  └── Auto-scaling, service mesh, GitOps
  └── Cost: ~$200-500/month per region
  └── Capacity: ~500K orgs, 5M users

Phase 5: Multi-Region Active-Active (When global latency matters)
  └── Read replicas for cross-region flag reads
  └── Writes still region-locked (data confinement)
  └── Cost: ~$500-1000/month per region
  └── Capacity: Unlimited (horizontal scaling)
```

### 14.2 When to Scale

| Metric | Threshold | Action |
|--------|-----------|--------|
| DB CPU | > 70% for 15 min | Move to managed PostgreSQL |
| API CPU | > 70% for 15 min | Add API server instance |
| Memory | > 80% for 15 min | Scale up VPS plan |
| Disk | > 85% | Expand volume |
| API Latency p99 | > 100ms | Add cache layer, optimize queries |
| Concurrent Connections | > 500 | Add API server instance |
| Monthly Cost per Org | > $10 (free tier) | Alert finance, limit resources |

---

## 16. Disaster Recovery & Backup

### 15.1 Backup Strategy

```
Backup Schedule:
  ├── Daily: 03:00 UTC, retained 7 days
  ├── Weekly: Sunday 03:00 UTC, retained 4 weeks
  └── Monthly: 1st of month 03:00 UTC, retained 1 year

Backup Storage:
  ├── Local: /mnt/data/backups (on VPS)
  ├── Remote: S3-compatible storage (Backblaze B2, Wasabi)
  └── Encryption: SOPS encrypted before upload

Backup Contents:
  ├── PostgreSQL dump (pg_dump --format=custom)
  ├── Caddy certificates
  ├── .env file (encrypted)
  └── Docker Compose config
```

### 15.2 Recovery Procedure

```bash
#!/usr/bin/env bash
# infra/scripts/restore-backup.sh
#
# Restores a backup to a new or existing environment.
#
# Usage: restore-backup.sh <backup_file> <target_env>

set -euo pipefail

BACKUP_FILE="${1:?backup_file required}"
TARGET_ENV="${2:?target_env required}"

echo "=== Restoring backup to $TARGET_ENV ==="

# 1. Provision new VPS (if needed)
# 2. Install Docker, configure Caddy
# 3. Restore PostgreSQL dump
# 4. Restore .env (decrypt)
# 5. Start services
# 6. Run health check
# 7. Update DNS if needed

echo "=== Restore complete ==="
```

### 15.3 DR Testing Schedule

| Test | Frequency | Scope |
|------|-----------|-------|
| Backup verification | Weekly | Verify backup file is valid |
| Restore test | Monthly | Restore to fresh VPS, verify data |
| Full DR drill | Quarterly | Simulate region failure, failover |
| RTO/RPO validation | Quarterly | Verify recovery time < 1 hour, data loss < 1 day |

---

## 17. Observability Integration

### 16.1 OpenTelemetry Configuration

```yaml
# deploy/compose/otel-collector.yml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./deploy/otel/collector-config.yaml:/etc/otel-collector-config.yaml:ro
    environment:
      OTEL_INGESTION_KEY: ${OTEL_INGESTION_KEY}
    ports:
      - "4317:4317"  # OTLP gRPC
      - "4318:4318"  # OTLP HTTP
    deploy:
      resources:
        limits:
          memory: 256M
    networks:
      - internal
```

### 16.2 Server Instrumentation

```go
// server/internal/observability/setup.go

func SetupOTEL(ctx context.Context, cfg config.Config) (func(), error) {
    if !cfg.OTEL.Enabled {
        return func() {}, nil
    }

    ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
    defer cancel()

    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint(cfg.OTEL.Endpoint),
        otlptracegrpc.WithHeaders(map[string]string{
            "signoz-ingestion-key": cfg.OTEL.IngestionKey,
        }),
    )
    if err != nil {
        return nil, fmt.Errorf("create trace exporter: %w", err)
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String(cfg.ServiceName),
            semconv.ServiceVersionKey.String(cfg.Version),
            attribute.String("region", cfg.Region.ID),
        )),
    )

    otel.SetTracerProvider(tp)
    otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
        propagation.TraceContext{},
        propagation.Baggage{},
    ))

    return func() {
        tp.Shutdown(context.Background())
    }, nil
}
```

---

## 18. Implementation Checklist

### Phase 1: Foundation (Weeks 1-4)
- [ ] Create `.env.example` as single source of truth for all config
- [ ] Create deployment-specific config templates (saas, dedicated-vps, onprem, community)
- [ ] Implement config validation on startup
- [ ] Set up SOPS + Age for secrets management

- [ ] Set up Terraform remote state (S3/Terraform Cloud)
- [ ] Create VPS Terraform modules (Hetzner, Utho)
- [ ] Create DNS Terraform module (Cloudflare)
- [ ] Create Ansible playbooks (VPS setup, app deploy)
- [ ] Set up SOPS + Age for secrets management
- [ ] Create Docker Compose templates (region, shared)
- [ ] Implement Provisioning Service API (Go)
- [ ] Implement environment lifecycle management

### Phase 2: Multi-Region (Weeks 5-8)

- [ ] Provision VPSes for IN, US, EU, ASIA regions
- [ ] Configure Cloudflare geo-routing
- [ ] Implement regional data confinement middleware
- [ ] Implement per-region PostgreSQL setup
- [ ] Implement region selection in customer signup
- [ ] Test cross-region isolation

### Phase 3: Automation (Weeks 9-12)

- [ ] Implement Ops Portal environment creation UI
- [ ] Implement automated DNS record creation
- [ ] Implement automated backup setup
- [ ] Implement cost tracking engine
- [ ] Implement auto-expiry for sandbox environments
- [ ] Implement smoke test automation

### Phase 4: Hardening (Weeks 13-16)

- [ ] Load testing across all deployment models
- [ ] Security audit (penetration testing)
- [ ] Disaster recovery testing
- [ ] Performance tuning
- [ ] Documentation (runbooks, onboarding guides)
- [ ] Team training

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-15 | Engineering | Initial infrastructure provisioning architecture |
| 1.1.0 | 2026-01-15 | Engineering | Added persistent vs ephemeral environment classification, config strategy section, updated lifecycle rules |

---

## Next Steps

1. **Review** this document with infrastructure team
2. **Approve** provider selection per region
3. **Implement** Terraform modules
4. **Implement** Ansible playbooks
5. **Test** provisioning flow end-to-end
6. **Document** runbooks for common operations