import type { Metadata } from "next";
import LandingNav from "./_components/LandingNav";
import Ticker from "./_components/Ticker";
import Hero from "./_components/Hero";
import Manifesto from "./_components/Manifesto";
import ChapterLibrary from "./_components/ChapterLibrary";
import ChapterWeek from "./_components/ChapterWeek";
import PullQuote from "./_components/PullQuote";
import Close from "./_components/Close";
import LandingFooter from "./_components/LandingFooter";
import RevealScript from "./_components/RevealScript";
import "./landing.css";

export const metadata: Metadata = {
  title: "Good Measure — A nutrition app for people who actually cook.",
  description:
    "Your pantry, your recipes, your week — measured to the gram, planned as a system, optimized by an AI that reads the whole week instead of one meal at a time.",
  openGraph: {
    title: "Good Measure — A nutrition app for people who actually cook.",
    description:
      "Your pantry, your recipes, your week — measured to the gram, planned as a system, optimized by AI.",
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
      <PullQuote />
      <Close />
      <LandingFooter />
      <RevealScript />
    </div>
  );
}
