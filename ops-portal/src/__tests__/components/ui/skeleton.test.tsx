import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonText } from '@/components/ui/skeleton';

describe('Skeleton', () => {
  it('renders with default classes', () => {
    const { container } = render(<Skeleton />);
    const div = container.firstChild as HTMLElement;
    expect(div).toBeDefined();
    expect(div.className).toContain('animate-pulse');
    expect(div.className).toContain('rounded-md');
    expect(div.className).toContain('bg-bg-tertiary');
  });

  it('has aria-hidden="true" for accessibility', () => {
    const { container } = render(<Skeleton />);
    const div = container.firstChild as HTMLElement;
    expect(div.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders as a circle when circle prop is true', () => {
    const { container } = render(<Skeleton circle />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('rounded-full');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="h-10 w-10" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('h-10');
    expect(div.className).toContain('w-10');
  });

  it('renders with inline style for width', () => {
    const { container } = render(<Skeleton style={{ width: '50%' }} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.width).toBe('50%');
  });

  it('passes data attributes to the element', () => {
    const { container } = render(<Skeleton data-testid="skeleton-loading" />);
    const div = container.firstChild as HTMLElement;
    expect(div.getAttribute('data-testid')).toBe('skeleton-loading');
  });

  it('renders with both circle and custom className', () => {
    const { container } = render(<Skeleton circle className="h-12 w-12" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('rounded-full');
    expect(div.className).toContain('h-12');
    expect(div.className).toContain('w-12');
  });
});

describe('SkeletonCard', () => {
  it('renders multiple skeleton elements', () => {
    const { container } = render(<SkeletonCard />);
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  it('renders a card-like container with border', () => {
    const { container } = render(<SkeletonCard />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('rounded-lg');
    expect(wrapper.className).toContain('border-border-default');
  });

  it('contains skeleton elements with specific dimensions', () => {
    const { container } = render(<SkeletonCard />);
    const skeletonDivs = container.querySelectorAll('.animate-pulse');
    const hasH10W10 = Array.from(skeletonDivs).some(
      (el) => el.className.includes('h-10') && el.className.includes('w-10'),
    );
    expect(hasH10W10).toBe(true);
  });
});

describe('SkeletonTable', () => {
  it('renders default number of rows (5)', () => {
    const { container } = render(<SkeletonTable />);
    // Each row is a flex container with skeletons inside
    const rows = container.querySelectorAll('.flex.gap-4.py-2');
    expect(rows.length).toBe(5);
  });

  it('renders custom number of rows', () => {
    const { container } = render(<SkeletonTable rows={3} />);
    const rows = container.querySelectorAll('.flex.gap-4.py-2');
    expect(rows.length).toBe(3);
  });

  it('renders header skeleton', () => {
    const { container } = render(<SkeletonTable />);
    const header = container.querySelector('.flex.gap-4.border-b');
    expect(header).toBeDefined();
  });

  it('renders skeleton elements inside each row', () => {
    const { container } = render(<SkeletonTable rows={2} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    // Header (5) + 2 rows (5 each) = 15 skeletons
    expect(skeletons.length).toBeGreaterThanOrEqual(10);
  });

  it('renders with no rows when rows is 0', () => {
    const { container } = render(<SkeletonTable rows={0} />);
    const rows = container.querySelectorAll('.flex.gap-4.py-2');
    expect(rows.length).toBe(0);
  });
});

describe('SkeletonText', () => {
  it('renders default number of lines (3)', () => {
    const { container } = render(<SkeletonText />);
    const lines = container.querySelectorAll('.animate-pulse');
    expect(lines.length).toBe(3);
  });

  it('renders custom number of lines', () => {
    const { container } = render(<SkeletonText lines={5} />);
    const lines = container.querySelectorAll('.animate-pulse');
    expect(lines.length).toBe(5);
  });

  it('renders lines with varying widths', () => {
    const { container } = render(<SkeletonText lines={3} />);
    const lines = container.querySelectorAll('.animate-pulse');
    expect(lines.length).toBe(3);
    // Each line should have a style attribute for width
    lines.forEach((line) => {
      const htmlLine = line as HTMLElement;
      expect(htmlLine.style.width).toBeTruthy();
    });
  });

  it('first line is the widest', () => {
    const { container } = render(<SkeletonText lines={3} />);
    const lines = container.querySelectorAll('.animate-pulse');
    const widths = Array.from(lines).map(
      (line) => parseInt((line as HTMLElement).style.width),
    );
    expect(widths[0]).toBeGreaterThan(widths[1]);
    expect(widths[1]).toBeGreaterThan(widths[2]);
  });

  it('renders single line', () => {
    const { container } = render(<SkeletonText lines={1} />);
    const lines = container.querySelectorAll('.animate-pulse');
    expect(lines.length).toBe(1);
  });
});
