"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Shared with the other admin pages so one login covers all of them in a tab.
const PW_KEY = "gm-admin-pw";

interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function AdminWaitlistPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (pw: string) => {
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/waitlist", {
      headers: { "x-admin-password": pw },
    });
    if (res.ok) {
      setEntries(await res.json());
      setAuthed(true);
      try { sessionStorage.setItem(PW_KEY, pw); } catch { /* private mode */ }
    } else {
      setError("Wrong password.");
      try { sessionStorage.removeItem(PW_KEY); } catch { /* */ }
    }
    setLoading(false);
  };

  // Try the cached password silently on mount (set by the admin hub or a sibling page).
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(PW_KEY);
      if (cached) { setPassword(cached); load(cached).catch(() => { /* show form */ }); }
    } catch { /* */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await load(password);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (!authed) {
    return (
      <div className="standalone-page">
        <header className="standalone-topbar">
          <Link href="/" className="standalone-wordmark">Good Measure</Link>
        </header>
        <div className="standalone-body">
          <div className="standalone-eyebrow">Admin</div>
          <h1 className="standalone-headline">Waitlist.</h1>
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
              {loading ? "Checking…" : "View waitlist →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="standalone-page">
      <header className="standalone-topbar">
        <Link href="/" className="standalone-wordmark">Good Measure</Link>
        <span style={{ display: "flex", gap: "18px", alignItems: "center" }}>
          <Link href="/admin" className="standalone-back-link">← Admin</Link>
          <span className="standalone-back-link">{entries.length} {entries.length === 1 ? "person" : "people"}</span>
        </span>
      </header>
      <div className="standalone-body" style={{ paddingTop: "48px" }}>
        <div className="standalone-eyebrow">Admin</div>
        <h1 className="standalone-headline" style={{ marginBottom: "32px" }}>Waitlist.</h1>
        {entries.length === 0 ? (
          <p style={{ fontSize: "14px", color: "var(--muted)" }}>No entries yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["Name", "Email", "Date"].map((h) => (
                  <th key={h} style={{
                    fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.14em",
                    textTransform: "uppercase", color: "var(--muted)", textAlign: "left",
                    paddingBottom: "12px", borderBottom: "1px solid var(--rule)", fontWeight: 400,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                  <td style={{ padding: "12px 16px 12px 0", color: "var(--fg)" }}>{entry.name}</td>
                  <td style={{ padding: "12px 16px 12px 0", color: "var(--fg-2)" }}>{entry.email}</td>
                  <td style={{ padding: "12px 0", color: "var(--muted)", whiteSpace: "nowrap" }}>{formatDate(entry.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
