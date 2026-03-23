"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else window.location.href = "/";
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
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

        {/* Email/password form */}
        <form onSubmit={handleSignIn} className="space-y-4">
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
              autoComplete="current-password"
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
            {loading ? "Signing in…" : "Sign in"}
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
