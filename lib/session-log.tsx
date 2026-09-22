"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SessionEvent } from "./types";

const LOG_KEY = "staff-session-log";

type SessionLogStore = {
  events: SessionEvent[];
  hydrated: boolean;
  addEvent: (event: Omit<SessionEvent, "id" | "at"> & { id?: string; at?: string }) => void;
  clear: () => void;
};

const SessionLogContext = createContext<SessionLogStore | null>(null);

export function SessionLogProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LOG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SessionEvent[];
        if (Array.isArray(parsed)) setEvents(parsed);
      }
    } catch {
      // Ignore corrupt session logs.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(LOG_KEY, JSON.stringify(events));
  }, [events, hydrated]);

  const addEvent = useCallback(
    (event: Omit<SessionEvent, "id" | "at"> & { id?: string; at?: string }) => {
      setEvents((current) => [
        {
          id: event.id ?? `evt_${Date.now()}`,
          at: event.at ?? new Date().toISOString(),
          kind: event.kind,
          customerName: event.customerName,
          detail: event.detail,
          codes: event.codes ?? [],
          reason: event.reason,
        },
        ...current,
      ]);
    },
    [],
  );

  const clear = useCallback(() => {
    setEvents([]);
    sessionStorage.removeItem(LOG_KEY);
  }, []);

  const value = useMemo(
    () => ({ events, hydrated, addEvent, clear }),
    [addEvent, clear, events, hydrated],
  );

  return <SessionLogContext.Provider value={value}>{children}</SessionLogContext.Provider>;
}

export function useSessionLog() {
  const store = useContext(SessionLogContext);
  if (!store) {
    throw new Error("useSessionLog must be used within SessionLogProvider");
  }
  return store;
}
