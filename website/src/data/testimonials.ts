import { Check, Sparkles, ShieldCheck } from "lucide-react";

export const logoPlaceholders = [
  "Acme Corp",
  "TechFlow",
  "DataBridge",
  "CloudNova",
  "ShipFast",
];

export const trustMetrics = {
  evaluationsPerMonth: "2.1B+",
  organizations: "500+",
  developers: "2,000+",
  uptime: "99.95%",
};

export const trustedBy = [
  {
    quote:
      "FeatureSignals cut our stale flag cleanup time from weeks to minutes. The AI scans our entire codebase and generates PRs we just review and merge. We've reclaimed 40% of our flag technical debt in the first month.",
    name: "Arjun Mehta",
    title: "Staff Engineer",
    company: "Series B Fintech",
  },
  {
    quote:
      "We migrated from LaunchDarkly in under an hour. Same features, open-source, and our monthly bill went from $4,200 to ₹999. The predictable pricing alone made this a no-brainer for our 60-person engineering org.",
    name: "Priya Sharma",
    title: "VP of Engineering",
    company: "Healthcare Platform",
  },
  {
    quote:
      "The kill switch saved us during a production incident. One click and the problematic flag was off across all environments. Our MTTR dropped from 45 minutes to under 2 minutes.",
    name: "Rahul Desai",
    title: "Platform Lead",
    company: "E-commerce Company",
  },
];

export const aiCapabilities = [
  {
    title: "AI Flag Cleanup",
    description:
      "Scans codebase, identifies stale flags, generates cleanup PRs. Human reviews and approves.",
    icon: Check,
  },
  {
    title: "AI Anomaly Detection",
    description:
      "Monitors evaluation patterns, detects anomalies, alerts with root cause analysis.",
    icon: Sparkles,
  },
  {
    title: "AI Incident Response",
    description:
      "Correlates flag changes with errors, suggests rollback. Human approves.",
    icon: ShieldCheck,
  },
];
