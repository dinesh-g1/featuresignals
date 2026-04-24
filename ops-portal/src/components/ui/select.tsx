'use client';

import * as React from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  /** The currently selected value */
  value?: string;
  /** Called when the value changes */
  onValueChange: (value: string) => void;
  /** Available options */
  options: SelectOption[];
  /** Placeholder text when nothing is selected */
  placeholder?: string;
  /** Label shown above the select */
  label?: string;
  /** Error message shown below */
  error?: string;
  /** Helper text shown below (when no error) */
  helperText?: string;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Whether to show a search input at the top of the dropdown */
  searchable?: boolean;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Optional class name for the trigger */
  className?: string;
  /** Optional class name for the content dropdown */
  contentClassName?: string;
  /** Id for the trigger (for accessibility) */
  id?: string;
  /** Name attribute for forms */
  name?: string;
}

// ─── Select Item Component ────────────────────────────────────────────────

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ value, children, disabled, className, ...props }, forwardedRef) => {
    return (
      <RadixSelect.Item
        value={value}
        disabled={disabled}
        className={cn(
          'relative flex cursor-default select-none items-center rounded-md px-8 py-2 text-sm text-text-primary outline-none',
          'data-[highlighted]:bg-bg-tertiary data-[highlighted]:text-text-primary',
          'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          'transition-colors duration-100',
          className,
        )}
        ref={forwardedRef}
        {...props}
      >
        <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
        <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
          <RadixSelect.ItemIndicator>
            <Check className="h-3.5 w-3.5 text-accent-primary" />
          </RadixSelect.ItemIndicator>
        </span>
      </RadixSelect.Item>
    );
  },
);
SelectItem.displayName = 'SelectItem';

// ─── Main Select Component ────────────────────────────────────────────────

export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  label,
  error,
  helperText,
  disabled = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  className,
  contentClassName,
  id,
  name,
}: SelectProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);

  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchable || !searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        opt.value.toLowerCase().includes(query),
    );
  }, [options, searchQuery, searchable]);

  // Reset search when dropdown closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-text-secondary mb-1.5"
        >
          {label}
        </label>
      )}

      <RadixSelect.Root
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        open={open}
        onOpenChange={setOpen}
        name={name}
      >
        <RadixSelect.Trigger
          id={selectId}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border bg-bg-tertiary px-3 py-2 text-sm',
            'border-border-default transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1 focus-visible:ring-offset-bg-primary',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-secondary',
            'data-[placeholder]:text-text-muted',
            error && 'border-accent-danger focus-visible:ring-accent-danger',
            className,
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
          }
        >
          <RadixSelect.Value placeholder={placeholder}>
            {selectedLabel && (
              <span className="text-text-primary">{selectedLabel}</span>
            )}
          </RadixSelect.Value>
          <RadixSelect.Icon asChild>
            <ChevronDown className="h-4 w-4 text-text-muted" aria-hidden="true" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            className={cn(
              'relative z-50 max-h-[320px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border-default bg-bg-elevated shadow-xl',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              contentClassName,
            )}
            position="popper"
            sideOffset={4}
          >
            {/* Search input */}
            {searchable && (
              <div className="sticky top-0 z-10 border-b border-border-default bg-bg-elevated p-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className={cn(
                      'w-full rounded-md border border-border-default bg-bg-tertiary py-1.5 pl-8 pr-8 text-sm text-text-primary placeholder:text-text-muted',
                      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-primary',
                    )}
                    autoComplete="off"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <RadixSelect.ScrollUpButton className="flex h-6 cursor-default items-center justify-center bg-bg-elevated text-text-muted">
              <ChevronUp className="h-4 w-4" />
            </RadixSelect.ScrollUpButton>

            <RadixSelect.Viewport className="p-1">
              {filteredOptions.length === 0 ? (
                <div className="px-8 py-4 text-center text-sm text-text-muted">
                  No results found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </SelectItem>
                ))
              )}
            </RadixSelect.Viewport>

            <RadixSelect.ScrollDownButton className="flex h-6 cursor-default items-center justify-center bg-bg-elevated text-text-muted">
              <ChevronDown className="h-4 w-4" />
            </RadixSelect.ScrollDownButton>

            <RadixSelect.Arrow className="fill-border-default" />
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>

      {error && (
        <p id={`${selectId}-error`} className="mt-1.5 text-xs text-accent-danger" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${selectId}-helper`} className="mt-1.5 text-xs text-text-muted">
          {helperText}
        </p>
      )}
    </div>
  );
}
