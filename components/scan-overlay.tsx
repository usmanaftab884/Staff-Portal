"use client";

import { useScanSession } from "@/lib/scan-session";
import { ScanView } from "./scan-view";

export function ScanOverlay() {
  const { open, stream, cameraError } = useScanSession();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <ScanView layout="overlay" initialStream={stream} cameraError={cameraError} />
    </div>
  );
}
