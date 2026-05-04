"use client";

import { useState } from "react";
import Link from "next/link";
import EditorialBackground from "@/app/components/EditorialBackground";

export default function InvitePage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!code.trim()) { setError("Enter your invite code."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/invite/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.valid) {
        window.location.href = "/login?signup=1";
      } else {
        setError("That code isn't valid. Try again.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
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
          <div className="auth-eyebrow">§ Invite code</div>
          <h1 className="auth-headline">You&rsquo;re invited.</h1>
          <p className="auth-lede">Enter your invite code below to create your account.</p>
        </section>

        <div className="auth-divider" aria-hidden="true" />

        <section className="auth-right">
          <div className="auth-form-wrap">
            <form onSubmit={handleSubmit}>
              <label className="auth-field">
                <span className="auth-label">Invite code</span>
                <input
                  className="auth-input"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="off"
                  autoFocus
                  aria-label="Invite code"
                />
              </label>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? "Checking…" : "Continue →"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
