import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-bg-tertiary text-text-secondary border border-border-default',
        success: 'bg-accent-success/10 text-accent-success border border-accent-success/20',
        warning: 'bg-accent-warning/10 text-accent-warning border border-accent-warning/20',
        danger: 'bg-accent-danger/10 text-accent-danger border border-accent-danger/20',
        info: 'bg-accent-info/10 text-accent-info border border-accent-info/20',
        primary: 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Show a dot indicator before the text */
  dot?: boolean;
  /** Dot color override (e.g., for custom status colors) */
  dotColor?: string;
}

export function Badge({
  className,
  variant,
  size,
  dot,
  dotColor,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {dot && (
        <span
          className={cn('mr-1.5 h-1.5 w-1.5 rounded-full', {
            'bg-current': !dotColor,
          })}
          style={dotColor ? { backgroundColor: dotColor } : undefined}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
