"use client";

import { useScanSession } from "@/lib/scan-session";
import { ScanIcon } from "./icons";

export function ScanLaunch() {
  const { startScan } = useScanSession();

  return (
    <div className="mx-auto flex min-h-80 max-w-md flex-col items-center justify-center text-center">
      <h2 className="text-xl font-semibold tracking-tight">Scan a customer QR</h2>
      <p className="mt-2 text-sm text-muted">
        Open the camera on this tap. After a successful scan you will hear a beep and the voucher details will appear.
      </p>
      <button type="button" className="btn-primary mt-6" onClick={() => void startScan()}>
        <ScanIcon className="h-4 w-4" />
        Open camera
      </button>
    </div>
  );
}
