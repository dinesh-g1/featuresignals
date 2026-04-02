const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new APIError(res.status, data.error || "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Auth
  register: (data: { email: string; password: string; name: string; org_name: string }) =>
    request("/v1/auth/register", { method: "POST", body: data }),
  login: (data: { email: string; password: string }) =>
    request<{ user: any; tokens: { access_token: string; refresh_token: string } }>(
      "/v1/auth/login",
      { method: "POST", body: data },
    ),
  refresh: (refreshToken: string) =>
    request("/v1/auth/refresh", { method: "POST", body: { refresh_token: refreshToken } }),
  sendOTP: (token: string, phone: string) =>
    request("/v1/auth/send-otp", { method: "POST", body: { phone }, token }),
  verifyOTP: (token: string, otp: string) =>
    request("/v1/auth/verify-otp", { method: "POST", body: { otp }, token }),
  sendVerificationEmail: (token: string) =>
    request("/v1/auth/send-verification-email", { method: "POST", token }),

  // Projects
  listProjects: (token: string) => request<any[]>("/v1/projects", { token }),
  createProject: (token: string, data: { name: string; slug?: string }) =>
    request("/v1/projects", { method: "POST", body: data, token }),
  getProject: (token: string, id: string) => request<any>(`/v1/projects/${id}`, { token }),

  // Environments
  listEnvironments: (token: string, projectId: string) =>
    request<any[]>(`/v1/projects/${projectId}/environments`, { token }),
  createEnvironment: (token: string, projectId: string, data: { name: string; slug?: string; color?: string }) =>
    request(`/v1/projects/${projectId}/environments`, { method: "POST", body: data, token }),

  // Flags
  listFlags: (token: string, projectId: string) =>
    request<any[]>(`/v1/projects/${projectId}/flags`, { token }),
  getFlag: (token: string, projectId: string, flagKey: string) =>
    request<any>(`/v1/projects/${projectId}/flags/${flagKey}`, { token }),
  createFlag: (token: string, projectId: string, data: any) =>
    request(`/v1/projects/${projectId}/flags`, { method: "POST", body: data, token }),
  updateFlag: (token: string, projectId: string, flagKey: string, data: any) =>
    request(`/v1/projects/${projectId}/flags/${flagKey}`, { method: "PUT", body: data, token }),
  deleteFlag: (token: string, projectId: string, flagKey: string) =>
    request(`/v1/projects/${projectId}/flags/${flagKey}`, { method: "DELETE", token }),

  // Flag States
  getFlagState: (token: string, projectId: string, flagKey: string, envId: string) =>
    request<any>(`/v1/projects/${projectId}/flags/${flagKey}/environments/${envId}`, { token }),
  updateFlagState: (token: string, projectId: string, flagKey: string, envId: string, data: any) =>
    request(`/v1/projects/${projectId}/flags/${flagKey}/environments/${envId}`, { method: "PUT", body: data, token }),

  // Projects
  deleteProject: (token: string, id: string) =>
    request(`/v1/projects/${id}`, { method: "DELETE", token }),

  // Environments
  deleteEnvironment: (token: string, projectId: string, envId: string) =>
    request(`/v1/projects/${projectId}/environments/${envId}`, { method: "DELETE", token }),

  // Segments
  listSegments: (token: string, projectId: string) =>
    request<any[]>(`/v1/projects/${projectId}/segments`, { token }),
  getSegment: (token: string, projectId: string, segKey: string) =>
    request<any>(`/v1/projects/${projectId}/segments/${segKey}`, { token }),
  createSegment: (token: string, projectId: string, data: any) =>
    request(`/v1/projects/${projectId}/segments`, { method: "POST", body: data, token }),
  updateSegment: (token: string, projectId: string, segKey: string, data: any) =>
    request(`/v1/projects/${projectId}/segments/${segKey}`, { method: "PUT", body: data, token }),
  deleteSegment: (token: string, projectId: string, segKey: string) =>
    request(`/v1/projects/${projectId}/segments/${segKey}`, { method: "DELETE", token }),

  // API Keys
  listAPIKeys: (token: string, envId: string) =>
    request<any[]>(`/v1/environments/${envId}/api-keys`, { token }),
  createAPIKey: (token: string, envId: string, data: { name: string; type: string }) =>
    request(`/v1/environments/${envId}/api-keys`, { method: "POST", body: data, token }),
  revokeAPIKey: (token: string, keyId: string) =>
    request(`/v1/api-keys/${keyId}`, { method: "DELETE", token }),

  // Audit
  listAudit: (token: string, limit?: number, offset?: number) =>
    request<any[]>(`/v1/audit?limit=${limit || 50}&offset=${offset || 0}`, { token }),

  // Team / Members
  listMembers: (token: string) =>
    request<any[]>("/v1/members", { token }),
  inviteMember: (token: string, data: { email: string; role: string }) =>
    request("/v1/members/invite", { method: "POST", body: data, token }),
  updateMemberRole: (token: string, memberId: string, role: string) =>
    request(`/v1/members/${memberId}`, { method: "PUT", body: { role }, token }),
  removeMember: (token: string, memberId: string) =>
    request(`/v1/members/${memberId}`, { method: "DELETE", token }),
  getMemberPermissions: (token: string, memberId: string) =>
    request<any[]>(`/v1/members/${memberId}/permissions`, { token }),
  updateMemberPermissions: (token: string, memberId: string, permissions: any[]) =>
    request(`/v1/members/${memberId}/permissions`, { method: "PUT", body: { permissions }, token }),

  // Approvals
  listApprovals: (token: string, status?: string) =>
    request<any[]>(`/v1/approvals${status ? `?status=${status}` : ""}`, { token }),
  getApproval: (token: string, id: string) =>
    request<any>(`/v1/approvals/${id}`, { token }),
  createApproval: (token: string, data: { flag_id: string; env_id: string; change_type: string; payload: any }) =>
    request("/v1/approvals", { method: "POST", body: data, token }),
  reviewApproval: (token: string, id: string, action: "approve" | "reject", note?: string) =>
    request(`/v1/approvals/${id}/review`, { method: "POST", body: { action, note: note || "" }, token }),

  // Kill Switch
  killFlag: (token: string, projectId: string, flagKey: string, envId: string) =>
    request(`/v1/projects/${projectId}/flags/${flagKey}/kill`, {
      method: "POST",
      body: { env_id: envId },
      token,
    }),

  // Flag Promotion
  promoteFlag: (token: string, projectId: string, flagKey: string, sourceEnvId: string, targetEnvId: string) =>
    request(`/v1/projects/${projectId}/flags/${flagKey}/promote`, {
      method: "POST",
      body: { source_env_id: sourceEnvId, target_env_id: targetEnvId },
      token,
    }),

  // Evaluation Metrics
  getEvalMetrics: (token: string) =>
    request<{ total_evaluations: number; window_start: string; counters: { flag_key: string; env_id: string; reason: string; count: number }[] }>(
      "/v1/metrics/evaluations",
      { token },
    ),
  resetEvalMetrics: (token: string) =>
    request("/v1/metrics/evaluations/reset", { method: "POST", token }),

  // Webhooks
  listWebhooks: (token: string) =>
    request<any[]>("/v1/webhooks", { token }),
  createWebhook: (token: string, data: { name: string; url: string; secret?: string; events: string[] }) =>
    request("/v1/webhooks", { method: "POST", body: data, token }),
  updateWebhook: (token: string, webhookId: string, data: any) =>
    request(`/v1/webhooks/${webhookId}`, { method: "PUT", body: data, token }),
  deleteWebhook: (token: string, webhookId: string) =>
    request(`/v1/webhooks/${webhookId}`, { method: "DELETE", token }),
  listWebhookDeliveries: (token: string, webhookId: string) =>
    request<any[]>(`/v1/webhooks/${webhookId}/deliveries`, { token }),

  // Billing
  createCheckout: (token: string) =>
    request<{
      payu_url: string;
      key: string;
      txnid: string;
      hash: string;
      amount: string;
      productinfo: string;
      firstname: string;
      email: string;
      phone: string;
      surl: string;
      furl: string;
    }>("/v1/billing/checkout", { method: "POST", token }),
  getSubscription: (token: string) =>
    request<any>("/v1/billing/subscription", { token }),
  getUsage: (token: string) =>
    request<any>("/v1/billing/usage", { token }),

  // Onboarding
  getOnboarding: (token: string) =>
    request<any>("/v1/onboarding", { token }),
  updateOnboarding: (token: string, data: Record<string, boolean>) =>
    request("/v1/onboarding", { method: "PATCH", body: data, token }),

  // Demo
  createDemoSession: () =>
    request<{
      user: any;
      organization: any;
      tokens: { access_token: string; refresh_token: string; expires_at: number };
      demo_expires_at: number;
    }>("/v1/demo/session", { method: "POST" }),
  convertDemo: (token: string, data: { email: string; password: string; name: string; org_name: string; phone?: string }) =>
    request<{ tokens: { access_token: string; refresh_token: string; expires_at: number }; message: string }>(
      "/v1/demo/convert",
      { method: "POST", body: data, token },
    ),
  submitDemoFeedback: (token: string, data: { message: string; email?: string; rating?: number }) =>
    request("/v1/demo/feedback", { method: "POST", body: data, token }),
};
