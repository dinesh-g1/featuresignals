# Terraform module for provisioning isolated customer VPS on Hetzner Cloud
# Usage: This module creates a complete VPS environment for a single customer

terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

variable "hetzner_token" {
  description = "Hetzner Cloud API token"
  type        = string
  sensitive   = true
}

variable "customer_name" {
  description = "Customer identifier (used in subdomain and VPS name)"
  type        = string
}

variable "org_id" {
  description = "FeatureSignals organization ID"
  type        = string
}

variable "vps_type" {
  description = "Hetzner server type (cx22, cx32, cx42, cpX1, etc.)"
  type        = string
  default     = "cx32"
}

variable "region" {
  description = "Hetzner datacenter location (fsn1, nbg1, hel1, ash)"
  type        = string
  default     = "fsn1"
}

variable "ssh_public_key" {
  description = "SSH public key for deployment access"
  type        = string
}

variable "allowed_admin_cidrs" {
  description = "CIDR blocks allowed for SSH access (office IPs)"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Restrict this in production!
}

variable "docker_compose_template" {
  description = "docker-compose.yml content for the customer"
  type        = string
}

variable "env_vars" {
  description = "Environment variables for the customer's .env file"
  type        = map(string)
  sensitive   = true
}

provider "hcloud" {
  token = var.hetzner_token
}

# ─── SSH Key ───────────────────────────────────────────────────────────────

resource "hcloud_ssh_key" "customer_vps" {
  name       = "customer-${var.customer_name}"
  public_key = var.ssh_public_key
}

# ─── Server ────────────────────────────────────────────────────────────────

resource "hcloud_server" "customer_vps" {
  name        = "fs-${var.customer_name}"
  image       = "debian-12"
  server_type = var.vps_type
  location    = var.region
  ssh_keys    = [hcloud_ssh_key.customer_vps.id]

  labels = {
    managed_by       = "featuresignals"
    org_id           = var.org_id
    customer_name    = var.customer_name
    deployment_model = "isolated"
    provisioned_at   = timestamp()
  }

  # Cloud-init for initial setup
  user_data = templatefile("${path.module}/templates/cloud-init.yaml.tftpl", {
    customer_name = var.customer_name
  })

  # Wait for network to be ready
  keep_disk = false
}

# ─── Firewall ──────────────────────────────────────────────────────────────

resource "hcloud_firewall" "customer_vps" {
  name = "fw-${var.customer_name}"

  # SSH - restricted to admin IPs
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = var.allowed_admin_cidrs
  }

  # HTTP
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  # HTTPS
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  # PostgreSQL - restricted to admin IPs only
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "5432"
    source_ips = var.allowed_admin_cidrs
  }

  # ICMP (ping)
  rule {
    direction  = "in"
    protocol   = "icmp"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
}

resource "hcloud_server_network" "customer_vps" {
  server_id  = hcloud_server.customer_vps.id
  firewall_ids = [hcloud_firewall.customer_vps.id]
}

# ─── Outputs ───────────────────────────────────────────────────────────────

output "vps_ip" {
  description = "Public IPv4 address of the VPS"
  value       = hcloud_server.customer_vps.ipv4_address
}

output "vps_id" {
  description = "Hetzner server ID"
  value       = hcloud_server.customer_vps.id
}

output "vps_name" {
  description = "Server name"
  value       = hcloud_server.customer_vps.name
}

output "ssh_connection" {
  description = "SSH connection string"
  value       = "root@${hcloud_server.customer_vps.ipv4_address}"
}
