export default function AppLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent/10 border-t-accent" />
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  );
}
