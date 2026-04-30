/**
 * NavList inline SVG icons — 16px, currentColor, Primer conventions.
 * Phase 4 adds: ThreeBars, X, ChevronDownIcon/Right, Plus, Bell, Person, LogOut,
 * HelpCircle, ExternalLink, ArrowRight/Left, Clock, GitPullRequest, AlertFill,
 * InfoFill, Filter, KebabHorizontal, Copy, Download, Globe, Shield, Zap.
 */
interface IconProps {
  className?: string;
}

export function FlagIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.75 1a.75.75 0 0 0-.75.75V14.5a.75.75 0 0 0 1.5 0V10h8.75a.75.75 0 0 0 .53-1.28L10.53 5.5l3.22-3.22A.75.75 0 0 0 13.25 1H3.75ZM4.5 2.5h7.69L9.22 5.22a.75.75 0 0 0 0 1.06l2.97 2.72H4.5v-6.5Z" />
    </svg>
  );
}

export function SegmentIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 3.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM6.5 3.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM11 3.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM2 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM6.5 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM2 12.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM6.5 12.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" />
    </svg>
  );
}

export function EnvironmentIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 1a7 7 0 1 0 7 7 7.008 7.008 0 0 0-7-7Zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11Zm0-9.5a4 4 0 0 0-4 4c0 1.808 1.034 3.464 2.577 3.968A1.348 1.348 0 0 1 7.2 12.7c.77.12 1.54-.23 1.66-1 .63-.504 1.056-1.435 1.056-2.7 0-1.593-1.204-3-2.916-3C5.576 6 4.5 7.269 4.5 8.6c0 .914.52 1.707 1.275 2.084A.75.75 0 1 0 6.5 9.3a.693.693 0 0 1-.5-.7c0-.53.523-1.1 1.5-1.1C8.77 7.5 9.5 8.343 9.5 9.5c0 .747-.211 1.277-.5 1.656V12.5h-1a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5H10V8a2 2 0 1 0-4 0 2 2 0 0 0 2 2Z" />
    </svg>
  );
}

export function ApiKeysIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.5 1a3.5 3.5 0 0 0-3.106 5.137l-4.81 4.81a1.5 1.5 0 0 0-.44 1.06v1.843a.5.5 0 0 0 .5.5h1.5a.75.75 0 0 0 .75-.75V12.5h1a.75.75 0 0 0 .75-.75V10.5h1.25a.5.5 0 0 0 .5-.5V8.75h.344a1.5 1.5 0 0 0 1.06-.44l.24-.24A3.5 3.5 0 1 0 10.5 1Zm-2 3.5a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z" />
    </svg>
  );
}

export function WebhookIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.5 2.75a2.75 2.75 0 0 1 5.39.87.75.75 0 0 0 1.47-.24 4.25 4.25 0 0 0-8.33-1.34A4.25 4.25 0 0 0 4.75 9.5h.25a.75.75 0 0 0 0-1.5h-.25a2.75 2.75 0 0 1-1.25-5.25Zm5.78 2.5a.75.75 0 0 1 .72.55 2.75 2.75 0 0 1-1.25 5.25H8.5a.75.75 0 0 1 0-1.5h.25a1.25 1.25 0 1 0 .58-2.38.75.75 0 0 1-.08-1.48l.03-.01a.75.75 0 0 1 0 .07Zm-4.4-.77a.75.75 0 0 1 .57.9l-.7 3.5a.75.75 0 0 1-1.47-.3l.35-1.74A4.25 4.25 0 0 0 6.53 2.2a.75.75 0 0 1-.65 1.35A2.75 2.75 0 0 0 5.25 8.5h.5a.75.75 0 0 1 0 1.5h-1a.75.75 0 0 1-.75-.75 4.25 4.25 0 0 1 2.55-3.9.75.75 0 0 1-.67-.87Z" />
    </svg>
  );
}

export function AuditLogIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 1.75A.75.75 0 0 1 2.75 1h10.5a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75H2.75a.75.75 0 0 1-.75-.75V1.75ZM3.5 2.5v11h9v-11h-9Z" />
      <path d="M5 5.75A.75.75 0 0 1 5.75 5h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 5.75ZM5 8.75A.75.75 0 0 1 5.75 8h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 8.75ZM5 11.75a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

export function TeamIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M5.5 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM2 5.5a3.5 3.5 0 1 1 5.898 2.549 5.508 5.508 0 0 1 3.024 4.08.75.75 0 0 1-.471.957.75.75 0 0 1-.962-.474 4.001 4.001 0 0 0-7.978 0 .75.75 0 0 1-1.433-.487 5.509 5.509 0 0 1 3.024-4.08A3.487 3.487 0 0 1 2 5.5ZM11 6.75a.75.75 0 0 1 .75-.75 1.5 1.5 0 0 1 1.5 1.5.75.75 0 0 1-1.5 0h-.75ZM11 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </svg>
  );
}

export function SettingsIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M7.814 1.001a4.5 4.5 0 0 1 4.185 2.999h3.25a.75.75 0 0 1 0 1.5h-3.25a4.5 4.5 0 0 1-8.37 0H.75a.75.75 0 0 1 0-1.5h2.88a4.5 4.5 0 0 1 4.184-2.999Zm0 1.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm4.436 6.999a4.5 4.5 0 0 1-8.87 0H.75a.75.75 0 0 1 0-1.5h2.63a4.5 4.5 0 0 1 8.87 0h3.001a.75.75 0 0 1 0 1.5h-3.001Zm-4.436.999a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </svg>
  );
}

export function PlusCircleIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 1a7 7 0 1 0 7 7 7.008 7.008 0 0 0-7-7Zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11Zm0-8.75a.75.75 0 0 1 .75.75v2.25H11a.75.75 0 0 1 0 1.5H8.75V11a.75.75 0 0 1-1.5 0V8.75H5a.75.75 0 0 1 0-1.5h2.25V5a.75.75 0 0 1 .75-.75Z" />
    </svg>
  );
}

export function DashboardIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M6.75 1a.75.75 0 0 1 .75.75V6a.75.75 0 0 1-.75.75H1.75A.75.75 0 0 1 1 6V1.75A.75.75 0 0 1 1.75 1h5Zm-.25 1.5h-4v3h4v-3Zm7.75 0h-5v3h5v-3Zm-.75 1.5v-1.5h-3.5v1.5h3.5ZM6.75 9a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75H1.75a.75.75 0 0 1-.75-.75v-4.5A.75.75 0 0 1 1.75 9h5Zm-.25 1.5h-4v3h4v-3Zm8.25-1.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-5a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 1 .75-.75h5Zm-.25 1.5h-3.5v3h3.5v-3Z" />
    </svg>
  );
}

export function GraphIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M1.5 14.25a.75.75 0 0 1 .75-.75h11.5a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1-.75-.75Zm.5-8a.75.75 0 0 1 .97-.43l2.28.76L8.5 4.44l3.22 1.08a.75.75 0 0 1-.5 1.42L8.5 5.94 5.25 7.56l-2.28-.76a.75.75 0 0 1-.97-.43ZM2 10.75a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Zm5 0a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

export function PulseIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 2.75A.75.75 0 0 1 2.75 2h.38a.75.75 0 0 1 .72.56l2.62 9.82 1.76-4.89a.75.75 0 0 1 .7-.49h4.32a.75.75 0 0 1 0 1.5H9.38l-2.17 6.01a.75.75 0 0 1-1.4-.07L3.1 4.26l-.35 1.32a.75.75 0 0 1-.73.57h-.27a.75.75 0 0 1-.75-.75V2.75Z" />
    </svg>
  );
}

export function HeartIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M4.515 2.5C2.86 2.5 1.5 3.876 1.5 5.57c0 .862.278 1.771.766 2.65.488.878 1.208 1.75 2.104 2.58 1.794 1.66 3.96 2.853 3.96 2.853a.75.75 0 0 0 .67 0s2.166-1.193 3.96-2.853c.896-.83 1.616-1.702 2.104-2.58.488-.879.766-1.788.766-2.65C15.83 3.876 14.47 2.5 12.815 2.5c-.887 0-1.713.36-2.315 1.01C10 3.86 9.388 3.5 8.665 3.5c-.723 0-1.335.36-1.835.51-.602.01-1.428-.51-2.315-1.01Z" />
    </svg>
  );
}

export function CheckListIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.5 1.75v11.5c0 .138.112.25.25.25h3.17a.75.75 0 0 1 0 1.5H2.75A1.75 1.75 0 0 1 1 13.25V1.75C1 .784 1.784 0 2.75 0h8.5C12.216 0 13 .784 13 1.75v7.5a.75.75 0 0 1-1.5 0v-7.5a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25Zm7.03 5.03a.75.75 0 0 1 1.06 0l2.5 2.5a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-1.06 0l-1.5-1.5a.75.75 0 1 1 1.06-1.06l.97.97 3.47-3.47-1.5-1.5a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

export function SearchIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
    </svg>
  );
}

export function RocketIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M14.064 0h.186a.75.75 0 0 1 .75.75v.186a5.75 5.75 0 0 1-1.685 4.07l-1.1 1.1a5.5 5.5 0 0 1-1.343 4.487L8.47 13.03a.75.75 0 0 1-1.06 0l-1.88-1.88-2.75 2.75a.75.75 0 1 1-1.06-1.06l2.75-2.75-1.88-1.88a.75.75 0 0 1 0-1.06l2.437-2.437A5.5 5.5 0 0 1 9.5 3.37l1.1-1.1A5.75 5.75 0 0 1 14.064 0ZM8.53 8.53l-1.06-1.06-1.97 1.97 1.06 1.06 1.97-1.97Zm1.5-4.97a4 4 0 0 0-1.1 2.18l2.18-2.18a4 4 0 0 0-1.08 0ZM9.44 12.5l1.03-1.03-1.06-1.06-1.97 1.97Z" />
    </svg>
  );
}

export function SparklesIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M7.784 1.026a.75.75 0 0 1 1.432 0l.634 2.126a.75.75 0 0 0 .521.522l2.127.634a.75.75 0 0 1 0 1.431l-2.127.634a.75.75 0 0 0-.521.522l-.634 2.127a.75.75 0 0 1-1.432 0l-.634-2.127a.75.75 0 0 0-.521-.522l-2.127-.634a.75.75 0 0 1 0-1.431l2.127-.634a.75.75 0 0 0 .521-.522l.634-2.126Z" />
    </svg>
  );
}

export function CreditCardIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M15.25 3.5a1.75 1.75 0 0 0-1.75-1.75h-11A1.75 1.75 0 0 0 .75 3.5v8.5c0 .966.784 1.75 1.75 1.75h11a1.75 1.75 0 0 0 1.75-1.75v-8.5ZM2.25 3.25h11a.25.25 0 0 1 .25.25V5H2V3.5a.25.25 0 0 1 .25-.25ZM2 6.5h12v5.5a.25.25 0 0 1-.25.25h-11a.25.25 0 0 1-.25-.25V6.5Zm2 3.75a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

// ─── Phase 4: Additional Primer Icons ──────────────────────────────

export function ThreeBarsIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75ZM1.75 12a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H1.75Z" />
    </svg>
  );
}

export function XIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

export function ChevronDownIcon({ className = "h-3 w-3" }: IconProps) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z" />
    </svg>
  );
}

export function ChevronRightIcon({ className = "h-3 w-3" }: IconProps) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M5.22 3.22a.749.749 0 0 1 1.06 0l4.25 4.25a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 1 1-1.06-1.06L8.939 8 5.22 4.28a.749.749 0 0 1 0-1.06Z" />
    </svg>
  );
}

export function PlusIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 1.75a.75.75 0 0 1 .75.75v4.75h4.75a.75.75 0 0 1 0 1.5H8.75v4.75a.75.75 0 0 1-1.5 0V8.75H2.5a.75.75 0 0 1 0-1.5h4.75V2.5A.75.75 0 0 1 8 1.75Z" />
    </svg>
  );
}

export function BellIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 16a2 2 0 0 0 1.985-1.75c.017-.137-.097-.25-.235-.25h-3.5c-.138 0-.252.113-.235.25A2 2 0 0 0 8 16ZM3 5a5 5 0 0 1 10 0v2.947c0 .05.015.098.042.139l1.703 2.555A1.518 1.518 0 0 1 13.482 13H2.518a1.518 1.518 0 0 1-1.263-2.36l1.703-2.554A.25.25 0 0 0 3 7.947V5Zm3.5-3.5a1.5 1.5 0 0 1 3 0v1a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-1Z" />
    </svg>
  );
}

export function PersonIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM6 5a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm-4 8.746C2 11.82 4.348 10 8 10s6 1.82 6 3.746a.5.5 0 0 1-.494.504H2.494A.5.5 0 0 1 2 13.746ZM3.516 12.75h8.968A3.988 3.988 0 0 0 8 11.5a3.988 3.988 0 0 0-4.484 1.25Z" />
    </svg>
  );
}

export function LogOutIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 2.75A2.75 2.75 0 0 1 4.75 0h4.5a.75.75 0 0 1 0 1.5h-4.5c-.69 0-1.25.56-1.25 1.25v10.5c0 .69.56 1.25 1.25 1.25h4.5a.75.75 0 0 1 0 1.5h-4.5A2.75 2.75 0 0 1 2 13.25V2.75Zm9.47 2.72a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06l-2.25 2.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l.97-.97H5.75a.75.75 0 0 1 0-1.5h6.69l-.97-.97a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

export function HelpCircleIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM.5 8a7.5 7.5 0 1 1 15 0A7.5 7.5 0 0 1 .5 8Zm7.5-2.25a1 1 0 0 0-.875.547.75.75 0 0 1-1.313-.725 2.5 2.5 0 1 1 3.824 3.074.752.752 0 0 1-.636.317v.287a.75.75 0 0 1-1.5 0v-.5a.75.75 0 0 1 .75-.75h.037a1 1 0 0 0 .713-1.7ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
    </svg>
  );
}

export function ExternalLinkIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "h-3 w-3" }: IconProps) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l2.97-2.97H1.75a.75.75 0 0 1 0-1.5h9.44L8.22 4.03a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

export function ArrowLeftIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M7.78 13.03a.75.75 0 0 1-1.06 0L2.47 8.78a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L4.81 7.5h9.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06Z" />
    </svg>
  );
}

export function ClockIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM.5 8a7.5 7.5 0 1 1 15 0A7.5 7.5 0 0 1 .5 8ZM8.75 4.25a.75.75 0 0 0-1.5 0v4c0 .199.079.39.22.53l2.5 2.5a.75.75 0 0 0 1.06-1.06L8.75 8.19V4.25Z" />
    </svg>
  );
}

export function GitPullRequestIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
    </svg>
  );
}

export function AlertIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575L6.457 1.047ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-.25-5.25a.75.75 0 0 0-1.5 0v2.5a.75.75 0 0 0 1.5 0v-2.5Z"
      />
    </svg>
  );
}

export function InfoFillIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 1a7 7 0 1 0 7 7 7.008 7.008 0 0 0-7-7Zm.75 4.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM7.5 8a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .742.867l-.5 3.008a.75.75 0 0 1-1.483-.25l.5-3.008A.75.75 0 0 1 7.5 8Z" />
    </svg>
  );
}

export function FilterIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M.75 3h14.5a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1 0-1.5ZM3 7.75A.75.75 0 0 1 3.75 7h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 3 7.75Zm3 4a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

export function KebabHorizontalIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM1.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm13 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    </svg>
  );
}

export function CopyIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25v-7.5Z" />
      <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25v-7.5Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25h-7.5Z" />
    </svg>
  );
}

export function DownloadIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14H2.75Z" />
      <path d="M7.25 10.542V1.75a.75.75 0 0 1 1.5 0v8.792l2.97-2.97a.749.749 0 1 1 1.06 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0l-4.25-4.25a.749.749 0 1 1 1.06-1.06l2.97 2.97Z" />
    </svg>
  );
}

export function GlobeIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM6.5 2.525a5.489 5.489 0 0 0-1.904.975A5.489 5.489 0 0 0 2.525 6.5h2.25c.132-1.755.768-3.237 1.725-3.975Zm3 0C10.482 3.263 11.118 4.745 11.25 6.5h2.25a5.489 5.489 0 0 0-2.07-3.975ZM2.525 9.5a5.489 5.489 0 0 0 2.07 2.975A5.489 5.489 0 0 0 6.5 13.475C5.518 12.737 4.882 11.255 4.75 9.5h-2.25Zm8.95 0c-.132 1.755-.768 3.237-1.725 3.975A5.489 5.489 0 0 0 11.75 9.5H9.5Zm-1.5-3.5c.132 1.593.604 3.02 1.25 4H6.75c.646-.98 1.118-2.407 1.25-4h-.002Zm-3.525 0h-2.25c.132-1.593.604-3.02 1.25-4h.75a11.97 11.97 0 0 0 .25 4Z" />
    </svg>
  );
}

export function ShieldIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 1.5c2.093 1.459 4.476 2.168 7 1.964v5.482c0 3.73-3.361 5.58-7 5.58-3.639 0-7-1.85-7-5.58V3.464c2.524.204 4.907-.505 7-1.964ZM2.5 4.095v4.851c0 3.003 2.52 4.58 5.5 4.58 2.98 0 5.5-1.577 5.5-4.58V4.095a10.513 10.513 0 0 1-5.5 1.406A10.513 10.513 0 0 1 2.5 4.095Z" />
    </svg>
  );
}

export function ZapIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M9.97 1.03a.75.75 0 0 0-1.44.27l-.53 4.22H4.25a.75.75 0 0 0-.63 1.14l4.5 7.5a.75.75 0 0 0 1.36-.36l.53-4.22H13.75a.75.75 0 0 0 .63-1.14l-4.5-7.5a.75.75 0 0 0 .09.09ZM5.97 6.52h1.93a.75.75 0 0 0 .74-.87l.24-1.93 2.59 4.32H9.31a.75.75 0 0 0-.74.87l-.24 1.93L5.97 6.52Z" />
    </svg>
  );
}

// ─── Phase 5: Extended Primer Icons ──────────────────────────────

export function BarChartIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M1.5 14.25a.75.75 0 0 1 .75-.75h11.5a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1-.75-.75Zm.5-8a.75.75 0 0 1 .97-.43L4 6.19l2.25-1.13a.75.75 0 0 1 .58 0L9 6.19l2.25-1.13a.75.75 0 0 1 .75 1.3L9.5 7.56 7.25 6.44 5 7.56 3.25 6.44a.75.75 0 0 1-1.25.56Zm0 4a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Zm5 0a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

export function UsersIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M5.5 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM2 5.5a3.5 3.5 0 1 1 5.898 2.549 5.508 5.508 0 0 1 3.024 4.08.75.75 0 0 1-.471.957.75.75 0 0 1-.962-.474 4.001 4.001 0 0 0-7.978 0 .75.75 0 0 1-1.433-.487 5.509 5.509 0 0 1 3.024-4.08A3.487 3.487 0 0 1 2 5.5ZM11 6.75a.75.75 0 0 1 .75-.75 1.5 1.5 0 0 1 1.5 1.5.75.75 0 0 1-1.5 0h-.75ZM11 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </svg>
  );
}

export function BuildingIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M4.5 1a.5.5 0 0 0-.5.5V15H1.75a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H12V1.5a.5.5 0 0 0-.5-.5h-7ZM5.5 2.5h5V15h-5V2.5Zm1.75 2a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5Zm0 3a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5Zm0 3a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5ZM6 3.75a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

export function TrendingUpIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M15.28 3.28a.75.75 0 0 0-1.06-1.06L10 6.44 7.97 4.41a.75.75 0 0 0-1.06 0L2.22 9.09a.75.75 0 0 0 1.06 1.06l4.16-4.16 2.03 2.03a.75.75 0 0 0 1.06 0l4.75-4.74ZM12.5 4v3.25a.75.75 0 0 0 1.5 0V3.5a.75.75 0 0 0-.75-.75H9.5a.75.75 0 0 0 0 1.5H12.5Z" />
    </svg>
  );
}

export function CheckCircleFillIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 1a7 7 0 1 0 7 7 7.008 7.008 0 0 0-7-7Zm3.28 5.03a.75.75 0 0 1 0 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-1.5-1.5a.75.75 0 0 1 1.06-1.06l.97.97 2.97-2.97a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}

export function CheckIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M13.28 5.28a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06L5.25 12.2l6.97-6.97a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}

export function ClipboardIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.5 1.75v11.5c0 .138.112.25.25.25h3.17a.75.75 0 0 1 0 1.5H2.75A1.75 1.75 0 0 1 1 13.25V1.75C1 .784 1.784 0 2.75 0h8.5C12.216 0 13 .784 13 1.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25Zm7.03 5.03a.75.75 0 0 1 1.06 0l2.5 2.5a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-1.06 0l-1.5-1.5a.75.75 0 1 1 1.06-1.06l.97.97 3.47-3.47-1.5-1.5a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

export function ArrowLeftRightIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8.22 3.22a.749.749 0 0 1 1.06 0l3.25 3.25a.749.749 0 0 1 0 1.06l-3.25 3.25a.749.749 0 1 1-1.06-1.06l1.97-1.97H2.75a.75.75 0 0 1 0-1.5h7.44L8.22 4.28a.749.749 0 0 1 0-1.06Zm-.44 6.56a.749.749 0 0 1-1.06 0l-3.25-3.25a.749.749 0 0 1 0-1.06l3.25-3.25a.749.749 0 1 1 1.06 1.06L6.81 5.25h7.44a.75.75 0 0 1 0 1.5H6.81l1.97 1.97a.749.749 0 0 1 0 1.06Z" />
    </svg>
  );
}

export function FolderOpenIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M.513 1.513A1.75 1.75 0 0 1 1.75 1h3.5c.55 0 1.07.26 1.4.7l.9 1.2a.25.25 0 0 0 .2.1H13a1 1 0 0 1 1 1v.5H2.75a.75.75 0 0 0 0 1.5H14a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4.25c0-.232.028-.459.083-.674l.66-2.387A1.75 1.75 0 0 1 3.455.25h9.795a.75.75 0 0 1 0 1.5H3.455a.25.25 0 0 0-.245.173l-.36 1.303A1.752 1.752 0 0 1 1.75 4.5H.25a.75.75 0 0 1 0 1.5h1.5v5c0 .966.784 1.75 1.75 1.75h10.5A1.75 1.75 0 0 0 15.75 11V5c0-.69-.56-1.25-1.25-1.25H6.7l-.9-1.2a.25.25 0 0 0-.2-.1H1.75a.25.25 0 0 0-.237.163l-.28.843a.75.75 0 0 1-1.44-.472l.66-2.387Z" />
    </svg>
  );
}

export function PencilIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M11.28 1.72a.75.75 0 0 1 1.06 0l1.94 1.94a.75.75 0 0 1 0 1.06l-9.72 9.72a.75.75 0 0 1-.53.22H2a.75.75 0 0 1-.75-.75v-2.03a.75.75 0 0 1 .22-.53l9.81-9.63ZM9.97 3.5l.53.53-7.47 7.47-.53-.53 7.47-7.47ZM3.5 10.47l2.03 2.03-2.03.53-.53-2.03ZM12.5 5.47l.53-.53-1.94-1.94-.53.53 1.94 1.94Z" />
    </svg>
  );
}

export function TrashIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M6.25 1a.75.75 0 0 0-.75.75V3H2.75a.75.75 0 0 0 0 1.5h.36l.702 9.828A1.75 1.75 0 0 0 5.555 16h4.89a1.75 1.75 0 0 0 1.742-1.672L12.89 4.5h.36a.75.75 0 0 0 0-1.5H10.5V1.75A.75.75 0 0 0 9.75 1h-3.5ZM7 2.5h2V3H7v-.5Zm-1.64 2h5.28l-.69 9.672a.25.25 0 0 1-.249.228H5.3a.25.25 0 0 1-.249-.228L5.36 4.5ZM6.5 7a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0v-5A.75.75 0 0 1 6.5 7Zm3 0a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0v-5A.75.75 0 0 1 9.5 7Z" />
    </svg>
  );
}

export function ServerIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v1.5C0 5.216.784 6 1.75 6h12.5A1.75 1.75 0 0 0 16 4.25v-1.5A1.75 1.75 0 0 0 14.25 1H1.75ZM1.5 2.75a.25.25 0 0 1 .25-.25h12.5a.25.25 0 0 1 .25.25v1.5a.25.25 0 0 1-.25.25H1.75a.25.25 0 0 1-.25-.25v-1.5ZM1.75 9A1.75 1.75 0 0 0 0 10.75v1.5C0 13.216.784 14 1.75 14h12.5A1.75 1.75 0 0 0 16 12.25v-1.5A1.75 1.75 0 0 0 14.25 9H1.75ZM1.5 10.75a.25.25 0 0 1 .25-.25h12.5a.25.25 0 0 1 .25.25v1.5a.25.25 0 0 1-.25.25H1.75a.25.25 0 0 1-.25-.25v-1.5ZM4.5 3.5a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Zm0 8a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

export function KeyIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.5 1a3.5 3.5 0 0 0-3.106 5.137l-4.81 4.81a1.5 1.5 0 0 0-.44 1.06v1.843a.5.5 0 0 0 .5.5h1.5a.75.75 0 0 0 .75-.75V12.5h1a.75.75 0 0 0 .75-.75V10.5h1.25a.5.5 0 0 0 .5-.5V8.75h.344a1.5 1.5 0 0 0 1.06-.44l.24-.24A3.5 3.5 0 1 0 10.5 1Zm-2 3.5a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z" />
    </svg>
  );
}

export function LoaderIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      className={`animate-spin ${className}`}
      aria-hidden="true"
    >
      <path
        d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z"
        strokeWidth="1.5"
        strokeDasharray="28"
        strokeDashoffset="8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SlidersHorizontalIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M.75 3h5.5a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1 0-1.5Zm0 4h14.5a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1 0-1.5Zm0 4h9.5a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1 0-1.5Zm9.5-4.5a.75.75 0 0 1 .75-.75h4.25a.75.75 0 0 1 0 1.5H11a.75.75 0 0 1-.75-.75Zm-3-2.5a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5H8a.75.75 0 0 1-.75-.75Zm-4 8a.75.75 0 0 1 .75-.75h6.25a.75.75 0 0 1 0 1.5H3.5a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

export function RefreshIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M1.5 8a6.5 6.5 0 0 1 11.086-4.628.75.75 0 0 0 1.043-1.078A8 8 0 1 0 0 8a.75.75 0 0 0 1.5 0Zm11.25 2.5a.75.75 0 0 0 0 1.5h.004a.75.75 0 0 0 0-1.5h-.004ZM14.414 8.75a.75.75 0 0 0 0 1.5h.086a.75.75 0 0 0 0-1.5h-.086Zm.664-2.164a.75.75 0 0 0 0 1.5h.172a.75.75 0 0 0 0-1.5h-.172ZM13.75 4a.75.75 0 0 0 0 1.5h.25a.75.75 0 0 0 0-1.5h-.25Zm.914.777a.75.75 0 0 0 0 1.5h.086a.75.75 0 0 0 0-1.5h-.086Z" />
    </svg>
  );
}

export function BrainIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M5.5 1A2.5 2.5 0 0 0 3 3.5v.5c0 .137.011.272.032.404A4 4 0 0 0 5 12h.5v1.25a.75.75 0 0 0 1.5 0V12h2v1.25a.75.75 0 0 0 1.5 0V12h.5a4 4 0 0 0 3.78-2.5H15a1 1 0 0 0 0-2h-.22a4 4 0 0 0-3.748-3.5H11a2.5 2.5 0 0 0-2.45-2H5.5ZM4.5 3.5a1 1 0 0 1 1-1h3.05a1 1 0 0 1 .99.895A4.05 4.05 0 0 0 8.5 4H8a2 2 0 0 0-2 2v.22A4 4 0 0 0 5 6h-.5a1 1 0 0 1-.95-.684A1 1 0 0 0 4.5 3.5ZM5 7.5h-.5A2.5 2.5 0 0 0 2 10v.25A2.5 2.5 0 0 0 4.5 12.75H5V11a1 1 0 0 0-1-1V8.5a1 1 0 0 0 1 1V7.5Zm6 0V9.5a1 1 0 0 0 1-1V10a1 1 0 0 0-1 1v1.75h.5A2.5 2.5 0 0 0 14 10.25V10a2.5 2.5 0 0 0-3-2.5Z" />
    </svg>
  );
}

export function LayersIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8.492.309a.75.75 0 0 0-.984 0l-7 5.5a.75.75 0 0 0 0 1.191l7 5.5a.75.75 0 0 0 .984 0l7-5.5a.75.75 0 0 0 0-1.191l-7-5.5ZM8 1.8l5.44 4.275L8 10.35 2.56 6.075 8 1.8ZM2.008 9.675a.75.75 0 0 1 1.06.028L8 14.45l4.932-4.747a.75.75 0 0 1 1.036 1.088l-5.5 5.3a.75.75 0 0 1-1.036-.001l-5.5-5.3a.75.75 0 0 1 .028-1.06Z" />
    </svg>
  );
}

export function CalendarIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.75 1a.75.75 0 0 0-.75.75V3H1.75a.75.75 0 0 0 0 1.5H3v2H1.75a.75.75 0 0 0 0 1.5H3v2H1.75a.75.75 0 0 0 0 1.5H3v1.25c0 .966.784 1.75 1.75 1.75h7.5A1.75 1.75 0 0 0 14 12.75V11.5h1.25a.75.75 0 0 0 0-1.5H14v-2h1.25a.75.75 0 0 0 0-1.5H14v-2h1.25a.75.75 0 0 0 0-1.5H14V1.75a.75.75 0 0 0-.75-.75h-9.5ZM4.5 3h7v1.5h-7V3Zm7 3v2h-7V6h7Zm-7 5v-1.5h7V11h-7Z" />
    </svg>
  );
}

export function LockIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 5.5V4a4 4 0 0 1 8 0v1.5h.25c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 12.25 16H3.75A1.75 1.75 0 0 1 2 14.25V7.25C2 6.284 2.784 5.5 3.75 5.5H4ZM5.5 4a2.5 2.5 0 0 1 5 0v1.5h-5V4Zm-1.75 3a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25h-8.5Z" />
    </svg>
  );
}

export function MailIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M1.75 2A1.75 1.75 0 0 0 0 3.75v.736a.75.75 0 0 0 0 .027v7.737C0 13.216.784 14 1.75 14h12.5A1.75 1.75 0 0 0 16 12.25V4.513a.75.75 0 0 0 0-.027V3.75A1.75 1.75 0 0 0 14.25 2H1.75ZM14.5 4.625v7.625a.25.25 0 0 1-.25.25H1.75a.25.25 0 0 1-.25-.25V4.625l6.066 3.79a.75.75 0 0 0 .868-.001L14.5 4.626ZM13.25 3.5a.25.25 0 0 0-.132-.5H2.882a.25.25 0 0 0-.132.5L8 6.835 13.25 3.5Z" />
    </svg>
  );
}

export function BookIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.75 1A1.75 1.75 0 0 0 1 2.75v10.5c0 .966.784 1.75 1.75 1.75h10.5A1.75 1.75 0 0 0 15 13.25v-8.5A1.75 1.75 0 0 0 13.25 3H7.823l-.587-.587A1.75 1.75 0 0 0 6 1.75L2.75 1ZM6 3H2.75a.25.25 0 0 0-.25.25V4h6V3ZM3.5 5.5h9v7.75a.25.25 0 0 1-.25.25H3.75a.25.25 0 0 1-.25-.25V5.5Z" />
    </svg>
  );
}

export function UserPlusIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8.5 1.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM7 4a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM5.696 9.123A4.5 4.5 0 0 1 8.5 7.5c1.48 0 2.772.716 3.568 1.81a.75.75 0 0 1-1.192.912A3 3 0 0 0 8.5 9a3 3 0 0 0-2.384 1.144.75.75 0 0 1-1.192-.912ZM2.5 4a.75.75 0 0 1 .75-.75h.5V2.5a.75.75 0 0 1 1.5 0v.75h.75a.75.75 0 0 1 0 1.5h-.75v.75a.75.75 0 0 1-1.5 0v-.75h-.5A.75.75 0 0 1 2.5 4Z" />
    </svg>
  );
}

export function MoreIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM1.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm13 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    </svg>
  );
}

export function InfoIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM.5 8a7.5 7.5 0 1 1 15 0A7.5 7.5 0 0 1 .5 8Zm7.5 1.75a.75.75 0 0 1 .75.75v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 1 .75-.75Zm0-3a.75.75 0 0 0 0 1.5h.008a.75.75 0 0 0 0-1.5H8Z" />
    </svg>
  );
}

export function GripVerticalIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <circle cx="6" cy="3" r="1.25" />
      <circle cx="10" cy="3" r="1.25" />
      <circle cx="6" cy="8" r="1.25" />
      <circle cx="10" cy="8" r="1.25" />
      <circle cx="6" cy="13" r="1.25" />
      <circle cx="10" cy="13" r="1.25" />
    </svg>
  );
}

export function LightbulbIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 1.5a4.5 4.5 0 0 0-2.246 8.368.75.75 0 0 0-.004.132v1a.75.75 0 0 0 .75.75h3a.75.75 0 0 0 .75-.75v-1a.75.75 0 0 0-.004-.132A4.501 4.501 0 0 0 8 1.5ZM5 6a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm3.75 5.25h-1.5v-.75h1.5v.75Zm0-2.25h-1.5V8.5a.75.75 0 0 1 .75-.75h.75a.75.75 0 0 1 0 1.5h-.75V9h.75a.75.75 0 0 1 0 1.5Z" />
    </svg>
  );
}

export function EyeIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 3c3.682 0 6.948 2.414 7.904 5.627a.75.75 0 0 1 0 .746C14.948 12.586 11.682 15 8 15S1.052 12.586.096 9.373a.75.75 0 0 1 0-.746C1.052 4.414 4.318 2 8 2v1Zm0 2C4.71 5 1.931 7.32.856 9.5c1.075 2.18 3.854 4.5 7.144 4.5s6.069-2.32 7.144-4.5C14.069 7.32 11.29 5 8 5Zm0 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
    </svg>
  );
}

export function EyeOffIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M.143 2.31a.75.75 0 0 1 1.047-.167l12.5 9a.75.75 0 0 1-.88 1.214L.31 3.357a.75.75 0 0 1-.167-1.047Zm3.506.958A6.15 6.15 0 0 1 8 3c3.682 0 6.948 2.414 7.904 5.627a.75.75 0 0 1 0 .746 10.873 10.873 0 0 1-2.493 3.22L11.73 11.19A4.479 4.479 0 0 0 12.5 9.5c-1.075-2.18-3.854-4.5-7.144-4.5a7.623 7.623 0 0 0-1.665.197L3.65 3.268Zm1.78.99L9.82 7.5H9.25a1.5 1.5 0 0 0-.86 2.71l-3.936 2.835A6.238 6.238 0 0 1 3.5 9.5c1.075-2.18 3.854-4.5 7.144-4.5.655 0 1.29.076 1.897.219l-2.717 1.957A2.484 2.484 0 0 0 8 7.5c-.3 0-.593.053-.866.151L5.43 4.258Z" />
    </svg>
  );
}

export function ActivityIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M1.5 8a6.5 6.5 0 0 1 13 0 .75.75 0 0 0 1.5 0 8 8 0 1 0-8 8 .75.75 0 0 0 0-1.5A6.5 6.5 0 0 1 1.5 8Z" />
      <path d="M12.25 10.25a.75.75 0 0 0 0-1.5h-.005a.75.75 0 0 0 0 1.5h.005Z" />
      <path d="M14.243 9.75a.75.75 0 0 0 0-1.5h-.005a.75.75 0 0 0 0 1.5h.005Z" />
    </svg>
  );
}

export function XCircleFillIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 1a7 7 0 1 0 7 7 7.008 7.008 0 0 0-7-7Zm2.28 4.22a.75.75 0 0 1 0 1.06L9.06 8l1.22 1.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-1.22 1.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 5.72 6.78a.75.75 0 0 1 1.06-1.06L8 6.94l1.22-1.22a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}

export function CommandIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1A1.5 1.5 0 0 1 6 3.5V5h4V3.5A1.5 1.5 0 0 1 11.5 2h1A1.5 1.5 0 0 1 14 3.5v1A1.5 1.5 0 0 1 12.5 6H11v4h1.5A1.5 1.5 0 0 1 14 11.5v1a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5V11H6v1.5A1.5 1.5 0 0 1 4.5 14h-1A1.5 1.5 0 0 1 2 12.5v-1A1.5 1.5 0 0 1 3.5 10H5V6H3.5A1.5 1.5 0 0 1 2 4.5v-1ZM5 5V3.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5H5Zm1 1v4h4V6H6Zm4-1h1.5a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5V5Zm0 6v1.5a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5H10Zm-4 0H4.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5V11Z" />
    </svg>
  );
}

export function InboxIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.75 1A1.75 1.75 0 0 0 1 2.75v10.5c0 .966.784 1.75 1.75 1.75h10.5A1.75 1.75 0 0 0 15 13.25v-8.5A1.75 1.75 0 0 0 13.25 3H7.823l-.587-.587A1.75 1.75 0 0 0 6 1.75L2.75 1ZM2.5 2.75a.25.25 0 0 1 .25-.25H6c.133 0 .26.053.354.146l.646.647a.75.75 0 0 0 .53.207h5.72a.25.25 0 0 1 .25.25V4H2.5V2.75Zm0 2.75h11v7.75a.25.25 0 0 1-.25.25H2.75a.25.25 0 0 1-.25-.25V5.5Z" />
    </svg>
  );
}

export function UserSearchIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8.5 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM6.5 5a2 2 0 1 1 4 0 2 2 0 0 1-4 0ZM2 13.746C2 11.82 4.348 10 8 10s6 1.82 6 3.746a.5.5 0 0 1-.494.504H2.494A.5.5 0 0 1 2 13.746ZM3.516 12.75h8.968A3.988 3.988 0 0 0 8 11.5a3.988 3.988 0 0 0-4.484 1.25ZM13.737 6.177a.75.75 0 0 1 1.06 0l.47.47.47-.47a.749.749 0 0 1 1.06 1.06l-.47.47.47.47a.749.749 0 0 1-1.06 1.06l-.47-.47-.47.47a.749.749 0 0 1-1.06-1.06l.47-.47-.47-.47a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

export function CodeIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M4.72 3.22a.75.75 0 0 1 1.06 1.06L2.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25Zm6.56 0a.75.75 0 0 1 0 1.06L13.94 8l-2.66 2.72a.75.75 0 1 1-1.06-1.06L12.94 8 10.22 4.28a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}

export function ArrowUpRightIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M5.22 3.22a.749.749 0 0 1 1.06 0l5.5 5.5a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L9 7.94v4.31a.75.75 0 0 1-1.5 0V7.94l-1.72 1.72a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l5.5-5.5Z" />
    </svg>
  );
}

export function PartyPopperIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M13.78 1.72a.75.75 0 0 1 0 1.06L12.06 4.5l1.72 1.72a.75.75 0 0 1-1.06 1.06L11.06 5.56 3.5 13.12a.75.75 0 0 1-1.06-1.06L10 4.5 6.94 1.47a.75.75 0 0 1 1.06-1.06L10 2.44 13.06.47a.75.75 0 0 1 .72.25ZM15.53 3.22a.75.75 0 0 1 0-1.06L14.97.53a.75.75 0 0 1 1.06-1.06l.56.56a.75.75 0 0 1-1.06 1.06l-.56-.56a.75.75 0 0 1 .56 2.69Z" />
    </svg>
  );
}

export function FileTextIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 1.75A.75.75 0 0 1 2.75 1h7.5a.75.75 0 0 1 .53.22l3 3a.75.75 0 0 1 .22.53v9.5a.75.75 0 0 1-.75.75h-10.5a.75.75 0 0 1-.75-.75V1.75ZM3.5 2.5v11h9V5.06L10.44 3H3.5ZM5 6.75A.75.75 0 0 1 5.75 6h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 6.75ZM5 9.75A.75.75 0 0 1 5.75 9h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 5 9.75Z" />
    </svg>
  );
}

export function CloudIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M4.5 4A3.5 3.5 0 0 0 1 7.5 3.5 3.5 0 0 0 2.357 11H2a2.5 2.5 0 0 1 0-5h.04a.75.75 0 0 0 .71-.5A4.972 4.972 0 0 1 7.5 3a4.972 4.972 0 0 1 4.75 2.5.75.75 0 0 0 .71.5H13a2.5 2.5 0 0 1 1.643 4.357A.75.75 0 0 0 14.357 10.5H4.5a2.501 2.501 0 0 1 0-5V4Zm0 1.5a2 2 0 0 0 0 4h8.857a1 1 0 0 0 .143-2h-.25a.75.75 0 0 1-.75-.75A3.464 3.464 0 0 0 7.5 4.5a3.464 3.464 0 0 0-3 1.75.75.75 0 0 1-.75.75H4.5Z" />
    </svg>
  );
}

export function TerminalIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M.44 3.72a.749.749 0 0 1 1.06 0l3.75 3.75a.749.749 0 0 1 0 1.06l-3.75 3.75a.749.749 0 1 1-1.06-1.06L3.69 8 .44 4.78a.749.749 0 0 1 0-1.06ZM6.5 11a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5h-6A.75.75 0 0 1 6.5 11Z" />
    </svg>
  );
}

export function LinkIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M7.775 3.275a.75.75 0 0 0 1.06 1.06l1.25-1.25a2 2 0 1 1 2.83 2.83l-2.5 2.5a2 2 0 0 1-2.83 0 .75.75 0 0 0-1.06 1.06 3.5 3.5 0 0 0 4.95 0l2.5-2.5a3.5 3.5 0 0 0-4.95-4.95l-1.25 1.25Zm-4.69 9.64a2 2 0 0 1 0-2.83l2.5-2.5a2 2 0 0 1 2.83 0 .75.75 0 0 0 1.06-1.06 3.5 3.5 0 0 0-4.95 0l-2.5 2.5a3.5 3.5 0 0 0 4.95 4.95l1.25-1.25a.75.75 0 0 0-1.06-1.06l-1.25 1.25a2 2 0 0 1-2.83 0Z" />
    </svg>
  );
}

export function SendIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z" />
    </svg>
  );
}

export function UsersRoundIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M2 2.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm4.5 6.1A5.48 5.48 0 0 1 8 8.5a5.48 5.48 0 0 1 1.5.1 2.752 2.752 0 1 0-3 0ZM3.5 5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm6 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm-8 6a2 2 0 0 0-2 2v.5a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5V13a2 2 0 0 0-2-2h-6Z" />
    </svg>
  );
}


export function BeakerIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M5 5.5V2.75a.75.75 0 0 1 1.5 0V5.5a.75.75 0 0 0 .3.6l5.6 4.2a1.25 1.25 0 0 1 .45.95v2.5a.25.25 0 0 1-.25.25H3.4a.25.25 0 0 1-.25-.25v-2.5c0-.38.173-.736.45-.95l5.6-4.2a.75.75 0 0 0 .3-.6ZM3.25 15.25h9.5a1.75 1.75 0 0 0 1.75-1.75v-2.5a2.75 2.75 0 0 0-1-2.1L8 4.75V2.75A2.25 2.25 0 0 0 5.75.5h4.5a2.25 2.25 0 0 0-2.25 2.25V4.75L2.5 8.9a2.75 2.75 0 0 0-1 2.1v2.5A1.75 1.75 0 0 0 3.25 15.25Z" />
    </svg>
  );
}

export function BugIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M4.72.22a.75.75 0 0 1 1.06 0l1.204 1.203A3.489 3.489 0 0 1 8.5 1.036c.545 0 1.058.147 1.517.387L11.22.22a.75.75 0 0 1 1.06 1.06l-1.026 1.027A3.5 3.5 0 0 1 12.5 5.5v.25a.75.75 0 0 1-1.5 0V5.5a2 2 0 1 0-4 0v1.228a4.491 4.491 0 0 1 2.586 2.37.75.75 0 0 1-1.364.62A2.992 2.992 0 0 0 5.5 7.75c-.599 0-1.138.175-1.592.47A.75.75 0 0 1 3.12 7.23 4.49 4.49 0 0 1 5.5 6.076V5.5a3.5 3.5 0 0 1 1.25-2.693L5.78 1.78a.75.75 0 0 1 0-1.06ZM3.5 10.5a.75.75 0 0 1 .75.75v1a2.25 2.25 0 0 0 4.5 0v-1a.75.75 0 0 1 1.5 0v1a3.75 3.75 0 0 1-7.5 0v-1a.75.75 0 0 1 .75-.75Z" />
    </svg>
  );
}

export function FlaskConicalIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M4.5 1.25a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-.75v3.25c0 .134.036.265.104.379l4.5 7A1.75 1.75 0 0 1 13.1 15H2.9a1.75 1.75 0 0 1-1.504-2.871l4.5-7A.748.748 0 0 0 6 4.75V2H5.25a.75.75 0 0 1-.75-.75ZM7.5 2v2.75c0 .4-.12.79-.346 1.124L3.44 11.5h9.12L8.846 5.874A1.998 1.998 0 0 1 8.5 4.75V2h-1Z" />
    </svg>
  );
}

export function RotateCcwIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M2.78 2.78a.75.75 0 0 1 1.06 0L5.5 4.44V2.75a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-.75.75h-3a.75.75 0 0 1 0-1.5h1.69L3.84 3.84a.75.75 0 0 1 0-1.06ZM8 1.5a6.5 6.5 0 1 0 6.5 6.5.75.75 0 0 1 1.5 0 8 8 0 1 1-8-8 .75.75 0 0 1 0 1.5Z" />
    </svg>
  );
}

export function ChevronUpIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3.22 10.53a.75.75 0 0 0 1.06 1.06L8 7.81l3.72 3.78a.75.75 0 1 0 1.06-1.06l-4.25-4.25a.75.75 0 0 0-1.06 0l-4.25 4.25Z" />
    </svg>
  );
}

export function ClipboardListIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3.25 1.5a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25H10a.75.75 0 0 1-1.5 0H7.5a.75.75 0 0 1-1.5 0H3.25ZM2 1.75C2 .784 2.784 0 3.75 0h1.768a2.24 2.24 0 0 1 2.232 2h.5a2.24 2.24 0 0 1 2.232-2h1.768C13.216 0 14 .784 14 1.75v12.5A1.75 1.75 0 0 1 12.25 16H3.75A1.75 1.75 0 0 1 2 14.25V1.75ZM11 5.75a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Zm-8 0A.75.75 0 0 1 3.75 5h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 3 5.75ZM11 8.75a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Zm-8 0A.75.75 0 0 1 3.75 8h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 3 8.75ZM11 11.75a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Zm-8 0a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

export function ShieldCheckIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="m8.533.133 5.25 1.68A1.75 1.75 0 0 1 15 3.48V7c0 1.566-.32 3.182-1.303 4.682-.983 1.498-2.585 2.813-5.032 3.855a1.697 1.697 0 0 1-1.33 0c-2.447-1.042-4.049-2.357-5.032-3.855C1.32 10.182 1 8.566 1 7V3.48a1.75 1.75 0 0 1 1.217-1.667l5.25-1.68a1.748 1.748 0 0 1 1.066 0Zm-.61 1.429.001.001-5.25 1.68a.251.251 0 0 0-.174.237V7c0 1.36.275 2.666 1.057 3.859.784 1.194 2.121 2.342 4.366 3.298a.196.196 0 0 0 .154 0c2.245-.957 3.582-2.103 4.366-3.297C13.225 9.666 13.5 8.358 13.5 7V3.48a.25.25 0 0 0-.174-.238l-5.25-1.68a.25.25 0 0 0-.153 0ZM11.28 6.28l-3.5 3.5a.75.75 0 0 1-1.06 0l-1.5-1.5a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215l.97.97 2.97-2.97a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z" />
    </svg>
  );
}

export function ArrowUpDown({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3.22 7.47a.75.75 0 0 0 1.06 1.06L8 4.81l3.72 3.72a.75.75 0 1 0 1.06-1.06l-4.25-4.25a.75.75 0 0 0-1.06 0L3.22 7.47Zm0 1.06a.75.75 0 0 1 1.06 0L8 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

export function ChevronLeft({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M10.78 3.22a.75.75 0 0 1 0 1.06L6.06 8l4.72 4.72a.75.75 0 1 1-1.06 1.06L4.47 8.53a.75.75 0 0 1 0-1.06l5.25-5.25a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}

export function FileCode({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3 1.75C3 .784 3.784 0 4.75 0h4.086c.464 0 .909.185 1.237.513l3.414 3.414c.328.328.513.773.513 1.237V8.5a.75.75 0 0 1-1.5 0V5.75H8.75A2.25 2.25 0 0 1 6.5 3.5V1.5H4.75a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h2a.75.75 0 0 1 0 1.5h-2A1.75 1.75 0 0 1 3 14.25V1.75ZM8 3.5V1.5l4 4H8.75a.75.75 0 0 1-.75-.75ZM5.53 9.22a.75.75 0 0 1 0 1.06l-.72.72.72.72a.75.75 0 1 1-1.06 1.06l-1.25-1.25a.75.75 0 0 1 0-1.06l1.25-1.25a.75.75 0 0 1 1.06 0Zm5.44 5.56a.75.75 0 0 1-.14-1.052L12.1 12l-1.27-1.728a.75.75 0 1 1 1.2-.9l1.5 2a.75.75 0 0 1-.13.628l-1.5 2a.75.75 0 0 1-1.05.14Z" />
    </svg>
  );
}

export function GitBranch({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
    </svg>
  );
}

export function GitFork({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
    </svg>
  );
}

export function GitCompare({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M1.5 11.25a.75.75 0 0 1 1.5 0V12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-.75a.75.75 0 0 1 1.5 0V12a3.5 3.5 0 0 1-3.5 3.5H5A3.5 3.5 0 0 1 1.5 12v-.75ZM3.5 4.75A.75.75 0 0 0 2 4.75V4a3.5 3.5 0 0 1 3.5-3.5h6A3.5 3.5 0 0 1 15 4v.75a.75.75 0 0 0 1.5 0V4A5 5 0 0 0 11.5-1h-6A5 5 0 0 0 .5 4v.75a.75.75 0 0 0 1.5 0V4.75Zm6.81 5.06a.75.75 0 1 0-.81-1.262l-1.7 1.09a.75.75 0 0 0 0 1.266l1.7 1.092a.75.75 0 1 0 .81-1.262L8.9 9.8l1.41-.99ZM5.69 5.14a.75.75 0 1 1 .81 1.262L5.1 7.01l1.41.99a.75.75 0 1 1-.81 1.262l-1.7-1.09a.751.751 0 0 1 0-1.266l1.7-1.09Z" />
    </svg>
  );
}

export function HeartPulse({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M5.234 11.103a.75.75 0 0 1 .729-.126l1.903.635 1.906-.636a.75.75 0 0 1 .729.127l2.267 1.89a.75.75 0 0 0 1.184-.763l-1.773-8.866a1.75 1.75 0 0 0-1.73-1.414H5.55a1.75 1.75 0 0 0-1.73 1.414l-1.773 8.866a.75.75 0 0 0 1.184.763l2.003-1.67ZM2.648 14.5h10.704a1.655 1.655 0 0 0 1.655-1.655v-.437a.219.219 0 0 0-.235-.219c-.793.07-1.859.45-3.542-1.041l-1.05-.875a2.25 2.25 0 0 0-2.203-.508l-1.9.634a2.25 2.25 0 0 1-1.884-.034L2.335 9.943a.219.219 0 0 0-.243.028v.875c0 .914.741 1.655 1.655 1.655h-.099Z" />
    </svg>
  );
}

export function LayoutDashboard({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M1.75 1.5a.25.25 0 0 0-.25.25v5.5c0 .138.112.25.25.25h5.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25h-5.5ZM0 1.75C0 .784.784 0 1.75 0h5.5C8.216 0 9 .784 9 1.75v5.5A1.75 1.75 0 0 1 7.25 9h-5.5A1.75 1.75 0 0 1 0 7.25v-5.5ZM1.75 10a.25.25 0 0 0-.25.25v4c0 .138.112.25.25.25h4a.25.25 0 0 0 .25-.25v-4a.25.25 0 0 0-.25-.25h-4ZM0 10.25C0 9.284.784 8.5 1.75 8.5h4c.966 0 1.75.784 1.75 1.75v4A1.75 1.75 0 0 1 5.75 16h-4A1.75 1.75 0 0 1 0 14.25v-4ZM9.75 10a.25.25 0 0 1 .25-.25h4a.25.25 0 0 1 .25.25v4a.25.25 0 0 1-.25.25h-4a.25.25 0 0 1-.25-.25v-4ZM9 10.25c0-.966.784-1.75 1.75-1.75h4c.966 0 1.75.784 1.75 1.75v4A1.75 1.75 0 0 1 14.75 16h-4A1.75 1.75 0 0 1 9 14.25v-4ZM9.75 1.5a.25.25 0 0 0-.25.25v2.5c0 .138.112.25.25.25h4.5a.25.25 0 0 0 .25-.25v-2.5a.25.25 0 0 0-.25-.25h-4.5ZM8 1.75C8 .784 8.784 0 9.75 0h4.5C15.216 0 16 .784 16 1.75v2.5A1.75 1.75 0 0 1 14.25 6h-4.5A1.75 1.75 0 0 1 8 4.25v-2.5Z" />
    </svg>
  );
}

export function LineChart({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M1.5 14.25a.75.75 0 0 1 .75-.75h11.5a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1-.75-.75Zm.5-8a.75.75 0 0 1 .97-.43l2.28.76L8.5 4.44l3.22 1.08a.75.75 0 0 1-.5 1.42L8.5 5.94 5.25 7.56l-2.28-.76a.75.75 0 0 1-.97-.43ZM2 10.75a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Zm5 0a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

export function MessageSquarePlus({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h8.5C13.216 0 14 .784 14 1.75v8.5A1.75 1.75 0 0 1 12.25 12h-4.336a.25.25 0 0 0-.177.073L5.5 14.31V12.75a.75.75 0 0 0-.75-.75H3.75A1.75 1.75 0 0 1 2 10.25v-8.5ZM3.75 1.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h1.5a.75.75 0 0 1 .75.75v1.69l2.22-2.22a1.75 1.75 0 0 1 1.238-.513h4.292a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25H3.75ZM8.75 4.5a.75.75 0 0 0-1.5 0v1.25H6a.75.75 0 0 0 0 1.5h1.25V8.5a.75.75 0 0 0 1.5 0V7.25H10a.75.75 0 0 0 0-1.5H8.75V4.5Z" />
    </svg>
  );
}

export function Minus({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M2.75 8a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5h-9A.75.75 0 0 1 2.75 8Z" />
    </svg>
  );
}

export function PieChart({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M9 1.5a6.5 6.5 0 1 0 3.25 12.13.75.75 0 1 1 .75 1.3 8 8 0 1 1-4-14.93.75.75 0 0 1 0 1.5ZM9 2a6.5 6.5 0 0 1 4.89 10.84A.75.75 0 0 0 14.6 12 5 5 0 1 1 9 4a.75.75 0 0 0 0-1.5ZM9 4.5a4.5 4.5 0 1 0 3.822 2.201.75.75 0 0 1 1.273-.8 6 6 0 1 1-7.596 9.598.75.75 0 0 1 .802-1.272A4.5 4.5 0 0 0 9 14.5V4.5Z" />
    </svg>
  );
}

export function Settings2({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M11.695 7.846A3.47 3.47 0 0 0 11.5 7a3.5 3.5 0 0 0-.195-.846l1.43-1.43a.75.75 0 0 0 0-1.06l-1.399-1.4a.75.75 0 0 0-1.06 0L8.845 3.695A3.51 3.51 0 0 0 8 3.5a3.47 3.47 0 0 0-.846.195L5.724 2.265a.75.75 0 0 0-1.06 0l-1.4 1.399a.75.75 0 0 0 0 1.06l1.43 1.43A3.47 3.47 0 0 0 4.5 7c0 .286.034.568.098.841l-1.334 1.334a.75.75 0 0 0 0 1.06l1.4 1.4a.75.75 0 0 0 1.06 0l1.43-1.43A3.51 3.51 0 0 0 8 10.5c.287 0 .57-.034.846-.098l1.43 1.43a.75.75 0 0 0 1.06 0l1.399-1.4a.75.75 0 0 0 0-1.06l-1.04-1.526ZM8 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
    </svg>
  );
}

export function ThumbsUp({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M1.896 13.933a.75.75 0 0 1-.483-.94 6.27 6.27 0 0 1 1.242-2.374A5.73 5.73 0 0 1 1.5 7.75V5.5a4.75 4.75 0 0 1 9.055-2.014A6.208 6.208 0 0 1 15.016 3.5a.75.75 0 0 1 .733.99 6.26 6.26 0 0 1-2.216 3.315.75.75 0 0 1-.794 1.196A4.75 4.75 0 0 0 8.75 9.5h-1a3.75 3.75 0 0 0-3.582 2.622C2.9 13.18 2.376 13.84 1.896 13.933ZM8.75 8c1.313 0 2.487.45 3.422 1.202A7.76 7.76 0 0 0 13.022 10.6 3.25 3.25 0 0 1 13 5.211V4.647a4.708 4.708 0 0 0-2.656.984.75.75 0 0 1-.957-1.15A6.253 6.253 0 0 1 13 2.98V2.75a3.25 3.25 0 0 0-6.5 0v.336a.75.75 0 0 1-.698.748A3.25 3.25 0 0 0 3 6.75h1.75a.75.75 0 0 1 0 1.5H3v-1.5V6.75A4.75 4.75 0 0 1 8 11.5h.75v-1.5H8V8.75h.75Z" />
    </svg>
  );
}

export function ThumbsDown({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M14.104 2.067a.75.75 0 0 1 .483.94 6.27 6.27 0 0 1-1.242 2.374A5.73 5.73 0 0 1 14.5 8.25v2.25a4.75 4.75 0 0 1-9.055 2.014A6.208 6.208 0 0 1 .984 12.5a.75.75 0 0 1-.733-.99 6.26 6.26 0 0 1 2.216-3.315.75.75 0 0 1 .794-1.196A4.75 4.75 0 0 0 7.25 6.5h1a3.75 3.75 0 0 0 3.582-2.622c1.27-1.059 1.794-1.72 2.272-1.811ZM7.25 8c-1.313 0-2.487-.45-3.422-1.202A7.76 7.76 0 0 0 2.978 5.4 3.25 3.25 0 0 1 3 10.789v.564a4.708 4.708 0 0 0 2.656-.984.75.75 0 0 1 .957 1.15A6.253 6.253 0 0 1 3 13.02v.23a3.25 3.25 0 0 0 6.5 0v-.336a.75.75 0 0 1 .698-.748A3.25 3.25 0 0 0 13 9.25H11.25a.75.75 0 0 1 0-1.5H13v1.5V9.25A4.75 4.75 0 0 1 8 4.5h-.75v1.5H8V6.75h-.75Z" />
    </svg>
  );
}

export function PieChartIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M9 1.5a6.5 6.5 0 1 0 3.25 12.13.75.75 0 1 1 .75 1.3 8 8 0 1 1-4-14.93.75.75 0 0 1 0 1.5ZM9 2a6.5 6.5 0 0 1 4.89 10.84A.75.75 0 0 0 14.6 12 5 5 0 1 1 9 4a.75.75 0 0 0 0-1.5ZM9 4.5a4.5 4.5 0 1 0 3.822 2.201.75.75 0 0 1 1.273-.8 6 6 0 1 1-7.596 9.598.75.75 0 0 1 .802-1.272A4.5 4.5 0 0 0 9 14.5V4.5Z" />
    </svg>
  );
}

export function ToggleLeftIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M2 8a4 4 0 0 1 4-4h4a4 4 0 0 1 0 8H6a4 4 0 0 1-4-4Zm4-2.5a2.5 2.5 0 0 0 0 5h4a2.5 2.5 0 0 0 0-5H6Zm0 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
    </svg>
  );
}

export function NavFlagIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3.75 1a.75.75 0 0 0-.75.75V14.5a.75.75 0 0 0 1.5 0V10h8.75a.75.75 0 0 0 .53-1.28L10.53 5.5l3.22-3.22A.75.75 0 0 0 13.25 1H3.75ZM4.5 2.5h7.69L9.22 5.22a.75.75 0 0 0 0 1.06l2.97 2.72H4.5v-6.5Z" />
    </svg>
  );
}

export function Activity({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M2 2.75A.75.75 0 0 1 2.75 2h.38a.75.75 0 0 1 .72.56l2.62 9.82 1.76-4.89a.75.75 0 0 1 .7-.49h4.32a.75.75 0 0 1 0 1.5H9.38l-2.17 6.01a.75.75 0 0 1-1.4-.07L3.1 4.26l-.35 1.32a.75.75 0 0 1-.73.57h-.27a.75.75 0 0 1-.75-.75V2.75Z" />
    </svg>
  );
}

export function Inbox({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M2.8 2.06A1.75 1.75 0 0 1 4.41 1h7.18c.7 0 1.333.417 1.61 1.06l2.74 6.395a.75.75 0 0 1 .06.295v4.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25v-4.5a.75.75 0 0 1 .06-.295L2.8 2.06Zm1.61.44a.25.25 0 0 0-.23.152L1.904 8h2.596a.75.75 0 0 1 .693.464L6.19 10.5h3.62l.997-2.036a.75.75 0 0 1 .693-.464h2.596L11.82 2.652a.25.25 0 0 0-.23-.152H4.41Z" />
    </svg>
  );
}
