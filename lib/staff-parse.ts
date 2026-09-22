import { asRecord, pickString } from "./api-parse";
import type {
  ConfirmResponse,
  CustomerPreview,
  LuckyDrawEntry,
  StaffLoginResponse,
  StaffProfile,
  ValidateResponse,
} from "./types";

function entriesFromUnknown(value: unknown): LuckyDrawEntry[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const record = asRecord(item) ?? {};
    return {
      id:
        pickString(record.id, record.entryId, record.entry_id) ??
        `entry_${index}`,
      status: pickString(record.status),
      entryCode:
        pickString(
          record.entryCode,
          record.entry_code,
          record.code,
          record.voucherCode,
          record.voucher_code,
        ) ?? null,
    };
  });
}

function customerFromUnknown(value: unknown): CustomerPreview | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const firstName = pickString(record.firstName, record.first_name) ?? "";
  const lastName = pickString(record.lastName, record.last_name) ?? "";
  const full = pickString(record.fullName, record.full_name, record.name);
  if (!firstName && !lastName && !full) return undefined;
  const [firstFromFull, ...rest] = (full ?? "").split(" ");
  return {
    firstName: firstName || firstFromFull || "",
    lastName: lastName || rest.join(" "),
    phoneMasked: pickString(
      record.phoneMasked,
      record.phone_masked,
      record.maskedPhone,
      record.phone,
    ),
  };
}

export function parseStaffLogin(body: unknown): StaffLoginResponse {
  const payload = asRecord(body) ?? {};
  const nested = asRecord(payload.staff) ?? asRecord(payload.user) ?? payload;
  const accessToken = pickString(
    payload.accessToken,
    payload.access_token,
    payload.token,
  );
  if (!accessToken) {
    throw new Error("Login succeeded but no access token was returned.");
  }

  const firstName = pickString(nested.firstName, nested.first_name);
  const lastName = pickString(nested.lastName, nested.last_name);
  const staff: StaffProfile = {
    id: pickString(nested.id) ?? "",
    email: pickString(nested.email, payload.email) ?? "",
    fullName:
      pickString(nested.fullName, nested.full_name) ||
      [firstName, lastName].filter(Boolean).join(" ") ||
      pickString(nested.email) ||
      "Staff",
    employeeCode:
      pickString(nested.employeeCode, nested.employee_code, nested.code) ?? "",
    isActive: nested.isActive !== false && nested.is_active !== false,
  };

  return { accessToken, staff };
}

export function parseValidate(body: unknown, httpOk: boolean): ValidateResponse {
  const payload = asRecord(body) ?? {};
  const customer =
    customerFromUnknown(payload.customer) ??
    customerFromUnknown(payload.user) ??
    customerFromUnknown(payload);
  const entries = entriesFromUnknown(
    payload.entries ?? payload.luckyDrawEntries ?? payload.lucky_draw_entries,
  );
  const reason =
    pickString(payload.reason, payload.message, payload.error) ?? "invalid";
  const validFlag = payload.valid;

  if (validFlag === false || (!httpOk && validFlag !== true)) {
    return { valid: false, reason, customer, entries };
  }

  if (validFlag === true || (httpOk && customer && entries.length >= 0)) {
    if (!customer) {
      return { valid: false, reason: reason === "invalid" ? "not_found" : reason };
    }
    return { valid: true, customer, entries };
  }

  return { valid: false, reason, customer, entries };
}

export function parseConfirm(body: unknown): ConfirmResponse {
  const payload = asRecord(body) ?? {};
  const customer =
    customerFromUnknown(payload.customer) ??
    customerFromUnknown(payload.user) ??
    customerFromUnknown(payload);
  const entries = entriesFromUnknown(
    payload.entries ?? payload.luckyDrawEntries ?? payload.lucky_draw_entries,
  );
  return {
    alreadyConfirmed: Boolean(
      payload.alreadyConfirmed ?? payload.already_confirmed,
    ),
    customer,
    entries,
  };
}

export function parseReprint(body: unknown): LuckyDrawEntry {
  const payload = asRecord(body) ?? {};
  const entryRecord = asRecord(payload.entry) ?? payload;
  const parsed = entriesFromUnknown([entryRecord])[0];
  return (
    parsed ?? {
      id: pickString(payload.entryId, payload.entry_id) ?? "",
      entryCode: pickString(payload.entryCode, payload.entry_code, payload.code),
    }
  );
}
