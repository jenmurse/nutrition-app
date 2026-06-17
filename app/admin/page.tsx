"use client";

/**
 * /admin — the admin hub. Gates once with the shared ADMIN_PASSWORD, caches it
 * (same sessionStorage key as the sub-pages), then links out to each tool.
 * Because the password is cached, the sub-pages auto-authenticate on arrival.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

const PW_KEY = "gm-admin-pw";

const SECTIONS = [
  { href: "/admin/codes", title: "Signup codes", desc: "Mint and manage invite codes; set each one’s plan." },
  { href: "/admin/waitlist", title: "Waitlist", desc: "People who asked to hear more." },
  { href: "/admin/usage", title: "Usage", desc: "AI token and cost telemetry." },
];

export default function AdminHomePage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Any admin GET validates the shared password; /api/admin/codes is lightweight.
  const verify = async (pw: string) => {
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/codes", { headers: { "x-admin-password": pw } });
    if (res.ok) {
      setAuthed(true);
      try { sessionStorage.setItem(PW_KEY, pw); } catch { /* private mode */ }
    } else {
      setError("Wrong password.");
      try { sessionStorage.removeItem(PW_KEY); } catch { /* */ }
    }
    setLoading(false);
  };

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(PW_KEY);
      if (cached) { setPassword(cached); verify(cached).catch(() => { /* show form */ }); }
    } catch { /* */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await verify(password);
  };

  if (!authed) {
    return (
      <div className="standalone-page" style={{ height: "100%", overflowY: "auto" }}>
        <header className="standalone-topbar">
          <Link href="/" className="standalone-wordmark">Good Measure</Link>
        </header>
        <div className="standalone-body">
          <div className="standalone-eyebrow">Admin</div>
          <h1 className="standalone-headline">Admin.</h1>
          <form onSubmit={handleSubmit}>
            <label className="standalone-field">
              <span className="standalone-label">Password</span>
              <input
                className="standalone-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
                aria-label="Admin password"
              />
            </label>
            {error && <p className="standalone-submit-error" role="alert">{error}</p>}
            <button type="submit" className="standalone-submit" disabled={loading}>
              {loading ? "Checking…" : "Enter →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="standalone-page" style={{ height: "100%", overflowY: "auto" }}>
      <header className="standalone-topbar">
        <Link href="/" className="standalone-wordmark">Good Measure</Link>
      </header>
      <div className="standalone-body" style={{ paddingTop: "48px", maxWidth: "640px" }}>
        <div className="standalone-eyebrow">Admin</div>
        <h1 className="standalone-headline" style={{ marginBottom: "32px" }}>Admin.</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              border: "1px solid var(--rule)", padding: "20px 22px", textDecoration: "none",
              color: "var(--fg)",
            }}>
              <span>
                <span style={{ display: "block", fontSize: "16px", fontWeight: 500, letterSpacing: "-0.01em" }}>
                  {s.title}
                </span>
                <span style={{ display: "block", fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                  {s.desc}
                </span>
              </span>
              <span aria-hidden="true" style={{ color: "var(--muted)", fontSize: "16px" }}>→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
