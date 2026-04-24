export default function LandingNav() {
  return (
    <nav className="nav" aria-label="Primary">
      <a href="#" className="nav-logo" aria-label="Good Measure — home">
        <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M32,32H0V0h32v32ZM1.38,30.62h29.25V1.38H1.38v29.25h0Z" fill="currentColor" />
          <rect x="9.09" y="6.8" width="3.2" height="18.4" fill="currentColor" />
          <rect x="19.74" y="6.8" width="3.2" height="18.4" fill="currentColor" />
        </svg>
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
