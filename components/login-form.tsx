"use client";

import { FormEvent, useEffect, useState } from "react";
import { staffLogin } from "@/lib/api";
import { isAuthenticated, saveSession } from "@/lib/auth";
import { ApiError } from "@/lib/api-parse";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      window.location.replace("/");
    }
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Enter an email and password to continue.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const session = await staffLogin(email.trim(), password);
      saveSession(session.accessToken, session.staff);
      window.location.replace("/");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not sign in.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4">
      <div className="relative w-full max-w-md rounded-[1.5rem] border border-border bg-surface p-8 shadow-[0_16px_40px_rgba(28,25,23,0.06)]">
        <div className="mb-8">
          <p className="text-lg font-semibold tracking-tight">Giga Mall</p>
          <p className="text-sm text-muted">Staff Panel</p>
          <p className="mt-4 text-sm text-muted">
            Sign in to validate customer QR codes and print lucky-draw vouchers.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm text-muted">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field"
              placeholder="counter1@gigamall.com"
              autoComplete="username"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-muted">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field"
              placeholder="Staff password"
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
