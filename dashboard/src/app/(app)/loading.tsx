import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function AppLoading() {
  return (
    <LoadingSpinner
      variant="lotus"
      size="lg"
      fullPage
      className="min-h-[60vh]"
    />
  );
}
