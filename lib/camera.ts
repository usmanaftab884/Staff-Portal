export function httpsPageUrl() {
  if (typeof window === "undefined") return "";
  return `https://${window.location.host}${window.location.pathname}${window.location.search}`;
}

export function isInsecureCameraContext() {
  return typeof window !== "undefined" && !window.isSecureContext;
}

function errorName(error: unknown) {
  return error instanceof DOMException ? error.name : "";
}

export function cameraErrorMessage(error: unknown) {
  const name = errorName(error);
  const message = error instanceof Error ? error.message : "";
  const secureUrl = httpsPageUrl();

  if (isInsecureCameraContext()) {
    return `This phone blocked the camera because the page is HTTP. Open ${secureUrl || "the HTTPS address"}, tap Advanced → Proceed, then Start camera.`;
  }

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera permission was denied. In the phone browser, allow Camera for this site, reload, then tap Start camera again.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera was found. Close other apps using the camera, then try again.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "The camera is already in use by another app. Close it and try again.";
  }
  if (name === "SecurityError") {
    return message || "Camera access is blocked on this connection. Stay on HTTPS, accept the certificate warning, then try again.";
  }

  return message || "Could not open the camera.";
}

export async function openDeviceCamera() {
  if (isInsecureCameraContext()) {
    throw new DOMException(
      `This phone blocked the camera because the page is HTTP. Open ${httpsPageUrl()}, tap Advanced → Proceed, then Start camera.`,
      "SecurityError",
    );
  }

  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new DOMException("Camera API is not available.", "SecurityError");
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    });
  } catch (error) {
    const name = errorName(error);
    if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
      throw error;
    }
    return navigator.mediaDevices.getUserMedia({ audio: false, video: true });
  }
}

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}
