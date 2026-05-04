"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import EditorialBackground from "@/app/components/EditorialBackground";

type Mode = "signin" | "signup" | "forgot";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setModeState] = useState<Mode>("signin");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteHousehold, setInviteHousehold] = useState<string | null>(null);
  const supabase = createClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    delete document.documentElement.dataset.theme;
  }, []);

  useEffect(() => {
    const signup = searchParams.get("signup");
    const modeParam = searchParams.get("mode");
    const invite = searchParams.get("invite");
    if (modeParam === "forgot") setModeState("forgot");
    else if (invite) setModeState("signup");
    else if (signup) window.location.replace("/invite");
  }, [searchParams]);

  useEffect(() => {
    const invite = searchParams.get("invite");
    if (invite) {
      setInviteToken(invite);
      document.cookie = `invite_token=${invite}; path=/; max-age=3600; SameSite=Lax`;
      fetch(`/api/households/invite/info?token=${invite}`)
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d?.householdName) setInviteHousehold(d.householdName); })
        .catch(() => {});
    }
  }, [searchParams]);

  const setMode = (next: Mode) => {
    setModeState(next);
    setError("");
    setNotice("");
    const params = new URLSearchParams(window.location.search);
    if (next === "signup") { params.set("signup", "1"); params.delete("mode"); }
    else if (next === "forgot") { params.set("mode", "forgot"); params.delete("signup"); }
    else { params.delete("signup"); params.delete("mode"); }
    const qs = params.toString();
    window.history.replaceState(null, "", `/login${qs ? `?${qs}` : ""}`);
  };

  const getInviteParam = () => {
    const token = inviteToken || getCookie("invite_token");
    return token ? `?invite=${token}` : "";
  };

  const friendlyError = (msg: string): string => {
    if (msg.includes("Password should contain") || msg.includes("password"))
      return "Password needs at least 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character (!@#$%^&*).";
    if (msg.includes("sending confirmation email") || msg.includes("sending an email"))
      return "Couldn\u2019t send a confirmation email. Try again in a moment, or sign in with Google.";
    if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("User already registered"))
      return "An account with this email already exists. Try signing in instead.";
    if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials"))
      return "Email or password is incorrect.";
    if (msg.includes("Email not confirmed"))
      return "Check your email and click the confirmation link first.";
    return msg;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(friendlyError(error.message));
      setLoading(false);
    } else {
      window.location.href = `/auth/callback${getInviteParam()}`;
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords don\u2019t match.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback${getInviteParam()}`,
        data: { full_name: firstName.trim() || undefined },
      },
    });
    if (error) {
      setError(friendlyError(error.message));
    } else if (data.user && (data.user.identities?.length ?? 0) === 0) {
      // Supabase email-enumeration protection: existing email returns success
      // with an empty identities array instead of an error. Surface it.
      setError("An account with this email already exists. Try signing in instead.");
    } else {
      setNotice("Check your email for a confirmation link.");
    }
    setLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) setError(friendlyError(error.message));
    else setNotice("Check your email for a reset link.");
    setLoading(false);
  };

  const handleGoogle = () => {
    setError("");
    const invite = inviteToken || getCookie("invite_token");
    window.location.href = `/api/auth/google${invite ? `?invite=${invite}` : ""}`;
  };

  const copy = {
    signin: {
      eyebrow: "§ Sign in",
      headline: "Pick up where you left off.",
      lede: "Your pantry. Your recipes. The week you were planning. All calculated to the gram.",
      submit: "Sign in",
      submitLoading: "Signing in…",
    },
    signup: {
      eyebrow: "§ Create account",
      headline: "Set up your kitchen.",
      lede: "Build your pantry once. Create or import recipes. Plan your week. Let Good Measure take care of the rest.",
      submit: "Create account",
      submitLoading: "Creating account…",
    },
    forgot: {
      eyebrow: "§ Reset password",
      headline: "Forgot? It happens.",
      lede: "Enter the email tied to your account and we’ll send a reset link.",
      submit: "Send reset link",
      submitLoading: "Sending…",
    },
  }[mode];

  return (
    <div className="auth-page">
      <EditorialBackground />
      <nav className="auth-nav">
        <Link href="/" className="auth-nav-logo">Good Measure</Link>
        <Link href="/" className="auth-nav-link">← Back</Link>
      </nav>

      <main className="auth-split">
        <section className="auth-left">
          <div className="auth-eyebrow">{copy.eyebrow}</div>
          <h1 className="auth-headline">{copy.headline}</h1>
          <p className="auth-lede">{copy.lede}</p>
        </section>

        <div className="auth-divider" aria-hidden="true" />

        <section className="auth-right">
          <div className="auth-form-wrap">

            {inviteHousehold && mode === "signup" && (
              <div className="auth-invite-banner" role="status" aria-live="polite">
                You&rsquo;ve been invited to join <strong>{inviteHousehold}</strong>
              </div>
            )}

            {mode === "forgot" ? (
              <form onSubmit={handleForgot}>
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
                {error && <p className="auth-error" role="alert">{error}</p>}
                {notice && <p className="auth-notice" role="status">{notice}</p>}
                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? copy.submitLoading : copy.submit}
                </button>
                <button type="button" className="auth-back-link" onClick={() => setMode("signin")}>
                  ← Back to sign in
                </button>
              </form>
            ) : (
              <>
                <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp}>
                  {mode === "signup" && (
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
                  )}

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

                  <div className="auth-field">
                    {mode === "signin" ? (
                      <div className="auth-label-row">
                        <span className="auth-label" style={{ marginBottom: 0 }}>Password</span>
                        <button
                          type="button"
                          className="auth-label-link"
                          onClick={() => setMode("forgot")}
                        >
                          Forgot
                        </button>
                      </div>
                    ) : (
                      <span className="auth-label">Password</span>
                    )}
                    <input
                      className="auth-input password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      aria-label="Password"
                    />
                  </div>

                  {mode === "signup" && (
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
                  )}

                  {error && <p className="auth-error" role="alert">{error}</p>}
                  {notice && <p className="auth-notice" role="status">{notice}</p>}

                  <button type="submit" className="auth-submit" disabled={loading}>
                    {loading ? copy.submitLoading : copy.submit}
                  </button>
                </form>

                <div className="auth-or">
                  <div className="auth-or-rule" />
                  <span className="auth-or-text">Or</span>
                  <div className="auth-or-rule" />
                </div>

                <button type="button" className="auth-oauth" onClick={handleGoogle}>
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
