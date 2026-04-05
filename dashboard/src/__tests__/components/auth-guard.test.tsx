import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
}));

const mockRefresh = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    refresh: (...args: any[]) => mockRefresh(...args),
  },
}));

import { AuthGuard } from "@/components/auth-guard";

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    useAppStore.getState().logout();
    mockRefresh.mockReset();
    mockReplace.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows loading spinner when not hydrated and no token", () => {
    render(
      <AuthGuard>
        <div data-testid="protected">Protected Content</div>
      </AuthGuard>,
    );

    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
  });

  it("renders children when token is present after hydration", async () => {
    useAppStore.getState().setAuth("tok", "ref", { id: "u1", name: "Test", email: "test@test.com", email_verified: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" }, undefined, Math.floor(Date.now() / 1000) + 7200);

    render(
      <AuthGuard>
        <div data-testid="protected">Protected Content</div>
      </AuthGuard>,
    );

    await act(async () => {});

    expect(screen.getByTestId("protected")).toBeInTheDocument();
  });

  it("triggers proactive refresh immediately when token expires within 5 minutes", async () => {
    const almostExpired = Math.floor(Date.now() / 1000) + 120;
    useAppStore.getState().setAuth("tok", "ref", { id: "u1", name: "Test", email: "test@test.com", email_verified: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" }, undefined, almostExpired);

    mockRefresh.mockResolvedValue({
      tokens: { access_token: "new-tok", refresh_token: "new-ref", expires_at: almostExpired + 3600 },
    });

    render(
      <AuthGuard>
        <div>Protected</div>
      </AuthGuard>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(mockRefresh).toHaveBeenCalledWith("ref");
  });

  it("schedules proactive refresh before expiry when token has time remaining", async () => {
    const futureExpiry = Math.floor(Date.now() / 1000) + 600;
    useAppStore.getState().setAuth("tok", "ref", { id: "u1", name: "Test", email: "test@test.com", email_verified: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" }, undefined, futureExpiry);

    mockRefresh.mockResolvedValue({
      tokens: { access_token: "new-tok", refresh_token: "new-ref", expires_at: futureExpiry + 3600 },
    });

    render(
      <AuthGuard>
        <div>Protected</div>
      </AuthGuard>,
    );

    await act(async () => {});

    expect(mockRefresh).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400 * 1000);
    });

    expect(mockRefresh).toHaveBeenCalledWith("ref");
  });

  it("updates store with new tokens after proactive refresh succeeds", async () => {
    const almostExpired = Math.floor(Date.now() / 1000) + 60;
    useAppStore.getState().setAuth("old-tok", "old-ref", { id: "u1", name: "Test", email: "test@test.com", email_verified: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" }, { id: "o1", name: "Test Org", slug: "test-org", plan: "free", created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" }, almostExpired);

    mockRefresh.mockResolvedValue({ access_token: "new-tok", refresh_token: "new-ref", expires_at: 99999 });

    render(
      <AuthGuard>
        <div>Protected</div>
      </AuthGuard>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    const state = useAppStore.getState();
    expect(state.token).toBe("new-tok");
    expect(state.refreshToken).toBe("new-ref");
    expect(state.expiresAt).toBe(99999);
  });

  it("does not set up timer when no expiresAt is stored", async () => {
    useAppStore.getState().setAuth("tok", "ref", { id: "u1", name: "Test", email: "test@test.com", email_verified: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" });

    render(
      <AuthGuard>
        <div>Protected</div>
      </AuthGuard>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    });

    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("redirects to login with session_expired when proactive refresh fails", async () => {
    const almostExpired = Math.floor(Date.now() / 1000) + 60;
    useAppStore.getState().setAuth("tok", "ref", { id: "u1", name: "Test", email: "test@test.com", email_verified: true, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z" }, undefined, almostExpired);

    mockRefresh.mockRejectedValue(new Error("refresh failed"));

    render(
      <AuthGuard>
        <div>Protected</div>
      </AuthGuard>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(useAppStore.getState().token).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith("/login?session_expired=true");
  });
});
