terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.47"
    }
  }
  required_version = ">= 1.5.0"
}

provider "hcloud" {
  token = var.hcloud_token
}

variable "hcloud_token" {
  type      = string
  sensitive = true
}

variable "region" {
  type        = string
  description = "Deployment region identifier (us, eu, dev)"
}

variable "server_type" {
  type        = string
  default     = "cpx31"
  description = "Hetzner server type (cpx21=3 vCPU/4GB, cpx31=4 vCPU/8GB, cpx41=8 vCPU/16GB)"
}

variable "location" {
  type        = string
  description = "Hetzner datacenter location (ash=US, fsn1=EU-DE, hel1=EU-FI)"
}

variable "ssh_key_name" {
  type        = string
  default     = "featuresignals-deploy"
  description = "Name of the SSH key in Hetzner Cloud"
}

variable "domain_api" {
  type = string
}

variable "domain_app" {
  type = string
}

data "hcloud_ssh_key" "deploy" {
  name = var.ssh_key_name
}

resource "hcloud_firewall" "web" {
  name = "fs-${var.region}-web"

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

resource "hcloud_server" "app" {
  name        = "fs-${var.region}"
  server_type = var.server_type
  location    = var.location
  image       = "ubuntu-24.04"

  ssh_keys = [data.hcloud_ssh_key.deploy.id]

  firewall_ids = [hcloud_firewall.web.id]

  labels = {
    service = "featuresignals"
    region  = var.region
    env     = var.region == "dev" ? "staging" : "production"
  }

  user_data = <<-EOF
    #!/bin/bash
    set -euo pipefail

    apt-get update && apt-get upgrade -y
    apt-get install -y curl git ufw fail2ban

    # Firewall
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 443/udp
    ufw --force enable

    # SSH hardening
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
    sed -i 's/PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
    systemctl restart sshd

    # Docker
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker

    # App directory
    mkdir -p /opt/featuresignals
    cd /opt/featuresignals
    git clone https://github.com/dinesh-g1/featuresignals.git .

    echo "Server provisioned for region: ${var.region}"
  EOF
}

output "server_ip" {
  value = hcloud_server.app.ipv4_address
}

output "server_id" {
  value = hcloud_server.app.id
}

output "region" {
  value = var.region
}
