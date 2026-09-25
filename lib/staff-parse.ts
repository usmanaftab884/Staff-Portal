import { asRecord, pickNumber, pickString } from "./api-parse";
import type {
  ConfirmResponse,
  CustomerPreview,
  LuckyDrawEntry,
  StaffAuditAction,
  StaffAuditEvent,
  StaffDashboard,
  StaffDashboardCounters,
  StaffDashboardCustomer,
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
    pointsDeducted: pickNumber(
      payload.pointsDeducted,
      payload.points_deducted,
    ),
    newBalance: pickNumber(payload.newBalance, payload.new_balance),
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

function pickInt(...values: unknown[]) {
  return pickNumber(...values) ?? 0;
}

function parseCounters(value: unknown): StaffDashboardCounters {
  const record = asRecord(value) ?? {};
  return {
    scans: pickInt(record.scans),
    validScans: pickInt(record.validScans, record.valid_scans),
    invalidScans: pickInt(record.invalidScans, record.invalid_scans),
    confirms: pickInt(record.confirms),
    entriesRedeemed: pickInt(record.entriesRedeemed, record.entries_redeemed),
    reprints: pickInt(record.reprints),
    uniqueCustomers: pickInt(record.uniqueCustomers, record.unique_customers),
  };
}

function parseDashboardCustomer(
  value: unknown,
  index: number,
): StaffDashboardCustomer {
  const record = asRecord(value) ?? {};
  const customer = customerFromUnknown(record.customer) ?? customerFromUnknown(record);
  return {
    userId:
      pickString(record.userId, record.user_id, record.id) ??
      `customer_${index}`,
    firstName: customer?.firstName ?? pickString(record.firstName, record.first_name) ?? "",
    lastName: customer?.lastName ?? pickString(record.lastName, record.last_name) ?? "",
    phoneMasked:
      customer?.phoneMasked ??
      pickString(record.phoneMasked, record.phone_masked, record.maskedPhone),
    scanCount: pickInt(record.scanCount, record.scan_count, record.scans),
    confirmCount: pickInt(record.confirmCount, record.confirm_count, record.confirms),
    reprintCount: pickInt(record.reprintCount, record.reprint_count, record.reprints),
  };
}

export function parseDashboard(body: unknown): StaffDashboard {
  const payload = asRecord(body) ?? {};
  const customers = payload.customersToday ?? payload.customers_today ?? payload.customers;
  return {
    date: pickString(payload.date) ?? "",
    timezone: pickString(payload.timezone, payload.timeZone) ?? "Asia/Karachi",
    mine: parseCounters(payload.mine ?? payload.staff ?? payload),
    mall: parseCounters(payload.mall ?? payload.store ?? {}),
    customersToday: Array.isArray(customers)
      ? customers.map(parseDashboardCustomer)
      : [],
  };
}

function parseAction(value: unknown): StaffAuditAction {
  const raw = (pickString(value) ?? "").toLowerCase();
  if (raw.includes("reprint")) return "reprint";
  if (raw.includes("confirm") || raw.includes("redeem")) return "confirm";
  return "validate";
}

function parseSuccess(record: Record<string, unknown>) {
  if (typeof record.success === "boolean") return record.success;
  if (typeof record.ok === "boolean") return record.ok;
  if (typeof record.valid === "boolean") return record.valid;
  return !pickString(record.reason, record.error);
}

function codesFromRecord(record: Record<string, unknown>): string[] {
  const sources = [record, asRecord(record.metadata) ?? {}];
  const found: string[] = [];
  for (const source of sources) {
    const single = pickString(
      source.entryCode,
      source.entry_code,
      source.code,
      source.voucherCode,
      source.voucher_code,
    );
    if (single) found.push(single);
    const list = source.codes ?? source.entryCodes ?? source.entry_codes;
    if (Array.isArray(list)) {
      for (const item of list) {
        if (typeof item === "string" && item.trim()) found.push(item.trim());
      }
    }
  }
  return [...new Set(found)];
}

function parseAuditEvent(value: unknown, index: number): StaffAuditEvent {
  const record = asRecord(value) ?? {};
  const customer =
    customerFromUnknown(record.customer) ??
    customerFromUnknown(record.user) ??
    customerFromUnknown(record);
  const staff = asRecord(record.staff) ?? record;
  return {
    id:
      pickString(record.id, record.eventId, record.event_id) ??
      `audit_${index}`,
    at:
      pickString(
        record.at,
        record.createdAt,
        record.created_at,
        record.timestamp,
        record.occurredAt,
        record.occurred_at,
      ) ?? new Date().toISOString(),
    action: parseAction(record.action ?? record.type ?? record.kind),
    success: parseSuccess(record),
    reason: pickString(record.reason, record.message, record.error),
    codes: codesFromRecord(record),
    staffName: pickString(
      staff.fullName,
      staff.full_name,
      staff.staffName,
      staff.staff_name,
      record.staffName,
      record.staff_name,
    ),
    staffCode: pickString(
      staff.employeeCode,
      staff.employee_code,
      staff.staffCode,
      staff.staff_code,
      record.staffCode,
      record.staff_code,
    ),
    customerName: customer
      ? [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Customer"
      : "Customer",
    phoneMasked:
      customer?.phoneMasked ??
      pickString(record.phoneMasked, record.phone_masked, record.maskedPhone),
  };
}

export function parseAuditEvents(body: unknown): StaffAuditEvent[] {
  if (Array.isArray(body)) return body.map(parseAuditEvent);
  const payload = asRecord(body) ?? {};
  const list =
    payload.events ??
    payload.items ??
    payload.rows ??
    payload.results ??
    payload.scans ??
    payload.confirms ??
    payload.reprints;
  return Array.isArray(list) ? list.map(parseAuditEvent) : [];
}
