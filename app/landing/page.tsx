import LandingScreenCycle from "../components/LandingScreenCycle";

export const metadata = {
  title: "Good Measure — Recipe-based nutrition for your household",
  description:
    "Build or import recipes, see live nutrition, optimize with AI, and plan the week for everyone in your household. No spreadsheets.",
};

export default function LandingPage() {
  return (
    <div className="lp-root">
      <LandingScreenCycle />
    </div>
  );
}
