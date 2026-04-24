export default function LandingNav() {
  return (
    <nav className="nav" aria-label="Primary">
      <a href="#" className="nav-logo nav-logo-serif" aria-label="Good Measure — home">
        <span>Good Measure</span>
      </a>
      <div className="nav-right">
        <a href="/login">Sign in</a>
        <a href="/login?signup=1" className="cta">
          Get Started <span className="arr" aria-hidden="true">↗</span>
        </a>
      </div>
    </nav>
  );
}
