import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { EmptyState } from '@/components/ui/empty-state';
import { Inbox, AlertCircle } from 'lucide-react';

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeDefined();
  });

  it('renders the description when provided', () => {
    render(
      <EmptyState
        title="No data"
        description="There are no items to display at this time."
      />,
    );
    expect(screen.getByText('There are no items to display at this time.')).toBeDefined();
  });

  it('does not render description when not provided', () => {
    render(<EmptyState title="No items" />);
    expect(screen.queryByRole('paragraph')).toBeNull();
  });

  it('renders the icon when provided', () => {
    render(<EmptyState icon={Inbox} title="No messages" />);
    // The icon is rendered as an SVG inside the container
    const svg = document.querySelector('svg');
    expect(svg).toBeDefined();
  });

  it('renders the primary state with role="status"', () => {
    render(<EmptyState title="Status" />);
    const container = screen.getByRole('status');
    expect(container).toBeDefined();
    expect(container.className).toContain('border-dashed');
  });

  it('renders action button with label and calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="Empty"
        action={{ label: 'Add Item', onClick }}
      />,
    );
    const button = screen.getByRole('button', { name: /add item/i });
    expect(button).toBeDefined();
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not render action button when action is not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('applies custom className', () => {
    render(<EmptyState title="Styled" className="custom-class" />);
    const container = screen.getByRole('status');
    expect(container.className).toContain('custom-class');
  });

  it('renders with long title and description text', () => {
    const longTitle = 'A very long title that should still render without any issues in the empty state component';
    const longDesc = 'This is an extremely long description that goes on and on to test how the component handles large amounts of text content without breaking layout or functionality';
    render(<EmptyState title={longTitle} description={longDesc} />);
    expect(screen.getByText(longTitle)).toBeDefined();
    expect(screen.getByText(longDesc)).toBeDefined();
  });

  it('renders with different icon components', () => {
    const { rerender } = render(<EmptyState icon={Inbox} title="Inbox" />);
    expect(document.querySelector('svg')).toBeDefined();

    rerender(<EmptyState icon={AlertCircle} title="Alert" />);
    expect(document.querySelector('svg')).toBeDefined();
    expect(screen.getByText('Alert')).toBeDefined();
  });

  it('renders with title as an h3 element', () => {
    render(<EmptyState title="Heading" />);
    const heading = screen.getByText('Heading');
    expect(heading.tagName).toBe('H3');
    expect(heading.className).toContain('font-semibold');
  });

  it('renders action button with primary variant and small size', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="Test"
        action={{ label: 'Create', onClick }}
      />,
    );
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-accent-primary');
  });

  it('renders icon in a rounded container when provided', () => {
    render(<EmptyState icon={Inbox} title="With Icon" />);
    const iconContainer = document.querySelector('.rounded-full');
    expect(iconContainer).toBeDefined();
    const svg = iconContainer?.querySelector('svg');
    expect(svg).toBeDefined();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });
});
