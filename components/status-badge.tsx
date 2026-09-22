import type { BadgeStatus } from "@/lib/types";

const labels: Record<BadgeStatus, string> = {
  unused: "Ready",
  redeemed: "Redeemed",
  expired: "Expired",
  invalid: "Invalid",
  already_used: "Already redeemed",
  revoked: "Revoked",
};

const styles: Record<BadgeStatus, string> = {
  unused: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  redeemed: "bg-amber-50 text-amber-800 ring-amber-200",
  expired: "bg-stone-100 text-stone-600 ring-stone-200",
  invalid: "bg-rose-50 text-rose-700 ring-rose-200",
  already_used: "bg-amber-50 text-amber-800 ring-amber-200",
  revoked: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function reasonToBadge(reason?: string): BadgeStatus {
  const value = (reason ?? "").toLowerCase().replace(/\s+/g, "_");
  if (value.includes("already") || value.includes("redeemed") || value.includes("consumed")) {
    return "already_used";
  }
  if (value.includes("expired")) return "expired";
  if (value.includes("revoked")) return "revoked";
  if (value.includes("not_found") || value.includes("invalid")) return "invalid";
  return "invalid";
}

export function StatusBadge({ status }: { status: BadgeStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
