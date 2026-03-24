"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteHousehold, setInviteHousehold] = useState<string | null>(null);
  const supabase = createClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    const invite = searchParams.get("invite");
    if (invite) {
      setInviteToken(invite);
      // Store in cookie so it persists through OAuth redirect
      document.cookie = `invite_token=${invite}; path=/; max-age=3600; SameSite=Lax`;
      // Fetch household name for display
      fetch(`/api/households/invite/info?token=${invite}`)
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d?.householdName) setInviteHousehold(d.householdName); })
        .catch(() => {});
    }
  }, [searchParams]);

  const getInviteParam = () => {
    const token = inviteToken || getCookie("invite_token");
    return token ? `?invite=${token}` : "";
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Redirect through callback to trigger provisioning
      window.location.href = `/auth/callback${getInviteParam()}`;
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback${getInviteParam()}` },
    });
    if (error) {
      setError(error.message);
    } else {
      setError("Check your email for a confirmation link.");
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback${getInviteParam()}` },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="w-full max-w-[360px] px-6">
        {/* Brand */}
        <div className="mb-10">
          <h1 className="font-serif text-[32px] text-[var(--fg)] leading-none tracking-[-0.01em]">
            Course
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] mt-2">
            Plan meals. Track nutrition.
          </p>
        </div>

        {/* Invite banner */}
        {inviteHousehold && (
          <div className="mb-6 p-3 border border-[var(--accent)] bg-[var(--accent-light)]" role="status" aria-live="polite">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--fg)]">
              You&apos;ve been invited to join <strong>{inviteHousehold}</strong>
            </p>
          </div>
        )}

        {/* Mode tabs */}
        <div className="flex gap-0 mb-6 border-b border-[var(--rule)]">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`font-mono text-[9px] uppercase tracking-[0.1em] px-4 py-2 border-b-2 transition-colors ${
              mode === "signin"
                ? "border-[var(--fg)] text-[var(--fg)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--fg)]"
            }`}
            aria-label="Switch to sign in"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`font-mono text-[9px] uppercase tracking-[0.1em] px-4 py-2 border-b-2 transition-colors ${
              mode === "signup"
                ? "border-[var(--fg)] text-[var(--fg)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--fg)]"
            }`}
            aria-label="Switch to create account"
          >
            Create account
          </button>
        </div>

        {/* Email/password form */}
        <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="space-y-4">
          <div className="space-y-1">
            <label className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full border border-[var(--rule)] bg-[var(--bg)] px-3 py-2 font-sans text-[13px] text-[var(--fg)] outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="w-full border border-[var(--rule)] bg-[var(--bg)] px-3 py-2 font-sans text-[13px] text-[var(--fg)] outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="font-mono text-[10px] text-[var(--error)]" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--accent)] text-[var(--accent-text)] py-[10px] font-mono text-[9px] uppercase tracking-[0.1em] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {loading
              ? mode === "signin" ? "Signing in…" : "Creating account…"
              : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 border-t border-[var(--rule)]" />
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">or</span>
          <div className="flex-1 border-t border-[var(--rule)]" />
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogle}
          className="w-full border border-[var(--rule)] py-[10px] font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--fg)] transition-colors"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}

export default function LoginPageWrapper() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}
