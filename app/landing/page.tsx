import LandingScreenCycle from "../components/LandingScreenCycle";

export const metadata = {
  title: "Good Measure — Recipe-based nutrition for your household",
  description:
    "Build or import recipes, see live nutrition, optimize with AI, and plan the week for everyone in your household. No spreadsheets.",
};

export default function LandingPage() {
  return (
    <div className="lp-root">

      {/* ── Split hero (nav + copy + features / floating app frame) ── */}
      <LandingScreenCycle />

      {/* ── Footer ── */}
      <footer className="lp-footer" aria-label="Site footer">
        <span className="lp-footer-copy">
          © 2026 Made by{" "}
          <a href="https://jenmurse.com" target="_blank" rel="noopener noreferrer" className="lp-footer-link">
            Jen Murse
          </a>
        </span>
      </footer>

    </div>
  );
}
