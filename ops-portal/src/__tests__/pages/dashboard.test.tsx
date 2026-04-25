import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardPage from '@/app/dashboard/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock api.ts
vi.mock('@/lib/api', () => ({
  getDashboardStats: vi.fn(),
  getMRR: vi.fn(),
  getCellHealth: vi.fn(),
}));

import { getDashboardStats, getMRR, getCellHealth } from '@/lib/api';

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stat cards with correct values', async () => {
    (getDashboardStats as any).mockResolvedValueOnce({
      active_tenants: 42,
      active_tenants_delta: 3,
      mrr: 1847,
      mrr_currency: 'USD',
      mrr_delta_percent: 2.5,
      total_cells: 3,
      healthy_cells: 3,
      last_updated: new Date().toISOString(),
    });
    (getMRR as any).mockResolvedValueOnce({ total_mrr: 1847, avg_revenue: 44, churn_rate: 2.4 });
    (getCellHealth as any).mockResolvedValueOnce({
      cells: [],
      summary: { healthy: 3, degraded: 0, down: 0, empty: 0, draining: 0, total: 3 },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/42/)).toBeDefined();
    });
    // Delta value for active tenants should be rendered
    expect(screen.getByText(/3/)).toBeDefined();
  });

  it('shows MRR value', async () => {
    (getDashboardStats as any).mockResolvedValueOnce({
      active_tenants: 9,
      active_tenants_delta: 1,
      mrr: 1847,
      mrr_currency: 'USD',
      mrr_delta_percent: 0,
      total_cells: 1,
      healthy_cells: 1,
      last_updated: new Date().toISOString(),
    });
    (getMRR as any).mockResolvedValueOnce({ total_mrr: 1847, avg_revenue: 44, churn_rate: 2.4 });
    (getCellHealth as any).mockResolvedValueOnce({
      cells: [],
      summary: { healthy: 1, degraded: 0, down: 0, empty: 0, draining: 0, total: 1 },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/1,847/)).toBeDefined();
    });
  });

  it('shows skeletons while loading', () => {
    (getDashboardStats as any).mockImplementationOnce(() => new Promise(() => {}));
    (getMRR as any).mockImplementationOnce(() => new Promise(() => {}));
    (getCellHealth as any).mockImplementationOnce(() => new Promise(() => {}));

    render(<DashboardPage />);

    // Skeleton cards should be present
    const skeletons = document.querySelectorAll('[class*="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error state on API failure', async () => {
    (getDashboardStats as any).mockRejectedValueOnce(new Error('API error'));
    (getMRR as any).mockRejectedValueOnce(new Error('API error'));
    (getCellHealth as any).mockRejectedValueOnce(new Error('API error'));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/retry/i)).toBeDefined();
    });
  });

  it('displays partial data when some APIs fail', async () => {
    (getDashboardStats as any).mockResolvedValueOnce({
      active_tenants: 42,
      active_tenants_delta: 3,
      mrr: 1847,
      mrr_currency: 'USD',
      mrr_delta_percent: 0,
      total_cells: 3,
      healthy_cells: 3,
      last_updated: new Date().toISOString(),
    });
    (getMRR as any).mockRejectedValueOnce(new Error('Billing down'));
    (getCellHealth as any).mockResolvedValueOnce({
      cells: [],
      summary: { healthy: 3, degraded: 0, down: 0, empty: 0, draining: 0, total: 3 },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/42/)).toBeDefined();
    });
    // Should show partial data indicator
    expect(screen.getByText(/tenants/i)).toBeDefined();
  });

  it('shows retry button on complete failure', async () => {
    (getDashboardStats as any).mockRejectedValueOnce(new Error('Network error'));
    (getMRR as any).mockRejectedValueOnce(new Error('Network error'));
    (getCellHealth as any).mockRejectedValueOnce(new Error('Network error'));

    render(<DashboardPage />);

    await waitFor(() => {
      const retryButtons = screen.getAllByText(/retry/i);
      expect(retryButtons.length).toBeGreaterThan(0);
    });
  });
});
