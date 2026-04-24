"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    delete document.documentElement.dataset.theme;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div>
      <nav className="auth-nav">
        <Link href="/" className="auth-nav-logo">Good Measure</Link>
        <Link href="/login" className="auth-nav-link">← Sign in</Link>
      </nav>

      <main className="auth-split">
        <section className="auth-left">
          <div className="auth-left-spacer" />
          <div>
            <div className="auth-eyebrow">§ Set new password</div>
            <h1 className="auth-headline">Pick something you&rsquo;ll <em>remember.</em></h1>
            <p className="auth-lede">Use at least 8 characters.</p>
          </div>
          <div className="auth-left-spacer" />
        </section>

        <section className="auth-right">
          <div className="auth-form-wrap">
            {!ready ? (
              <>
                <p className="auth-notice">This reset link is invalid or has expired.</p>
                <Link href="/login" className="auth-back-link">← Back to sign in</Link>
              </>
            ) : (
              <form onSubmit={handleSubmit}>
                <label className="auth-field">
                  <span className="auth-label">New password</span>
                  <input
                    className="auth-input password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    aria-label="New password"
                  />
                </label>
                <label className="auth-field">
                  <span className="auth-label">Confirm password</span>
                  <input
                    className="auth-input password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    aria-label="Confirm password"
                  />
                </label>
                {error && <p className="auth-error" role="alert">{error}</p>}
                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? "Updating…" : "Update password"}
                </button>
                <Link href="/login" className="auth-back-link">← Back to sign in</Link>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
