"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { unlockScanBeep } from "./beep";
import { cameraErrorMessage, openDeviceCamera, stopStream } from "./camera";

type ScanSession = {
  open: boolean;
  stream: MediaStream | null;
  cameraError: string;
  startScan: () => Promise<void>;
  closeScan: () => void;
  clearStream: () => void;
};

const ScanSessionContext = createContext<ScanSession | null>(null);

export function ScanProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const streamRef = useRef<MediaStream | null>(null);

  const clearStream = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    setStream(null);
  }, []);

  const startScan = useCallback(async () => {
    unlockScanBeep();
    setCameraError("");
    try {
      const next = await openDeviceCamera();
      stopStream(streamRef.current);
      streamRef.current = next;
      setStream(next);
      setOpen(true);
    } catch (error) {
      clearStream();
      setCameraError(cameraErrorMessage(error));
      setOpen(true);
    }
  }, [clearStream]);

  const closeScan = useCallback(() => {
    clearStream();
    setCameraError("");
    setOpen(false);
  }, [clearStream]);

  const value = useMemo(
    () => ({ open, stream, cameraError, startScan, closeScan, clearStream }),
    [open, stream, cameraError, startScan, closeScan, clearStream],
  );

  return <ScanSessionContext.Provider value={value}>{children}</ScanSessionContext.Provider>;
}

export function useScanSession() {
  const store = useContext(ScanSessionContext);
  if (!store) {
    throw new Error("useScanSession must be used inside ScanProvider");
  }
  return store;
}
