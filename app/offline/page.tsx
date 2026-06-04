// Static offline shell — pre-cached by the service worker and shown when the
// user navigates to a route that isn't in the cache while offline. Kept
// minimal and dependency-free so it works without any client JS.

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        textAlign: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono), 'DM Mono', ui-monospace, monospace",
          fontSize: 9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        § OFFLINE
      </div>
      <h1
        style={{
          fontSize: "clamp(28px, 4vw, 40px)",
          fontWeight: 500,
          letterSpacing: "-0.03em",
          maxWidth: 540,
          lineHeight: 1.1,
        }}
      >
        You&apos;re offline.
      </h1>
      <p
        style={{
          color: "var(--muted)",
          lineHeight: 1.6,
          maxWidth: 480,
          fontSize: 14,
        }}
      >
        Pages and data you&apos;ve recently opened are still available — try
        going back to the planner, pantry, or recipes. Anything you haven&apos;t
        loaded yet this session will need a connection.
      </p>
    </div>
  );
}
