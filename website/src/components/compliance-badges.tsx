import Link from "next/link";

function BadgeWrapper({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={title}
      className="group flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-200 bg-white shadow-sm transition-all hover:border-indigo-200 hover:shadow-md sm:h-[72px] sm:w-[72px]"
    >
      {children}
    </Link>
  );
}

export function AuditTrailBadge() {
  return (
    <BadgeWrapper href="/security" title="Tamper-Evident Audit Trail — SHA-256 Integrity Chain">
      <div className="flex flex-col items-center justify-center text-center">
        <svg
          className="h-3 w-3 text-indigo-500 sm:h-3.5 sm:w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <span className="mt-0.5 text-[9px] font-extrabold leading-tight text-slate-800 sm:text-[10px]">
          Audit
        </span>
      </div>
    </BadgeWrapper>
  );
}

export function EncryptionBadge() {
  return (
    <BadgeWrapper href="/security" title="End-to-End Encryption — TLS 1.3 + AES-256">
      <div className="flex flex-col items-center justify-center text-center">
        <svg
          className="h-3 w-3 text-emerald-500 sm:h-3.5 sm:w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span className="mt-0.5 text-[9px] font-extrabold leading-tight text-slate-800 sm:text-[10px]">
          Encrypted
        </span>
      </div>
    </BadgeWrapper>
  );
}

export function RBACBadge() {
  return (
    <BadgeWrapper href="/security" title="Role-Based Access Control + MFA">
      <div className="flex flex-col items-center justify-center text-center">
        <svg
          className="h-3 w-3 text-blue-500 sm:h-3.5 sm:w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span className="mt-0.5 text-[9px] font-extrabold leading-tight text-slate-800 sm:text-[10px]">
          RBAC
        </span>
      </div>
    </BadgeWrapper>
  );
}

export function OpenFeatureBadge() {
  return (
    <BadgeWrapper href="/security" title="OpenFeature Compatible — CNCF Standard">
      <div className="flex flex-col items-center justify-center text-center">
        <span className="text-[6px] font-semibold uppercase tracking-wider text-slate-400 sm:text-[7px]">
          CNCF
        </span>
        <span className="text-[9px] font-extrabold leading-tight text-slate-800 sm:text-[10px]">
          Open
        </span>
        <span className="text-[9px] font-extrabold leading-tight text-slate-800 sm:text-[10px]">
          Feature
        </span>
      </div>
    </BadgeWrapper>
  );
}

export function ComplianceBadges() {
  return (
    <div className="flex items-center gap-2.5">
      <AuditTrailBadge />
      <EncryptionBadge />
      <RBACBadge />
      <OpenFeatureBadge />
    </div>
  );
}
