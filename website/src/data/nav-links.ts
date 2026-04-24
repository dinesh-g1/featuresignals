import {
  Flag,
  FlaskConical,
  Search,
  ShieldCheck,
  Cloud,
  Layers,
  Lock,
  BookOpen,
  Terminal,
  Package,
  GitBranch,
  Rocket,
  Brain,
  Webhook,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
  badge?: string;
}

export const platformItems: NavItem[] = [
  {
    title: "Core Features",
    description: "Flag engine, targeting, rollouts, A/B testing",
    href: "/features",
    icon: Flag,
  },
  {
    title: "AI Janitor",
    description: "Autonomous stale flag detection & PR generation",
    href: "/features/ai",
    icon: Brain,
    badge: "New",
  },
  {
    title: "Security & Governance",
    description: "RBAC, audit logs, SSO, CAB approvals, compliance",
    href: "/features/security",
    icon: ShieldCheck,
  },
  {
    title: "Integrations",
    description: "Terraform, Slack, GitHub, Jira, Datadog, webhooks",
    href: "/features/integrations",
    icon: Webhook,
  },
  {
    title: "Use Cases",
    description: "CI/CD, canary releases, kill switches, experimentation",
    href: "/use-cases",
    icon: Layers,
  },
];

export const learnMoreItems: NavItem[] = [
  {
    title: "Pricing",
    description: "Flat-rate pricing. Unlimited MAUs. Never per-seat.",
    href: "/pricing",
    icon: Layers,
  },
  {
    title: "Documentation",
    description: "Getting started, GitOps, OpenFeature guides",
    href: "https://docs.featuresignals.com",
    icon: BookOpen,
    external: true,
  },
];

export const developerItems: NavItem[] = [
  {
    title: "Documentation",
    description: "Getting started, concepts, architecture guides",
    href: "https://docs.featuresignals.com",
    icon: BookOpen,
    external: true,
  },
  {
    title: "API Reference",
    description: "REST API & OpenAPI playground",
    href: "https://docs.featuresignals.com/api-playground",
    icon: Terminal,
    external: true,
  },
  {
    title: "SDKs (8 Languages)",
    description: "Go, Node, Python, Java, C#, Ruby, React, Vue",
    href: "https://docs.featuresignals.com/sdks/overview",
    icon: Package,
    external: true,
  },
  {
    title: "Terraform Provider",
    description: "Manage flags as infrastructure code",
    href: "https://registry.terraform.io/providers/featuresignals",
    icon: Cloud,
    external: true,
  },
  {
    title: "GitHub",
    description: "Source code, issues, contributions welcome",
    href: "https://github.com/dinesh-g1/featuresignals",
    icon: GitBranch,
    external: true,
  },
];
