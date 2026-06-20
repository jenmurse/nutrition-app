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
            Good Measure is a personal nutrition and meal planning tool made by Mer So Studio, LLC, available on the web. This policy explains what data we collect, how it&rsquo;s used, and how you can control it.
          </p>

          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginTop: 16 }}>
            Effective June 16, 2026
          </p>

          <Section heading="What we collect">
            <List items={[
              "Your name and email address when you create an account",
              "Your name and email when you sign in with Apple or Google — only your name and email are shared with us by those services, nothing else",
              "Nutrition goals, recipes, ingredients, meal plans, and day templates you create",
              "Your name and email address if you join the waitlist",
            ]} />
          </Section>

          <Section heading="What we don't collect">
            <List items={[
              "Payment information",
              "Location data",
              "Contacts, photos library, or microphone access",
              "Advertising or tracking identifiers of any kind — we never track you across other apps or websites",
            ]} />
          </Section>

          <Section heading="Where your data lives">
            <p style={bodyStyle}>
              Good Measure runs on{" "}
              <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>Supabase</a>
              {" "}and{" "}
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>Vercel</a>
              {" "}(United States). All data stays within these services and is never sold or shared with third parties.
            </p>
          </Section>

          <Section heading="Signing in">
            <p style={bodyStyle}>
              You can sign in with an email magic link, with{" "}
              <strong style={{ color: "var(--fg)", fontWeight: 600 }}>Sign in with Apple</strong>, or with{" "}
              <strong style={{ color: "var(--fg)", fontWeight: 600 }}>Google</strong>. When you use Apple or Google, they confirm your identity and share only your name and email with us. We don&rsquo;t receive your password, and we don&rsquo;t post anything or read anything else from those accounts.
            </p>
          </Section>

          {/* TODO (native launch): add "On your phone and tablet" section covering offline cache, keychain token, notification permissions, no third-party SDKs */}

          <Section heading="How long we keep it">
            <p style={bodyStyle}>
              Your data is kept for as long as your account exists. You can delete your account at any time from Settings. This permanently deletes all your data immediately.
            </p>
          </Section>

          <Section heading="Cookies and sign-in tokens">
            <p style={bodyStyle}>
              On the web, we use session cookies only to keep you signed in. In the mobile apps, the equivalent sign-in token is stored securely on your device instead of in a cookie. We do not use advertising or tracking cookies anywhere.
            </p>
          </Section>

          <Section heading="Your rights">
            <p style={bodyStyle}>
              Your data is yours. You can view and edit everything you&rsquo;ve created directly in the app at any time, and you can permanently delete your account &mdash; and all of its data &mdash; from Settings. If you&rsquo;d like a copy of your data exported, or you can&rsquo;t access your account, email us and we&rsquo;ll help. Depending on where you live, you may have additional rights under the GDPR (EU/UK) or CCPA (California), including the right to access, correct, port, or delete your data; this policy describes how we honor those rights for everyone.
            </p>
          </Section>

          <Section heading="Children's privacy">
            <p style={bodyStyle}>
              Good Measure is not directed to children under 13, and we don&rsquo;t knowingly collect personal information from them. A parent can set up a{" "}
              <strong style={{ color: "var(--fg)", fontWeight: 600 }}>tracked-only profile</strong> for a child within their household &mdash; this holds only what the parent enters (such as a first name and nutrition goals) and has no login or account of its own.
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

          <Section heading="AI integration via MCP (optional, advanced)">
            <p style={bodyStyle}>
              Good Measure does not call any AI service on your behalf. Instead, it offers an optional MCP integration for use with any MCP-compatible AI agent (such as Claude). If you set this up, your recipe and nutrition data is accessed by your own AI agent using a token you control. Any data shared with your AI agent during a session is subject to that agent&rsquo;s own privacy policy &mdash; not ours.
            </p>
          </Section>

          <Section heading="Changes to this policy">
            <p style={bodyStyle}>
              If we change what we collect or how we use it, we&rsquo;ll update this page and revise the effective date above. For significant changes, we&rsquo;ll let you know in the app.
            </p>
          </Section>

          <Section heading="Contact">
            <p style={bodyStyle}>
              {/* TODO (DNS move): change to hello@withgoodmeasure.com once Cloudflare Email Routing is set up */}
              Questions about your data? Email{" "}
              <a href="mailto:hello@withgoodmeasure.com" style={{ ...linkStyle, textDecoration: "underline" }}>hello@withgoodmeasure.com</a>
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
