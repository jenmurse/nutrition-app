"use client";

/**
 * /admin/codes — mint and manage signup codes without the terminal.
 *
 * Same auth pattern + shared password cache as /admin/usage and /admin/waitlist
 * (ADMIN_PASSWORD via x-admin-password header). Create a code, see the list with
 * usage, copy a code, or delete one.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

// Shared with the other admin pages so one login covers all of them in a tab.
const PW_KEY = "gm-admin-pw";

const PLANS = ["comp", "free", "pro"] as const;
type Plan = (typeof PLANS)[number];

interface SignupCode {
  id: number;
  code: string;
  label: string | null;
  plan: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string;
}

export default function AdminCodesPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [codes, setCodes] = useState<SignupCode[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // New-code form
  const [label, setLabel] = useState("");
  const [plan, setPlan] = useState<Plan>("comp");
  const [maxUses, setMaxUses] = useState(1);
  const [customCode, setCustomCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [copied, setCopied] = useState<number | null>(null);

  const load = async (pw: string) => {
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/codes", { headers: { "x-admin-password": pw } });
    if (res.ok) {
      setCodes(await res.json());
      setAuthed(true);
      try { sessionStorage.setItem(PW_KEY, pw); } catch { /* private mode */ }
    } else {
      setError("Wrong password.");
      try { sessionStorage.removeItem(PW_KEY); } catch { /* */ }
    }
    setLoading(false);
  };

  // Try the cached password silently on mount.
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(PW_KEY);
      if (cached) {
        setPassword(cached);
        load(cached).catch(() => { /* fall through to form */ });
      }
    } catch { /* */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await load(password);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!label.trim()) { setFormError("Give it a label."); return; }
    setCreating(true);
    const res = await fetch("/api/admin/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({
        label: label.trim(),
        plan,
        maxUses,
        code: customCode.trim() || undefined,
      }),
    });
    if (res.ok) {
      const row: SignupCode = await res.json();
      setCodes((prev) => [row, ...prev]);
      setLabel(""); setCustomCode(""); setMaxUses(1); setPlan("comp");
    } else {
      const j = await res.json().catch(() => ({}));
      setFormError(j.error || "Couldn’t create the code.");
    }
    setCreating(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this code? Anyone who hasn’t used it yet won’t be able to.")) return;
    const res = await fetch(`/api/admin/codes?id=${id}`, {
      method: "DELETE",
      headers: { "x-admin-password": password },
    });
    if (res.ok) setCodes((prev) => prev.filter((c) => c.id !== id));
  };

  const copyCode = async (c: SignupCode) => {
    try {
      await navigator.clipboard.writeText(c.code);
      setCopied(c.id);
      setTimeout(() => setCopied((cur) => (cur === c.id ? null : cur)), 1500);
    } catch { /* clipboard blocked */ }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (!authed) {
    return (
      <div className="standalone-page" style={{ height: "100%", overflowY: "auto" }}>
        <header className="standalone-topbar">
          <Link href="/" className="standalone-wordmark">Good Measure</Link>
        </header>
        <div className="standalone-body">
          <div className="standalone-eyebrow">Admin</div>
          <h1 className="standalone-headline">Signup codes.</h1>
          <form onSubmit={handleLogin}>
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
              {loading ? "Checking…" : "View codes →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const thStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.14em",
    textTransform: "uppercase", color: "var(--muted)", textAlign: "left",
    paddingBottom: "10px", borderBottom: "1px solid var(--rule)", fontWeight: 400,
    paddingRight: "16px",
  };
  const tdStyle: React.CSSProperties = {
    padding: "12px 16px 12px 0", fontSize: "12px", color: "var(--fg)", verticalAlign: "middle",
  };

  const planBadge = (p: string) => {
    const colors: Record<string, { bg: string; fg: string }> = {
      comp: { bg: "#EFE", fg: "#363" },
      pro: { bg: "#EEF", fg: "#339" },
      free: { bg: "#F2F2F2", fg: "#666" },
    };
    const c = colors[p] ?? colors.free;
    return (
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.14em",
        textTransform: "uppercase", background: c.bg, color: c.fg, padding: "3px 8px",
      }}>{p}</span>
    );
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)", fontSize: "12px", padding: "8px 10px",
    border: "1px solid var(--rule)", background: "var(--bg)", color: "var(--fg)",
  };

  return (
    <div className="standalone-page" style={{ height: "100%", overflowY: "auto" }}>
      <header className="standalone-topbar">
        <Link href="/" className="standalone-wordmark">Good Measure</Link>
        <span style={{ display: "flex", gap: "18px", alignItems: "center" }}>
          <Link href="/admin" className="standalone-back-link">← Admin</Link>
          <span className="standalone-back-link">{codes.length} codes</span>
        </span>
      </header>
      <div className="standalone-body" style={{ paddingTop: "48px", maxWidth: "900px" }}>
        <div className="standalone-eyebrow">Admin</div>
        <h1 className="standalone-headline" style={{ marginBottom: "8px" }}>Signup codes.</h1>
        <p style={{ color: "var(--muted)", fontSize: "13px", margin: "0 0 32px", maxWidth: "560px" }}>
          A code lets one (or more) people create an account, and stamps their household with the
          chosen plan. Friends → <strong>comp</strong> (full access, free). Testers → <strong>free</strong>.
        </p>

        {/* Create form */}
        <form onSubmit={handleCreate} style={{
          display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end",
          marginBottom: "40px", paddingBottom: "32px", borderBottom: "1px solid var(--rule)",
        }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "2 1 180px" }}>
            <span style={thStyle as React.CSSProperties}>Label</span>
            <input style={inputStyle} value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Angie" aria-label="Label" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 100px" }}>
            <span style={thStyle as React.CSSProperties}>Plan</span>
            <select style={inputStyle} value={plan} onChange={(e) => setPlan(e.target.value as Plan)} aria-label="Plan">
              {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 90px" }}>
            <span style={thStyle as React.CSSProperties}>Max uses</span>
            <input style={inputStyle} type="number" min={1} value={maxUses}
              onChange={(e) => setMaxUses(Math.max(1, parseInt(e.target.value, 10) || 1))} aria-label="Max uses" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 120px" }}>
            <span style={thStyle as React.CSSProperties}>Code (optional)</span>
            <input style={inputStyle} value={customCode} onChange={(e) => setCustomCode(e.target.value)}
              placeholder="auto" aria-label="Custom code" />
          </label>
          <button type="submit" className="standalone-submit" disabled={creating}
            style={{ flex: "0 0 auto", marginTop: 0 }}>
            {creating ? "Creating…" : "Create code"}
          </button>
          {formError && <p className="standalone-submit-error" role="alert" style={{ flexBasis: "100%", margin: 0 }}>{formError}</p>}
        </form>

        {/* Codes table */}
        {codes.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: "13px" }}>No codes yet — create one above.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Label</th>
              <th style={thStyle}>Plan</th>
              <th style={thStyle}>Uses</th>
              <th style={thStyle}>Created</th>
              <th style={{ ...thStyle, textAlign: "right" }} />
            </tr></thead>
            <tbody>
              {codes.map((c) => {
                const spent = c.usedCount >= c.maxUses;
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--rule)", opacity: spent ? 0.55 : 1 }}>
                    <td style={{ ...tdStyle, fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                      <button type="button" onClick={() => copyCode(c)} title="Copy code"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg)",
                          font: "inherit", padding: 0, letterSpacing: "0.04em" }}>
                        {c.code}
                      </button>
                      {copied === c.id && (
                        <span style={{ marginLeft: "8px", fontSize: "9px", color: "var(--accent)",
                          fontFamily: "var(--font-mono)", letterSpacing: "0.14em" }}>COPIED</span>
                      )}
                    </td>
                    <td style={tdStyle}>{c.label || <span style={{ color: "var(--muted)" }}>—</span>}</td>
                    <td style={tdStyle}>{planBadge(c.plan)}</td>
                    <td style={{ ...tdStyle, fontFamily: "var(--font-mono)", fontSize: "11px",
                      color: spent ? "var(--muted)" : "var(--fg)" }}>
                      {c.usedCount}/{c.maxUses}{spent ? " · spent" : ""}
                    </td>
                    <td style={{ ...tdStyle, color: "var(--muted)", whiteSpace: "nowrap", fontSize: "11px" }}>
                      {formatDate(c.createdAt)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", paddingRight: 0 }}>
                      <button type="button" onClick={() => handleDelete(c.id)} title="Delete code"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)",
                          fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.14em",
                          textTransform: "uppercase" }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
