/**
 * EventBus — lightweight cross-component event system for cache invalidation.
 *
 * When any CRUD operation modifies projects or environments, dispatch the
 * corresponding event so that the ContextHierarchy, sidebars, and other
 * context-aware components can refetch without a full page reload.
 *
 * Usage:
 *   EventBus.dispatch("projects:changed");
 *   EventBus.on("projects:changed", () => { /* reload * / });
 *   const cleanup = EventBus.subscribe("environments:changed", () => { ... });
 *   cleanup(); // unsubscribe
 */

type EventName = "projects:changed" | "environments:changed" | "flags:changed";

const EVENT_PREFIX = "fs:";

function toKey(name: EventName): string {
  return `${EVENT_PREFIX}${name}`;
}

export const EventBus = {
  /** Dispatch a data change event. */
  dispatch(name: EventName): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(toKey(name)));
  },

  /** Subscribe to a data change event. Returns an unsubscribe function. */
  subscribe(name: EventName, callback: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    const key = toKey(name);
    const handler = () => callback();
    window.addEventListener(key, handler);
    return () => window.removeEventListener(key, handler);
  },

  /** Subscribe once (auto-unsubscribes after first trigger). */
  once(name: EventName, callback: () => void): void {
    if (typeof window === "undefined") return;
    const cleanup = EventBus.subscribe(name, () => {
      callback();
      cleanup();
    });
  },
};
