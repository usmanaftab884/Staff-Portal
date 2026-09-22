export type StaffProfile = {
  id: string;
  email: string;
  fullName: string;
  employeeCode: string;
  isActive: boolean;
};

export type StaffLoginResponse = {
  accessToken: string;
  staff: StaffProfile;
};

export type LuckyDrawEntry = {
  id: string;
  status?: string;
  entryCode?: string | null;
};

export type CustomerPreview = {
  firstName: string;
  lastName: string;
  phoneMasked?: string;
};

export type ValidateSuccess = {
  valid: true;
  customer: CustomerPreview;
  entries: LuckyDrawEntry[];
};

export type ValidateFailure = {
  valid: false;
  reason: string;
  customer?: CustomerPreview;
  entries?: LuckyDrawEntry[];
};

export type ValidateResponse = ValidateSuccess | ValidateFailure;

export type ConfirmResponse = {
  alreadyConfirmed: boolean;
  customer?: CustomerPreview;
  entries: LuckyDrawEntry[];
};

export type ReprintResponse = {
  entry: LuckyDrawEntry;
};

export type SessionKind = "rejected" | "confirmed" | "reprinted";

export type SessionEvent = {
  id: string;
  at: string;
  kind: SessionKind;
  customerName: string;
  detail: string;
  codes: string[];
  reason?: string;
};

export type BadgeStatus =
  | "unused"
  | "redeemed"
  | "expired"
  | "invalid"
  | "already_used"
  | "revoked";
