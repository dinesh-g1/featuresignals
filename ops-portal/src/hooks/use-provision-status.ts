"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface ProvisionEvent {
  id: string;
  cell_id: string;
  event_type: string;
  metadata?: Record<string, string>;
  created_at: string;
}

export type ProvisionStatus =
  | "idle"
  | "connecting"
  | "streaming"
  | "completed"
  | "failed";

export function useProvisionStatus(cellId: string | null): {
  events: ProvisionEvent[];
  status: ProvisionStatus;
  error: string | null;
} {
  const [events, setEvents] = useState<ProvisionEvent[]>([]);
  const [status, setStatus] = useState<ProvisionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const connect = useCallback(() => {
    if (!cellId) {
      setStatus("idle");
      return;
    }

    // Clean up any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setStatus("connecting");
    setError(null);

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("ops_access_token")
        : null;
    const baseUrl = `${process.env.NEXT_PUBLIC_OPS_API_URL || "/api/v1/ops"}/cells/${cellId}/provision-status`;
    const url = token
      ? `${baseUrl}?token=${encodeURIComponent(token)}`
      : baseUrl;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setStatus("streaming");
    };

    es.addEventListener("provisioning_completed", () => {
      setStatus("completed");
      es.close();
    });

    es.addEventListener("provisioning_failed", () => {
      setStatus("failed");
      es.close();
    });

    es.addEventListener("bootstrap_completed", () => {
      // Still waiting for provisioning_completed
    });

    es.addEventListener("bootstrap_failed", () => {
      setStatus("failed");
      es.close();
    });

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ProvisionEvent;
        setEvents((prev) => {
          // Prevent duplicates
          if (prev.some((e) => e.id === data.id)) return prev;
          return [...prev, data];
        });
        // Update status based on event type
        if (
          data.event_type === "provisioning_completed" ||
          data.event_type === "bootstrap_completed"
        ) {
          if (data.event_type === "provisioning_completed") {
            setStatus("completed");
          }
        } else if (
          data.event_type === "provisioning_failed" ||
          data.event_type === "bootstrap_failed"
        ) {
          setStatus("failed");
        } else if (data.event_type === "provisioning_started") {
          setStatus("connecting");
        }
      } catch {
        // Ignore parse errors for keepalive comments
      }
    };

    es.onerror = () => {
      setError("Connection lost. Retrying...");
      es.close();
      // Auto-reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };
  }, [cellId]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return { events, status, error };
}
