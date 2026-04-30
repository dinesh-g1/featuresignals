import type { Icon } from "@primer/octicons-react";
import {
  IterationsIcon,
  BeakerIcon,
  ShieldCheckIcon,
  CloudIcon,
  StackIcon,
  BookIcon,
  TerminalIcon,
  PackageIcon,
  GitBranchIcon,
  RocketIcon,
  LightBulbIcon,
  WebhookIcon,
  SearchIcon,
  LockIcon,
} from "@primer/octicons-react";

export interface NavItem {
  title: string;
  description: string;
  href: string;
  icon: Icon;
  external?: boolean;
  badge?: string;
}

export const platformItems: NavItem[] = [
  {
    title: "Core Features",
    description: "Flag engine, targeting, rollouts, A/B testing",
    href: "/features",
    icon: IterationsIcon,
  },
  {
    title: "AI Janitor",
    description: "Autonomous stale flag detection & PR generation",
    href: "/features/ai",
    icon: LightBulbIcon,
    badge: "New",
  },
  {
    title: "Security & Governance",
    description: "RBAC, audit logs, SSO, CAB approvals, compliance",
    href: "/features/security",
    icon: ShieldCheckIcon,
  },
  {
    title: "Integrations",
    description: "Terraform, Slack, GitHub, Jira, Datadog, webhooks",
    href: "/features/integrations",
    icon: WebhookIcon,
  },
  {
    title: "Use Cases",
    description: "CI/CD, canary releases, kill switches, experimentation",
    href: "/use-cases",
    icon: StackIcon,
  },
];

export const learnMoreItems: NavItem[] = [
  {
    title: "Pricing",
    description: "Flat-rate pricing. Unlimited MAUs. Never per-seat.",
    href: "/pricing",
    icon: StackIcon,
  },
  {
    title: "Documentation",
    description: "Getting started, GitOps, OpenFeature guides",
    href: "https://docs.featuresignals.com",
    icon: BookIcon,
    external: true,
  },
];

export const developerItems: NavItem[] = [
  {
    title: "Documentation",
    description: "Getting started, concepts, architecture guides",
    href: "https://docs.featuresignals.com",
    icon: BookIcon,
    external: true,
  },
  {
    title: "API Reference",
    description: "REST API & OpenAPI playground",
    href: "https://docs.featuresignals.com/api-playground",
    icon: TerminalIcon,
    external: true,
  },
  {
    title: "SDKs (8 Languages)",
    description: "Go, Node, Python, Java, C#, Ruby, React, Vue",
    href: "https://docs.featuresignals.com/sdks/overview",
    icon: PackageIcon,
    external: true,
  },
  {
    title: "Terraform Provider",
    description: "Manage flags as infrastructure code",
    href: "https://registry.terraform.io/providers/featuresignals",
    icon: CloudIcon,
    external: true,
  },
  {
    title: "GitHub",
    description: "Source code, issues, contributions welcome",
    href: "https://github.com/dinesh-g1/featuresignals",
    icon: GitBranchIcon,
    external: true,
  },
];
