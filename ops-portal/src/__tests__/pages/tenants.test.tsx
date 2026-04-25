import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TenantsPage from '@/app/tenants/page';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/tenants',
}));

// Mock api.ts
vi.mock('@/lib/api', () => ({
  listTenants: vi.fn(),
  provisionTenant: vi.fn(),
}));

import { listTenants, provisionTenant } from '@/lib/api';

describe('Tenants Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', async () => {
    (listTenants as any).mockResolvedValueOnce({ tenants: [], total: 0 });

    render(<TenantsPage />);

    await waitFor(() => {
      expect(screen.getByText(/tenants/i)).toBeDefined();
    });
  });

  it('lists tenants with correct data', async () => {
    (listTenants as any).mockResolvedValueOnce({
      tenants: [
        { id: '1', name: 'Acme Corp', slug: 'acme-corp', tier: 'pro', status: 'active', created_at: '2026-01-15T00:00:00Z' },
        { id: '2', name: 'Globex Inc', slug: 'globex', tier: 'free', status: 'suspended', created_at: '2026-03-01T00:00:00Z' },
      ],
      total: 2,
    });

    render(<TenantsPage />);

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeDefined();
      expect(screen.getByText('Globex Inc')).toBeDefined();
    });
  });

  it('searches by name', async () => {
    const user = userEvent.setup();
    (listTenants as any).mockResolvedValueOnce({ tenants: [], total: 0 });
    (listTenants as any).mockResolvedValueOnce({
      tenants: [{ id: '1', name: 'Acme Corp', slug: 'acme-corp', tier: 'pro', status: 'active', created_at: '2026-01-15T00:00:00Z' }],
      total: 1,
    });

    render(<TenantsPage />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'Acme');

    await waitFor(() => {
      expect(listTenants).toHaveBeenCalledWith(expect.objectContaining({ search: 'Acme' }));
    });
  });

  it('filters by tier', async () => {
    const user = userEvent.setup();
    (listTenants as any).mockResolvedValueOnce({ tenants: [], total: 0 });

    render(<TenantsPage />);

    const tierSelect = screen.getByLabelText(/tier/i);
    if (tierSelect) {
      await user.selectOptions(tierSelect, 'pro');
      await waitFor(() => {
        expect(listTenants).toHaveBeenCalledWith(expect.objectContaining({ tier: 'pro' }));
      });
    }
  });

  it('paginates correctly', async () => {
    const tenants = Array.from({ length: 25 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Tenant ${i + 1}`,
      slug: `tenant-${i + 1}`,
      tier: 'free',
      status: 'active',
      created_at: '2026-01-15T00:00:00Z',
    }));
    (listTenants as any).mockResolvedValueOnce({ tenants, total: 100 });

    render(<TenantsPage />);

    await waitFor(() => {
      expect(screen.getByText(/showing/i)).toBeDefined();
    });
  });

  it('shows empty state when no tenants exist', async () => {
    (listTenants as any).mockResolvedValueOnce({ tenants: [], total: 0 });

    render(<TenantsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no tenants/i)).toBeDefined();
    });
  });

  it('shows skeletons while loading', () => {
    (listTenants as any).mockImplementationOnce(() => new Promise(() => {}));

    render(<TenantsPage />);

    const skeletons = document.querySelectorAll('[class*="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error state on API failure', async () => {
    (listTenants as any).mockRejectedValueOnce(new Error('Failed to fetch'));

    render(<TenantsPage />);

    await waitFor(() => {
      expect(screen.getByText(/retry/i)).toBeDefined();
    });
  });

  it('navigates to tenant detail on click', async () => {
    const user = userEvent.setup();
    (listTenants as any).mockResolvedValueOnce({
      tenants: [{ id: 'tenant-1', name: 'Acme Corp', slug: 'acme-corp', tier: 'pro', status: 'active', created_at: '2026-01-15T00:00:00Z' }],
      total: 1,
    });

    render(<TenantsPage />);

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeDefined();
    });

    await user.click(screen.getByText('Acme Corp'));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('tenant-1'));
  });
});
