import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Helper to create React elements without JSX in .ts files
function h(
  type: string,
  props: Record<string, any> | null,
  ...children: any[]
) {
  const React = require("react");
  return React.createElement(type, props, ...children);
}

// ============================================================
// Next.js mocks
// ============================================================

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, className, ...props }: Record<string, any>) => {
    return h("a", { href, className, ...props }, children);
  },
}));

// ============================================================
// Framer Motion mocks — render children directly, strip animation props
// ============================================================

function createMotionComponent(tag: string) {
  return ({ children, ...props }: Record<string, any>) => {
    const {
      initial,
      animate,
      exit,
      whileInView,
      viewport,
      transition,
      variants,
      layout,
      layoutId,
      onAnimationStart,
      onAnimationComplete,
      ...htmlProps
    } = props;
    return h(tag, htmlProps, children);
  };
}

vi.mock("framer-motion", () => {
  const tags = [
    "div",
    "section",
    "span",
    "button",
    "nav",
    "header",
    "footer",
    "main",
    "article",
    "aside",
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "a",
    "img",
    "svg",
    "path",
    "g",
    "circle",
    "rect",
    "line",
    "text",
    "blockquote",
    "figure",
    "figcaption",
    "form",
    "input",
    "label",
    "table",
    "thead",
    "tbody",
    "tr",
    "td",
    "th",
  ];

  const motion: Record<string, ReturnType<typeof createMotionComponent>> = {};
  for (const tag of tags) {
    motion[tag] = createMotionComponent(tag);
  }

  return {
    motion,
    AnimatePresence: ({ children }: { children?: any }) => children || null,
    MotionConfig: ({ children }: { children?: any }) => children || null,
  };
});

// ============================================================
// Radix UI mocks
// ============================================================

vi.mock("@radix-ui/react-navigation-menu", () => {
  const React = require("react");
  return {
    Root: ({ children, ...props }: Record<string, any>) =>
      React.createElement("nav", props, children),
    List: ({ children, ...props }: Record<string, any>) =>
      React.createElement("ul", props, children),
    Item: ({ children, ...props }: Record<string, any>) =>
      React.createElement("li", props, children),
    Trigger: ({ children, ...props }: Record<string, any>) => {
      const { "data-state": _ds, ...rest } = props;
      return React.createElement("button", rest, children);
    },
    Content: ({ children, ...props }: Record<string, any>) => {
      const { "data-motion": _dm, ...rest } = props;
      return React.createElement("div", rest, children);
    },
    Link: ({ children, asChild, ...props }: Record<string, any>) => {
      if (asChild) return children;
      return React.createElement("a", props, children);
    },
    Indicator: ({ children, ...props }: Record<string, any>) =>
      React.createElement("div", props, children),
    Viewport: ({ children, ...props }: Record<string, any>) =>
      React.createElement("div", props, children),
  };
});

vi.mock("@radix-ui/react-dialog", () => {
  const React = require("react");
  return {
    Root: ({ children }: Record<string, any>) =>
      React.createElement(React.Fragment, null, children),
    Portal: ({ children }: Record<string, any>) =>
      React.createElement(React.Fragment, null, children),
    Overlay: ({ children, ...props }: Record<string, any>) =>
      React.createElement("div", props, children),
    Content: ({ children, forceMount, ...props }: Record<string, any>) => {
      return React.createElement("div", props, children);
    },
    Close: ({ children, asChild, ...props }: Record<string, any>) => {
      if (asChild) return children;
      return React.createElement("button", props, children);
    },
    Trigger: ({ children, ...props }: Record<string, any>) =>
      React.createElement("button", props, children),
  };
});

vi.mock("@radix-ui/react-accordion", () => {
  const React = require("react");
  return {
    Root: ({ children, ...props }: Record<string, any>) =>
      React.createElement("div", { ...props, "data-accordion": "" }, children),
    Item: ({ children, ...props }: Record<string, any>) =>
      React.createElement(
        "div",
        { ...props, "data-accordion-item": "" },
        children,
      ),
    Header: ({ children, ...props }: Record<string, any>) =>
      React.createElement("div", props, children),
    Trigger: ({ children, ...props }: Record<string, any>) =>
      React.createElement("button", props, children),
    Content: ({ children, ...props }: Record<string, any>) =>
      React.createElement("div", props, children),
  };
});

vi.mock("@radix-ui/react-tabs", () => {
  const React = require("react");
  return {
    Root: ({ children, ...props }: Record<string, any>) =>
      React.createElement("div", { ...props, "data-tabs": "" }, children),
    List: ({ children, ...props }: Record<string, any>) =>
      React.createElement("div", props, children),
    Trigger: ({ children, ...props }: Record<string, any>) =>
      React.createElement("button", props, children),
    Content: ({ children, ...props }: Record<string, any>) =>
      React.createElement("div", props, children),
  };
});
