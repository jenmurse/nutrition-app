import type { Metadata } from "next";
import LandingNav from "./_components/LandingNav";
import Ticker from "./_components/Ticker";
import Hero from "./_components/Hero";
import Manifesto from "./_components/Manifesto";
import ChapterLibrary from "./_components/ChapterLibrary";
import ChapterWeek from "./_components/ChapterWeek";
import Close from "./_components/Close";
import LandingFooter from "./_components/LandingFooter";
import LandingMotion from "./_components/LandingMotion";
import "./landing.css";

export const metadata: Metadata = {
  title: "Good Measure — Cook by the gram. Plan by the week.",
  description:
    "A cooking tool that calculates nutrition to the gram, plans meals by the week, and works whether you're cooking for yourself or a whole household.",
  openGraph: {
    title: "Good Measure — Cook by the gram. Plan by the week.",
    description:
      "A cooking tool that calculates nutrition to the gram, plans meals by the week, and works whether you're cooking for yourself or a whole household.",
  },
};

export default function MarketingLanding() {
  return (
    <div className="mkt">
      <LandingNav />
      <Ticker />
      <Hero />
      <Manifesto />
      <ChapterLibrary />
      <ChapterWeek />
      <Close />
      <LandingFooter />
      <LandingMotion />
    </div>
  );
}
