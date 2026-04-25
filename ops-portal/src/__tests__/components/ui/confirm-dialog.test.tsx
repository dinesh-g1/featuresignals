import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmDialog, useConfirmDialog } from '@/components/ui/confirm-dialog';

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        onOpenChange={vi.fn()}
        message="Are you sure?"
        resourceName="test-tenant"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.queryByText('Are you sure?')).toBeNull();
  });

  it('renders title and message when open', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        message="This action will delete the resource."
        resourceName="tenant-42"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText('This action will delete the resource.')).toBeDefined();
  });

  it('renders default title for danger variant', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        message="Proceed with deprovisioning?"
        resourceName="tenant-42"
        onConfirm={vi.fn()}
        variant="danger"
      />,
    );
    expect(screen.getByText(/deprovision/i)).toBeDefined();
  });

  it('renders custom title when provided', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        title="Custom Title"
        message="Proceed?"
        resourceName="tenant-42"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText('Custom Title')).toBeDefined();
  });

  it('renders details when provided', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        message="Proceed?"
        details="This will remove all associated data."
        resourceName="tenant-42"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText('This will remove all associated data.')).toBeDefined();
  });

  it('renders confirmation input by default', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        message="Are you sure?"
        resourceName="tenant-42"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText('tenant-42')).toBeDefined();
  });

  it('disables confirm button when input does not match resource name', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        message="Are you sure?"
        resourceName="tenant-42"
        onConfirm={vi.fn()}
      />,
    );
    const confirmBtn = screen.getByText('Deprovision').closest('button');
    expect(confirmBtn).toBeDisabled();
  });

  it('enables confirm button when input matches resource name', async () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        message="Are you sure?"
        resourceName="tenant-42"
        onConfirm={vi.fn()}
      />,
    );
    const input = screen.getByPlaceholderText('tenant-42');
    await userEvent.clear(input);
    await userEvent.type(input, 'tenant-42');
    const confirmBtn = screen.getByText('Deprovision').closest('button');
    expect(confirmBtn).not.toBeDisabled();
  });

  it('shows error message when typed name does not match', async () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        message="Are you sure?"
        resourceName="tenant-42"
        onConfirm={vi.fn()}
      />,
    );
    const input = screen.getByPlaceholderText('tenant-42');
    await userEvent.clear(input);
    await userEvent.type(input, 'wrong-name');
    expect(screen.getByText(/name does not match/i)).toBeDefined();
  });

  it('calls onConfirm when confirmed with matching name', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        message="Are you sure?"
        resourceName="tenant-42"
        onConfirm={onConfirm}
      />,
    );
    const input = screen.getByPlaceholderText('tenant-42');
    await userEvent.type(input, 'tenant-42');
    await userEvent.click(screen.getByText('Deprovision'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('does not call onConfirm when typed name does not match', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        message="Are you sure?"
        resourceName="tenant-42"
        onConfirm={onConfirm}
      />,
    );
    const input = screen.getByPlaceholderText('tenant-42');
    await userEvent.type(input, 'wrong');
    await userEvent.click(screen.getByText('Deprovision'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        message="Are you sure?"
        resourceName="tenant-42"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows danger warning box by default', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        message="Are you sure?"
        resourceName="tenant-42"
        onConfirm={vi.fn()}
        variant="danger"
      />,
    );
    expect(screen.getByText(/cannot be undone/i)).toBeDefined();
    expect(screen.getByText(/permanently removed/i)).toBeDefined();
  });

  it('disables inputs when loading', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        message="Are you sure?"
        resourceName="tenant-42"
        onConfirm={vi.fn()}
        loading={true}
      />,
    );
    expect(screen.getByText('Cancel').closest('button')).toBeDisabled();
  });

  it('skips confirmation when requireConfirmation is false', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        message="Are you sure?"
        resourceName="tenant-42"
        onConfirm={vi.fn()}
        requireConfirmation={false}
      />,
    );
    expect(screen.queryByPlaceholderText('tenant-42')).toBeNull();
    const confirmBtn = screen.getByText('Deprovision').closest('button');
    expect(confirmBtn).not.toBeDisabled();
  });

  it('renders with custom confirm label', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        message="Proceed?"
        resourceName="tenant-42"
        confirmLabel="Delete Forever"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText('Delete Forever')).toBeDefined();
  });

  it('renders with custom confirmation label', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        message="Proceed?"
        resourceName="tenant-42"
        confirmationLabel="Type the tenant name to confirm"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText(/type the tenant name to confirm/i)).toBeDefined();
  });

  it('renders resource type in warning box', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        message="Proceed?"
        resourceName="my-preview"
        resourceType="preview"
        onConfirm={vi.fn()}
        variant="danger"
      />,
    );
    expect(screen.getByText(/preview/)).toBeDefined();
  });

  it('resets typed name when dialog opens', () => {
    const { rerender } = render(
      <ConfirmDialog
        open={false}
        onOpenChange={vi.fn()}
        message="Proceed?"
        resourceName="tenant-42"
        onConfirm={vi.fn()}
      />,
    );
    rerender(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        message="Proceed?"
        resourceName="tenant-42"
        onConfirm={vi.fn()}
      />,
    );
    const input = screen.getByPlaceholderText('tenant-42') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('uses default deprovision label for danger variant', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        message="Proceed?"
        resourceName="tenant-42"
        onConfirm={vi.fn()}
        variant="danger"
      />,
    );
    expect(screen.getByText('Deprovision')).toBeDefined();
  });

  it('shows custom cancel label', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        message="Proceed?"
        resourceName="tenant-42"
        cancelLabel="Go Back"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText('Go Back')).toBeDefined();
  });

  it('handles special characters in resource name', async () => {
    const onConfirm = vi.fn();
    const specialName = 'my-tenant_123.prod';
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        message="Confirm?"
        resourceName={specialName}
        onConfirm={onConfirm}
      />,
    );
    const input = screen.getByPlaceholderText(specialName);
    await userEvent.type(input, specialName);
    await userEvent.click(screen.getByText('Deprovision'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});

describe('useConfirmDialog', () => {
  it('returns initial state with dialog closed', () => {
    function TestComponent() {
      const { open, openDialog, closeDialog, dialogProps } = useConfirmDialog();
      return (
        <div>
          <span data-testid="open-state">{open ? 'open' : 'closed'}</span>
          <button onClick={openDialog}>Open</button>
          <button onClick={closeDialog}>Close</button>
          <span data-testid="dialog-open">{String(dialogProps.open)}</span>
        </div>
      );
    }

    render(<TestComponent />);
    expect(screen.getByTestId('open-state').textContent).toBe('closed');
    expect(screen.getByTestId('dialog-open').textContent).toBe('false');
  });

  it('opens dialog when openDialog is called', async () => {
    function TestComponent() {
      const { open, openDialog, dialogProps } = useConfirmDialog();
      return (
        <div>
          <span data-testid="open-state">{open ? 'open' : 'closed'}</span>
          <button onClick={openDialog}>Open</button>
          <span data-testid="dialog-open">{String(dialogProps.open)}</span>
        </div>
      );
    }

    render(<TestComponent />);
    await userEvent.click(screen.getByText('Open'));
    expect(screen.getByTestId('open-state').textContent).toBe('open');
    expect(screen.getByTestId('dialog-open').textContent).toBe('true');
  });

  it('closes dialog when closeDialog is called', async () => {
    function TestComponent() {
      const { open, openDialog, closeDialog } = useConfirmDialog();
      return (
        <div>
          <span data-testid="open-state">{open ? 'open' : 'closed'}</span>
          <button onClick={openDialog}>Open</button>
          <button onClick={closeDialog}>Close</button>
        </div>
      );
    }

    render(<TestComponent />);
    await userEvent.click(screen.getByText('Open'));
    expect(screen.getByTestId('open-state').textContent).toBe('open');
    await userEvent.click(screen.getByText('Close'));
    expect(screen.getByTestId('open-state').textContent).toBe('closed');
  });
});
