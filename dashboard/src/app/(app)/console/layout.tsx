/**
 * Console Layout — Pass-through shell.
 *
 * The actual layout (AuthGuard, ConsoleTopBar, ThreeZone, ConsoleBottomBar,
 * CommandPalette, HelpWidget, UndoToastContainer) is rendered by the
 * parent (app)/layout.tsx as the permanent shell for all authenticated pages.
 *
 * This layout exists so Next.js App Router can apply route-specific
 * loading.tsx and error.tsx boundaries scoped to /console/*.
 */

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
