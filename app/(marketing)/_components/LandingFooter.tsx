export default function LandingFooter() {
  return (
    <footer className="foot">
      <div>
        © 2026 · Made by{" "}
        <a href="https://www.mersostudio.com/" target="_blank" rel="noopener noreferrer">
          Mer So Studio, LLC
        </a>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        <a href="mailto:hello@mersostudio.com">Contact</a>
        <span style={{ margin: "0 8px" }}>·</span>
        <a href="/privacy">Privacy</a>
      </div>
    </footer>
  );
}
