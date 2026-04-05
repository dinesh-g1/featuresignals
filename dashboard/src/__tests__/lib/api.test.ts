import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useAppStore } from "@/stores/app-store";
import { api, APIError } from "@/lib/api";

const API_URL = "http://localhost:8080";

function jsonResponse(status: number, body: any): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: new Headers(),
    redirected: false,
    statusText: "",
    type: "basic",
    url: "",
    clone: () => jsonResponse(status, body),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("api.ts request interceptor", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalLocation: PropertyDescriptor | undefined;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    useAppStore.getState().logout();

    originalLocation = Object.getOwnPropertyDescriptor(window, "location");
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalLocation) {
      Object.defineProperty(window, "location", originalLocation);
    }
  });

  it("makes a successful request with authorization header", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: [1, 2, 3] }));

    const result = await api.listProjects("my-token");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_URL}/v1/projects`);
    expect((opts.headers as Record<string, string>)["Authorization"]).toBe("Bearer my-token");
    expect(result).toEqual([1, 2, 3]);
  });

  it("throws APIError for non-2xx non-401 responses", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: "bad request" }));

    try {
      await api.listProjects("tok");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(APIError);
      expect((err as APIError).status).toBe(400);
      expect((err as APIError).message).toBe("bad request");
    }
  });

  it("on 401 token_expired: refreshes token and retries original request", async () => {
    useAppStore.getState().setAuth("old-token", "valid-refresh", { id: "u1" }, { id: "o1" }, 1000);

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: "token_expired" }))
      .mockResolvedValueOnce(jsonResponse(200, { tokens: { access_token: "new-token", refresh_token: "new-refresh", expires_at: 9999 } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: ["project-1"] }));

    const result = await api.listProjects("old-token");

    expect(fetchMock).toHaveBeenCalledTimes(3);

    const refreshCall = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(refreshCall[0]).toBe(`${API_URL}/v1/auth/refresh`);
    expect(JSON.parse(refreshCall[1].body as string)).toEqual({ refresh_token: "valid-refresh" });

    const retryCall = fetchMock.mock.calls[2] as [string, RequestInit];
    expect((retryCall[1].headers as Record<string, string>)["Authorization"]).toBe("Bearer new-token");

    expect(result).toEqual(["project-1"]);
    expect(useAppStore.getState().token).toBe("new-token");
    expect(useAppStore.getState().refreshToken).toBe("new-refresh");
    expect(useAppStore.getState().expiresAt).toBe(9999);
  });

  it("on 401 token_expired with failed refresh: logs out and redirects", async () => {
    useAppStore.getState().setAuth("old-token", "bad-refresh", { id: "u1" }, undefined, 1000);

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: "token_expired" }))
      .mockResolvedValueOnce(jsonResponse(401, { error: "invalid refresh token" }));

    try {
      await api.listProjects("old-token");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(APIError);
      expect((err as APIError).status).toBe(401);
    }

    expect(useAppStore.getState().token).toBeNull();
    expect(useAppStore.getState().refreshToken).toBeNull();
    expect(window.location.href).toBe("/login?session_expired=true");
  });

  it("on 401 token_expired without refresh token: logs out immediately", async () => {
    useAppStore.setState({ token: "old-token", refreshToken: null, user: { id: "u1" } });

    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: "token_expired" }));

    try {
      await api.listProjects("old-token");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(APIError);
    }

    expect(useAppStore.getState().token).toBeNull();
    expect(window.location.href).toBe("/login?session_expired=true");
  });

  it("on 401 with non-expired error (tampered token): logs out without refresh attempt", async () => {
    useAppStore.getState().setAuth("bad-token", "valid-refresh", { id: "u1" });

    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: "invalid or expired token" }));

    try {
      await api.listProjects("bad-token");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(APIError);
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().token).toBeNull();
    expect(window.location.href).toBe("/login?session_expired=true");
  });

  it("does not retry a request that has already been retried (_retry flag)", async () => {
    useAppStore.getState().setAuth("tok", "ref", { id: "u1" });

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: "token_expired" }))
      .mockResolvedValueOnce(jsonResponse(200, { tokens: { access_token: "new-tok", refresh_token: "new-ref", expires_at: 9999 } }))
      .mockResolvedValueOnce(jsonResponse(401, { error: "token_expired" }));

    try {
      await api.listProjects("tok");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(APIError);
    }

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("concurrent 401s share a single refresh (mutex)", async () => {
    useAppStore.getState().setAuth("old-token", "valid-refresh", { id: "u1" }, undefined, 1000);

    let callCount = 0;
    fetchMock.mockImplementation(async (url: string) => {
      callCount++;
      if ((url as string).includes("/v1/auth/refresh")) {
        return jsonResponse(200, { tokens: { access_token: "new-token", refresh_token: "new-refresh", expires_at: 9999 } });
      }
      if (callCount <= 3) {
        return jsonResponse(401, { error: "token_expired" });
      }
      return jsonResponse(200, { data: "ok" });
    });

    const results = await Promise.all([
      api.listProjects("old-token"),
      api.listProjects("old-token"),
      api.listProjects("old-token"),
    ]);

    const refreshCalls = fetchMock.mock.calls.filter(
      (c: any[]) => (c[0] as string).includes("/v1/auth/refresh"),
    );
    expect(refreshCalls.length).toBe(1);

    results.forEach((r) => expect(r).toEqual([]));
  });

  it("on 403 account_deleted: redirects to /register", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: "account_deleted" }));

    try {
      await api.listProjects("tok");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(APIError);
      expect((err as APIError).status).toBe(403);
    }

    expect(window.location.href).toBe("/register");
  });

  it("handles 204 No Content responses", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(204, undefined));

    const result = await api.deleteProject("tok", "proj-1");
    expect(result).toBeUndefined();
  });

  it("does not attempt refresh for unauthenticated requests (no token)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: "token_expired" }));

    try {
      await api.getPricing();
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(APIError);
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("preserves user and organization in store after refresh", async () => {
    useAppStore.getState().setAuth("old-tok", "old-ref", { id: "u1", name: "User" }, { id: "o1", name: "Org" }, 1000);

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: "token_expired" }))
      .mockResolvedValueOnce(jsonResponse(200, { tokens: { access_token: "new-tok", refresh_token: "new-ref", expires_at: 9999 } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [] }));

    await api.listProjects("old-tok");

    const state = useAppStore.getState();
    expect(state.user).toEqual({ id: "u1", name: "User" });
    expect(state.organization).toEqual({ id: "o1", name: "Org" });
  });
});
