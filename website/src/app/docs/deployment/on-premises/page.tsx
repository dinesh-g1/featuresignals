import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Container,
  Monitor,
  WifiOff,
  Shield,
  Key,
  Network,
  HardDrive,
  Lightbulb,
} from "lucide-react";
import { Callout } from "@/components/docs/Callout";
import { CodeBlock } from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "On-Premises Deployment",
  description:
    "Deploy FeatureSignals on your own infrastructure. Covers Kubernetes, VM deployment, air-gapped environments, and security considerations.",
};

export default function OnPremisesPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        On-Premises Deployment
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Deploy FeatureSignals on your own infrastructure — Kubernetes clusters,
        virtual machines, or air-gapped environments. Full control over data,
        networking, and security posture.
      </p>

      <Callout variant="info">
        This guide covers advanced deployment scenarios. For a quick Docker
        Compose setup, see the{" "}
        <Link
          href="/docs/self-hosting/onboarding-guide"
          className="text-[var(--signal-fg-accent)] hover:underline font-medium"
        >
          Self-Hosting Onboarding Guide
        </Link>
        .
      </Callout>

      {/* Deployment Options */}
      <SectionHeading>Deployment Options</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals supports three on-premises deployment models:
      </p>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <DeployCard
          icon={Container}
          title="Kubernetes"
          description="Deploy on any Kubernetes cluster (EKS, GKE, AKS, OpenShift, or bare-metal K8s). Helm chart available."
          href="#kubernetes"
        />
        <DeployCard
          icon={Monitor}
          title="Virtual Machines"
          description="Deploy on VMs using Docker Compose or systemd. Suitable for traditional infrastructure."
          href="#virtual-machines"
        />
        <DeployCard
          icon={WifiOff}
          title="Air-Gapped"
          description="Deploy in environments with no internet access. Pre-bundled images, offline docs, manual updates."
          href="#air-gapped"
        />
      </div>

      {/* Kubernetes */}
      <SectionHeading id="kubernetes">Kubernetes Deployment</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals provides an official Helm chart for Kubernetes
        deployments. The chart includes the API server, Flag Engine dashboard,
        and configurable PostgreSQL (external or in-cluster).
      </p>

      <SubHeading>Prerequisites</SubHeading>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-4">
        <li>Kubernetes 1.28+ cluster with RBAC enabled</li>
        <li>Helm 3.12+</li>
        <li>Ingress controller (nginx-ingress, Traefik, or similar)</li>
        <li>cert-manager (for automatic TLS)</li>
        <li>PersistentVolume provisioner (for PostgreSQL storage)</li>
      </ul>

      <SubHeading>Install via Helm</SubHeading>
      <CodeBlock language="bash">{`helm repo add featuresignals https://charts.featuresignals.com
helm repo update

helm install featuresignals featuresignals/featuresignals \\
  --namespace featuresignals \\
  --create-namespace \\
  --set global.domain=featuresignals.example.com \\
  --set postgresql.auth.password=$(openssl rand -base64 32) \\
  --set jwtSecret=$(openssl rand -base64 64)`}</CodeBlock>

      <SubHeading>Production Values</SubHeading>
      <p className="text-[var(--signal-fg-primary)] mb-3">
        For production, create a values file with production overrides:
      </p>
      <CodeBlock language="yaml" title="values-prod.yaml">{`replicaCount: 3

resources:
  requests:
    cpu: "1"
    memory: "2Gi"
  limits:
    cpu: "2"
    memory: "4Gi"

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

postgresql:
  primary:
    persistence:
      size: 50Gi
    resources:
      requests:
        cpu: "2"
        memory: "4Gi"

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  tls:
    - hosts:
        - featuresignals.example.com
        - api.featuresignals.example.com

monitoring:
  serviceMonitor:
    enabled: true`}</CodeBlock>

      <Callout variant="info" title="External database">
        For production, we strongly recommend using an external PostgreSQL
        instance (e.g., AWS RDS, Cloud SQL, or a dedicated Postgres cluster)
        rather than the in-cluster chart dependency. Set{" "}
        <InlineCode>postgresql.enabled=false</InlineCode> and configure{" "}
        <InlineCode>externalDatabase.*</InlineCode> in your values file.
      </Callout>

      {/* VM Deployment */}
      <SectionHeading id="virtual-machines">
        Virtual Machine Deployment
      </SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        For teams not using Kubernetes, FeatureSignals can be deployed on
        virtual machines using Docker Compose or as systemd services:
      </p>

      <SubHeading>Docker Compose on VMs</SubHeading>
      <p className="text-[var(--signal-fg-primary)] mb-3">
        Follow the standard Docker Compose setup with the following VM-specific
        considerations:
      </p>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-4">
        <li>Place the VM behind a load balancer for high availability</li>
        <li>
          Use an external PostgreSQL instance accessible from all VM replicas
        </li>
        <li>
          Configure Docker to start containers on boot:{" "}
          <InlineCode>docker compose up -d --restart always</InlineCode>
        </li>
        <li>Set up log forwarding to your centralized logging system</li>
      </ul>

      <SubHeading>Systemd Service</SubHeading>
      <p className="text-[var(--signal-fg-primary)] mb-3">
        For environments where Docker is not available, the Go API server can be
        compiled to a static binary and run as a systemd service:
      </p>
      <CodeBlock
        language="ini"
        title="/etc/systemd/system/featuresignals.service"
      >{`[Unit]
Description=FeatureSignals API Server
After=network.target postgresql.service

[Service]
Type=simple
User=featuresignals
Group=featuresignals
WorkingDirectory=/opt/featuresignals
EnvironmentFile=/opt/featuresignals/.env
ExecStart=/opt/featuresignals/bin/server
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target`}</CodeBlock>

      {/* Air-Gapped */}
      <SectionHeading id="air-gapped">Air-Gapped Environments</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals supports deployment in environments with no internet
        access — common in government, financial, and defense sectors.
      </p>

      <SubHeading>Image Bundling</SubHeading>
      <p className="text-[var(--signal-fg-primary)] mb-3">
        FeatureSignals provides pre-bundled tarballs containing all Docker
        images, the Helm chart, and offline documentation:
      </p>
      <CodeBlock language="bash">{`# On an internet-connected machine:
docker pull featuresignals/server:v2.0.0
docker pull featuresignals/dashboard:v2.0.0
docker save featuresignals/server:v2.0.0 featuresignals/dashboard:v2.0.0 | gzip > featuresignals-images.tar.gz

# Download the offline bundle
wget https://releases.featuresignals.com/v2.0.0/offline-bundle.tar.gz

# Transfer to air-gapped environment via approved media
# Then load on the target machine:
docker load < featuresignals-images.tar.gz
tar xzf offline-bundle.tar.gz`}</CodeBlock>

      <SubHeading>Air-Gapped Considerations</SubHeading>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>No telemetry</strong> — FeatureSignals does not phone home. No
          usage data, error reports, or metrics leave your network.
        </li>
        <li>
          <strong>License validation</strong> — Enterprise licenses are
          validated offline using signed tokens. No call to an external
          validation server is required.
        </li>
        <li>
          <strong>Email delivery</strong> — Configure an internal SMTP relay for
          transactional emails (password resets, invitations). Without SMTP,
          these features will not function.
        </li>
        <li>
          <strong>Updates</strong> — Upgrade by transferring new image tarballs
          and Helm charts via your approved data transfer process. Review the
          changelog for migration notes.
        </li>
        <li>
          <strong>Documentation</strong> — The offline bundle includes a static
          HTML copy of the documentation. Serve it from an internal web server.
        </li>
      </ul>

      {/* Security */}
      <SectionHeading>Security Considerations</SectionHeading>
      <div className="space-y-4 mb-8">
        <SecurityCard
          icon={Network}
          title="Network Segmentation"
          description="Place the database on a private subnet with no public internet access. Only the API server and dashboard should be reachable (via load balancer or reverse proxy). Use security groups or firewall rules to restrict traffic between components to only the necessary ports."
        />
        <SecurityCard
          icon={Key}
          title="Secrets Management"
          description="Never store secrets in configuration files committed to version control. Use a secrets manager appropriate for your environment: HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, or Kubernetes Secrets (with encryption at rest enabled)."
        />
        <SecurityCard
          icon={Shield}
          title="TLS Everywhere"
          description="Encrypt all traffic — both external (client to server) and internal (service-to-service, service-to-database). Use mTLS for service-to-service communication where possible. The API server and database should communicate over TLS, even on private networks."
        />
        <SecurityCard
          icon={HardDrive}
          title="Data at Rest"
          description="Enable encryption at rest for all persistent storage: PostgreSQL (TDE or filesystem encryption), Kubernetes PersistentVolumes (storage class with encryption), and backup files. Never store unencrypted database dumps."
        />
      </div>

      {/* High Availability */}
      <SectionHeading>High Availability Architecture</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        For production deployments requiring high availability:
      </p>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-4">
        <li>
          <strong>Multiple API server replicas</strong> — Deploy at least 3
          replicas behind a load balancer for redundancy.
        </li>
        <li>
          <strong>Stateless design</strong> — API servers are stateless. The
          evaluation cache uses PG LISTEN/NOTIFY for cross-instance
          invalidation.
        </li>
        <li>
          <strong>Database HA</strong> — Use PostgreSQL streaming replication
          with automated failover (Patroni, Cloud SQL HA, or RDS Multi-AZ).
        </li>
        <li>
          <strong>Load balancer health checks</strong> — Configure your load
          balancer to use the <InlineCode>/health</InlineCode> endpoint for
          liveness and <InlineCode>/ready</InlineCode> for readiness.
        </li>
        <li>
          <strong>Graceful shutdown</strong> — API servers handle SIGTERM by
          draining in-flight requests before stopping (default: 30s grace
          period).
        </li>
      </ul>

      <Callout variant="warning" title="Split-brain prevention">
        FeatureSignals does not use leader election. All instances are
        active-active and rely on the database as the source of truth. Ensure
        your PostgreSQL HA setup prevents split-brain scenarios (e.g., using
        etcd-based leader election with Patroni).
      </Callout>

      {/* Compliance */}
      <SectionHeading>Compliance &amp; Regulatory</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Deploying on-premises gives you full control over your compliance
        posture:
      </p>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>SOC 2</strong> — Self-hosting FeatureSignals in your SOC
          2-compliant infrastructure extends your existing controls to flag
          management.
        </li>
        <li>
          <strong>HIPAA</strong> — FeatureSignals does not process PHI by
          default. With proper network controls and a BAA with your
          infrastructure provider, on-premises deployment supports HIPAA
          compliance.
        </li>
        <li>
          <strong>GDPR</strong> — All data remains in your infrastructure within
          your chosen region. No data leaves your control.
        </li>
        <li>
          <strong>FedRAMP / ITAR</strong> — Air-gapped deployment with FIPS
          140-2 validated cryptography supports government compliance
          requirements.
        </li>
      </ul>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        <li>
          <Link
            href="/docs/self-hosting/onboarding-guide"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>Self-Hosting Onboarding Guide</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — step-by-step setup with Docker Compose
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
            — complete list of environment variables and Helm values
          </span>
        </li>
        <li>
          <Link
            href="/docs/architecture/overview"
            className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
          >
            <ArrowRight size={14} />
            <span>Architecture Overview</span>
          </Link>
          <span className="text-xs text-[var(--signal-fg-secondary)] ml-6">
            — understand how FeatureSignals works under the hood
          </span>
        </li>
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function SectionHeading({
  children,
  id,
}: {
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <h2
      id={id}
      className="text-xl font-semibold text-[var(--signal-fg-primary)] mt-10 mb-4 pb-2 border-b border-[var(--signal-border-default)]"
    >
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

function DeployCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-sm)] hover:border-[var(--signal-border-accent-muted)] hover:shadow-[var(--signal-shadow-md)] transition-all duration-200"
    >
      <Icon size={20} className="text-[var(--signal-fg-accent)] mb-2" />
      <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
        {title}
      </p>
      <p className="text-xs text-[var(--signal-fg-secondary)]">{description}</p>
    </a>
  );
}

function SecurityCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-sm)]">
      <div className="flex items-start gap-3">
        <Icon
          size={18}
          className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0"
        />
        <div>
          <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
            {title}
          </p>
          <p className="text-sm text-[var(--signal-fg-secondary)]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
