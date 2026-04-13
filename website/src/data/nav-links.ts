import {
  Flag,
  FlaskConical,
  Search,
  ShieldCheck,
  Cloud,
  Layers,
  Lock,
  ArrowLeftRight,
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
    title: "AI Capabilities",
    description: "AI flag cleanup, anomaly detection, auto-remediation",
    href: "/features/ai",
    icon: Brain,
    badge: "New",
  },
  {
    title: "Security & Governance",
    description: "RBAC, audit logs, SSO, approvals, compliance",
    href: "/features/security",
    icon: ShieldCheck,
  },
  {
    title: "Integrations",
    description: "Slack, GitHub, Jira, Datadog, webhooks",
    href: "/features/integrations",
    icon: Webhook,
  },
  {
    title: "Use Cases",
    description: "Real workflows for engineering teams",
    href: "/use-cases",
    icon: Layers,
  },
];

export const learnMoreItems: NavItem[] = [
  {
    title: "Pricing",
    description: "Simple, transparent pricing — starts free",
    href: "/pricing",
    icon: Layers,
  },
  {
    title: "Documentation",
    description: "Getting started, concepts, guides",
    href: "https://docs.featuresignals.com",
    icon: BookOpen,
    external: true,
  },
];

export const productFooterLinks = [
  { title: "Core features", href: "/features" },
  { title: "AI capabilities", href: "/features/ai" },
  { title: "What's new", href: "/changelog" },
];

export const developerItems: NavItem[] = [
  {
    title: "Documentation",
    description: "Getting started, concepts, guides",
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
    title: "SDKs",
    description: "Go, Node, Python, Java, C#, Ruby, React, Vue",
    href: "https://docs.featuresignals.com/sdks/overview",
    icon: Package,
    external: true,
  },
  {
    title: "GitHub",
    description: "Source code, issues, contributions",
    href: "https://github.com/dinesh-g1/featuresignals",
    icon: GitBranch,
    external: true,
  },
];

export const developerFooterItem = {
  title: "Get started in 5 minutes",
  href: "https://docs.featuresignals.com/getting-started/quickstart",
  icon: Rocket,
  external: true,
};
