const DASHBOARD_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://app.featuresignals.com";

export const appUrl = {
  login: `${DASHBOARD_URL}/login`,
  register: `${DASHBOARD_URL}/register`,
  registerPlan: (plan: string) => `${DASHBOARD_URL}/register?plan=${plan}`,
  home: DASHBOARD_URL,
  /** Resolve a path to a full dashboard URL (e.g. "/register" -> "https://app.dev.../register"). */
  resolve: (path: string) => `${DASHBOARD_URL}${path}`,
};
