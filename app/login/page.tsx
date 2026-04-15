"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BrandName } from "@/app/components/BrandName";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteHousehold, setInviteHousehold] = useState<string | null>(null);
  const supabase = createClient();
  const searchParams = useSearchParams();

  // Force default theme on auth screens so it doesn't inherit a previous user's color
  useEffect(() => {
    document.documentElement.dataset.theme = "sage";
  }, []);

  useEffect(() => {
    const signup = searchParams.get("signup");
    if (signup) setMode("signup");
  }, [searchParams]);

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
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback${getInviteParam()}`,
        data: { full_name: firstName.trim() || undefined },
      },
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
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-5">
      <div className="w-full max-w-[360px]">
        {/* Brand */}
        <div className="mb-10 text-center">
          <Link href="/" aria-label="Back to home">
            <h1 className="font-serif text-[16px] font-bold text-[var(--fg)] leading-none tracking-[-0.02em] hover:opacity-70 transition-opacity duration-150">
              <BrandName />
            </h1>
          </Link>
        </div>

        {/* Invite banner */}
        {inviteHousehold && (
          <div className="mb-6 p-3 bg-[var(--accent-l)]" role="status" aria-live="polite">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--fg)]">
              You{"\u2019"}ve been invited to join <strong>{inviteHousehold}</strong>
            </p>
          </div>
        )}

        {/* Mode tabs */}
        <div className="flex border border-[var(--rule)] mb-8 rounded-pill overflow-hidden">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 font-mono text-[9px] uppercase tracking-[0.1em] py-2 text-center transition-[color,background] duration-[120ms] border-0 cursor-pointer ${
              mode === "signin"
                ? "bg-[var(--bg-2)] text-[var(--fg)]"
                : "bg-transparent text-[var(--muted)] hover:text-[var(--fg)]"
            }`}
            aria-label="Switch to sign in"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 font-mono text-[9px] uppercase tracking-[0.1em] py-2 text-center transition-[color,background] duration-[120ms] border-0 cursor-pointer ${
              mode === "signup"
                ? "bg-[var(--bg-2)] text-[var(--fg)]"
                : "bg-transparent text-[var(--muted)] hover:text-[var(--fg)]"
            }`}
            aria-label="Switch to create account"
          >
            Create account
          </button>
        </div>

        {/* Email/password form */}
        <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="space-y-5">
          {mode === "signup" && (
            <div>
              <label className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)] block mb-[6px]" htmlFor="firstName">
                Name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
                className="w-full border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] font-sans text-[13px] text-[var(--fg)] outline-none focus:border-[var(--accent)] transition-colors"
                placeholder="Your name"
              />
            </div>
          )}
          <div>
            <label className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)] block mb-[6px]" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] font-sans text-[13px] text-[var(--fg)] outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)] block mb-[6px]" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="w-full border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] font-sans text-[13px] text-[var(--fg)] outline-none focus:border-[var(--accent)] transition-colors"
              placeholder={mode === "signin" ? "••••••••" : "Choose a password"}
            />
          </div>

          {error && (
            <p className="font-mono text-[11px] text-[var(--error)]" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--accent)] text-[var(--accent-fg)] border border-[var(--accent)] py-[8px] px-5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] rounded-pill hover:opacity-90 active:scale-[0.97] transition-[opacity,transform] duration-150 disabled:opacity-50"
          >
            {loading
              ? mode === "signin" ? "Signing in…" : "Creating account…"
              : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 border-t border-[var(--rule)]" />
          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--muted)]">or</span>
          <div className="flex-1 border-t border-[var(--rule)]" />
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogle}
          className="w-full border border-[var(--rule)] bg-transparent py-[8px] px-5 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--fg)] rounded-pill hover:border-[var(--fg)] active:scale-[0.97] transition-[border-color,transform] duration-150 cursor-pointer text-center"
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
