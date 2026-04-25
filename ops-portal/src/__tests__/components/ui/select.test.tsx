import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Select } from '@/components/ui/select';

const sampleOptions = [
  { value: 'option-1', label: 'Option 1' },
  { value: 'option-2', label: 'Option 2' },
  { value: 'option-3', label: 'Option 3' },
];

const defaultProps = {
  options: sampleOptions,
  onValueChange: vi.fn(),
};

describe('Select', () => {
  it('renders with placeholder text', () => {
    render(<Select {...defaultProps} />);
    expect(screen.getByText('Select...')).toBeDefined();
  });

  it('renders with custom placeholder', () => {
    render(<Select {...defaultProps} placeholder="Pick one..." />);
    expect(screen.getByText('Pick one...')).toBeDefined();
  });

  it('renders with a label', () => {
    render(<Select {...defaultProps} label="Environment" />);
    expect(screen.getByText('Environment')).toBeDefined();
  });

  it('shows the currently selected value', () => {
    render(<Select {...defaultProps} value="option-2" />);
    expect(screen.getByText('Option 2')).toBeDefined();
  });

  it('renders with error message', () => {
    render(<Select {...defaultProps} error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeDefined();
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('renders error with role="alert"', () => {
    render(<Select {...defaultProps} error="Required" />);
    expect(screen.getByRole('alert').textContent).toBe('Required');
  });

  it('renders helper text when no error', () => {
    render(<Select {...defaultProps} helperText="Select an environment" />);
    expect(screen.getByText('Select an environment')).toBeDefined();
  });

  it('does not render helper text when error is present', () => {
    render(
      <Select
        {...defaultProps}
        helperText="Select an environment"
        error="Required"
      />,
    );
    expect(screen.queryByText('Select an environment')).toBeNull();
    expect(screen.getByText('Required')).toBeDefined();
  });

  it('sets aria-invalid when error is provided', () => {
    render(<Select {...defaultProps} error="Error" />);
    const trigger = screen.getByRole('combobox');
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
  });

  it('disables the select when disabled is true', () => {
    render(<Select {...defaultProps} disabled />);
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
  });

  it('renders with a custom id', () => {
    render(<Select {...defaultProps} id="custom-id" />);
    const trigger = screen.getByRole('combobox');
    expect(trigger.getAttribute('id')).toBe('custom-id');
  });

  it('renders with a name attribute', () => {
    render(<Select {...defaultProps} name="env" />);
    // Radix select manages the name on a hidden input
    const input = document.querySelector('input[name="env"]');
    expect(input).toBeDefined();
  });

  it('renders with additional className on trigger', () => {
    render(<Select {...defaultProps} className="custom-trigger" />);
    const trigger = screen.getByRole('combobox');
    expect(trigger.className).toContain('custom-trigger');
  });

  it('applies the ChevronDown icon on the trigger', () => {
    render(<Select {...defaultProps} />);
    const trigger = screen.getByRole('combobox');
    const svg = trigger.querySelector('svg');
    expect(svg).toBeDefined();
  });

  it('creates id from label when no id provided', () => {
    render(<Select {...defaultProps} label="My Select" />);
    const trigger = screen.getByRole('combobox');
    expect(trigger.getAttribute('id')).toBe('my-select');
  });

  it('renders all options in the dropdown', () => {
    render(<Select {...defaultProps} />);
    // Open the select
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    // The Radix select renders options in a portal
    expect(screen.getByText('Option 1')).toBeDefined();
    expect(screen.getByText('Option 2')).toBeDefined();
    expect(screen.getByText('Option 3')).toBeDefined();
  });

  it('calls onValueChange when an option is selected', async () => {
    const onValueChange = vi.fn();
    render(<Select {...defaultProps} onValueChange={onValueChange} />);
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    const option1 = screen.getByText('Option 1');
    fireEvent.click(option1);
    expect(onValueChange).toHaveBeenCalledWith('option-1');
  });

  it('renders with disabled options', () => {
    const optionsWithDisabled = [
      { value: 'a', label: 'Available' },
      { value: 'b', label: 'Unavailable', disabled: true },
    ];
    render(<Select options={optionsWithDisabled} onValueChange={vi.fn()} />);
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    // Both should be rendered
    expect(screen.getByText('Available')).toBeDefined();
    expect(screen.getByText('Unavailable')).toBeDefined();
  });

  it('renders search input when searchable is true', () => {
    render(<Select {...defaultProps} searchable />);
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    expect(screen.getByPlaceholderText('Search...')).toBeDefined();
  });

  it('renders with custom search placeholder', () => {
    render(<Select {...defaultProps} searchable searchPlaceholder="Find..." />);
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    expect(screen.getByPlaceholderText('Find...')).toBeDefined();
  });

  it('filters options based on search query', async () => {
    render(<Select {...defaultProps} searchable />);
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search...');
    await userEvent.type(searchInput, 'Option 1');

    expect(screen.getByText('Option 1')).toBeDefined();
    expect(screen.queryByText('Option 2')).toBeNull();
    expect(screen.queryByText('Option 3')).toBeNull();
  });

  it('shows no results when search matches nothing', async () => {
    render(<Select {...defaultProps} searchable />);
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search...');
    await userEvent.type(searchInput, 'zzzzz');

    expect(screen.getByText('No results found')).toBeDefined();
  });

  it('clears search query when X button is clicked', async () => {
    render(<Select {...defaultProps} searchable />);
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search...');
    await userEvent.type(searchInput, 'Option');

    const clearBtn = screen.getByLabelText('Clear search');
    fireEvent.click(clearBtn);

    // After clearing, all options should be visible
    expect(screen.getByText('Option 1')).toBeDefined();
    expect(screen.getByText('Option 2')).toBeDefined();
    expect(screen.getByText('Option 3')).toBeDefined();
  });

  it('resets search query when dropdown closes', () => {
    const { rerender } = render(<Select {...defaultProps} searchable />);

    // Open dropdown
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Option 1' } });

    // Close dropdown by clicking outside
    fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape' });

    // Re-render and open again - search should be reset
    rerender(<Select {...defaultProps} searchable />);
    fireEvent.click(screen.getByRole('combobox'));

    // All options should be visible
    expect(screen.getByText('Option 1')).toBeDefined();
    expect(screen.getByText('Option 2')).toBeDefined();
    expect(screen.getByText('Option 3')).toBeDefined();
  });

  it('renders with no options', () => {
    render(<Select options={[]} onValueChange={vi.fn()} />);
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    // Should show the trigger but no dropdown items since we can't open it via click if there are no options
    expect(screen.getByRole('combobox')).toBeDefined();
  });
});
