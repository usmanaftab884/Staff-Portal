"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getStaffAuditEvents } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { formatDateTime, karachiDate, shiftIsoDate } from "@/lib/format";
import { useScanSession } from "@/lib/scan-session";
import type { StaffAuditAction, StaffAuditEvent } from "@/lib/types";
import { SearchIcon } from "./icons";
import { reasonToBadge, StatusBadge } from "./status-badge";
import type { BadgeStatus } from "@/lib/types";

type Filter = "all" | "confirmed" | "rejected" | "reprinted";
type DatePreset = "today" | "7d" | "30d" | "custom";

function orderedRange(start: string, end: string) {
  if (start && end && start > end) return { from: end, to: start };
  return {
    from: start || undefined,
    to: end || undefined,
  };
}

function requireToken() {
  const token = getAccessToken();
  if (!token) {
    window.location.replace("/login");
    throw new Error("Not signed in");
  }
  return token;
}

function filterToAction(filter: Filter): StaffAuditAction | undefined {
  if (filter === "confirmed") return "confirm";
  if (filter === "reprinted") return "reprint";
  if (filter === "rejected") return "validate";
  return undefined;
}

function eventBadge(event: StaffAuditEvent): BadgeStatus {
  if (event.action === "confirm" || event.action === "reprint") return "redeemed";
  if (event.success) return "unused";
  return reasonToBadge(event.reason);
}

function eventTitle(event: StaffAuditEvent) {
  if (event.action === "confirm") return event.success ? "Confirmed" : "Confirm failed";
  if (event.action === "reprint") return event.success ? "Reprinted" : "Reprint failed";
  return event.success ? "Validated" : event.reason || "Invalid scan";
}

export function HistoryView() {
  const { open } = useScanSession();
  const wasOpen = useRef(open);
  const [events, setEvents] = useState<StaffAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [from, setFrom] = useState(() => karachiDate());
  const [to, setTo] = useState(() => karachiDate());
  const [preset, setPreset] = useState<DatePreset>("today");
  const today = karachiDate();

  const load = useCallback(async (nextFilter: Filter, quiet = false) => {
    setError("");
    if (!quiet) setLoading(true);
    try {
      const range = orderedRange(from, to);
      const rows = await getStaffAuditEvents(requireToken(), {
        action: filterToAction(nextFilter),
        from: range.from,
        to: range.to,
        limit: 100,
      });
      setEvents(
        nextFilter === "rejected" ? rows.filter((row) => !row.success) : rows,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load history.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  useEffect(() => {
    if (wasOpen.current && !open) void load(filter, true);
    wasOpen.current = open;
  }, [filter, load, open]);

  function applyPreset(next: DatePreset) {
    const end = karachiDate();
    setPreset(next);
    if (next === "today") {
      setFrom(end);
      setTo(end);
      return;
    }
    if (next === "7d") {
      setFrom(shiftIsoDate(end, -6));
      setTo(end);
      return;
    }
    if (next === "30d") {
      setFrom(shiftIsoDate(end, -29));
      setTo(end);
    }
  }

  function onFromChange(value: string) {
    setPreset("custom");
    setFrom(value);
  }

  function onToChange(value: string) {
    setPreset("custom");
    setTo(value);
  }

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return events;
    return events.filter((item) => {
      const haystack = `${item.customerName} ${item.phoneMasked ?? ""} ${item.reason ?? ""} ${item.codes.join(" ")} ${eventTitle(item)}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [events, query]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="lg:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="mt-2 text-sm text-muted">
          Scan, confirm, and reprint trail for your counter.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ["today", "Today"],
          ["7d", "Last 7 days"],
          ["30d", "Last 30 days"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => applyPreset(value)}
            className={`rounded-full px-3 py-2 text-sm ${
              preset === value
                ? "bg-nav-active text-foreground"
                : "bg-surface text-muted ring-1 ring-border hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <label className="space-y-1.5">
          <span className="text-xs text-muted">From</span>
          <input
            type="date"
            value={from}
            max={to || today}
            onChange={(event) => onFromChange(event.target.value)}
            className="field"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs text-muted">To</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            max={today}
            onChange={(event) => onToChange(event.target.value)}
            className="field"
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="field has-icon"
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

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <p>{error}</p>
          <button type="button" className="mt-2 font-medium underline" onClick={() => void load(filter)}>
            Try again
          </button>
        </div>
      ) : null}

      <div className="card overflow-hidden">
        {loading ? (
          <p className="px-5 py-16 text-center text-sm text-muted">Loading history…</p>
        ) : rows.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="font-medium">No matching activity</p>
            <p className="mt-1 text-sm text-muted">
              No validates, confirms, or reprints in this date range.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((item) => (
              <li key={item.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="font-medium">{item.customerName}</p>
                  <p className="truncate text-sm text-muted">
                    {eventTitle(item)}
                    {item.phoneMasked ? ` · ${item.phoneMasked}` : ""}
                    {item.codes.length ? ` · ${item.codes.join(", ")}` : ""}
                    {item.action !== "validate" && item.reason ? ` · ${item.reason}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted">{formatDateTime(item.at)}</p>
                </div>
                <StatusBadge status={eventBadge(item)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
