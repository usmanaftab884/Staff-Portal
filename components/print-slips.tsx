"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { customerDisplayName } from "@/lib/format";
import type { CustomerPreview, LuckyDrawEntry } from "@/lib/types";
import { VoucherTicket } from "./voucher-ticket";

export function PrintSlips({
  customer,
  entries,
  staffName,
}: {
  customer?: CustomerPreview;
  entries: LuckyDrawEntry[];
  staffName: string;
}) {
  const [mounted, setMounted] = useState(false);
  const name = customerDisplayName(customer);
  const issuedAt = new Date().toISOString();
  const printable = entries.filter((entry) => entry.entryCode);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div id="print-slips">
      {printable.map((entry) => (
        <div key={entry.entryCode} className="voucher-print-set">
          <VoucherTicket
            code={entry.entryCode as string}
            customerName={name}
            staffName={staffName}
            copyType="Customer copy"
            issuedAt={issuedAt}
          />
          <VoucherTicket
            code={entry.entryCode as string}
            customerName={name}
            staffName={staffName}
            copyType="Box copy"
            issuedAt={issuedAt}
          />
        </div>
      ))}
    </div>,
    document.body,
  );
}
