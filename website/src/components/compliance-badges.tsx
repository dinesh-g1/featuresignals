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

export function SOC2Badge() {
  return (
    <BadgeWrapper href="/security" title="SOC 2 Type II — Controls Implemented">
      <div className="flex flex-col items-center justify-center text-center">
        <span className="text-[6px] font-semibold uppercase tracking-wider text-slate-400 sm:text-[7px]">
          AICPA
        </span>
        <span className="text-[11px] font-extrabold leading-tight text-slate-800 sm:text-xs">
          SOC 2
        </span>
        <span className="text-[5px] font-bold uppercase tracking-wide text-blue-600 sm:text-[6px]">
          Type II
        </span>
      </div>
    </BadgeWrapper>
  );
}

export function GDPRBadge() {
  return (
    <BadgeWrapper href="/security" title="GDPR Compliant">
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
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span className="mt-0.5 text-[11px] font-extrabold leading-tight text-slate-800 sm:text-xs">
          GDPR
        </span>
      </div>
    </BadgeWrapper>
  );
}

export function HIPAABadge() {
  return (
    <BadgeWrapper href="/security" title="HIPAA Compliant — BAA Available">
      <div className="flex flex-col items-center justify-center text-center">
        <svg
          className="h-3 w-3 text-teal-500 sm:h-3.5 sm:w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
        <span className="mt-0.5 text-[11px] font-extrabold leading-tight text-slate-800 sm:text-xs">
          HIPAA
        </span>
      </div>
    </BadgeWrapper>
  );
}

export function ISO27001Badge() {
  return (
    <BadgeWrapper href="/security" title="ISO 27001 — Controls Mapped">
      <div className="flex flex-col items-center justify-center text-center">
        <span className="text-[6px] font-semibold uppercase tracking-wider text-slate-400 sm:text-[7px]">
          ISO
        </span>
        <span className="text-[11px] font-extrabold leading-tight text-slate-800 sm:text-xs">
          27001
        </span>
      </div>
    </BadgeWrapper>
  );
}

export function ComplianceBadges() {
  return (
    <div className="flex items-center gap-2.5">
      <SOC2Badge />
      <HIPAABadge />
      <GDPRBadge />
      <ISO27001Badge />
    </div>
  );
}
