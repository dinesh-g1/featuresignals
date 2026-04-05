import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { api } from "@/lib/api";

let mockSearchParams = new URLSearchParams("token=test-exchange-token");
const mockReplace = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { exchangeToken: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  useParams: () => ({}),
}));

import TokenExchangePage from "@/app/auth/exchange/page";

describe("TokenExchangePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams("token=test-exchange-token");
  });

  it("shows loading spinner initially", () => {
    vi.mocked(api.exchangeToken).mockReturnValue(new Promise(() => {}));

    render(<TokenExchangePage />);

    expect(screen.getByText("Setting up your account...")).toBeInTheDocument();
  });

  it("shows error when token param missing", () => {
    mockSearchParams = new URLSearchParams();

    render(<TokenExchangePage />);

    expect(screen.getByText("Missing token parameter")).toBeInTheDocument();
    expect(screen.getByText("Authentication Failed")).toBeInTheDocument();
  });

  it("calls api.exchangeToken with token param on mount", () => {
    vi.mocked(api.exchangeToken).mockReturnValue(new Promise(() => {}));

    render(<TokenExchangePage />);

    expect(api.exchangeToken).toHaveBeenCalledWith("test-exchange-token");
  });

  it("shows error UI on exchange failure", async () => {
    vi.mocked(api.exchangeToken).mockRejectedValue(new Error("Token expired"));

    render(<TokenExchangePage />);

    await waitFor(() => {
      expect(screen.getByText("Authentication Failed")).toBeInTheDocument();
    });
    expect(screen.getByText("Token expired")).toBeInTheDocument();
  });
});
