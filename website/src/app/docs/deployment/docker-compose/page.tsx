import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = {
  title: "Docker Compose",
  description:
    "Deploy FeatureSignals with Docker Compose for development and production environments.",
};

export default function DockerComposePage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fgColor-default)] mb-3"
      >
        Docker Compose Deployment
      </h1>
      <p className="text-lg text-[var(--fgColor-muted)] mb-8 leading-relaxed">
        The quickest way to run FeatureSignals is with Docker Compose.
      </p>

      {/* Quick Start */}
      <SectionHeading>Quick Start</SectionHeading>
      <CodeBlock
        language="bash"
        code={`git clone https://github.com/dinesh-g1/featuresignals.git
cd featuresignals
docker compose up -d`}
      />

      {/* Services */}
      <SectionHeading>Services</SectionHeading>
      <p className="text-[var(--fgColor-default)] mb-4">
        The <InlineCode>docker-compose.yml</InlineCode> defines these services:
      </p>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-3">
        PostgreSQL
      </h3>
      <CodeBlock
        language="yaml"
        code={`postgres:
  image: postgres:16-alpine
  ports:
    - "5432:5432"
  environment:
    POSTGRES_DB: featuresignals
    POSTGRES_USER: fs
    POSTGRES_PASSWORD: fsdev
  volumes:
    - pgdata:/var/lib/postgresql/data`}
      />
      <p className="text-sm text-[var(--fgColor-muted)] mt-2 mb-4">
        Data is persisted to a Docker volume.
      </p>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-3">Migrate</h3>
      <CodeBlock
        language="yaml"
        code={`migrate:
  image: migrate/migrate:v4.17.0
  depends_on:
    - postgres
  volumes:
    - ./server/migrations:/migrations
  command:
    ["-path", "/migrations", "-database", "postgres://fs:fsdev@postgres:5432/featuresignals?sslmode=disable", "up"]`}
      />
      <p className="text-sm text-[var(--fgColor-muted)] mt-2 mb-4">
        Runs database migrations on startup.
      </p>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-3">
        API Server
      </h3>
      <CodeBlock
        language="yaml"
        code={`server:
  build:
    context: ./server
    dockerfile: ../deploy/docker/Dockerfile.server
  ports:
    - "8080:8080"
  depends_on:
    - postgres
    - migrate
  environment:
    DATABASE_URL: postgres://fs:fsdev@postgres:5432/featuresignals?sslmode=disable
    JWT_SECRET: dev-secret-change-in-production
    PORT: "8080"
    CORS_ORIGIN: http://localhost:3000`}
      />

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-3">
        Flag Engine
      </h3>
      <CodeBlock
        language="yaml"
        code={`dashboard:
  build:
    context: ./dashboard
    dockerfile: ../deploy/docker/Dockerfile.dashboard
  ports:
    - "3000:3000"
  environment:
    NEXT_PUBLIC_API_URL: http://localhost:8080`}
      />

      {/* Accessing Services */}
      <SectionHeading>Accessing Services</SectionHeading>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Service</Th>
            <Th>URL</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>Flag Engine</Td>
            <Td>
              <a
                href="http://localhost:3000"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--fgColor-accent)] hover:underline"
              >
                http://localhost:3000
              </a>
            </Td>
          </Tr>
          <Tr>
            <Td>API Server</Td>
            <Td>
              <InlineCode>http://localhost:8080</InlineCode>
            </Td>
          </Tr>
          <Tr>
            <Td>Health Check</Td>
            <Td>
              <InlineCode>http://localhost:8080/health</InlineCode>
            </Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Stopping */}
      <SectionHeading>Stopping</SectionHeading>
      <CodeBlock language="bash" code="docker compose down" />
      <p className="text-sm text-[var(--fgColor-muted)] mt-2 mb-4">To also remove data:</p>
      <CodeBlock language="bash" code="docker compose down -v" />

      {/* Relay Proxy */}
      <SectionHeading>Adding the Relay Proxy</SectionHeading>
      <p className="text-[var(--fgColor-default)] mb-3">
        Add the relay proxy to your <InlineCode>docker-compose.yml</InlineCode>:
      </p>
      <CodeBlock
        language="yaml"
        code={`relay:
  build:
    context: .
    dockerfile: deploy/docker/Dockerfile.relay
  ports:
    - "8090:8090"
  depends_on:
    - server
  environment:
    FS_API_KEY: "your-api-key-here"
    FS_ENV_KEY: "production"
    FS_UPSTREAM: "http://server:8080"`}
      />

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "Self-Hosting Guide", href: "/docs/deployment/self-hosting" },
          { label: "Configuration Reference", href: "/docs/deployment/configuration" },
          { label: "Quickstart", href: "/docs/getting-started/quickstart" },
        ].map((step) => (
          <Link
            key={step.href}
            href={step.href}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--fgColor-accent)] hover:bg-[var(--bgColor-accent-muted)] transition-colors font-medium"
          >
            <ArrowRightIcon size={14} />
            <span>{step.label}</span>
          </Link>
        ))}
      </div>
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

function SimpleTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-[var(--borderColor-default)] rounded-lg mb-6">
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
  return (
    <tr className="border-b border-[var(--borderColor-default)] last:border-b-0">
      {children}
    </tr>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2.5 text-[var(--fgColor-default)]">{children}</td>;
}
