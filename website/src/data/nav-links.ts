import {
  Flag,
  FlaskConical,
  Users,
  Code,
  Shield,
  Zap,
  Server,
  Clock,
  Star,
  BookOpen,
  Terminal,
  Package,
  GitBranch,
  Rocket,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
}

export const productItems: NavItem[] = [
  {
    title: "Flag Engine",
    description: "Multi-type flags, targeting, rollouts",
    href: "/features",
    icon: Flag,
  },
  {
    title: "A/B Experimentation",
    description: "Weighted variants, consistent hashing",
    href: "/features",
    icon: FlaskConical,
  },
  {
    title: "Segments & Targeting",
    description: "13 operators, AND/OR logic, segment rules",
    href: "/features",
    icon: Users,
  },
  {
    title: "SDKs for Every Stack",
    description: "8 SDKs + OpenFeature, zero vendor lock-in",
    href: "/features",
    icon: Code,
  },
  {
    title: "Enterprise Governance",
    description: "Audit logs, RBAC, approvals",
    href: "/features",
    icon: Shield,
  },
  {
    title: "Real-Time Updates",
    description: "SSE streaming, sub-second propagation",
    href: "/features",
    icon: Zap,
  },
  {
    title: "Relay Proxy",
    description: "Edge caching, fault tolerance",
    href: "/features",
    icon: Server,
  },
  {
    title: "Scheduling & Kill Switch",
    description: "Auto-enable/disable, emergency kill switch",
    href: "/features",
    icon: Clock,
  },
];

export const productFooterItem: NavItem = {
  title: "Why FeatureSignals",
  description: "Open-source, self-hosted, no $50K bill",
  href: "/",
  icon: Star,
};

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
    title: "SDK Quickstarts",
    description: "Go, Node, Python, Java, and more",
    href: "https://docs.featuresignals.com/sdks/overview",
    icon: Package,
    external: true,
  },
  {
    title: "GitHub",
    description: "Source code, issues, PRs",
    href: "https://github.com/dinesh-g1/featuresignals",
    icon: GitBranch,
    external: true,
  },
  {
    title: "Quickstart Guide",
    description: "Up and running in 5 minutes",
    href: "https://docs.featuresignals.com/getting-started/quickstart",
    icon: Rocket,
    external: true,
  },
];
