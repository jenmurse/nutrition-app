import Link from "next/link";

export default function Footer() {
  return (
    <footer className="ln-footer">
      <span className="ln-eyebrow">© 2026 · <a href="https://www.mersostudio.com/" target="_blank" rel="noopener noreferrer">Mer So Studio, LLC</a></span>
      <div className="ln-footer-links">
        <Link href="/privacy">Privacy</Link>
      </div>
    </footer>
  );
}
