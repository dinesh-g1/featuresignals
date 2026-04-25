import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Hello World</Card>);
    expect(screen.getByText('Hello World')).toBeDefined();
  });

  it('renders with default variant classes', () => {
    render(<Card>Default</Card>);
    const card = screen.getByText('Default');
    expect(card.className).toContain('rounded-lg');
    expect(card.className).toContain('bg-bg-secondary');
    expect(card.className).toContain('border-border-default');
  });

  it('renders with elevated variant', () => {
    render(<Card variant="elevated">Elevated</Card>);
    const card = screen.getByText('Elevated');
    expect(card.className).toContain('shadow-lg');
    expect(card.className).toContain('bg-bg-elevated');
  });

  it('renders with bordered variant', () => {
    render(<Card variant="bordered">Bordered</Card>);
    const card = screen.getByText('Bordered');
    expect(card.className).toContain('border-2');
    expect(card.className).toContain('accent-primary/20');
  });

  it('applies custom className', () => {
    render(<Card className="custom-class">Custom</Card>);
    const card = screen.getByText('Custom');
    expect(card.className).toContain('custom-class');
  });

  it('passes additional HTML attributes', () => {
    render(<Card data-testid="test-card" id="my-card">Attrs</Card>);
    const card = screen.getByTestId('test-card');
    expect(card.getAttribute('id')).toBe('my-card');
  });
});

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader><h2>Header</h2></CardHeader>);
    expect(screen.getByText('Header')).toBeDefined();
  });

  it('applies default padding classes', () => {
    render(<CardHeader data-testid="header">Content</CardHeader>);
    const header = screen.getByTestId('header');
    expect(header.className).toContain('p-6');
    expect(header.className).toContain('pb-0');
  });
});

describe('CardTitle', () => {
  it('renders as h3 element', () => {
    render(<CardTitle>Title</CardTitle>);
    const title = screen.getByText('Title');
    expect(title.tagName).toBe('H3');
  });

  it('renders with correct styling classes', () => {
    render(<CardTitle data-testid="title">Styled Title</CardTitle>);
    const title = screen.getByTestId('title');
    expect(title.className).toContain('font-semibold');
    expect(title.className).toContain('text-text-primary');
  });
});

describe('CardDescription', () => {
  it('renders as paragraph element', () => {
    render(<CardDescription>Description text</CardDescription>);
    const desc = screen.getByText('Description text');
    expect(desc.tagName).toBe('P');
  });

  it('renders with secondary text styling', () => {
    render(<CardDescription data-testid="desc">Desc</CardDescription>);
    const desc = screen.getByTestId('desc');
    expect(desc.className).toContain('text-text-secondary');
    expect(desc.className).toContain('text-sm');
  });
});

describe('CardContent', () => {
  it('renders children', () => {
    render(<CardContent><span>Content</span></CardContent>);
    expect(screen.getByText('Content')).toBeDefined();
  });

  it('applies padding classes', () => {
    render(<CardContent data-testid="content">Content</CardContent>);
    const content = screen.getByTestId('content');
    expect(content.className).toContain('p-6');
    expect(content.className).toContain('pt-4');
  });
});

describe('CardFooter', () => {
  it('renders children', () => {
    render(<CardFooter><button>Action</button></CardFooter>);
    expect(screen.getByText('Action')).toBeDefined();
  });

  it('applies flex layout classes', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>);
    const footer = screen.getByTestId('footer');
    expect(footer.className).toContain('flex');
    expect(footer.className).toContain('items-center');
  });

  it('renders with no padding top', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>);
    const footer = screen.getByTestId('footer');
    expect(footer.className).toContain('pt-0');
  });
});

describe('Card composition', () => {
  it('renders a full card with all subcomponents', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Composition Title</CardTitle>
          <CardDescription>A description</CardDescription>
        </CardHeader>
        <CardContent>Main content here</CardContent>
        <CardFooter>
          <button>Save</button>
        </CardFooter>
      </Card>,
    );

    expect(screen.getByText('Composition Title')).toBeDefined();
    expect(screen.getByText('A description')).toBeDefined();
    expect(screen.getByText('Main content here')).toBeDefined();
    expect(screen.getByText('Save')).toBeDefined();
  });
});
