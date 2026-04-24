export default function TenantDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-bg-tertiary" />
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-7 w-48 rounded bg-bg-tertiary" />
              <div className="h-5 w-16 rounded-full bg-bg-tertiary" />
              <div className="h-5 w-20 rounded bg-bg-tertiary" />
            </div>
            <div className="h-4 w-64 rounded bg-bg-tertiary" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 rounded-lg bg-bg-tertiary" />
          <div className="h-9 w-24 rounded-lg bg-bg-tertiary" />
          <div className="h-9 w-28 rounded-lg bg-bg-tertiary" />
          <div className="h-9 w-28 rounded-lg bg-accent-danger/20" />
        </div>
      </div>

      {/* Overview Card */}
      <div className="rounded-lg border border-border-default bg-bg-secondary p-6">
        <div className="h-5 w-20 rounded bg-bg-tertiary mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 rounded bg-bg-tertiary" />
              <div className="h-5 w-32 rounded bg-bg-tertiary" />
            </div>
          ))}
        </div>
      </div>

      {/* Two-column sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Keys skeleton */}
        <div className="rounded-lg border border-border-default bg-bg-secondary p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <div className="h-5 w-24 rounded bg-bg-tertiary" />
              <div className="h-4 w-20 rounded bg-bg-tertiary" />
            </div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border-default bg-bg-tertiary/50 px-3 py-2.5"
              >
                <div className="space-y-1.5">
                  <div className="h-4 w-36 rounded bg-bg-tertiary" />
                  <div className="h-3 w-24 rounded bg-bg-tertiary" />
                </div>
                <div className="h-8 w-8 rounded bg-bg-tertiary" />
              </div>
            ))}
          </div>
        </div>

        {/* Current Bill skeleton */}
        <div className="rounded-lg border border-border-default bg-bg-secondary p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <div className="h-5 w-24 rounded bg-bg-tertiary" />
              <div className="h-4 w-40 rounded bg-bg-tertiary" />
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="h-4 w-32 rounded bg-bg-tertiary mb-3" />
            <div className="h-10 w-36 rounded bg-bg-tertiary" />
          </div>
        </div>
      </div>

      {/* Activity Log skeleton */}
      <div className="rounded-lg border border-border-default bg-bg-secondary p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <div className="h-5 w-24 rounded bg-bg-tertiary" />
            <div className="h-4 w-20 rounded bg-bg-tertiary" />
          </div>
        </div>
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg px-3 py-2.5"
            >
              <div className="h-6 w-6 rounded-full bg-bg-tertiary shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-full rounded bg-bg-tertiary" />
                <div className="h-3 w-2/3 rounded bg-bg-tertiary" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
