"use client";

import { useEffect, useRef } from "react";
import { createApiReference } from "@scalar/api-reference";
import type { ApiReferenceInstance } from "@scalar/types/api-reference";
import "@scalar/api-reference/style.css";

// Use the local spec file served from /public
const SPEC_URL = "/openapi/featuresignals.json";

export default function ApiPlaygroundPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<ApiReferenceInstance | null>(null);

  useEffect(() => {
    if (!containerRef.current || instanceRef.current) return;

    instanceRef.current = createApiReference(containerRef.current, {
      url: SPEC_URL,
    });

    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="api-playground -mx-6 lg:-mx-10" />;
}
