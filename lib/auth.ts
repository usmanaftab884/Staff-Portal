import type { StaffProfile } from "./types";

const TOKEN_KEY = "staffAccessToken";
const STAFF_KEY = "staffProfile";

function canUseSession() {
  return typeof window !== "undefined";
}

export function getAccessToken() {
  if (!canUseSession()) return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

export function getStaff(): StaffProfile | null {
  if (!canUseSession()) return null;
  const raw = sessionStorage.getItem(STAFF_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StaffProfile;
  } catch {
    return null;
  }
}

export function saveSession(accessToken: string, staff: StaffProfile) {
  sessionStorage.setItem(TOKEN_KEY, accessToken);
  sessionStorage.setItem(STAFF_KEY, JSON.stringify(staff));
}

export function logout() {
  if (!canUseSession()) return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(STAFF_KEY);
  sessionStorage.removeItem("staff-session-log");
}
