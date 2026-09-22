"use client";

import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (isAuthenticated()) {
      setAllowed(true);
      return;
    }
    setAllowed(false);
    window.location.replace("/login");
  }, []);

  if (allowed === false) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-10 w-10 animate-pulse rounded-full bg-nav-active" />
      </div>
    );
  }

  return children;
}
