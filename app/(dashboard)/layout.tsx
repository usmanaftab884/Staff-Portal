import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/app-shell";
import { ScanOverlay } from "@/components/scan-overlay";
import { ScanProvider } from "@/lib/scan-session";
import { SessionLogProvider } from "@/lib/session-log";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <SessionLogProvider>
        <ScanProvider>
          <AppShell>{children}</AppShell>
          <ScanOverlay />
        </ScanProvider>
      </SessionLogProvider>
    </AuthGate>
  );
}
