import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = {
  title: "Installation",
  description:
    "Install FeatureSignals via Docker Compose, standalone Docker containers, or build from source. Self-hosted feature flag management.",
};

export default function InstallationPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fgColor-default)] mb-3"
      >
        Installation
      </h1>
      <p className="text-lg text-[var(--fgColor-muted)] mb-8 leading-relaxed">
        FeatureSignals can be installed via Docker Compose (recommended), standalone Docker, or
        built from source.
      </p>

      {/* Docker Compose */}
      <SectionHeading>Docker Compose (Recommended)</SectionHeading>
      <p className="text-[var(--fgColor-default)] mb-4">
        The fastest way to run the full stack locally:
      </p>
      <CodeBlock
        language="bash"
        code={`git clone https://github.com/dinesh-g1/featuresignals.git
cd featuresignals
docker compose up -d`}
      />
      <p className="text-sm text-[var(--fgColor-muted)] mt-4 mb-6">This starts all services:</p>
      <Table>
        <thead>
          <tr>
            <Th>Service</Th>
            <Th>Port</Th>
            <Th>Description</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>PostgreSQL</Td>
            <Td><InlineCode>5432</InlineCode></Td>
            <Td>Data store</Td>
          </Tr>
          <Tr>
            <Td>API Server</Td>
            <Td><InlineCode>8080</InlineCode></Td>
            <Td>REST API + SSE</Td>
          </Tr>
          <Tr>
            <Td>Flag Engine</Td>
            <Td><InlineCode>3000</InlineCode></Td>
            <Td>Web UI (Next.js)</Td>
          </Tr>
        </tbody>
      </Table>
      <p className="text-sm text-[var(--fgColor-muted)] mt-2">
        Migrations run automatically via the <InlineCode>migrate</InlineCode> service.
      </p>

      {/* Standalone Docker */}
      <SectionHeading>Standalone Docker</SectionHeading>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-3">
        API Server
      </h3>
      <CodeBlock
        language="bash"
        code={`docker build -f deploy/docker/Dockerfile.server -t featuresignals-server ./server

docker run -d \\
  -p 8080:8080 \\
  -e DATABASE_URL="postgres://user:pass@host:5432/featuresignals?sslmode=disable" \\
  -e JWT_SECRET="your-secret-here" \\
  -e CORS_ORIGIN="http://localhost:3000" \\
  featuresignals-server`}
      />

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-3">
        Flag Engine
      </h3>
      <CodeBlock
        language="bash"
        code={`docker build -f deploy/docker/Dockerfile.dashboard -t featuresignals-dashboard ./dashboard

docker run -d \\
  -p 3000:3000 \\
  -e NEXT_PUBLIC_API_URL="http://localhost:8080" \\
  featuresignals-dashboard`}
      />

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-3">
        Relay Proxy
      </h3>
      <CodeBlock
        language="bash"
        code={`docker build -f deploy/docker/Dockerfile.relay -t featuresignals-relay .

docker run -d \\
  -p 8090:8090 \\
  -e FS_API_KEY="your-api-key" \\
  -e FS_ENV_KEY="production" \\
  -e FS_UPSTREAM="http://your-server:8080" \\
  featuresignals-relay`}
      />

      {/* Build from Source */}
      <SectionHeading>Build from Source</SectionHeading>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-4 mb-3">
        Prerequisites
      </h3>
      <ul className="list-disc pl-6 space-y-1 text-[var(--fgColor-default)] mb-4">
        <li>Go 1.22+</li>
        <li>Node.js 18+ and npm</li>
        <li>PostgreSQL 14+</li>
      </ul>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mb-3">
        API Server
      </h3>
      <CodeBlock
        language="bash"
        code={`cd server
go build -o featuresignals-server ./cmd/server
./featuresignals-server`}
      />

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-3">
        Flag Engine
      </h3>
      <CodeBlock
        language="bash"
        code={`cd dashboard
npm install
npm run build
npm start`}
      />

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-3">
        Database Setup
      </h3>
      <p className="text-[var(--fgColor-default)] mb-3">
        Create the database and run migrations:
      </p>
      <CodeBlock
        language="bash"
        code={`createdb featuresignals

# Using golang-migrate
migrate -path server/migrations \\
  -database "postgres://user:pass@localhost:5432/featuresignals?sslmode=disable" \\
  up`}
      />

      {/* Verification */}
      <SectionHeading>Verifying the Installation</SectionHeading>
      <p className="text-[var(--fgColor-default)] mb-3">
        After starting, verify the API is healthy:
      </p>
      <CodeBlock language="bash" code="curl http://localhost:8080/health" />
      <p className="text-sm text-[var(--fgColor-muted)] mt-3 mb-2">Expected response:</p>
      <CodeBlock
        language="json"
        code={`{"status": "ok", "service": "featuresignals"}`}
      />
      <p className="text-[var(--fgColor-default)] mt-4">
        Open{" "}
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--fgColor-accent)] hover:underline"
        >
          http://localhost:3000
        </a>{" "}
        to access the Flag Engine.
      </p>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Quickstart", href: "/docs/getting-started/quickstart", desc: "create your first flag" },
          { label: "Configuration Reference", href: "/docs/deployment/configuration", desc: "environment variables" },
          { label: "Self-Hosting Guide", href: "/docs/deployment/self-hosting", desc: "production deployment" },
        ].map((step) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="flex items-center gap-2 text-[var(--fgColor-accent)] hover:underline text-sm font-medium"
            >
              <ArrowRightIcon size={14} />
              <span>{step.label}</span>
            </Link>
            <span className="text-xs text-[var(--fgColor-muted)] ml-6">
              — {step.desc}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-[var(--fgColor-default)] mt-10 mb-4 pb-2 border-b border-[var(--borderColor-default)]">
      {children}
    </h2>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--bgColor-inset)] text-[var(--fgColor-default)] border border-[var(--borderColor-default)]">
      {children}
    </code>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-[var(--borderColor-default)] rounded-lg">
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 font-semibold bg-[var(--bgColor-inset)] border-b border-[var(--borderColor-default)] text-[var(--fgColor-default)]">
      {children}
    </th>
  );
}

function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-[var(--borderColor-default)] last:border-b-0">{children}</tr>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2.5 text-[var(--fgColor-default)]">{children}</td>;
}
