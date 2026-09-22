"use client";

import { useMemo, useState } from "react";
import { formatDateTime } from "@/lib/format";
import { useSessionLog } from "@/lib/session-log";
import type { SessionKind } from "@/lib/types";
import { SearchIcon } from "./icons";
import { reasonToBadge, StatusBadge } from "./status-badge";
import type { BadgeStatus } from "@/lib/types";

type Filter = "all" | SessionKind;

function eventBadge(kind: SessionKind, reason?: string): BadgeStatus {
  if (kind === "confirmed" || kind === "reprinted") return "redeemed";
  return reasonToBadge(reason);
}

export function HistoryView() {
  const { events } = useSessionLog();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events.filter((item) => {
      const matchesFilter = filter === "all" || item.kind === filter;
      const haystack = `${item.customerName} ${item.detail} ${item.codes.join(" ")}`.toLowerCase();
      return matchesFilter && (!needle || haystack.includes(needle));
    });
  }, [events, filter, query]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="lg:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">This session</h1>
        <p className="mt-2 text-sm text-muted">
          Confirms, rejects, and reprints from this browser tab. Nothing is stored after logout.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="field pl-10"
            placeholder="Search by guest, reason, or code"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {(["all", "confirmed", "rejected", "reprinted"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-3 py-2 text-sm capitalize ${
                filter === value
                  ? "bg-nav-active text-foreground"
                  : "bg-surface text-muted ring-1 ring-border hover:text-foreground"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="font-medium">No matching activity</p>
            <p className="mt-1 text-sm text-muted">
              This list is session-only. There is no staff history API yet.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((item) => (
              <li key={item.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="font-medium">{item.customerName}</p>
                  <p className="truncate text-sm text-muted">
                    {item.detail}
                    {item.codes.length ? ` · ${item.codes.join(", ")}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted">{formatDateTime(item.at)}</p>
                </div>
                <StatusBadge status={eventBadge(item.kind, item.reason)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
