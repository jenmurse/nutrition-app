import Link from "next/link";

export default function Footer() {
  return (
    <footer className="ln-footer">
      <span className="ln-eyebrow">© 2026 · Mer So Studio, LLC</span>
      <div className="ln-footer-links">
        <a href="mailto:hello@withgoodmeasure.com">Contact</a>
        <Link href="/privacy">Privacy</Link>
      </div>
    </footer>
  );
}
