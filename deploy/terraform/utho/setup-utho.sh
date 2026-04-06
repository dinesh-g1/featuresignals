#!/bin/bash
set -euo pipefail

echo "==> Setting up Utho server for FeatureSignals India region..."

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
git clone https://github.com/dinesh-g1/featuresignals.git . || echo "Already cloned"

echo ""
echo "==> Server setup complete for India region."
echo "    Next steps:"
echo "    1. Copy deploy/.env.region.example to /opt/featuresignals/.env"
echo "    2. Fill in REGION=in and India-specific values"
echo "    3. Run: bash deploy/deploy-region.sh"
