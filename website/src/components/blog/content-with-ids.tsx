import React from "react";

/**
 * Renders children with auto-generated `id` attributes on h2 and h3 elements.
 * This makes them linkable via URL fragments (e.g., #section-name).
 */
export function ContentWithIds({ children }: { children: React.ReactNode }) {
  function addIds(node: React.ReactNode): React.ReactNode {
    if (!node || typeof node !== "object") return node;
    if (Array.isArray(node)) return node.map(addIds);

    const element = node as React.ReactElement & {
      props: { children?: React.ReactNode };
    };

    if (
      (element.type === "h2" || element.type === "h3") &&
      typeof element.props.children === "string"
    ) {
      const id = element.props.children
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      if (typeof element.type !== "string") return element;

      const Tag = element.type as "h2" | "h3";
      return <Tag id={id}>{element.props.children}</Tag>;
    }

    if (element.props?.children) {
      const newChildren = addIds(element.props.children);
      if (typeof element.type === "string") {
        const Tag = element.type as keyof React.JSX.IntrinsicElements;
        const { children: _, ...rest } = element.props;
        return <Tag {...rest}>{newChildren}</Tag>;
      }
    }

    return element;
  }

  return <>{addIds(children)}</>;
}
