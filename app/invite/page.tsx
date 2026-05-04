"use client";

import { useState } from "react";
import Link from "next/link";

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
        setError("That code isn’t valid. Try again.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="standalone-page" data-register="editorial">
      <header className="standalone-topbar">
        <Link href="/" className="standalone-wordmark">Good Measure</Link>
      </header>
      <div className="standalone-body">
        <div className="standalone-eyebrow">§ Invite code</div>
        <h1 className="standalone-headline">You&rsquo;re invited.</h1>
        <p className="standalone-lede">Enter your invite code below to create your account.</p>
        <form onSubmit={handleSubmit} noValidate>
          <label className="standalone-field">
            <span className="standalone-label">Invite code</span>
            <input
              className="standalone-input"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              aria-label="Invite code"
            />
            {error && <span className="standalone-field-error" role="alert">{error}</span>}
          </label>
          <button type="submit" className="standalone-submit" disabled={loading}>
            {loading ? "Checking…" : "Continue →"}
          </button>
        </form>
      </div>
    </div>
  );
}
