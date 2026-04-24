'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/error-state';

export default function TenantDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service in production
    console.error('Tenant detail page error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <ErrorState
        title="Failed to load tenant details"
        message={
          error.message ?? 'An unexpected error occurred while loading this page.'
        }
        onRetry={() => reset()}
      />
    </div>
  );
}
```

Now let me continue creating the remaining files - the cells pages.
