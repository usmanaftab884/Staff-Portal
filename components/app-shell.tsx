"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getStaff, logout } from "@/lib/auth";
import { initials } from "@/lib/format";
import { useScanSession } from "@/lib/scan-session";
import type { StaffProfile } from "@/lib/types";
import { HistoryIcon, HomeIcon, LogoutIcon, ScanIcon } from "./icons";

const sidebarNav = [
  { href: "/", label: "Dashboard", icon: HomeIcon },
  { href: "/scan", label: "Scan", icon: ScanIcon, scan: true },
  { href: "/history", label: "History", icon: HistoryIcon },
] as const;

const mobileNav = [
  { href: "/", label: "Dashboard", icon: HomeIcon },
  { href: "/scan", label: "Scan", icon: ScanIcon, scan: true },
  { href: "/history", label: "History", icon: HistoryIcon },
] as const;

function pageCopy(pathname: string, staff: StaffProfile | null) {
  if (pathname === "/") {
    return { title: staff?.fullName ?? "Staff", subtitle: "" };
  }
  if (pathname.startsWith("/scan")) {
    return { title: "Scan QR", subtitle: "Camera opens on tap, then details appear automatically" };
  }
  if (pathname.startsWith("/history")) {
    return { title: "This session", subtitle: "Activity from this browser tab" };
  }
  return { title: "Giga Mall", subtitle: "Staff Panel" };
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function StaffAvatar({
  staff,
  onLogout,
}: {
  staff: StaffProfile | null;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {initials(staff?.fullName || "S")}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-white shadow-[0_16px_40px_rgba(28,25,23,0.12)]"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate font-medium">{staff?.fullName || "Staff"}</p>
            {staff?.employeeCode ? (
              <p className="mt-0.5 text-xs text-muted">{staff.employeeCode}</p>
            ) : null}
            {staff?.email ? (
              <p className="mt-1 truncate text-sm text-muted">{staff.email}</p>
            ) : null}
          </div>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-muted transition hover:bg-background hover:text-foreground"
            onClick={onLogout}
          >
            <LogoutIcon className="h-4 w-4" />
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { open: scanOpen, startScan } = useScanSession();
  const [staff, setStaff] = useState<StaffProfile | null>(null);

  useEffect(() => {
    setStaff(getStaff());
  }, []);

  const copy = pageCopy(pathname, staff);

  function signOut() {
    logout();
    window.location.replace("/login");
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-chrome px-4 py-6 lg:flex">
        <div className="px-3 pb-8">
          <p className="text-lg font-semibold tracking-tight">Giga Mall</p>
          <p className="text-sm text-muted">Staff panel</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {sidebarNav.map((item) => {
            const scan = "scan" in item && item.scan;
            const active = scan ? scanOpen : isActive(pathname, item.href);
            const className = `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-nav-active text-foreground"
                : "text-muted hover:bg-background hover:text-foreground"
            }`;
            if (scan) {
              return (
                <button key={item.href} type="button" className={className} onClick={() => void startScan()}>
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </button>
              );
            }
            return (
              <Link key={item.href} href={item.href} className={className}>
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-1">
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-background hover:text-foreground"
          >
            <LogoutIcon className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-chrome px-4 py-4 lg:hidden">
          <div>
            <p className="text-xl font-semibold tracking-tight">{copy.title}</p>
            {copy.subtitle ? <p className="mt-0.5 text-sm text-muted">{copy.subtitle}</p> : null}
          </div>
          <StaffAvatar staff={staff} onLogout={signOut} />
        </header>

        <header className="sticky top-0 z-20 hidden items-center justify-between border-b border-border bg-chrome px-8 py-5 lg:flex">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
            {copy.subtitle ? <p className="mt-1 text-sm text-muted">{copy.subtitle}</p> : null}
          </div>
          <StaffAvatar staff={staff} onLogout={signOut} />
        </header>

        <main className="px-4 py-6 pb-28 lg:px-8 lg:py-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-border bg-surface px-2 py-2 lg:hidden">
        {mobileNav.map((item) => {
          const scan = "scan" in item && item.scan;
          const active = scan ? scanOpen : isActive(pathname, item.href);
          const className = `flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium ${
            active ? "bg-nav-active text-foreground" : "text-muted"
          }`;
          if (scan) {
            return (
              <button key={item.href} type="button" className={className} onClick={() => void startScan()}>
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          }
          return (
            <Link key={item.href} href={item.href} className={className}>
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
