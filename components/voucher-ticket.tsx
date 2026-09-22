"use client";

import { useEffect, useState } from "react";
import { toDataURL } from "qrcode";
import { formatVoucherDate } from "@/lib/format";

export const GIGA_APP_URL = "https://thegigamall.com";
export const GIGA_VENUE = "Giga Mall WTC Islamabad";

type CopyType = "Customer copy" | "Box copy";

let logoSrcCache: string | null = null;
const logoWaiters = new Set<(src: string) => void>();

function knockOutBlack(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = pixels.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 38 && data[i + 1] < 38 && data[i + 2] < 38) {
      data[i + 3] = 0;
    }
  }
  context.putImageData(pixels, 0, 0);
  return canvas.toDataURL("image/png");
}

function loadBrandMark() {
  if (logoSrcCache) return;
  const image = new Image();
  image.src = "/icon.png";
  image.onload = () => {
    logoSrcCache = knockOutBlack(image) || "/icon.png";
    logoWaiters.forEach((notify) => notify(logoSrcCache as string));
    logoWaiters.clear();
  };
}

function useBrandMark() {
  const [src, setSrc] = useState(logoSrcCache ?? "");
  useEffect(() => {
    if (logoSrcCache) {
      setSrc(logoSrcCache);
      return;
    }
    const notify = (next: string) => setSrc(next);
    logoWaiters.add(notify);
    loadBrandMark();
    return () => {
      logoWaiters.delete(notify);
    };
  }, []);
  return src;
}

let qrSrcCache: string | null = null;
const qrWaiters = new Set<(src: string) => void>();

function loadAppQr() {
  if (qrSrcCache) return;
  void toDataURL(GIGA_APP_URL, {
    margin: 0,
    width: 240,
    color: { dark: "#1c1917", light: "#00000000" },
    errorCorrectionLevel: "M",
  }).then((url) => {
    qrSrcCache = url;
    qrWaiters.forEach((notify) => notify(url));
    qrWaiters.clear();
  });
}

function useAppQr() {
  const [src, setSrc] = useState(qrSrcCache ?? "");
  useEffect(() => {
    if (qrSrcCache) {
      setSrc(qrSrcCache);
      return;
    }
    const notify = (next: string) => setSrc(next);
    qrWaiters.add(notify);
    loadAppQr();
    return () => {
      qrWaiters.delete(notify);
    };
  }, []);
  return src;
}

export function VoucherTicket({
  code,
  customerName,
  staffName,
  copyType,
  issuedAt,
}: {
  code: string;
  customerName: string;
  staffName: string;
  copyType: CopyType;
  issuedAt: string;
}) {
  const logoSrc = useBrandMark();
  const qrSrc = useAppQr();
  const dateLabel = formatVoucherDate(issuedAt);

  return (
    <article className="voucher-ticket">
      <div className="voucher-ticket-inner">
        <header className="voucher-brand">
          {logoSrc ? (
            <img src={logoSrc} alt="Giga Mall" className="voucher-logo" />
          ) : (
            <div className="voucher-logo voucher-logo-fallback" />
          )}
          <p className="voucher-kicker">Giga Mall · Lucky Draw</p>
          <span className="voucher-copy-pill">{copyType}</span>
        </header>

        <div className="voucher-stub">
          <p className="voucher-stub-label">Voucher code</p>
          <div className="voucher-code-box">{code}</div>
        </div>

        <dl className="voucher-meta">
          <div>
            <dt>Date:</dt>
            <dd>{dateLabel}</dd>
          </div>
          <div>
            <dt>Copy type:</dt>
            <dd>{copyType}</dd>
          </div>
          <div>
            <dt>Name:</dt>
            <dd>{customerName}</dd>
          </div>
          <div>
            <dt>Issued by:</dt>
            <dd>{staffName}</dd>
          </div>
          <div className="voucher-meta-wide">
            <dt>Issued at:</dt>
            <dd>{GIGA_VENUE}</dd>
          </div>
        </dl>

        <div className="voucher-app">
          {qrSrc ? (
            <img src={qrSrc} alt="Giga Mall app QR" className="voucher-qr" />
          ) : (
            <div className="voucher-qr voucher-qr-fallback" />
          )}
          <p>
            <strong>Scan to get the Giga Mall app</strong>
            Offers, events & lucky draw on your phone
          </p>
        </div>

        <p className="voucher-footer">{GIGA_VENUE} · Keep this slip</p>
      </div>
    </article>
  );
}
