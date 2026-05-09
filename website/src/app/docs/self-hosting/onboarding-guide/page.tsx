import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Server,
  Shield,
  HardDrive,
  Wifi,
  Key,
  Database,
  Bell,
  CheckCircle,
  Lightbulb,
} from "lucide-react";
import { Callout } from "@/components/docs/Callout";
import { CodeBlock } from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Self-Hosting Onboarding Guide",
  description:
    "Complete guide to self-hosting FeatureSignals: requirements, installation, configuration, SSL setup, backup strategy, and monitoring.",
};

export default function SelfHostingOnboardingPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Self-Hosting Onboarding Guide
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        A complete walkthrough for deploying and operating FeatureSignals on
        your own infrastructure — from initial requirements through production
        hardening, backup strategy, and ongoing monitoring.
      </p>

      <Callout variant="info" title="Before you begin">
        This guide assumes familiarity with Linux server administration, Docker,
        PostgreSQL, and TLS certificate management. If you&apos;re looking for a
        managed experience, check out{" "}
        <a
          href="https://app.featuresignals.com/register"
          className="text-[var(--signal-fg-accent)] hover:underline font-medium"
        >
          FeatureSignals Cloud
        </a>
        .
      </Callout>

      {/* Requirements */}
      <SectionHeading>System Requirements</SectionHeading>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border border-[var(--signal-border-default)] rounded-md">
          <thead className="bg-[var(--signal-bg-secondary)]">
            <tr>
              <th className="text-left px-4 py-2.5 text-[var(--signal-fg-primary)] font-semibold">
                Resource
              </th>
              <th className="text-left px-4 py-2.5 text-[var(--signal-fg-primary)] font-semibold">
                Minimum
              </th>
              <th className="text-left px-4 py-2.5 text-[var(--signal-fg-primary)] font-semibold">
                Recommended
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--signal-border-default)]">
            {[
              { resource: "CPU", min: "2 vCPUs", rec: "4+ vCPUs" },
              { resource: "Memory", min: "4 GB RAM", rec: "8+ GB RAM" },
              {
                resource: "Disk",
                min: "20 GB SSD",
                rec: "50+ GB SSD (with room for growth)",
              },
              {
                resource: "PostgreSQL",
                min: "14+",
                rec: "16+ (with streaming replication)",
              },
              { resource: "Docker", min: "24.0+", rec: "Latest stable" },
              { resource: "Docker Compose", min: "v2+", rec: "Latest stable" },
              {
                resource: "OS",
                min: "Ubuntu 22.04 / Debian 12",
                rec: "Ubuntu 24.04 LTS",
              },
            ].map((row) => (
              <tr
                key={row.resource}
                className="hover:bg-[var(--signal-bg-secondary)] transition-colors"
              >
                <td className="px-4 py-2.5 font-medium text-[var(--signal-fg-primary)]">
                  {row.resource}
                </td>
                <td className="px-4 py-2.5 text-[var(--signal-fg-secondary)]">
                  {row.min}
                </td>
                <td className="px-4 py-2.5 text-[var(--signal-fg-secondary)]">
                  {row.rec}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Callout variant="warning" title="Database sizing">
        For production deployments serving more than 10 million evaluations per
        day, use a dedicated PostgreSQL instance (not co-located on the
        application server) with at least 4 vCPUs and 16 GB RAM. Enable
        connection pooling via PgBouncer.
      </Callout>

      {/* Installation */}
      <SectionHeading>Installation</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals is distributed as a set of Docker images. The recommended
        deployment method is Docker Compose:
      </p>

      <SubHeading>1. Clone the Repository</SubHeading>
      <CodeBlock language="bash">{`git clone https://github.com/dinesh-g1/featuresignals.git
cd featuresignals`}</CodeBlock>

      <SubHeading>2. Configure Environment</SubHeading>
      <p className="text-[var(--signal-fg-primary)] mb-3">
        Copy the example environment file and customize it for your deployment:
      </p>
      <CodeBlock language="bash">{`cp .env.example .env
# Edit .env with your configuration values
nano .env`}</CodeBlock>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
        Key environment variables to configure:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-sm text-[var(--signal-fg-primary)] mb-4">
        <li>
          <InlineCode>DATABASE_URL</InlineCode> — PostgreSQL connection string
        </li>
        <li>
          <InlineCode>JWT_SECRET</InlineCode> — Random 64+ character secret for
          token signing
        </li>
        <li>
          <InlineCode>API_BASE_URL</InlineCode> — Public URL where the API
          server is reachable
        </li>
        <li>
          <InlineCode>APP_BASE_URL</InlineCode> — Public URL where the dashboard
          is reachable
        </li>
        <li>
          <InlineCode>SMTP_*</InlineCode> — SMTP server settings for
          transactional email
        </li>
      </ul>

      <SubHeading>3. Start the Services</SubHeading>
      <CodeBlock language="bash">{`docker compose up -d`}</CodeBlock>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6">
        This starts PostgreSQL, the API server (port 8080), and the Flag Engine
        dashboard (port 3000). Database migrations run automatically on first
        startup.
      </p>

      <SubHeading>4. Verify Installation</SubHeading>
      <CodeBlock language="bash">{`# Check that all services are running
docker compose ps

# Verify the API server responds
curl http://localhost:8080/health

# Verify the dashboard is accessible
curl http://localhost:3000`}</CodeBlock>

      {/* SSL Setup */}
      <SectionHeading>SSL / TLS Setup</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals must be served over HTTPS in production. The recommended
        approach is to place a reverse proxy (nginx or Caddy) in front of the
        application:
      </p>

      <SubHeading>Option A: Caddy (Recommended)</SubHeading>
      <p className="text-[var(--signal-fg-primary)] mb-3">
        Caddy automatically obtains and renews TLS certificates via Let&apos;s
        Encrypt:
      </p>
      <CodeBlock
        language="text"
        title="Caddyfile"
      >{`featuresignals.example.com {
    reverse_proxy localhost:3000
}

api.featuresignals.example.com {
    reverse_proxy localhost:8080
}`}</CodeBlock>

      <SubHeading>Option B: nginx + Certbot</SubHeading>
      <p className="text-[var(--signal-fg-primary)] mb-3">
        Traditional nginx setup with Certbot for certificate management:
      </p>
      <CodeBlock language="bash">{`sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d featuresignals.example.com -d api.featuresignals.example.com`}</CodeBlock>

      {/* Backup Strategy */}
      <SectionHeading>Backup Strategy</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        A comprehensive backup strategy protects against data loss. The most
        critical data to back up is the PostgreSQL database:
      </p>

      <SubHeading>Database Backups</SubHeading>
      <p className="text-[var(--signal-fg-primary)] mb-3">
        Use <InlineCode>pg_dump</InlineCode> for logical backups. Schedule this
        as a cron job:
      </p>
      <CodeBlock
        language="bash"
        title="/etc/cron.d/featuresignals-backup"
      >{`# Daily database backup at 2 AM UTC
0 2 * * * postgres pg_dump -U featuresignals featuresignals | gzip > /backups/featuresignals-$(date +\\%Y\\%m\\%d).sql.gz

# Retain last 30 days of backups
0 3 * * * postgres find /backups -name "featuresignals-*.sql.gz" -mtime +30 -delete`}</CodeBlock>

      <Callout variant="info">
        For production deployments, also configure{" "}
        <strong>Point-in-Time Recovery (PITR)</strong> by enabling PostgreSQL
        WAL archiving. This allows you to restore to any point in time, not just
        to the last daily backup.
      </Callout>

      <SubHeading>What to Back Up</SubHeading>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>PostgreSQL database</strong> — All configuration data: flags,
          segments, projects, environments, API keys, audit logs
        </li>
        <li>
          <strong>Environment configuration</strong> — Your{" "}
          <InlineCode>.env</InlineCode> file (contains secrets and connection
          strings)
        </li>
        <li>
          <strong>TLS certificates</strong> — If not using auto-renewal (Caddy
          handles this automatically)
        </li>
        <li>
          <strong>Custom configurations</strong> — Any modified nginx/Caddy
          configs, custom migration scripts
        </li>
      </ul>

      <SubHeading>Restore Procedure</SubHeading>
      <CodeBlock language="bash">{`# 1. Stop the application
docker compose down

# 2. Restore the database
gunzip < /backups/featuresignals-20260115.sql.gz | psql -U featuresignals featuresignals

# 3. Restart the application
docker compose up -d`}</CodeBlock>

      {/* Monitoring */}
      <SectionHeading>Monitoring</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        A healthy self-hosted deployment requires monitoring at multiple levels:
      </p>

      <div className="space-y-4 mb-6">
        <MonitorCard
          icon={Server}
          title="Application Health"
          items={[
            "Monitor /health endpoint (returns 200 when server is alive)",
            "Monitor /ready endpoint (returns 200 when database is reachable)",
            "Export server metrics in OpenTelemetry format for integration with SigNoz, Grafana, or Datadog",
            "Set alerts for 5xx error rate exceeding 0.1%",
          ]}
        />
        <MonitorCard
          icon={Database}
          title="Database Monitoring"
          items={[
            "Track connection pool utilization — alert if above 80% of max connections are in use",
            "Monitor replication lag if using read replicas",
            "Watch for long-running queries (longer than 1 second) that may indicate missing indexes",
            "Set up automated vacuum and analyze maintenance windows",
          ]}
        />
        <MonitorCard
          icon={HardDrive}
          title="Infrastructure Monitoring"
          items={[
            "Disk usage — alert at 80%, critical at 90%",
            "Memory usage — track RSS and cache utilization",
            "CPU load — alert on sustained above 80% utilization",
            "Network throughput — monitor for unusual traffic patterns",
          ]}
        />
      </div>

      {/* Security */}
      <SectionHeading>Security Hardening</SectionHeading>
      <div className="space-y-2 mb-6">
        {[
          "Use a dedicated, non-root user for the FeatureSignals services",
          "Place the application behind a firewall — only expose ports 80/443 to the internet",
          "Enable automatic security updates for the host OS",
          "Rotate JWT secrets and API keys on a regular schedule (recommended: every 90 days)",
          "Configure fail2ban to block repeated failed authentication attempts",
          "Regularly run govulncheck and npm audit on the codebase to catch dependency vulnerabilities",
          "Use network isolation — place the database on a private subnet not accessible from the public internet",
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 text-sm text-[var(--signal-fg-primary)]"
          >
            <CheckCircle
              size={14}
              className="text-[var(--signal-fg-success)] mt-0.5 shrink-0"
            />
            <span>{item}</span>
          </div>
        ))}
      </div>

      {/* Upgrades */}
      <SectionHeading>Upgrades</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        To upgrade FeatureSignals to a new version:
      </p>
      <CodeBlock language="bash">{`# Pull the latest images
docker compose pull

# Apply any new database migrations and restart
docker compose up -d

# Verify the upgrade
docker compose ps
curl http://localhost:8080/health`}</CodeBlock>
      <Callout variant="warning" title="Before upgrading">
        Always back up your database before applying upgrades. Review the{" "}
        <Link
          href="/docs"
          className="text-[var(--signal-fg-accent)] hover:underline font-medium"
        >
          changelog
        </Link>{" "}
        for breaking changes, especially database migration changes that cannot
        be rolled back.
      </Callout>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        <li>
          <Link
            href="/docs/deployment/on-premises"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>On-Premises Deployment</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — Kubernetes, air-gapped, and advanced deployment patterns
          </span>
        </li>
        <li>
          <Link
            href="/docs/deployment/docker-compose"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>Docker Compose Reference</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — detailed configuration options
          </span>
        </li>
        <li>
          <Link
            href="/docs/deployment/configuration"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>Configuration Reference</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — all environment variables and their defaults
          </span>
        </li>
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-[var(--signal-fg-primary)] mt-10 mb-4 pb-2 border-b border-[var(--signal-border-default)]">
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
      {children}
    </h3>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)]">
      {children}
    </code>
  );
}

function MonitorCard({
  icon: Icon,
  title,
  items,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  items: string[];
}) {
  return (
    <div className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]">
      <div className="flex items-start gap-3 mb-2">
        <Icon
          size={16}
          className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0"
        />
        <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
          {title}
        </p>
      </div>
      <ul className="list-disc pl-9 space-y-1 text-sm text-[var(--signal-fg-primary)]">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
