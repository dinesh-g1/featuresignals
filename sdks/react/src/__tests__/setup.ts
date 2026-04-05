// Minimal jsdom setup for Node.js test runner
import jsdom from "jsdom";
const { JSDOM } = jsdom;

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost",
  pretendToBeVisual: true,
});

// Assign DOM globals needed by React and @testing-library/react.
// Only set properties that don't already exist or are writable.
const globals: Record<string, unknown> = {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver,
};

for (const [key, value] of Object.entries(globals)) {
  if (!(key in globalThis)) {
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  }
}

// navigator may already be defined (Node 22), so wrap in try/catch
try {
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    writable: true,
    configurable: true,
  });
} catch {
  // Already defined as non-configurable
}

type TestGlobalThis = typeof globalThis & {
  requestAnimationFrame?: typeof globalThis.requestAnimationFrame;
  cancelAnimationFrame?: typeof globalThis.cancelAnimationFrame;
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const testGlobal = globalThis as TestGlobalThis;

if (typeof testGlobal.requestAnimationFrame === "undefined") {
  testGlobal.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(cb, 0) as unknown as number;
  testGlobal.cancelAnimationFrame = (id: number) => clearTimeout(id);
}

// React checks this for act() warnings
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;
