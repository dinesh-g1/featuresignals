/**
 * Console Loading — Full-page skeleton.
 *
 * Displayed while the Console SSR shell streams in and the client-side
 * ConsoleShell hydrates. Uses the three-zone skeleton layout matching
 * the Console surface proportions: CONNECT | LIFECYCLE | LEARN.
 */

import { SkeletonConsole } from "@/components/console/skeleton-console";

export default function ConsoleLoading() {
  return <SkeletonConsole />;
}
