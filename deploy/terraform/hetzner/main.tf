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

# ---------------------------------------------------------------------------
# Variables
# ---------------------------------------------------------------------------

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
  default     = "cpx32"
  description = "Hetzner server type (cpx22=2 vCPU/4GB, cpx32=4 vCPU/8GB, cpx42=8 vCPU/16GB)"
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

variable "volume_size" {
  type        = number
  default     = 20
  description = "Persistent volume size in GB for PostgreSQL data"
}

# ---------------------------------------------------------------------------
# Data sources
# ---------------------------------------------------------------------------

data "hcloud_ssh_key" "deploy" {
  name = var.ssh_key_name
}

# ---------------------------------------------------------------------------
# Firewall — allow SSH, HTTP, HTTPS (TCP + UDP for HTTP/3)
# ---------------------------------------------------------------------------

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

# ---------------------------------------------------------------------------
# Persistent volume — survives server recreation, mounted at /mnt/data
# ---------------------------------------------------------------------------

resource "hcloud_volume" "data" {
  name     = "fs-${var.region}-data"
  size     = var.volume_size
  location = var.location
  format   = "ext4"

  labels = {
    service = "featuresignals"
    region  = var.region
  }
}

# ---------------------------------------------------------------------------
# Server
# ---------------------------------------------------------------------------

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

    export DEBIAN_FRONTEND=noninteractive

    apt-get update && apt-get upgrade -y
    apt-get install -y curl git ufw fail2ban unattended-upgrades apt-listchanges logrotate

    # --- Automatic security updates ---
    cat > /etc/apt/apt.conf.d/20auto-upgrades << 'APTCONF'
    APT::Periodic::Update-Package-Lists "1";
    APT::Periodic::Unattended-Upgrade "1";
    APT::Periodic::AutocleanInterval "7";
    APTCONF

    # --- Firewall ---
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 443/udp
    ufw --force enable

    # --- SSH hardening ---
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
    sed -i 's/PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
    systemctl restart sshd

    # --- Deploy user (non-root) ---
    useradd -m -s /bin/bash -G sudo deploy
    mkdir -p /home/deploy/.ssh
    cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
    chown -R deploy:deploy /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/authorized_keys
    echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy

    # --- Docker ---
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    usermod -aG docker deploy

    # --- Docker log rotation ---
    cat > /etc/docker/daemon.json << 'DOCKERCONF'
    {
      "log-driver": "json-file",
      "log-opts": {
        "max-size": "20m",
        "max-file": "5"
      }
    }
    DOCKERCONF
    systemctl restart docker

    # --- Mount persistent volume at /mnt/data ---
    mkdir -p /mnt/data
    echo "/dev/disk/by-id/scsi-0HC_Volume_${hcloud_volume.data.id} /mnt/data ext4 defaults,nofail 0 2" >> /etc/fstab
    mount -a
    mkdir -p /mnt/data/pgdata /mnt/data/backups
    chown -R deploy:deploy /mnt/data

    # --- App directory ---
    mkdir -p /opt/featuresignals
    chown deploy:deploy /opt/featuresignals
    su - deploy -c "git clone https://github.com/dinesh-g1/featuresignals.git /opt/featuresignals"

    # --- Backup cron (daily at 03:00 UTC) ---
    echo "0 3 * * * deploy cd /opt/featuresignals && bash deploy/pg-backup.sh >> /mnt/data/backups/backup.log 2>&1" > /etc/cron.d/fs-backup
    chmod 644 /etc/cron.d/fs-backup

    echo "Server provisioned for region: ${var.region}"
  EOF
}

# Attach volume after server creation
resource "hcloud_volume_attachment" "data" {
  volume_id = hcloud_volume.data.id
  server_id = hcloud_server.app.id
  automount = true
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------

output "server_ip" {
  value = hcloud_server.app.ipv4_address
}

output "server_id" {
  value = hcloud_server.app.id
}

output "volume_id" {
  value = hcloud_volume.data.id
}

output "region" {
  value = var.region
}

output "ssh_command" {
  value = "ssh deploy@${hcloud_server.app.ipv4_address}"
}
