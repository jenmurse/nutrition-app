"use client";

import { useState } from "react";
import Link from "next/link";

export default function WaitlistPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    let ok = true;
    if (!name.trim()) { setNameError("Required."); ok = false; } else setNameError("");
    if (!email.trim()) { setEmailError("Required."); ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setEmailError("Enter a valid email."); ok = false; }
    else setEmailError("");
    return ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) throw new Error();
      window.location.href = "/waitlist-success";
    } catch {
      setSubmitError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="standalone-page" data-register="editorial">
      <header className="standalone-topbar">
        <Link href="/" className="standalone-wordmark">Good Measure</Link>
      </header>
      <div className="standalone-body">
        <div className="standalone-eyebrow">§ Sign up</div>
        <h1 className="standalone-headline">Join our waitlist.</h1>
        <p className="standalone-lede">
          Good Measure is currently invite-only. Leave your name and email
          and we&rsquo;ll be in touch when it&rsquo;s ready for the general public.
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <label className="standalone-field">
            <span className="standalone-label">Name</span>
            <input
              className="standalone-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
              aria-label="Name"
            />
            {nameError && <span className="standalone-field-error" role="alert">{nameError}</span>}
          </label>
          <label className="standalone-field">
            <span className="standalone-label">Email</span>
            <input
              className="standalone-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-label="Email"
            />
            {emailError && <span className="standalone-field-error" role="alert">{emailError}</span>}
          </label>
          <button type="submit" className="standalone-submit" disabled={loading}>
            {loading ? "Sending…" : "Join waitlist →"}
          </button>
          {submitError && <p className="standalone-submit-error" role="alert">{submitError}</p>}
        </form>
      </div>
    </div>
  );
}
