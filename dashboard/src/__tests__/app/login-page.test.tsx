import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/lib/api", () => ({
  api: {
    login: vi.fn(),
    listRegions: vi.fn().mockResolvedValue({ regions: [] }),
  },
  APIError: class APIError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("@/stores/app-store", () => ({
  useAppStore: vi.fn((selector: any) => {
    const state = {
      setAuth: vi.fn(),
      token: null,
      refreshToken: null,
      expiresAt: null,
      user: null,
      organization: null,
    };
    return selector(state);
  }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSearchParams = new URLSearchParams();
  });

  it("shows session expired banner when session_expired=true", async () => {
    mockSearchParams = new URLSearchParams("session_expired=true");

    const { default: LoginPage } = await import("@/app/login/page");
    render(<LoginPage />);

    expect(screen.getByText("Your session has expired. Please sign in again.")).toBeInTheDocument();
  });

  it("does not show session expired banner normally", async () => {
    mockSearchParams = new URLSearchParams("");

    const { default: LoginPage } = await import("@/app/login/page");
    render(<LoginPage />);

    expect(screen.queryByText("Your session has expired. Please sign in again.")).not.toBeInTheDocument();
  });

  it("renders login form with email and password fields", async () => {
    const { default: LoginPage } = await import("@/app/login/page");
    render(<LoginPage />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByText("Sign in")).toBeInTheDocument();
  });

  it("renders sign up link", async () => {
    const { default: LoginPage } = await import("@/app/login/page");
    render(<LoginPage />);

    expect(screen.getByText("Sign up")).toBeInTheDocument();
  });
});
