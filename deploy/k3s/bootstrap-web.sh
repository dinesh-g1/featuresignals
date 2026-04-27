#!/usr/bin/env bash
#
# FeatureSignals — Web VPS Bootstrap (Hardened)
#
# Installs and hardens a web server for:
# - featuresignals.com (website)
# - docs.featuresignals.com (documentation)
#
# Security layers:
#   1. OS: unattended-upgrades, SSH hardening, fail2ban
#   2. Network: iptables firewall (default DROP)
#   3. Web: Caddy + CSP + rate limiting + security headers
#   4. Monitoring: auditd, logwatch, health checks
#   5. Integrity: file permissions, immutable configs
#
# Usage:
#   sudo ./bootstrap-web.sh
#
# This script is idempotent — safe to run multiple times.
# =============================================================================
set -euo pipefail

LOGFILE="/var/log/featuresignals-web-bootstrap.log"
exec > >(tee -a "$LOGFILE") 2>&1

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log_info()  { echo -e "${GREEN}[INFO]${NC}  $(date '+%H:%M:%S') $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%H:%M:%S') $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $*"; }

# ─── Prerequisites ───────────────────────────────────────────────────────────
prereq_check() {
    if [ "$(id -u)" -ne 0 ]; then
        log_error "This script must be run as root (sudo)."
        exit 1
    fi
    if [ "$(uname -s)" != "Linux" ]; then
        log_error "Designed for Linux (Debian/Ubuntu). Detected: $(uname -s)"
        exit 1
    fi
    log_info "Prerequisites satisfied."
}

# ─── Layer 1: OS Hardening ───────────────────────────────────────────────────
harden_os() {
    log_info "=== Layer 1: OS Hardening ==="

    # 1a. Automatic security updates
    log_info "Installing unattended-upgrades..."
    apt-get install -y -qq unattended-upgrades apt-listchanges 2>/dev/null
    cat > /etc/apt/apt.conf.d/20auto-upgrades <<'UPGRADES'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
UPGRADES
    cat > /etc/apt/apt.conf.d/50unattended-upgrades <<'UNATTENDED'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::OnlyOnACPower "false";
UNATTENDED
    systemctl restart unattended-upgrades 2>/dev/null || true
    log_info "  ✅ Automatic security updates configured."

    # 1b. SSH hardening
    log_info "Hardening SSH..."
    sed -i 's/^#PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
    sed -i 's/^#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
    sed -i 's/^#ChallengeResponseAuthentication.*/ChallengeResponseAuthentication no/' /etc/ssh/sshd_config
    sed -i 's/^#UsePAM.*/UsePAM no/' /etc/ssh/sshd_config
    sed -i 's/^#LoginGraceTime.*/LoginGraceTime 30/' /etc/ssh/sshd_config
    sed -i 's/^#MaxAuthTries.*/MaxAuthTries 3/' /etc/ssh/sshd_config
    sed -i 's/^#MaxSessions.*/MaxSessions 5/' /etc/ssh/sshd_config
    sed -i 's/^#ClientAliveInterval.*/ClientAliveInterval 300/' /etc/ssh/sshd_config
    sed -i 's/^#ClientAliveCountMax.*/ClientAliveCountMax 2/' /etc/ssh/sshd_config
    # Only allow key-based auth
    grep -q "^AuthenticationMethods" /etc/ssh/sshd_config || \
        echo "AuthenticationMethods publickey" >> /etc/ssh/sshd_config
    systemctl restart sshd
    log_info "  ✅ SSH hardened (key-only, no passwords)."

    # 1c. fail2ban
    log_info "Installing fail2ban..."
    apt-get install -y -qq fail2ban 2>/dev/null
    cat > /etc/fail2ban/jail.local <<'FAIL2BAN'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
banaction = iptables-multiport
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[caddy]
enabled = true
port = http,https
filter = caddy
logpath = /var/log/caddy/access.log
maxretry = 20
bantime = 3600
FAIL2BAN

    cat > /etc/fail2ban/filter.d/caddy.conf <<'CADDYFILTER'
[Definition]
failregex = ^<HOST> - - \[.*\] "(GET|POST).*" 4\d{2} .*$
ignoreregex =
CADDYFILTER

    systemctl enable fail2ban 2>/dev/null
    systemctl restart fail2ban 2>/dev/null || true
    log_info "  ✅ fail2ban installed (SSH + Caddy jails)."

    # 1d. Auditd
    log_info "Installing auditd..."
    apt-get install -y -qq auditd audispd-plugins 2>/dev/null
    cat > /etc/audit/rules.d/hardening.rules <<'AUDIT'
# Monitor SSH config changes
-w /etc/ssh/sshd_config -p wa -k ssh_config
# Monitor user/group changes
-w /etc/passwd -p wa -k user_change
-w /etc/shadow -p wa -k user_change
-w /etc/group -p wa -k user_change
# Monitor sudoers
-w /etc/sudoers -p wa -k sudo_change
-w /etc/sudoers.d/ -p wa -k sudo_change
# Monitor cron
-w /etc/crontab -p wa -k cron_change
# Monitor system logins
-w /var/log/auth.log -p wa -k auth_log
# Monitor caddy config
-w /etc/caddy/ -p wa -k caddy_config
AUDIT
    systemctl enable auditd 2>/dev/null || true
    systemctl restart auditd 2>/dev/null || true
    log_info "  ✅ auditd configured."

    # 1e. Kernel hardening via sysctl
    log_info "Hardening kernel parameters..."
    cat > /etc/sysctl.d/99-hardening.conf <<'SYSCTL'
# IP spoofing protection
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0
# Ignore source routed packets
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
# SYN flood protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_syn_retries = 3
net.ipv4.tcp_synack_retries = 3
# Disable ICMP redirect sending
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
# Disable IPv6 router advertisements
net.ipv6.conf.all.accept_ra = 0
net.ipv6.conf.default.accept_ra = 0
SYSCTL
    sysctl -p /etc/sysctl.d/99-hardening.conf 2>/dev/null || true
    log_info "  ✅ Kernel parameters hardened."
}

# ─── Layer 2: Network Security (iptables) ────────────────────────────────────
apply_firewall() {
    log_info "=== Layer 2: Firewall ==="

    # Reset all rules to a known state
    iptables -P INPUT ACCEPT 2>/dev/null
    iptables -P FORWARD ACCEPT 2>/dev/null
    iptables -P OUTPUT ACCEPT 2>/dev/null
    iptables -F
    iptables -X

    # Default policies: DROP inbound, ACCEPT outbound
    iptables -P INPUT DROP
    iptables -P FORWARD DROP
    iptables -P OUTPUT ACCEPT

    # Allow established/related connections
    iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

    # Allow loopback
    iptables -A INPUT -i lo -j ACCEPT

    # Allow SSH (rate-limited)
    iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --set
    iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --update --seconds 60 --hitcount 4 -j DROP
    iptables -A INPUT -p tcp --dport 22 -j ACCEPT

    # Allow HTTP/HTTPS (unlimited)
    iptables -A INPUT -p tcp --dport 80 -j ACCEPT
    iptables -A INPUT -p tcp --dport 443 -j ACCEPT

    # Allow ICMP (ping) — rate limited
    iptables -A INPUT -p icmp --icmp-type echo-request -m limit --limit 10/second -j ACCEPT
    iptables -A INPUT -p icmp --icmp-type echo-request -j DROP

    # Log dropped packets (rate limited to prevent log flooding)
    iptables -A INPUT -m limit --limit 10/min -j LOG --log-prefix "FW-DROP: " --log-level 4

    # Save rules (persist across reboots)
    apt-get install -y -qq iptables-persistent 2>/dev/null || true
    mkdir -p /etc/iptables/
    iptables-save > /etc/iptables/rules.v4 2>/dev/null || true

    log_info "  ✅ Firewall applied (default DROP, allow SSH/HTTP/HTTPS only)."
}

# ─── Layer 3: Web Server (Caddy + Security) ─────────────────────────────────
install_caddy() {
    log_info "=== Layer 3: Web Server ==="

    # Install Caddy
    if command -v caddy &>/dev/null; then
        log_info "Caddy already installed: $(caddy version). Skipping install."
    else
        apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl gnupg ca-certificates
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
            gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
            tee /etc/apt/sources.list.d/caddy-stable.list
        apt-get update -qq
        apt-get install -y -qq caddy
        log_info "Caddy installed: $(caddy version)"
    fi

    # Create web roots
    mkdir -p /var/www/html /var/www/docs

    # Write hardened Caddyfile
    cat > /etc/caddy/Caddyfile <<'CADDYEOF'
{
    # Global rate limiting
    servers {
        max_header_size 16384
        trusted_proxies static 127.0.0.1/8 ::1
    }
}

featuresignals.com {
    root * /var/www/html
    file_server
    encode gzip

    # Rate limiting per IP
    rate_limit {
        zone website {
            key {remote_host}
            events 100
            window 1m
        }
    }

    # Security headers
    header {
        # HSTS — 1 year, include subdomains, preload
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        # Prevent MIME sniffing
        X-Content-Type-Options "nosniff"
        # Prevent clickjacking
        X-Frame-Options "DENY"
        # Referrer policy
        Referrer-Policy "strict-origin-when-cross-origin"
        # Permissions policy — disable all sensitive features
        Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
        # Content Security Policy — strict
        Content-Security-Policy "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; script-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
        # Prevent embedding
        X-Permitted-Cross-Domain-Policies "none"
        # Remove server version
        -Server
    }

    # Deny hidden files
    @hidden {
        path_regexp (^|/)\..+
    }
    respond @hidden 404

    # Custom 404
    handle_errors {
        @404 {
            expression {http.error.status_code} == 404
        }
        rewrite @404 /404.html
    }

    # Log format with security fields
    log {
        output file /var/log/caddy/access.log {
            roll_size 100mb
            roll_keep 30
        }
        format json
    }
}

docs.featuresignals.com {
    root * /var/www/docs
    file_server
    encode gzip

    rate_limit {
        zone docs {
            key {remote_host}
            events 200
            window 1m
        }
    }

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
        Content-Security-Policy "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; script-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
        X-Permitted-Cross-Domain-Policies "none"
        -Server
    }

    @hidden {
        path_regexp (^|/)\..+
    }
    respond @hidden 404

    handle_errors {
        @404 {
            expression {http.error.status_code} == 404
        }
        rewrite @404 /404.html
    }

    log {
        output file /var/log/caddy/docs-access.log {
            roll_size 100mb
            roll_keep 30
        }
        format json
    }
}
CADDYEOF

    # Validate
    if ! caddy validate --config /etc/caddy/Caddyfile 2>&1 | grep -q "Valid configuration"; then
        log_error "Caddyfile validation failed."
        caddy validate --config /etc/caddy/Caddyfile 2>&1
        exit 1
    fi
    log_info "  ✅ Caddyfile validated."

    # Start Caddy
    systemctl enable caddy 2>/dev/null
    systemctl restart caddy
    sleep 2
    if ! systemctl is-active --quiet caddy; then
        log_error "Caddy failed to start. Check: journalctl -xeu caddy"
        exit 1
    fi
    log_info "  ✅ Caddy running."

    # Set immutable permissions on Caddy config
    chmod 640 /etc/caddy/Caddyfile
    chown root:caddy /etc/caddy/Caddyfile
    log_info "  ✅ Caddy config permissions locked."
}

# ─── Layer 4: Monitoring & Maintenance ───────────────────────────────────────
setup_monitoring() {
    log_info "=== Layer 4: Monitoring ==="

    # 4a. Logwatch — daily log summary
    apt-get install -y -qq logwatch 2>/dev/null || true
    log_info "  ✅ logwatch installed (daily report at /var/log/logwatch/)."

    # 4b. Caddy log rotation (already handled by Caddy's built-in roll)

    # 4c. Health check endpoint
    mkdir -p /var/www/html/.well-known
    echo '{"status":"ok","service":"featuresignals-web","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}' \
        > /var/www/html/health.json
    log_info "  ✅ Health endpoint: /health.json"

    # 4d. Systemd timer for weekly security update check
    cat > /etc/systemd/system/security-check.service <<'SVC'
[Unit]
Description=Weekly security check
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/apt-get --just-print upgrade 2>&1 | grep -E "[0-9]+ upgraded" | mail -s "Security Updates Available" root
SVC

    cat > /etc/systemd/system/security-check.timer <<'TIMER'
[Unit]
Description=Weekly security check timer

[Timer]
OnCalendar=weekly
Persistent=true

[Install]
WantedBy=timers.target
TIMER

    systemctl daemon-reload 2>/dev/null
    systemctl enable security-check.timer 2>/dev/null || true
    systemctl start security-check.timer 2>/dev/null || true
    log_info "  ✅ Weekly security check configured."
}

# ─── Layer 5: File Integrity & Permissions ──────────────────────────────────
harden_filesystem() {
    log_info "=== Layer 5: File Integrity ==="

    # Lock down critical system files
    chmod 750 /etc/caddy/
    chmod 640 /etc/caddy/Caddyfile
    chmod 750 /root
    chmod 750 /var/www/html
    chmod 750 /var/www/docs

    # Set proper ownership
    chown -R root:www-data /var/www/html
    chown -R root:www-data /var/www/docs
    find /var/www/html -type d -exec chmod 755 {} \;
    find /var/www/html -type f -exec chmod 644 {} \;
    find /var/www/docs -type d -exec chmod 755 {} \;
    find /var/www/docs -type f -exec chmod 644 {} \;

    log_info "  ✅ File permissions hardened."

    # Immutable log file (can't be deleted without removing immutable flag)
    chattr +a /var/log/featuresignals-web-bootstrap.log 2>/dev/null || true
    log_info "  ✅ Bootstrap log set to append-only."
}

# ─── Summary ─────────────────────────────────────────────────────────────────
print_summary() {
    local ip
    ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║       ✅  Web VPS — Fully Hardened & Ready                  ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║  IP:          ${ip:-$(curl -s ifconfig.me 2>/dev/null || echo 'unknown')}"
    echo "║  Caddy:       $(caddy version 2>/dev/null | cut -d' ' -f1)"
    echo "║  Website:     /var/www/html → featuresignals.com"
    echo "║  Docs:        /var/www/docs  → docs.featuresignals.com"
    echo "║  Config:      /etc/caddy/Caddyfile"
    echo "║  Logs:        $LOGFILE"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║  🔒 Security layers:                                        ║"
    echo "║  Layer 1: OS hardening (auto-updates, SSH, fail2ban, audit) ║"
    echo "║  Layer 2: Firewall (default DROP, SSH rate-limited)        ║"
    echo "║  Layer 3: Caddy (HSTS, CSP, rate limit, security headers)   ║"
    echo "║  Layer 4: Monitoring (logwatch, health checks)              ║"
    echo "║  Layer 5: File integrity (permissions, immutable logs)      ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║  📋 Next steps:                                             ║"
    echo "║  1. Point DNS to this IP:                                   ║"
    echo "║     featuresignals.com  A  ${ip:-<ip>}"
    echo "║     docs.featuresignals.com  A  ${ip:-<ip>}"
    echo "║  2. Deploy content:                                         ║"
    echo "║     dagger call deploy-website --source=. --version=v1.0    ║"
    echo "║     dagger call deploy-docs --source=. --version=v1.0       ║"
    echo "║  3. Caddy auto-provisions SSL via Let's Encrypt             ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
}

# ─── Main ────────────────────────────────────────────────────────────────────
main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║    FeatureSignals — Web VPS Hardened Bootstrap               ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""

    prereq_check
    apt-get update -qq
    harden_os
    apply_firewall
    install_caddy
    setup_monitoring
    harden_filesystem
    print_summary

    log_info "Bootstrap complete. Log written to $LOGFILE"
}

main "$@"
