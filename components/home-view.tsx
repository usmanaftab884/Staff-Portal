"use client";

import Link from "next/link";
import { formatDateTime, isSameDay } from "@/lib/format";
import { useScanSession } from "@/lib/scan-session";
import { useSessionLog } from "@/lib/session-log";
import { ChevronDownIcon, ScanIcon } from "./icons";
import { reasonToBadge, StatusBadge } from "./status-badge";
import type { BadgeStatus } from "@/lib/types";

function eventBadge(kind: "rejected" | "confirmed" | "reprinted", reason?: string): BadgeStatus {
  if (kind === "confirmed") return "redeemed";
  if (kind === "reprinted") return "redeemed";
  return reasonToBadge(reason);
}

export function HomeView() {
  const { startScan } = useScanSession();
  const { events } = useSessionLog();
  const today = events.filter((item) => isSameDay(item.at));
  const confirmed = today.filter((item) => item.kind === "confirmed").length;
  const rejected = today.filter((item) => item.kind === "rejected").length;
  const reprinted = today.filter((item) => item.kind === "reprinted").length;

  const stats = [
    { label: "Actions today", value: today.length, tone: "bg-white" },
    { label: "Confirmed", value: confirmed, tone: "bg-emerald-50" },
    { label: "Rejected", value: rejected, tone: "bg-rose-50" },
    { label: "Reprints", value: reprinted, tone: "bg-amber-50" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="lg:hidden">
        <button type="button" className="btn-scan w-full rounded-2xl py-3.5" onClick={() => void startScan()}>
          <ScanIcon className="h-4 w-4" />
          Scan QR
        </button>
      </div>

      <div className="hidden justify-end pr-1 lg:flex">
        <button type="button" className="btn-scan" onClick={() => void startScan()}>
          <ScanIcon className="h-4 w-4" />
          Scan QR
        </button>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`rounded-2xl px-5 py-5 ${stat.tone}`}>
            <p className="text-sm text-muted">{stat.label}</p>
            <p className="mt-3 text-4xl font-semibold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl bg-white px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">This session</h2>
          <Link href="/history" className="text-sm font-medium text-blue-700 hover:underline">
            View all
          </Link>
        </div>
        {events.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <ScanIcon className="h-7 w-7 text-muted" />
            <p className="mt-4 font-medium">No scans yet</p>
            <p className="mt-1 text-sm text-muted">Confirmed and rejected scans show up here.</p>
            <ChevronDownIcon className="mt-8 h-5 w-5 text-muted" />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {events.slice(0, 5).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.customerName}</p>
                  <p className="truncate text-sm text-muted">
                    {item.detail}
                    {item.codes.length ? ` · ${item.codes.join(", ")}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusBadge status={eventBadge(item.kind, item.reason)} />
                  <p className="text-xs text-muted">{formatDateTime(item.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
