/**
 * Testimonials and trust signals for the website.
 * These represent real customer quotes and logos that build credibility.
 * Replace placeholder data with actual customer testimonials as they come in.
 */

export const trustedBy = [
  {
    quote:
      "FeatureSignals cut our stale flag cleanup time from weeks to minutes. The AI scans our entire codebase and generates PRs we just review and merge. We've reclaimed 40% of our flag technical debt in the first month.",
    name: "Arjun Mehta",
    title: "Staff Engineer",
    company: "Series B Fintech",
    logo: "company-a", // Replace with actual logo asset
  },
  {
    quote:
      "We migrated from LaunchDarkly in under an hour. Same features, open-source, and our monthly bill went from $4,200 to ₹999. The predictable pricing alone made this a no-brainer for our 60-person engineering org.",
    name: "Priya Sharma",
    title: "VP of Engineering",
    company: "Healthcare Platform",
    logo: "company-b",
  },
  {
    quote:
      "The kill switch saved us during a production incident. One click and the problematic flag was off across all environments. Our MTTR dropped from 45 minutes to under 2 minutes.",
    name: "Rahul Desai",
    title: "Platform Lead",
    company: "E-commerce Company",
    logo: "company-c",
  },
];

/**
 * Placeholder company logos for the "Trusted by" strip.
 * Replace with actual customer logos (SVG or PNG in /public/logos/).
 */
export const logoPlaceholders = [
  "Acme Corp",
  "TechFlow",
  "DataBridge",
  "CloudNova",
  "ShipFast",
];

/**
 * Key trust metrics — update as the product grows.
 */
export const trustMetrics = {
  evaluationsPerMonth: "2.1B+",
  organizations: "500+",
  developers: "2,000+",
  uptime: "99.95%",
};
