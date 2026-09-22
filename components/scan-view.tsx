"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { confirmQr, validateQr } from "@/lib/api";
import { ApiError } from "@/lib/api-parse";
import { getAccessToken, getStaff } from "@/lib/auth";
import {
  cameraErrorMessage,
  httpsPageUrl,
  isInsecureCameraContext,
  openDeviceCamera,
  stopStream,
} from "@/lib/camera";
import { playScanBeep } from "@/lib/beep";
import { customerDisplayName, initials } from "@/lib/format";
import { useScanSession } from "@/lib/scan-session";
import { useSessionLog } from "@/lib/session-log";
import type { ConfirmResponse, LuckyDrawEntry, ValidateResponse } from "@/lib/types";
import { CameraIcon, CheckIcon, CloseIcon, PrinterIcon } from "./icons";
import { PrintSlips } from "./print-slips";
import { QrCamera } from "./qr-camera";
import { VoucherTicket } from "./voucher-ticket";
import { reasonToBadge, StatusBadge } from "./status-badge";

type Phase = "idle" | "verifying" | "result" | "redeeming" | "done";

function codesFrom(entries: LuckyDrawEntry[]) {
  return entries.map((entry) => entry.entryCode).filter((code): code is string => Boolean(code));
}

export function ScanView({
  layout = "page",
  initialStream = null,
  cameraError = "",
}: {
  layout?: "page" | "overlay";
  initialStream?: MediaStream | null;
  cameraError?: string;
} = {}) {
  const overlay = layout === "overlay";
  const { startScan, closeScan, clearStream } = useScanSession();
  const { addEvent } = useSessionLog();
  const [token, setToken] = useState("");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [validateResult, setValidateResult] = useState<ValidateResponse | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmResponse | null>(null);
  const [busyLabel, setBusyLabel] = useState("");
  const [error, setError] = useState("");
  const [staffName, setStaffName] = useState("Staff");
  const [insecurePage, setInsecurePage] = useState(false);
  const [secureUrl, setSecureUrl] = useState("");

  useEffect(() => {
    setStaffName(getStaff()?.fullName ?? "Staff");
    if (isInsecureCameraContext()) {
      setInsecurePage(true);
      setSecureUrl(httpsPageUrl());
    }
  }, []);

  useEffect(() => {
    if (cameraError) setError(cameraError);
  }, [cameraError]);

  useEffect(() => {
    if (!initialStream) return;
    cameraStreamRef.current = initialStream;
    setCameraStream(initialStream);
    setToken("");
    setValidateResult(null);
    setConfirmResult(null);
    setPhase("idle");
    setError("");
    const video = videoRef.current;
    if (video) {
      video.srcObject = initialStream;
      video.muted = true;
      video.playsInline = true;
      void video.play().catch(() => undefined);
    }
  }, [initialStream]);

  useEffect(() => {
    cameraStreamRef.current = cameraStream;
  }, [cameraStream]);

  useEffect(() => {
    return () => stopStream(cameraStreamRef.current);
  }, []);

  const cameraOn = Boolean(cameraStream);

  function closeCamera() {
    stopStream(cameraStreamRef.current);
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStream(null);
    if (overlay) clearStream();
  }

  async function toggleCamera() {
    if (cameraOn) {
      closeCamera();
      return;
    }
    if (overlay) {
      await startScan();
      return;
    }
    try {
      const stream = await openDeviceCamera();
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        await video.play().catch(() => undefined);
      }
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setError("");
    } catch (err) {
      setError(cameraErrorMessage(err));
    }
  }
  const previewCustomer = confirmResult?.customer ?? validateResult?.customer;
  const previewEntries = confirmResult?.entries ?? validateResult?.entries ?? [];
  const allottedCodes = useMemo(() => codesFrom(previewEntries), [previewEntries]);

  async function requireToken() {
    const accessToken = getAccessToken();
    if (!accessToken) {
      window.location.replace("/login");
      throw new Error("Not signed in");
    }
    return accessToken;
  }

  function handleDetect(value: string) {
    playScanBeep();
    void runValidate(value);
  }

  async function runValidate(rawToken: string) {
    const nextToken = rawToken.trim();
    if (!nextToken) return;
    setToken(nextToken);
    closeCamera();
    setError("");
    setConfirmResult(null);
    setValidateResult(null);
    setPhase("verifying");
    try {
      const accessToken = await requireToken();
      const result = await validateQr(nextToken, accessToken);
      setValidateResult(result);
      setPhase("result");
      if (!result.valid) {
        addEvent({
          kind: "rejected",
          customerName: customerDisplayName(result.customer),
          detail: result.reason,
          reason: result.reason,
          codes: codesFrom(result.entries ?? []),
        });
      }
    } catch (err) {
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Could not validate this QR.");
    }
  }

  function onManualSubmit(event: FormEvent) {
    event.preventDefault();
    void runValidate(token);
  }

  async function runConfirm() {
    const nextToken = token.trim();
    if (!nextToken) return;
    setPhase("redeeming");
    setBusyLabel("Confirming…");
    setError("");
    try {
      const accessToken = await requireToken();
      const result = await confirmQr(nextToken, accessToken);
      setConfirmResult(result);
      setPhase("done");
      addEvent({
        kind: "confirmed",
        customerName: customerDisplayName(result.customer ?? validateResult?.customer),
        detail: result.alreadyConfirmed
          ? "Already confirmed — existing codes loaded"
          : "Lucky-draw entries redeemed",
        codes: codesFrom(result.entries),
      });
    } catch (err) {
      setPhase("result");
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not confirm this QR.",
      );
    } finally {
      setBusyLabel("");
    }
  }

  function resetScan() {
    setToken("");
    setValidateResult(null);
    setConfirmResult(null);
    setPhase("idle");
    closeCamera();
    setError("");
    if (overlay) {
      void startScan();
    }
  }

  function dismissOverlay() {
    setToken("");
    setValidateResult(null);
    setConfirmResult(null);
    setPhase("idle");
    closeCamera();
    setError("");
    closeScan();
  }

  const alreadyRedeemed =
    validateResult !== null &&
    !validateResult.valid &&
    reasonToBadge(validateResult.reason) === "already_used";

  const showCamera = cameraOn || phase === "idle";
  const showFallback = !cameraOn && (Boolean(error) || insecurePage);

  return (
    <div
      className={
        overlay
          ? "mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 px-4 py-4 lg:px-8"
          : "mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]"
      }
    >
      <PrintSlips
        customer={previewCustomer}
        entries={previewEntries}
        staffName={staffName}
      />

      <section className="space-y-4">
        {overlay ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Scan QR</h1>
              <p className="mt-1 text-sm text-muted">
                Point the camera at the customer QR. Details appear automatically.
              </p>
            </div>
            <button type="button" className="btn-secondary" onClick={dismissOverlay}>
              <CloseIcon className="h-4 w-4" />
              Close
            </button>
          </div>
        ) : (
          <div className="lg:hidden">
            <h1 className="text-2xl font-semibold tracking-tight">Scan QR</h1>
            <p className="mt-2 text-sm text-muted">
              Scan or paste the customer QR token, then confirm to allot voucher codes.
            </p>
          </div>
        )}

        {insecurePage ? (
          <div className="rounded-2xl border border-accent/40 bg-nav-active px-4 py-3 text-sm">
            <p className="font-medium">This phone cannot open the camera on HTTP.</p>
            <p className="mt-1 text-muted">
              Open the HTTPS address, accept the certificate warning, then tap Start camera.
            </p>
            {secureUrl ? (
              <a href={secureUrl} className="mt-2 inline-flex break-all font-semibold text-navy underline">
                {secureUrl}
              </a>
            ) : null}
          </div>
        ) : null}

        {showCamera ? (
        <div className="relative aspect-4/5 overflow-hidden rounded-3xl border border-border bg-[#1a1a1a] sm:aspect-5/4">
          <QrCamera
            ref={videoRef}
            stream={cameraStream}
            onDetect={handleDetect}
          />
          {!cameraOn ? (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,162,39,0.12),transparent_55%)] bg-[#ece7dc]" />
          ) : null}
          {cameraOn ? <div className="scan-line pointer-events-none" /> : null}

          <div className="pointer-events-none absolute inset-[18%] rounded-3xl border border-white/35">
            <span className="finder-corner -left-0.5 -top-0.5" />
            <span className="finder-corner -right-0.5 -top-0.5 rotate-90" />
            <span className="finder-corner -bottom-0.5 -left-0.5 -rotate-90" />
            <span className="finder-corner -bottom-0.5 -right-0.5 rotate-180" />
          </div>

          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-linear-to-t from-black/80 to-transparent px-5 pb-5 pt-16 text-center">
            {error && !cameraOn ? (
              <p className="max-w-sm text-sm text-rose-200">{error}</p>
            ) : (
              <p className="text-sm text-white">
                {cameraOn
                  ? "Point the camera at the customer QR. It will validate automatically."
                  : insecurePage
                    ? "Open this page over HTTPS on the phone to use the camera."
                    : "Start the camera to scan, or paste the QR token below."}
              </p>
            )}
            {overlay && cameraOn ? null : (
              <button
                type="button"
                className={cameraOn ? "btn-primary" : "btn-secondary"}
                onClick={() => void toggleCamera()}
              >
                <CameraIcon className="h-4 w-4" />
                {cameraOn ? "Stop camera" : "Start camera"}
              </button>
            )}
          </div>
        </div>
        ) : null}

        {(!overlay || showFallback) ? (
        <form onSubmit={onManualSubmit} className="card space-y-3 p-4">
          <label className="block space-y-1.5">
            <span className="text-sm text-muted">QR token</span>
            <textarea
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="field min-h-24 font-mono text-sm"
              placeholder="Paste the raw token from the customer QR"
              spellCheck={false}
            />
          </label>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <button type="submit" className="btn-primary w-full" disabled={phase === "verifying"}>
            {phase === "verifying" ? "Checking…" : "Validate"}
          </button>
        </form>
        ) : null}
      </section>

      {overlay && cameraOn && phase === "idle" ? null : (
      <aside className="lg:sticky lg:top-8">
        {phase === "verifying" ? (
          <div className="card flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 h-10 w-10 animate-pulse rounded-full bg-nav-active" />
            <h2 className="text-lg font-semibold">Checking QR</h2>
            <p className="mt-2 text-sm text-muted">Validating without redeeming.</p>
          </div>
        ) : phase === "idle" && !validateResult ? (
          <div className="card flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-background text-muted">
              <CameraIcon className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold">Waiting for a scan</h2>
            <p className="mt-2 max-w-xs text-sm text-muted">
              Customer name and lucky-draw entries will appear here before you confirm.
            </p>
          </div>
        ) : (
          <ResultPanel
            phase={phase}
            validateResult={validateResult}
            confirmResult={confirmResult}
            alreadyRedeemed={alreadyRedeemed}
            allottedCodes={allottedCodes}
            busyLabel={busyLabel}
            staffName={staffName}
            onConfirm={runConfirm}
            onLoadCodes={runConfirm}
            onPrint={() => window.print()}
            onReset={resetScan}
          />
        )}
      </aside>
      )}
    </div>
  );
}

function ResultPanel({
  phase,
  validateResult,
  confirmResult,
  alreadyRedeemed,
  allottedCodes,
  busyLabel,
  staffName,
  onConfirm,
  onLoadCodes,
  onPrint,
  onReset,
}: {
  phase: Phase;
  validateResult: ValidateResponse | null;
  confirmResult: ConfirmResponse | null;
  alreadyRedeemed: boolean;
  allottedCodes: string[];
  busyLabel: string;
  staffName: string;
  onConfirm: () => void;
  onLoadCodes: () => void;
  onPrint: () => void;
  onReset: () => void;
}) {
  const done = phase === "done" || Boolean(confirmResult);
  const valid = validateResult?.valid === true;
  const customer = confirmResult?.customer ?? validateResult?.customer;
  const entries = confirmResult?.entries ?? validateResult?.entries ?? [];
  const name = customerDisplayName(customer);
  const badge = done
    ? "redeemed"
    : valid
      ? "unused"
      : reasonToBadge(validateResult?.valid === false ? validateResult.reason : undefined);

  const title = done
    ? confirmResult?.alreadyConfirmed
      ? "Already confirmed"
      : "Codes allotted"
    : valid
      ? "QR is valid"
      : alreadyRedeemed
        ? "Already redeemed"
        : "QR is not valid";

  return (
    <div
      className={`card overflow-hidden border ${
        done || valid
          ? "border-emerald-200"
          : alreadyRedeemed
            ? "border-amber-200"
            : "border-rose-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Verification</p>
          <h2 className="mt-1 text-lg font-semibold">{title}</h2>
        </div>
        <StatusBadge status={badge} />
      </div>

      {customer ? (
        <div className="space-y-5 px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
              {initials(name)}
            </span>
            <div>
              <p className="font-medium">{name}</p>
              <p className="text-sm text-muted">{customer.phoneMasked ?? "Phone hidden"}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-background p-3 text-sm">
            <p className="text-muted">Lucky-draw entries</p>
            <p className="mt-1 font-medium">{entries.length} on this QR</p>
          </div>

          {entries.length ? (
            <ul className="space-y-2">
              {entries.map((entry) => (
                <li
                  key={entry.id || entry.entryCode}
                  className="flex items-center justify-between rounded-2xl bg-background px-3 py-2 text-sm"
                >
                  <span className="text-muted">{entry.status ?? "pending"}</span>
                  <span className="font-mono font-medium">{entry.entryCode ?? "Code after confirm"}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {done && allottedCodes.length ? (
            <div className="voucher-preview-list rounded-2xl bg-[#f3eee4] p-4">
              {allottedCodes.map((code) => (
                <VoucherTicket
                  key={code}
                  code={code}
                  customerName={name}
                  staffName={staffName}
                  copyType="Customer copy"
                  issuedAt={new Date().toISOString()}
                />
              ))}
            </div>
          ) : null}

          {validateResult && !validateResult.valid ? (
            <p className="text-sm text-muted">{validateResult.reason}</p>
          ) : null}
        </div>
      ) : (
        <p className="px-5 py-6 text-sm text-muted">
          {validateResult && !validateResult.valid
            ? validateResult.reason
            : "This QR is not in the system. Ask the guest to generate a new one."}
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-border p-4">
        {valid && !done ? (
          <button
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            disabled={Boolean(busyLabel)}
          >
            <CheckIcon className="h-4 w-4" />
            {busyLabel || "Confirm redeem"}
          </button>
        ) : null}

        {alreadyRedeemed && !done ? (
          <button
            type="button"
            className="btn-primary"
            onClick={onLoadCodes}
            disabled={Boolean(busyLabel)}
          >
            {busyLabel || "Load existing codes"}
          </button>
        ) : null}

        {done ? (
          <>
            {allottedCodes.length ? null : (
              <p className="text-center text-sm text-muted">No printable codes returned.</p>
            )}
            <button type="button" className="btn-primary" onClick={onPrint} disabled={!allottedCodes.length}>
              <PrinterIcon className="h-4 w-4" />
              Print 2 Copies
            </button>
          </>
        ) : null}

        <button type="button" className="btn-secondary" onClick={onReset}>
          <CloseIcon className="h-4 w-4" />
          Scan another
        </button>
        <p className="text-center text-[11px] text-muted">Signed in as {staffName}</p>
      </div>
    </div>
  );
}
