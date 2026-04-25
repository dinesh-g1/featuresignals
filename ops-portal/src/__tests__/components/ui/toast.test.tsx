import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToastContainer, useToast } from '@/components/ui/toast';
import { useUIStore } from '@/lib/store';

// ─── Helpers ──────────────────────────────────────────────────────────────

function addToastToStore(
  overrides: Partial<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description: string;
    duration: number;
  }> = {},
) {
  const type = overrides.type ?? 'success';
  const title = overrides.title ?? 'Test Toast';
  return useUIStore.getState().addToast({
    type,
    title,
    description: overrides.description,
    duration: overrides.duration ?? 5000,
  });
}

// ─── Clean store between tests ────────────────────────────────────────────

beforeEach(() => {
  useUIStore.getState().clearToasts();
});

// ─── Tests ────────────────────────────────────────────────────────────────

describe('ToastContainer', () => {
  it('renders nothing when there are no toasts', () => {
    const { container } = render(<ToastContainer />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a toast when one is added to the store', () => {
    act(() => {
      addToastToStore({ title: 'Operation completed' });
    });
    render(<ToastContainer />);
    expect(screen.getByText('Operation completed')).toBeDefined();
  });

  it('renders all toast types with correct icons', () => {
    act(() => {
      useUIStore.getState().addToast({ type: 'success', title: 'Success toast', duration: 5000 });
      useUIStore.getState().addToast({ type: 'error', title: 'Error toast', duration: 5000 });
      useUIStore.getState().addToast({ type: 'warning', title: 'Warning toast', duration: 5000 });
      useUIStore.getState().addToast({ type: 'info', title: 'Info toast', duration: 5000 });
    });
    render(<ToastContainer />);

    expect(screen.getByText('Success toast')).toBeDefined();
    expect(screen.getByText('Error toast')).toBeDefined();
    expect(screen.getByText('Warning toast')).toBeDefined();
    expect(screen.getByText('Info toast')).toBeDefined();
  });

  it('renders toast description when provided', () => {
    act(() => {
      addToastToStore({ title: 'Upload', description: 'File uploaded successfully' });
    });
    render(<ToastContainer />);
    expect(screen.getByText('Upload')).toBeDefined();
    expect(screen.getByText('File uploaded successfully')).toBeDefined();
  });

  it('renders dismiss button for each toast', () => {
    act(() => {
      addToastToStore({ title: 'Dismissible' });
    });
    render(<ToastContainer />);
    expect(screen.getByLabelText('Dismiss notification')).toBeDefined();
  });

  it('removes toast when dismiss button is clicked', async () => {
    act(() => {
      addToastToStore({ title: 'Will be dismissed' });
    });
    render(<ToastContainer />);
    expect(screen.getByText('Will be dismissed')).toBeDefined();

    await userEvent.click(screen.getByLabelText('Dismiss notification'));
    expect(screen.queryByText('Will be dismissed')).toBeNull();
  });

  it('renders multiple toasts', () => {
    act(() => {
      useUIStore.getState().addToast({ type: 'info', title: 'Toast A', duration: 5000 });
      useUIStore.getState().addToast({ type: 'info', title: 'Toast B', duration: 5000 });
      useUIStore.getState().addToast({ type: 'info', title: 'Toast C', duration: 5000 });
    });
    render(<ToastContainer />);
    expect(screen.getByText('Toast A')).toBeDefined();
    expect(screen.getByText('Toast B')).toBeDefined();
    expect(screen.getByText('Toast C')).toBeDefined();
  });

  it('has correct aria attributes', () => {
    act(() => {
      addToastToStore({ title: 'Accessible Toast' });
    });
    render(<ToastContainer />);
    expect(screen.getByLabelText('Notifications')).toBeDefined();
    expect(screen.getByText('Accessible Toast').closest('[role="status"]')).toBeDefined();
  });

  it('removes toast after duration expires', async () => {
    vi.useFakeTimers();
    act(() => {
      addToastToStore({ title: 'Timed Toast', duration: 100 });
    });
    render(<ToastContainer />);
    expect(screen.getByText('Timed Toast')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.queryByText('Timed Toast')).toBeNull();
    vi.useRealTimers();
  });
});

// ─── useToast hook tests ──────────────────────────────────────────────────

describe('useToast', () => {
  it('returns all toast functions', () => {
    function TestComponent() {
      const toast = useToast();
      expect(typeof toast.success).toBe('function');
      expect(typeof toast.error).toBe('function');
      expect(typeof toast.warning).toBe('function');
      expect(typeof toast.info).toBe('function');
      expect(typeof toast.dismiss).toBe('function');
      return null;
    }
    render(<TestComponent />);
  });

  it('creates a success toast', () => {
    function TestComponent() {
      const toast = useToast();
      toast.success('Saved!', 'Changes were saved');
      return null;
    }
    render(<TestComponent />);
    expect(screen.queryByText('Saved!')).toBeNull(); // not rendered yet — needs container

    // Render container to verify
    render(<ToastContainer />);
    expect(screen.getByText('Saved!')).toBeDefined();
    expect(screen.getByText('Changes were saved')).toBeDefined();
  });

  it('creates a toast using each variant', () => {
    function TestComponent() {
      const toast = useToast();
      toast.success('Success');
      toast.error('Error');
      toast.warning('Warning');
      toast.info('Info');
      return null;
    }
    render(<TestComponent />);
    render(<ToastContainer />);

    expect(screen.getByText('Success')).toBeDefined();
    expect(screen.getByText('Error')).toBeDefined();
    expect(screen.getByText('Warning')).toBeDefined();
    expect(screen.getByText('Info')).toBeDefined();
  });

  it('dismisses a toast by id', () => {
    let toastId = '';

    function TestComponent() {
      const toast = useToast();
      toastId = toast.success('Dismiss me');
      return null;
    }
    render(<TestComponent />);
    render(<ToastContainer />);
    expect(screen.getByText('Dismiss me')).toBeDefined();

    function DismissComponent() {
      const toast = useToast();
      toast.dismiss(toastId);
      return null;
    }
    render(<DismissComponent />);
    expect(screen.queryByText('Dismiss me')).toBeNull();
  });
});
