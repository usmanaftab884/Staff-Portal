import { logout } from "./auth";
import { ApiError, errorMessageFromBody, unwrapPayload } from "./api-parse";
import {
  parseConfirm,
  parseReprint,
  parseStaffLogin,
  parseValidate,
} from "./staff-parse";
import type { ConfirmResponse, LuckyDrawEntry, StaffLoginResponse, ValidateResponse } from "./types";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/backend").replace(
  /\/$/,
  "",
);

type StaffFetchOptions = {
  path: string;
  body?: unknown;
  token?: string | null;
  allowUnauthorizedLogout?: boolean;
};

async function staffFetch({
  path,
  body,
  token,
  allowUnauthorizedLogout = true,
}: StaffFetchOptions) {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
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
