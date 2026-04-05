import { vi } from "vitest";

export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

export const mockSearchParams = new URLSearchParams();

export const mockPathname = "/dashboard";

export function setupNavigationMocks(overrides?: {
  pathname?: string;
  searchParams?: URLSearchParams;
}) {
  vi.mock("next/navigation", () => ({
    useRouter: () => mockRouter,
    useSearchParams: () => overrides?.searchParams ?? mockSearchParams,
    usePathname: () => overrides?.pathname ?? mockPathname,
    useParams: () => ({}),
    redirect: vi.fn(),
  }));
}

export function resetRouterMocks() {
  mockRouter.push.mockReset();
  mockRouter.replace.mockReset();
  mockRouter.back.mockReset();
}
