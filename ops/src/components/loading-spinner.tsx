export function LoadingSpinner({ fullPage = false }: { fullPage?: boolean }) {
  if (fullPage) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-500 border-t-transparent" />
    </div>
  );
}
