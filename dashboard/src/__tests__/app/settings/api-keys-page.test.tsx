import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useAppStore } from "@/stores/app-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/settings/api-keys",
}));

vi.mock("@/lib/api", () => ({
  api: {
    listAPIKeys: vi.fn(),
    createAPIKey: vi.fn(),
    revokeAPIKey: vi.fn(),
    listEnvironments: vi.fn(),
  },
}));

vi.mock("@/components/toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    options,
    placeholder,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
  }) => (
    <select
      data-testid="mock-select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options?.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

import { api } from "@/lib/api";
import APIKeysPage from "@/app/(app)/settings/api-keys/page";

const mockApi = api as {
  listAPIKeys: ReturnType<typeof vi.fn>;
  createAPIKey: ReturnType<typeof vi.fn>;
  revokeAPIKey: ReturnType<typeof vi.fn>;
  listEnvironments: ReturnType<typeof vi.fn>;
};

const mockKeys = [
  {
    id: "k1",
    name: "Server Key",
    type: "server",
    key: "fs_srv_xxx",
    key_prefix: "fs_srv",
    created_at: "2025-01-01T00:00:00Z",
  },
];

describe("APIKeysPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().setAuth(
      "test-token",
      "test-refresh",
      { id: "u1", name: "Test", email: "test@test.com", role: "admin", email_verified: true },
      { id: "org-1", name: "Test Org", plan: "pro" },
      9999999999,
    );
    useAppStore.getState().setCurrentProject("proj-1");
    useAppStore.getState().setCurrentEnv("env-1");

    mockApi.listEnvironments.mockResolvedValue([
      { id: "env-1", name: "Production" },
      { id: "env-2", name: "Staging" },
    ]);
    mockApi.listAPIKeys.mockResolvedValue(mockKeys);
    mockApi.createAPIKey.mockResolvedValue({ key: "fs_srv_new_secret_key" });
    mockApi.revokeAPIKey.mockResolvedValue({});
  });

  afterEach(() => {
    useAppStore.getState().logout();
  });

  it("shows loading state", () => {
    // Arrange
    mockApi.listEnvironments.mockReturnValue(new Promise(() => {}));
    mockApi.listAPIKeys.mockReturnValue(new Promise(() => {}));

    // Act
    render(<APIKeysPage />);

    // Assert
    expect(screen.getByText("Create Key")).toBeInTheDocument();
    expect(mockApi.listAPIKeys).toHaveBeenCalled();
  });

  it("lists API keys with names and type", async () => {
    // Arrange & Act
    render(<APIKeysPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Server Key")).toBeInTheDocument();
      expect(screen.getByText(/fs_srv/)).toBeInTheDocument();
      expect(screen.getByText(/server/)).toBeInTheDocument();
    });
  });

  it("create key button renders", async () => {
    // Arrange & Act
    render(<APIKeysPage />);

    // Assert
    expect(screen.getByText("Create Key")).toBeInTheDocument();
  });

  it("create form submits with name and type", async () => {
    // Arrange
    render(<APIKeysPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Key name")).toBeInTheDocument();
    });

    // Act
    fireEvent.change(screen.getByPlaceholderText("Key name"), {
      target: { value: "Test Key" },
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Create Key"));
    });

    // Assert
    expect(mockApi.createAPIKey).toHaveBeenCalledWith("test-token", "env-1", {
      name: "Test Key",
      type: "server",
    });
  });

  it("revoke key with confirmation", async () => {
    // Arrange
    render(<APIKeysPage />);
    await waitFor(() => {
      expect(screen.getByText("Server Key")).toBeInTheDocument();
    });

    // Act — click revoke to show confirmation
    fireEvent.click(screen.getByText("Revoke"));

    // Assert — cancel option appears
    expect(screen.getByText("Cancel")).toBeInTheDocument();

    // Act — confirm revoke
    await act(async () => {
      fireEvent.click(screen.getByText("Revoke"));
    });

    // Assert
    expect(mockApi.revokeAPIKey).toHaveBeenCalledWith("test-token", "k1");
  });

  it("empty state when no keys", async () => {
    // Arrange
    mockApi.listAPIKeys.mockResolvedValue([]);

    // Act
    render(<APIKeysPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("No API keys for this environment")).toBeInTheDocument();
    });
  });
});
