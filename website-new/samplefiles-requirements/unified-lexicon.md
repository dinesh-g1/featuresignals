# FeatureSignals: Unified Lexicon & Positioning

To maintain market dominance, every piece of text across `website`, `dashboard`, `docs`, and `server` must use the same aggressive, enterprise-grade terminology.

## Banned Words vs. Approved Terminology

| Banned (SaaS/Startup Vibe) | Approved (Enterprise Infrastructure Vibe) | Why? |
| :--- | :--- | :--- |
| Feature Toggles / Switches | **Feature Flags / State** | We manage infrastructure state, not simple buttons. |
| User Interface (UI) | **Control Plane** | Implies high-availability separation from the "Data Plane" (Edge Nodes). |
| Pricing Tier / Monthly Active Users | **Infrastructure Compute / Flat Pricing** | Attacks LaunchDarkly's MAU model directly. |
| Stale Flags / Old Code | **Flag Rot / Technical Debt** | Frames the problem as a financial liability. |
| Auto-delete / Cleanup | **AI Janitor** | Personifies the solution to Flag Rot as an active, intelligent agent. |

## The 4 Core Marketing Pillars
Every feature built in the `server` or `dashboard` must map to one of these:
1. **Zero Vendor Lock-in** (OpenFeature Native, Terraform Provider).
2. **Enterprise Governance** (CAB Approvals, ServiceNow/Jira integration, Audit Logs).
3. **Automated Debt Eradication** (AI Janitor opening GitHub PRs).
4. **100% Edge Availability** (Sub-millisecond Wasm/Redis edge nodes).