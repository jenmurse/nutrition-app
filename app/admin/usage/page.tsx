"use client";

/**
 * /admin/usage — dashboard for chat token + cost telemetry.
 *
 * Same auth pattern as /admin/waitlist (admin password header). Pulls from
 * /api/admin/usage and renders summary tiles + per-turn breakdown so a tester
 * can see at a glance: what was asked, which tools fired, cache state, cost.
 */

import { useState } from "react";
import Link from "next/link";

interface RecentTurn {
  id: number;
  createdAt: string;
  person: string;
  model: string;
  promptVersion: string | null;
  userMessage: string | null;
  tools: string[];
  cacheState: "COLD" | "WARM" | "MIXED";
  inputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  outputTokens: number;
  costUsd: number;
}

interface UsageResponse {
  period: { days: number; since: string };
  summary: {
    totalCostUsd: number;
    turns: number;
    avgCostPerTurn: number;
    cacheHitRate: string;
    tokens: { input: number; cacheRead: number; cacheWrite: number; output: number };
  };
  byDay: Array<{ date: string; cost: number; turns: number }>;
  byPerson: Array<{ name: string; cost: number; turns: number }>;
  recent: RecentTurn[];
}

export default function AdminUsagePage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<UsageResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);

  const fetchData = async (pw: string, d: number) => {
    setError("");
    setLoading(true);
    const res = await fetch(`/api/admin/usage?days=${d}`, {
      headers: { "x-admin-password": pw },
    });
    if (res.ok) {
      const json = await res.json();
      setData(json);
      setAuthed(true);
    } else {
      setError("Wrong password.");
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchData(password, days);
  };

  const refresh = () => fetchData(password, days);
  const changeDays = (d: number) => {
    setDays(d);
    fetchData(password, d);
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });

  const formatCost = (n: number) => `$${n.toFixed(4)}`;
  const formatNum = (n: number) => n.toLocaleString();

  if (!authed) {
    return (
      <div className="standalone-page">
        <header className="standalone-topbar">
          <Link href="/" className="standalone-wordmark">Good Measure</Link>
        </header>
        <div className="standalone-body">
          <div className="standalone-eyebrow">§ Admin</div>
          <h1 className="standalone-headline">Usage.</h1>
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
              {loading ? "Checking…" : "View usage →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, byDay, byPerson, recent } = data;

  const tile = (label: string, value: string, sub?: string) => (
    <div style={{ border: "1px solid var(--rule)", padding: "16px 18px" }}>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.14em",
        textTransform: "uppercase", color: "var(--muted)", marginBottom: "8px",
      }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--fg)" }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--muted)", marginTop: "4px" }}>
          {sub}
        </div>
      )}
    </div>
  );

  const cacheBadge = (state: "COLD" | "WARM" | "MIXED") => {
    const colors = {
      COLD: { bg: "#FEE", fg: "#C33" },     // red — expensive
      WARM: { bg: "#EFE", fg: "#363" },     // green — cheap
      MIXED: { bg: "#FFE", fg: "#963" },    // amber — partial
    };
    const c = colors[state];
    return (
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.14em",
        background: c.bg, color: c.fg, padding: "3px 8px",
      }}>{state}</span>
    );
  };

  const thStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.14em",
    textTransform: "uppercase", color: "var(--muted)", textAlign: "left",
    paddingBottom: "10px", borderBottom: "1px solid var(--rule)", fontWeight: 400,
    paddingRight: "16px",
  };
  const tdStyle: React.CSSProperties = {
    padding: "12px 16px 12px 0", fontSize: "12px", color: "var(--fg)",
    verticalAlign: "top",
  };

  return (
    <div className="standalone-page">
      <header className="standalone-topbar">
        <Link href="/" className="standalone-wordmark">Good Measure</Link>
        <span className="standalone-back-link">
          {summary.turns} turns · {data.period.days}d
        </span>
      </header>
      <div className="standalone-body" style={{ paddingTop: "48px", maxWidth: "1100px" }}>
        <div className="standalone-eyebrow">§ Admin</div>
        <h1 className="standalone-headline" style={{ marginBottom: "8px" }}>Usage.</h1>

        {/* Period selector + refresh */}
        <div style={{ display: "flex", gap: "12px", margin: "20px 0 32px", alignItems: "center" }}>
          {[1, 7, 30, 90].map((d) => (
            <button key={d} type="button" onClick={() => changeDays(d)} style={{
              fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.14em",
              textTransform: "uppercase", padding: "6px 10px", cursor: "pointer",
              background: days === d ? "var(--fg)" : "transparent",
              color: days === d ? "var(--bg)" : "var(--muted)",
              border: `1px solid ${days === d ? "var(--fg)" : "var(--rule)"}`,
            }}>{d}d</button>
          ))}
          <button type="button" onClick={refresh} disabled={loading} style={{
            fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.14em",
            textTransform: "uppercase", padding: "6px 10px", cursor: "pointer",
            background: "transparent", color: "var(--muted)",
            border: "1px solid var(--rule)", marginLeft: "auto",
          }}>{loading ? "…" : "↻ Refresh"}</button>
        </div>

        {/* Summary tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "40px" }}>
          {tile("Total cost", formatCost(summary.totalCostUsd))}
          {tile("Turns", String(summary.turns), `avg ${formatCost(summary.avgCostPerTurn)}/turn`)}
          {tile("Cache hit rate", summary.cacheHitRate, `${formatNum(summary.tokens.cacheRead)} read`)}
          {tile("Output", `${formatNum(summary.tokens.output)} tok`, "per period")}
        </div>

        {/* By person */}
        {byPerson.length > 0 && (
          <section style={{ marginBottom: "40px" }}>
            <div className="standalone-eyebrow" style={{ marginBottom: "12px" }}>§ By person</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Turns</th>
                <th style={thStyle}>Cost</th>
              </tr></thead>
              <tbody>
                {byPerson.map((p) => (
                  <tr key={p.name} style={{ borderBottom: "1px solid var(--rule)" }}>
                    <td style={tdStyle}>{p.name}</td>
                    <td style={tdStyle}>{p.turns}</td>
                    <td style={tdStyle}>{formatCost(p.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* By day */}
        {byDay.length > 0 && (
          <section style={{ marginBottom: "40px" }}>
            <div className="standalone-eyebrow" style={{ marginBottom: "12px" }}>§ By day</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Turns</th>
                <th style={thStyle}>Cost</th>
              </tr></thead>
              <tbody>
                {byDay.map((d) => (
                  <tr key={d.date} style={{ borderBottom: "1px solid var(--rule)" }}>
                    <td style={tdStyle}>{d.date}</td>
                    <td style={tdStyle}>{d.turns}</td>
                    <td style={tdStyle}>{formatCost(d.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Recent turns */}
        <section style={{ marginBottom: "60px" }}>
          <div className="standalone-eyebrow" style={{ marginBottom: "12px" }}>§ Recent turns (last 50)</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={thStyle}>When</th>
              <th style={thStyle}>Cache</th>
              <th style={thStyle}>Prompt</th>
              <th style={thStyle}>Tools</th>
              <th style={thStyle}>Tokens (in/read/write/out)</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Cost</th>
            </tr></thead>
            <tbody>
              {recent.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                  <td style={{ ...tdStyle, color: "var(--muted)", whiteSpace: "nowrap", fontSize: "11px" }}>
                    {formatTime(t.createdAt)}
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--muted)" }}>
                      {t.person} · {t.promptVersion ?? "—"}
                    </div>
                  </td>
                  <td style={tdStyle}>{cacheBadge(t.cacheState)}</td>
                  <td style={{ ...tdStyle, maxWidth: "320px" }}>
                    {t.userMessage ? (
                      <span style={{ fontSize: "12px" }}>{t.userMessage}</span>
                    ) : (
                      <span style={{ color: "var(--muted)", fontStyle: "italic" }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {t.tools.length === 0 ? (
                      <span style={{ color: "var(--muted)" }}>—</span>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        {t.tools.map((name, i) => (
                          <span key={i} style={{
                            fontFamily: "var(--font-mono)", fontSize: "10px",
                            color: name.startsWith("propose") ? "var(--accent)" : "var(--fg)",
                          }}>{name}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--muted)" }}>
                    {formatNum(t.inputTokens)} / {formatNum(t.cacheReadTokens)} / {formatNum(t.cacheCreationTokens)} / {formatNum(t.outputTokens)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", paddingRight: 0 }}>
                    {formatCost(t.costUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
