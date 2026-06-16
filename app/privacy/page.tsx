import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="standalone-page" style={{ minHeight: 0, height: "100%" }}>
      <header className="standalone-topbar">
        <Link href="/" className="standalone-wordmark">Good Measure</Link>
        <Link href="/" className="standalone-back-link">← Back</Link>
      </header>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "64px 24px 80px" }}>

          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>Privacy</p>
          <h1 style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: "clamp(28px, 3vw, 40px)", letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--fg)", marginBottom: 24 }}>Your data, simply explained.</h1>

          <p style={{ fontFamily: "var(--font-sans)", fontWeight: 400, fontSize: 15, lineHeight: 1.7, color: "var(--fg-2)", maxWidth: 560, marginBottom: 0 }}>
            Good Measure is a personal nutrition and meal planning tool made by Mer So Studio, LLC. This policy explains what data we collect, how it&rsquo;s used, and how you can control it.
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

          <Section heading="Household sharing">
            <p style={bodyStyle}>
              Good Measure is built around households. When you create an account, you can invite other people to join your household. Each person you invite either signs in with their own account or is set up as a <strong style={{ color: "var(--fg)", fontWeight: 600 }}>tracked-only profile</strong> &mdash; useful for tracking children, for example, where one parent manages the data and the child has no login.
            </p>
            <p style={{ ...bodyStyle, marginTop: 12 }}>
              Within a household, recipes and pantry ingredients are <strong style={{ color: "var(--fg)", fontWeight: 600 }}>shared by all members</strong>. Nutrition goals and meal plans are <strong style={{ color: "var(--fg)", fontWeight: 600 }}>per-person but visible to all household members</strong> &mdash; so any signed-in member can see and edit any other member&rsquo;s plan. This is the design model; it&rsquo;s not a privacy gap.
            </p>
            <p style={{ ...bodyStyle, marginTop: 12 }}>
              If the household model isn&rsquo;t right for you (e.g. you want your data fully private from other adults), don&rsquo;t accept a household invitation &mdash; create a separate account instead.
            </p>
          </Section>

          <Section heading="In-app AI chat">
            <p style={bodyStyle}>
              Good Measure includes an in-app AI chat assistant. When you use it, your messages and a structured summary of your kitchen data (recipe names, nutrition goals, current week&rsquo;s plan, pantry summary) are sent to{" "}
              <a href="https://www.anthropic.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>Anthropic</a>
              {" "}via their API to generate the response. Anthropic does not train on API traffic and retains it briefly for abuse monitoring per their{" "}
              <a href="https://www.anthropic.com/legal/commercial-terms" target="_blank" rel="noopener noreferrer" style={linkStyle}>commercial terms</a>.
            </p>
            <p style={{ ...bodyStyle, marginTop: 12 }}>
              Your conversation history is also stored in Good Measure&rsquo;s database so you can pick up where you left off across sessions. You can clear your conversation at any time, and deleting your account erases your chat history immediately.
            </p>
            <p style={{ ...bodyStyle, marginTop: 12 }}>
              Within a household, the chat can read and write data for any household member, mirroring the household sharing model above. The chat does not expose any data the rest of the app doesn&rsquo;t already make visible to household members.
            </p>
          </Section>

          <Section heading="AI integration via MCP (optional, advanced)">
            <p style={bodyStyle}>
              Beyond the in-app chat, Good Measure also exposes an optional MCP integration for use with any MCP-compatible AI agent (e.g. Claude Desktop). If you set this up, your recipe and nutrition data is accessed by your own AI agent using a token you control. Good Measure does not send your data to any AI service on your behalf in this mode. Data shared with your AI agent during a session is subject to that agent&rsquo;s own privacy policy.
            </p>
          </Section>

          <Section heading="Contact">
            <p style={bodyStyle}>
              Questions about your data? Email{" "}
              <a href="mailto:hello@mersostudio.com" style={{ ...linkStyle, textDecoration: "underline" }}>hello@mersostudio.com</a>
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
        <li key={i} style={{ fontFamily: "var(--font-sans)", fontWeight: 400, fontSize: 14, lineHeight: 1.7, color: "var(--fg-2)", padding: "1px 0" }}>
          {item}
        </li>
      ))}
    </ul>
  );
}
