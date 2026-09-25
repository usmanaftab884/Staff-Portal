"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getStaffDashboard } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { customerDisplayName, karachiDate } from "@/lib/format";
import { useScanSession } from "@/lib/scan-session";
import type { StaffDashboard } from "@/lib/types";
import { ChevronDownIcon, ScanIcon } from "./icons";

function requireToken() {
  const token = getAccessToken();
  if (!token) {
    window.location.replace("/login");
    throw new Error("Not signed in");
  }
  return token;
}

export function HomeView() {
  const { startScan, open } = useScanSession();
  const wasOpen = useRef(open);
  const [date, setDate] = useState(() => karachiDate());
  const [dashboard, setDashboard] = useState<StaffDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const today = karachiDate();
  const isToday = date === today;

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await getStaffDashboard(requireToken(), date);
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard numbers.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (wasOpen.current && !open) void load();
    wasOpen.current = open;
  }, [load, open]);

  const mine = dashboard?.mine;
  const stats = [
    { label: "Scans", value: mine?.scans, tone: "bg-white" },
    { label: "Confirmed", value: mine?.confirms, tone: "bg-emerald-50" },
    { label: "Invalid", value: mine?.invalidScans, tone: "bg-rose-50" },
    { label: "Reprints", value: mine?.reprints, tone: "bg-amber-50" },
  ];
  const customers = dashboard?.customersToday ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="lg:hidden">
        <button type="button" className="btn-scan w-full rounded-2xl py-3.5" onClick={() => void startScan()}>
          <ScanIcon className="h-4 w-4" />
          Scan QR
        </button>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="w-full max-w-xs">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor="dashboard-date" className="text-xs text-muted">
              Date
            </label>
            {!isToday ? (
              <button
                type="button"
                className="text-xs font-medium text-blue-700 hover:underline"
                onClick={() => setDate(today)}
              >
                Today
              </button>
            ) : null}
          </div>
          <input
            id="dashboard-date"
            type="date"
            value={date}
            max={today}
            onChange={(event) => setDate(event.target.value || today)}
            className="field"
          />
        </div>
        <div className="hidden pr-1 lg:block">
          <button type="button" className="btn-scan" onClick={() => void startScan()}>
            <ScanIcon className="h-4 w-4" />
            Scan QR
          </button>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`rounded-2xl px-5 py-5 ${stat.tone}`}>
            <p className="text-sm text-muted">{stat.label}</p>
            <p className="mt-3 text-4xl font-semibold tabular-nums">
              {loading && !dashboard ? "—" : (stat.value ?? 0)}
            </p>
          </div>
        ))}
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <p>{error}</p>
          <button type="button" className="mt-2 font-medium underline" onClick={() => void load()}>
            Try again
          </button>
        </div>
      ) : null}

      <section className="rounded-3xl bg-white px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">{isToday ? "Customers today" : "Customers"}</h2>
          <Link href="/history" className="text-sm font-medium text-blue-700 hover:underline">
            View all
          </Link>
        </div>
        {loading && !dashboard ? (
          <p className="px-5 py-14 text-center text-sm text-muted">Loading customers…</p>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <ScanIcon className="h-7 w-7 text-muted" />
            <p className="mt-4 font-medium">No customers yet</p>
            <p className="mt-1 text-sm text-muted">
              {isToday
                ? "Scans and confirms from today show up here."
                : "No scans or confirms on this date."}
            </p>
            <ChevronDownIcon className="mt-8 h-5 w-5 text-muted" />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {customers.slice(0, 8).map((customer) => {
              const name = customerDisplayName(customer);
              const parts = [
                customer.scanCount ? `${customer.scanCount} scan${customer.scanCount === 1 ? "" : "s"}` : null,
                customer.confirmCount
                  ? `${customer.confirmCount} confirm${customer.confirmCount === 1 ? "" : "s"}`
                  : null,
                customer.reprintCount
                  ? `${customer.reprintCount} reprint${customer.reprintCount === 1 ? "" : "s"}`
                  : null,
              ].filter(Boolean);
              return (
                <li key={customer.userId} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{name}</p>
                    <p className="truncate text-sm text-muted">
                      {customer.phoneMasked ?? "Phone hidden"}
                      {parts.length ? ` · ${parts.join(" · ")}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
