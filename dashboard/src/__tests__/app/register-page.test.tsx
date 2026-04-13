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

  it("shows password strength indicators when password is entered", () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/^Password/), {
      target: { value: "Test1!" },
    });

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

  it("'Wrong email? Go back' button returns to form step", async () => {
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

    fireEvent.click(screen.getByText(/Wrong email\? Go back/i));

    expect(screen.getByText("Create your account")).toBeInTheDocument();
  });

  it("preserves form data when going back from OTP step", async () => {
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

    fireEvent.click(screen.getByText(/Wrong email\? Go back/i));

    const emailInput = screen.getByLabelText(/^Email/) as HTMLInputElement;
    expect(emailInput.value).toBe("test@example.com");
    const nameInput = screen.getByLabelText(/^Name/) as HTMLInputElement;
    expect(nameInput.value).toBe("Test User");
  });

  it("shows OTP step with email address displayed", async () => {
    vi.mocked(api.initiateSignup).mockResolvedValue({
      message: "OK",
      expires_in: 300,
    });
    render(<RegisterPage />);

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });
  });

  it("shows Verify button disabled when OTP is empty", async () => {
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

    // Verify button should be disabled when OTP is empty
    expect(screen.getByRole("button", { name: /Verify/i })).toBeDisabled();
  });

  it("shows resend cooldown text after OTP step", async () => {
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

    // Should show countdown text
    expect(screen.getByText(/Resend code in/)).toBeInTheDocument();
    // Resend button should NOT be visible yet
    expect(
      screen.queryByRole("button", { name: /Resend/ }),
    ).not.toBeInTheDocument();
  });

  it("shows inline email validation error for invalid email", () => {
    render(<RegisterPage />);

    const emailInput = screen.getByLabelText(/^Email/);
    fireEvent.change(emailInput, { target: { value: "not-an-email" } });
    // Blur the field to trigger inline validation (touched state)
    fireEvent.blur(emailInput);

    expect(
      screen.getByText("Please enter a valid email address"),
    ).toBeInTheDocument();
  });

  it("disables continue button when email is invalid", () => {
    render(<RegisterPage />);

    fillForm({ dataRegion: "India" });

    const emailInput = screen.getByLabelText(/^Email/);
    fireEvent.change(emailInput, { target: { value: "bad-email" } });
    // Blur to trigger touched state and inline validation
    fireEvent.blur(emailInput);

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("shows region selection error inline when no region selected", () => {
    render(<RegisterPage />);

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

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("Please select a data region")).toBeInTheDocument();
  });

  it("shows region unavailable error when API fails", async () => {
    vi.mocked(api.listRegions).mockRejectedValue(new Error("Network error"));
    render(<RegisterPage />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "This region is temporarily unavailable. Please select another.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("hides password strength when password is empty", () => {
    render(<RegisterPage />);

    const password = screen.getByLabelText(/^Password/) as HTMLInputElement;
    expect(password.value).toBe("");
    expect(screen.queryByText("8+ characters")).not.toBeInTheDocument();
  });

  it("shows password strength inline as user types", () => {
    render(<RegisterPage />);

    const passwordInput = screen.getByLabelText(/^Password/);
    fireEvent.change(passwordInput, { target: { value: "weak" } });

    expect(screen.getByText("8+ characters")).toBeInTheDocument();
    expect(screen.getByText("1 lowercase letter")).toBeInTheDocument();
  });
});
