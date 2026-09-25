import { logout } from "./auth";
import { ApiError, errorMessageFromBody, unwrapPayload } from "./api-parse";
import {
  parseAuditEvents,
  parseConfirm,
  parseDashboard,
  parseReprint,
  parseStaffLogin,
  parseValidate,
} from "./staff-parse";
import type {
  ConfirmResponse,
  LuckyDrawEntry,
  StaffAuditAction,
  StaffAuditEvent,
  StaffDashboard,
  StaffLoginResponse,
  ValidateResponse,
} from "./types";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/backend").replace(
  /\/$/,
  "",
);

type QueryValue = string | number | boolean | undefined;

type StaffFetchOptions = {
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, QueryValue>;
  token?: string | null;
  allowUnauthorizedLogout?: boolean;
};

function staffUrl(path: string, query?: Record<string, QueryValue>) {
  const search = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === "") continue;
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return `${API_BASE}${path}${qs ? `?${qs}` : ""}`;
}

async function staffFetch({
  path,
  method = "POST",
  body,
  query,
  token,
  allowUnauthorizedLogout = true,
}: StaffFetchOptions) {
  const headers: HeadersInit = {
    Accept: "application/json",
  };
  if (method !== "GET") {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(staffUrl(path, query), {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
  });

  const raw: unknown = await response.json().catch(() => null);
  const payload = unwrapPayload(raw);

  if (response.status === 401 && token && allowUnauthorizedLogout) {
    logout();
    window.location.replace("/login");
    throw new ApiError("Session expired. Please sign in again.", 401);
  }

  if (!response.ok) {
    throw new ApiError(
      errorMessageFromBody(payload ?? raw, `Request failed (${response.status})`),
      response.status,
    );
  }

  return { payload, raw, status: response.status };
}

export async function staffLogin(
  email: string,
  password: string,
): Promise<StaffLoginResponse> {
  const { payload } = await staffFetch({
    path: "/membership/staff/auth/login",
    body: { email, password },
    allowUnauthorizedLogout: false,
  });
  return parseStaffLogin(payload);
}

export async function validateQr(
  token: string,
  accessToken: string,
): Promise<ValidateResponse> {
  try {
    const { payload, status } = await staffFetch({
      path: "/membership/staff/lucky-draw/validate",
      body: { token },
      token: accessToken,
    });
    return parseValidate(payload, status >= 200 && status < 300);
  } catch (error) {
    if (error instanceof ApiError && error.status !== 401) {
      return { valid: false, reason: error.message };
    }
    throw error;
  }
}

export async function confirmQr(
  token: string,
  accessToken: string,
): Promise<ConfirmResponse> {
  const { payload } = await staffFetch({
    path: "/membership/staff/lucky-draw/confirm",
    body: { token },
    token: accessToken,
  });
  return parseConfirm(payload);
}

export async function reprintEntry(
  accessToken: string,
  input: { entryCode?: string; entryId?: string; reason: string },
): Promise<LuckyDrawEntry> {
  const { payload } = await staffFetch({
    path: "/membership/staff/lucky-draw/reprint",
    body: {
      ...(input.entryCode ? { entryCode: input.entryCode } : {}),
      ...(input.entryId ? { entryId: input.entryId } : {}),
      reason: input.reason,
    },
    token: accessToken,
  });
  return parseReprint(payload);
}

export async function getStaffDashboard(
  accessToken: string,
  date?: string,
): Promise<StaffDashboard> {
  const { payload } = await staffFetch({
    path: "/membership/staff/dashboard",
    method: "GET",
    query: { date },
    token: accessToken,
  });
  return parseDashboard(payload);
}

export async function getStaffAuditEvents(
  accessToken: string,
  query?: {
    action?: StaffAuditAction;
    from?: string;
    to?: string;
    limit?: number;
    allStaff?: boolean;
    staffId?: string;
  },
): Promise<StaffAuditEvent[]> {
  const { payload } = await staffFetch({
    path: "/membership/staff/audit/events",
    method: "GET",
    query: {
      action: query?.action,
      from: query?.from,
      to: query?.to,
      limit: query?.limit,
      allStaff: query?.allStaff ? true : undefined,
      staffId: query?.staffId,
    },
    token: accessToken,
  });
  return parseAuditEvents(payload);
}
