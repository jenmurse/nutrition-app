import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="standalone-page" data-register="editorial">
      <header className="standalone-topbar">
        <Link href="/" className="standalone-wordmark">Good Measure</Link>
      </header>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "64px 24px 80px" }}>

          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>§ Privacy</p>
          <h1 style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: "clamp(28px, 3vw, 40px)", letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--fg)", marginBottom: 24 }}>Your data, simply explained.</h1>

          <p style={{ fontFamily: "var(--font-sans)", fontWeight: 400, fontSize: 15, lineHeight: 1.7, color: "var(--fg-2)", maxWidth: 560, marginBottom: 0 }}>
            Good Measure is a personal nutrition and meal planning tool. This policy explains what data we collect, how it&rsquo;s used, and how you can control it.
          </p>

          <Section heading="What we collect">
            <List items={[
              "Your name and email address when you create an account",
              "Nutrition goals, recipes, ingredients, and meal plans you create",
              "Your name and email address if you join the waitlist",
            ]} />
          </Section>

          <Section heading="What we don't collect">
            <List items={[
              "Payment information",
              "Location data",
              "Advertising or tracking data of any kind",
            ]} />
          </Section>

          <Section heading="Where your data lives">
            <p style={bodyStyle}>
              Good Measure runs on{" "}
              <a href="https://railway.app" target="_blank" rel="noopener noreferrer" style={linkStyle}>Railway</a>
              {" "}(United States). Authentication is handled by{" "}
              <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>Supabase</a>.
              {" "}Images are stored on{" "}
              <a href="https://developers.cloudflare.com/r2" target="_blank" rel="noopener noreferrer" style={linkStyle}>Cloudflare R2</a>.
              {" "}All data stays within these services and is never sold or shared with third parties.
            </p>
          </Section>

          <Section heading="How long we keep it">
            <p style={bodyStyle}>
              Your data is kept for as long as your account exists. You can delete your account at any time from Settings. This permanently deletes all your data immediately.
            </p>
          </Section>

          <Section heading="Cookies">
            <p style={bodyStyle}>
              We use session cookies only to keep you signed in. We do not use advertising or tracking cookies.
            </p>
          </Section>

          <Section heading="AI integration (optional)">
            <p style={bodyStyle}>
              Good Measure includes an optional MCP integration for use with any MCP-compatible AI agent. If you use this feature, your recipe and nutrition data is accessed by your own AI agent using a token you control. Good Measure does not send your data to any AI service on your behalf. Data shared with your AI agent during a session is subject to that agent&rsquo;s own privacy policy.
            </p>
          </Section>

          <Section heading="Contact">
            <p style={bodyStyle}>
              Questions about your data? Email{" "}
              <a href="mailto:hello@jenmurse.com" style={{ ...linkStyle, textDecoration: "underline" }}>hello@jenmurse.com</a>
            </p>
          </Section>

        </div>
      </div>
    </div>
  );
}

const bodyStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontWeight: 400,
  fontSize: 14,
  lineHeight: 1.7,
  color: "var(--fg-2)",
  margin: 0,
};

const linkStyle: React.CSSProperties = {
  color: "var(--fg)",
  textDecoration: "underline",
};

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 40 }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>
        {heading}
      </p>
      {children}
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontFamily: "var(--font-sans)", fontWeight: 400, fontSize: 14, lineHeight: 1.7, color: "var(--fg-2)", padding: "4px 0" }}>
          {item}
        </li>
      ))}
    </ul>
  );
}
