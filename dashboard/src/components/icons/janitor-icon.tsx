import { cn } from "@/lib/utils";

interface JanitorIconProps {
  className?: string;
  strokeWidth?: number;
}

export function JanitorIcon({
  className,
  strokeWidth = 1.5,
}: JanitorIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5", className)}
    >
      {/* Broom handle */}
      <line x1="14" y1="10" x2="21" y2="3" />
      {/* Broom bristles */}
      <path d="M10 14l-7 7" />
      <path d="M12 12l-5 5" />
      <path d="M14 10l-3 3" />
      {/* Broom head */}
      <path d="M2 20l4-4c.8-.8 2-.8 2.8 0l.2.2c.8.8.8 2 0 2.8L5 23c-.8.8-2 .8-2.8 0l-.2-.2c-.8-.8-.8-2 0-2.8z" />
      {/* Sparkle dots */}
      <circle cx="18" cy="6" r="0.5" fill="currentColor" />
      <circle cx="20" cy="8" r="0.5" fill="currentColor" />
      <circle cx="16" cy="4" r="0.5" fill="currentColor" />
      {/* AI brain/sparkle */}
      <path d="M19 13l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5z" />
      <path d="M3 12l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5z" />
    </svg>
  );
}
