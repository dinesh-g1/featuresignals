import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '@/app/login/page';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock api.ts
vi.mock('@/lib/api', () => ({
  login: vi.fn(),
}));

import { login } from '@/lib/api';

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password fields', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeDefined();
    expect(screen.getByLabelText(/password/i)).toBeDefined();
  });

  it('renders sign in button', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDefined();
  });

  it('shows error on empty form submission', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText(/please enter your credentials/i)).toBeDefined();
  });

  it('shows error on invalid credentials', async () => {
    const user = userEvent.setup();
    (login as any).mockRejectedValueOnce(new Error('Invalid credentials'));

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeDefined();
    });
  });

  it('redirects to dashboard on success', async () => {
    const user = userEvent.setup();
    (login as any).mockResolvedValueOnce({ token: 'test-token' });

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'admin@featuresignals.com');
    await user.type(screen.getByLabelText(/password/i), 'correct-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    (login as any).mockImplementationOnce(() => new Promise(() => {})); // never resolves

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'admin@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDefined();
  });

  it('disables inputs during loading', async () => {
    const user = userEvent.setup();
    (login as any).mockImplementationOnce(() => new Promise(() => {}));

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'admin@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByLabelText(/email/i)).toBeDisabled();
    expect(screen.getByLabelText(/password/i)).toBeDisabled();
  });

  it('is accessible — has proper labels and roles', () => {
    render(<LoginPage />);
    expect(screen.getByRole('form')).toBeDefined();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
  });
});
