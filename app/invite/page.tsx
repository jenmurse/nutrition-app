"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import EditorialBackground from "@/app/components/EditorialBackground";

export default function InvitePage() {
  const [inviteCode, setInviteCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    delete document.documentElement.dataset.theme;
  }, []);

  const friendlyError = (msg: string): string => {
    if (msg.includes("Password should contain") || msg.includes("password"))
      return "Password needs at least 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character (!@#$%^&*).";
    if (msg.includes("sending confirmation email") || msg.includes("sending an email"))
      return "Couldn’t send a confirmation email. Try again in a moment, or sign up with Google.";
    if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("User already registered"))
      return "An account with this email already exists. Try signing in instead.";
    return msg;
  };

  const validateCode = async (): Promise<boolean> => {
    const res = await fetch("/api/invite/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: inviteCode }),
    });
    const data = await res.json();
    return data.valid === true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords don’t match.");
      return;
    }
    setLoading(true);
    const codeValid = await validateCode();
    if (!codeValid) {
      setError("That invite code isn’t valid. Try again.");
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: firstName.trim() || undefined },
      },
    });
    if (error) {
      setError(friendlyError(error.message));
    } else if (data.user && (data.user.identities?.length ?? 0) === 0) {
      setError("An account with this email already exists. Try signing in instead.");
    } else {
      setNotice("Check your email for a confirmation link.");
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    const codeValid = await validateCode();
    if (!codeValid) {
      setError("That invite code isn’t valid. Try again.");
      setLoading(false);
      return;
    }
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="auth-page">
      <EditorialBackground />
      <nav className="auth-nav">
        <Link href="/" className="auth-nav-logo">Good Measure</Link>
        <Link href="/" className="auth-nav-link">← Back</Link>
      </nav>

      <main className="auth-split">
        <section className="auth-left">
          <div className="auth-eyebrow">§ Create account</div>
          <h1 className="auth-headline">You&rsquo;re invited to set up your kitchen.</h1>
          <p className="auth-lede">
            Build your pantry once. Create or import recipes. Plan your week.
            Let Good Measure take care of the rest.
          </p>
        </section>

        <div className="auth-divider" aria-hidden="true" />

        <section className="auth-right">
          <div className="auth-form-wrap">
            {notice ? (
              <p className="auth-notice" role="status">{notice}</p>
            ) : (
              <>
                <form onSubmit={handleSubmit}>
                  <label className="auth-field">
                    <span className="auth-label">Invite code</span>
                    <input
                      className="auth-input"
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      required
                      autoComplete="off"
                      aria-label="Invite code"
                    />
                  </label>

                  <label className="auth-field">
                    <span className="auth-label">Name</span>
                    <input
                      className="auth-input"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      autoComplete="given-name"
                      aria-label="Name"
                    />
                  </label>

                  <label className="auth-field">
                    <span className="auth-label">Email</span>
                    <input
                      className="auth-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      aria-label="Email"
                    />
                  </label>

                  <label className="auth-field">
                    <span className="auth-label">Password</span>
                    <input
                      className="auth-input password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      aria-label="Password"
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
                    {loading ? "Creating account…" : "Create account"}
                  </button>
                </form>

                <div className="auth-or">
                  <div className="auth-or-rule" />
                  <span className="auth-or-text">Or</span>
                  <div className="auth-or-rule" />
                </div>

                <button type="button" className="auth-oauth" onClick={handleGoogle} disabled={loading}>
                  <svg width="13" height="13" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.13 4.13 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.86 2.69-6.62Z" />
                    <path fill="#34A853" d="M9 18c2.43 0 4.46-.81 5.95-2.18l-2.9-2.26c-.8.54-1.83.86-3.05.86-2.34 0-4.33-1.58-5.04-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
                    <path fill="#FBBC05" d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3-2.33Z" />
                    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.94 8.94 0 0 0 9 0 9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z" />
                  </svg>
                  CONTINUE WITH GOOGLE
                </button>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
