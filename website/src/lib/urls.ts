const DASHBOARD_URL = "https://app.featuresignals.com";

export const appUrl = {
  login: `${DASHBOARD_URL}/login`,
  register: `${DASHBOARD_URL}/register`,
  registerPlan: (plan: string) => `${DASHBOARD_URL}/register?plan=${plan}`,
  home: DASHBOARD_URL,
  resolve: (path: string) => `${DASHBOARD_URL}${path}`,
};
