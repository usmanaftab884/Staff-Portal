"use client";

import { forwardRef, useEffect, useRef, type ForwardedRef } from "react";

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeCameraProps = {
  stream: MediaStream | null;
  onDetect: (value: string) => void;
};

function assignRef<T>(ref: ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

export const BarcodeCamera = forwardRef<HTMLVideoElement, BarcodeCameraProps>(
  function BarcodeCamera({ stream, onDetect }, forwardedRef) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
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
      const detector = Detector ? new Detector({ formats: ["code_128"] }) : null;

      async function readFrame() {
        if (cancelled || detected || !detector || player.readyState < 2) return;

        try {
          const codes = await detector.detect(player);
          const value = codes[0]?.rawValue;
          if (value) {
            detected = true;
            onDetectRef.current(value);
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
    );
  },
);
