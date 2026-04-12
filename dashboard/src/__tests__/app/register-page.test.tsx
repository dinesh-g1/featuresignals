import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    initiateSignup: vi.fn(),
    completeSignup: vi.fn(),
    resendSignupOTP: vi.fn(),
    listRegions: vi.fn().mockResolvedValue({
      regions: [
        {
          code: "in",
          name: "India",
          flag: "\u{1F1EE}\u{1F1F3}",
          app_endpoint: "https://app.featuresignals.com",
        },
        {
          code: "us",
          name: "United States",
          flag: "\u{1F1FA}\u{1F1F8}",
          app_endpoint: "https://app.us.featuresignals.com",
        },
        {
          code: "eu",
          name: "Europe",
          flag: "\u{1F1EA}\u{1F1FA}",
          app_endpoint: "https://app.eu.featuresignals.com",
        },
      ],
    }),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
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

import RegisterPage from "@/app/register/page";

function fillForm(opts?: { dataRegion?: string }) {
  fireEvent.change(screen.getByLabelText(/^Name/), {
    target: { value: "Test User" },
  });
  fireEvent.change(screen.getByLabelText(/^Email/), {
    target: { value: "test@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/^Password/), {
    target: { value: "StrongP@ss1" },
  });
  fireEvent.change(screen.getByLabelText(/Organization Name/), {
    target: { value: "Test Org" },
  });
  if (opts?.dataRegion) {
    const radio = screen.getByRole("radio", {
      name: new RegExp(opts.dataRegion, "i"),
    });
    fireEvent.click(radio);
  } else {
    // Default to India if not specified
    const radio = screen.getByRole("radio", { name: /India/i });
    fireEvent.click(radio);
  }
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders signup form with 'Create your account' heading", () => {
    render(<RegisterPage />);

    expect(screen.getByText("Create your account")).toBeInTheDocument();
    expect(screen.getByText("FeatureSignals")).toBeInTheDocument();
  });

  it("shows password strength indicators", () => {
    render(<RegisterPage />);

    expect(screen.getByText("8+ characters")).toBeInTheDocument();
    expect(screen.getByText("1 uppercase letter")).toBeInTheDocument();
    expect(screen.getByText("1 lowercase letter")).toBeInTheDocument();
    expect(screen.getByText("1 number")).toBeInTheDocument();
    expect(screen.getByText("1 special character")).toBeInTheDocument();
  });

  it("continue button disabled when form invalid", () => {
    render(<RegisterPage />);

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("calls api.initiateSignup on form submit", async () => {
    vi.mocked(api.initiateSignup).mockResolvedValue({
      message: "OK",
      expires_in: 300,
    });
    render(<RegisterPage />);

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(api.initiateSignup).toHaveBeenCalledWith({
        name: "Test User",
        email: "test@example.com",
        password: "StrongP@ss1",
        org_name: "Test Org",
        data_region: "in",
      });
    });
  });

  it("transitions to OTP step after successful initiate", async () => {
    vi.mocked(api.initiateSignup).mockResolvedValue({
      message: "OK",
      expires_in: 300,
    });
    render(<RegisterPage />);

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByText("Verify your email")).toBeInTheDocument();
    });
  });

  it("shows error when initiateSignup fails", async () => {
    vi.mocked(api.initiateSignup).mockRejectedValue(
      new Error("Email already exists"),
    );
    render(<RegisterPage />);

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByText("Email already exists")).toBeInTheDocument();
    });
  });

  it("has link to login page", () => {
    render(<RegisterPage />);

    expect(screen.getByText(/Already have an account/)).toBeInTheDocument();
    const link = screen.getByText("Sign in");
    expect(link).toHaveAttribute("href", "/login");
  });

  it("back button on OTP step returns to form", async () => {
    vi.mocked(api.initiateSignup).mockResolvedValue({
      message: "OK",
      expires_in: 300,
    });
    render(<RegisterPage />);

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => {
      expect(screen.getByText("Verify your email")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Back to account details"));

    expect(screen.getByText("Create your account")).toBeInTheDocument();
  });

  it("calls completeSignup with default 'in' region when no region changed", async () => {
    vi.mocked(api.initiateSignup).mockResolvedValue({
      message: "OK",
      expires_in: 300,
    });
    vi.mocked(api.completeSignup).mockResolvedValue({
      tokens: { access_token: "tok", refresh_token: "ref", expires_at: 9999 },
      user: {
        id: "u1",
        name: "Test User",
        email: "test@example.com",
        email_verified: true,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      organization: {
        id: "o1",
        name: "Test Org",
        slug: "test-org",
        plan: "trial",
        data_region: "in",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      onboarding_completed: false,
    });

    render(<RegisterPage />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByText("Verify your email")).toBeInTheDocument();
    });

    const otpInput = screen.getByLabelText("Enter 6-digit verification code");
    fireEvent.change(otpInput, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /Verify/i }));

    await waitFor(() => {
      expect(api.completeSignup).toHaveBeenCalledWith({
        email: "test@example.com",
        otp: "123456",
      });
    });
  });

  it("calls completeSignup without region argument when United States is selected", async () => {
    vi.mocked(api.initiateSignup).mockResolvedValue({
      message: "OK",
      expires_in: 300,
    });
    vi.mocked(api.completeSignup).mockResolvedValue({
      tokens: { access_token: "tok", refresh_token: "ref", expires_at: 9999 },
      user: {
        id: "u1",
        name: "Test User",
        email: "test@example.com",
        email_verified: true,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      organization: {
        id: "o1",
        name: "Test Org",
        slug: "test-org",
        plan: "trial",
        data_region: "us",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      onboarding_completed: false,
    });

    render(<RegisterPage />);
    fillForm({ dataRegion: "United States" });

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByText("Verify your email")).toBeInTheDocument();
    });

    expect(api.initiateSignup).toHaveBeenCalledWith(
      expect.objectContaining({ data_region: "us" }),
    );

    const otpInput = screen.getByLabelText("Enter 6-digit verification code");
    fireEvent.change(otpInput, { target: { value: "654321" } });
    fireEvent.click(screen.getByRole("button", { name: /Verify/i }));

    await waitFor(() => {
      expect(api.completeSignup).toHaveBeenCalledWith({
        email: "test@example.com",
        otp: "654321",
      });
    });
  });
});
