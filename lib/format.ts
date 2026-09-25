export function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatVoucherDate(iso: string) {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat("en-GB", { day: "numeric" }).format(date);
  const month = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date);
  const year = date.getFullYear();
  const label = month === "Sep" ? "Sept" : month;
  return `${day} ${label} ${year}`;
}

export function customerDisplayName(customer?: {
  firstName?: string;
  lastName?: string;
} | null) {
  if (!customer) return "Customer";
  return [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Customer";
}

export function isSameDay(iso: string, now = new Date()) {
  const date = new Date(iso);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function karachiDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function shiftIsoDate(yyyyMmDd: string, days: number) {
  const [year, month, day] = yyyyMmDd.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + days));
  return date.toISOString().slice(0, 10);
}
