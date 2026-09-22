"use client";

import { forwardRef, useEffect, useRef, type ForwardedRef } from "react";
import jsQR from "jsqr";

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
};

type QrCameraProps = {
  stream: MediaStream | null;
  onDetect: (value: string) => void;
};

function assignRef<T>(ref: ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

export const QrCamera = forwardRef<HTMLVideoElement, QrCameraProps>(function QrCamera(
  { stream, onDetect },
  forwardedRef,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDetectRef = useRef(onDetect);

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  useEffect(() => {
    const media = videoRef.current;
    if (!media || !stream) return;

    let cancelled = false;
    let timer: number | undefined;
    let detected = false;
    const player: HTMLVideoElement = media;
    player.srcObject = stream;
    player.muted = true;
    player.playsInline = true;
    player.setAttribute("playsinline", "true");
    player.setAttribute("webkit-playsinline", "true");

    const Detector = (
      window as unknown as {
        BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike;
      }
    ).BarcodeDetector;
    const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;

    async function readFrame() {
      if (cancelled || detected || player.readyState < 2) return;

      try {
        if (detector) {
          const codes = await detector.detect(player);
          const value = codes[0]?.rawValue?.trim();
          if (value) {
            detected = true;
            onDetectRef.current(value);
            return;
          }
        }

        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d", { willReadFrequently: true });
        if (canvas && context) {
          canvas.width = player.videoWidth;
          canvas.height = player.videoHeight;
          if (canvas.width && canvas.height) {
            context.drawImage(player, 0, 0, canvas.width, canvas.height);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(pixels.data, pixels.width, pixels.height, {
              inversionAttempts: "dontInvert",
            });
            const value = result?.data?.trim();
            if (value) {
              detected = true;
              onDetectRef.current(value);
            }
          }
        }
      } catch {
        // Keep scanning if a single frame fails.
      }
    }

    async function playAndScan() {
      try {
        await player.play();
      } catch {
        // Autoplay can fail if the stream is already playing.
      }
      const loop = async () => {
        await readFrame();
        if (!cancelled && !detected) {
          timer = window.setTimeout(loop, 180);
        }
      };
      void loop();
    }

    void playAndScan();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [stream]);

  return (
    <>
      <video
        ref={(node) => {
          videoRef.current = node;
          assignRef(forwardedRef, node);
        }}
        className={
          stream
            ? "absolute inset-0 h-full w-full object-cover"
            : "pointer-events-none invisible absolute h-px w-px"
        }
        autoPlay
        muted
        playsInline
      />
      <canvas ref={canvasRef} className="hidden" />
    </>
  );
});
