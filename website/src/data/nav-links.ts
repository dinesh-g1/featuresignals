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
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
}

export const platformItems: NavItem[] = [
  {
    title: "Feature Flags",
    description: "Multi-type flags, targeting, percentage rollouts",
    href: "/features#ship-with-confidence",
    icon: Flag,
  },
  {
    title: "Experimentation",
    description: "A/B tests, weighted variants, mutual exclusion",
    href: "/features#experiment-measure",
    icon: FlaskConical,
  },
  {
    title: "Debugging",
    description: "Entity inspector, environment comparison",
    href: "/features#debug-troubleshoot",
    icon: Search,
  },
  {
    title: "Governance",
    description: "Audit logs, RBAC, approval workflows",
    href: "/features#govern-comply",
    icon: ShieldCheck,
  },
  {
    title: "Deployment",
    description: "Docker, Kubernetes, relay proxy, self-hosted",
    href: "/features#deploy-your-way",
    icon: Cloud,
  },
];

export const learnMoreItems: NavItem[] = [
  {
    title: "Use Cases",
    description: "Real workflows for engineering teams",
    href: "/use-cases",
    icon: Layers,
  },
  {
    title: "Security & Trust",
    description: "Encryption, RBAC, SOC 2, GDPR",
    href: "/security",
    icon: Lock,
  },
  {
    title: "How We Compare",
    description: "vs LaunchDarkly, Unleash, and more",
    href: "/features#comparison",
    icon: ArrowLeftRight,
  },
];

export const productFooterLinks = [
  { title: "See all features", href: "/features" },
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
