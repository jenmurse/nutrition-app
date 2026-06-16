import type { Metadata } from "next";
import Topbar from "./_components/Topbar";
import Hero from "./_components/Hero";
import ImageBand from "./_components/ImageBand";
import Interstitial from "./_components/Interstitial";
import Scenario from "./_components/Scenario";
import Architecture from "./_components/Architecture";
import Close from "./_components/Close";
import Footer from "./_components/Footer";
import "./landing.css";

const SHARE_DESCRIPTION =
  "A single tool for your pantry, your recipes, and your week of meals. One ingredient library, nutrition calculated to the gram, and a planner that optimizes your days to hit your targets — by math, in a tap.";

export const metadata: Metadata = {
  title: "Good Measure — Measure what matters.",
  description: SHARE_DESCRIPTION,
  openGraph: {
    title: "Good Measure — Measure what matters.",
    description: SHARE_DESCRIPTION,
  },
};

// ── Placeholder UI primitives reused across scenarios.
//    SCREENSHOT SLOTS: replace each function call site below with a
//    real screenshot when Jen provides them.

const PhRecipe = ({ green = false }: { green?: boolean }) => (
  <div className="ln-ph-recipe">
    <div className="ln-rh" />
    <div className={`ln-rl${green ? " green" : ""}`} />
    <div className="ln-rl short" />
    <div className={`ln-rl${green ? " green" : ""}`} />
    <div className="ln-rl short" />
  </div>
);

const PhEmptyWeek = () => (
  <div className="ln-ph">
    <div className="ln-ph-bar" />
    <div className="ln-ph-grid">
      {Array.from({ length: 7 }).map((_, i) => <div key={i} />)}
    </div>
  </div>
);

const PhAppliedWeek = ({ dayIndex }: { dayIndex: number }) => (
  <div className="ln-ph">
    <div className="ln-ph-bar" />
    <div className="ln-ph-grid">
      {Array.from({ length: 7 }).map((_, day) =>
        day === dayIndex ? (
          <div key={day}>
            <div className="ln-ph-cell brk swap" />
            <div className="ln-ph-cell lun swap" />
            <div className="ln-ph-cell din swap" />
          </div>
        ) : (
          <div key={day} />
        )
      )}
    </div>
  </div>
);

const PhShoppingList = () => (
  <div className="ln-ph-recipe" style={{ inset: "10% 10% 10% 10%" }}>
    {/* SCREENSHOT SLOT: Shopping list grouped by category */}
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className={`ln-rl${i % 3 === 0 ? "" : " short"}`} style={{ width: i % 3 === 0 ? "40%" : i % 3 === 1 ? "80%" : "65%" }} />
    ))}
  </div>
);

const PhDay = ({ clean = false }: { clean?: boolean }) => (
  <div className="ln-ph-day">
    <div className="ln-dh" />
    <div className="ln-ds">
      <div className="ln-ph-cell" />
      <div className="ln-ph-cell" />
      <div className="ln-ph-cell" />
    </div>
    <div className="ln-totals" style={clean ? { opacity: 1 } : undefined} />
  </div>
);

const PhDialog = () => (
  <div className="ln-ph-dialog">
    <div className="ln-dt" />
    <div className="ln-di" />
    <div className="ln-di" />
  </div>
);

// Optimizer "three variations" — three result cards side by side.
const PhOptResults = () => (
  <div className="ln-ph" style={{ flexDirection: "row", gap: 8, padding: 12 }}>
    {/* SCREENSHOT SLOT: Optimizer — three variations side by side */}
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} style={{ flex: 1, border: "1px solid var(--rule)", display: "flex", flexDirection: "column", gap: 8, padding: 10 }}>
        <div style={{ height: 10, background: "var(--fg)", width: "70%" }} />
        <div style={{ height: 6, background: "var(--accent)", width: "85%" }} />
        <div style={{ height: 6, background: "var(--rule)", width: "60%" }} />
        <div style={{ height: 6, background: "var(--rule)", width: "75%" }} />
      </div>
    ))}
  </div>
);

export default function MarketingLanding() {
  return (
    <div className="ln">
      <Topbar />
      <Hero />

      <ImageBand
        tiles={[
          { label: "Breakfast", hint: "[ Photo ]<br/>Turmeric waffles" },
          { label: "Lunch", hint: "[ Photo ]<br/>Lunch salad<br/>with tuna" },
          { label: "Dinner", hint: "[ Photo ]<br/>Black bean<br/>&amp; lentil chili" },
          { label: "Dessert", hint: "[ Photo ]<br/>Almond croissant<br/>blondies" },
        ]}
      />

      <Scenario
        id="scn01"
        num="01"
        headline="You found a recipe. Make it yours."
        lede="Save a recipe from anywhere. Change any ingredient or amount and the nutrition recalculates as you go. Actual ingredients, actual numbers. Save a new version that's yours. The original stays untouched."
        beats={[
          {
            tag: "Original",
            heading: "It enters exactly as published.",
            body: "Paste a URL. Good Measure pulls the recipe apart to the gram and matches every ingredient against your pantry. Over a hundred USDA-sourced staples are there from day one, so most recipes match against something real on first import.",
          },
          {
            tag: "Your edits",
            heading: "Change it like it's yours.",
            body: "Swap an ingredient, cut an amount, and the math follows instantly. Recipes draw from your pantry, so the numbers track the food. Prefer to talk it through? Connect an AI assistant via MCP and it reads the real recipe, handing back specific swaps: which ingredient, what amount, what it does to the totals.",
            prompt:
              "\"Cut the miso paste from 4 tsp to 2 tsp. Swap to no-salt cannellini beans. Drops the dish from 1,858mg sodium to about 950mg.\"",
          },
          {
            tag: "Saved",
            heading: "Keep the version that's yours.",
            body: "You save the change and the new version lands in your library. The original stays where it was. Two tablespoons of olive oil down to one, and every total updates with it.",
          },
        ]}
        states={[
          /* SCREENSHOT SLOT: Recipe import (original) — scn01 state A */
          <PhRecipe key="01-a" />,
          /* SCREENSHOT SLOT: Recipe editor with live nutrition — scn01 state B */
          <PhRecipe key="01-b" />,
          /* SCREENSHOT SLOT: Saved version — scn01 state C */
          <PhRecipe key="01-c" green />,
        ]}
      />

      <Interstitial
        tiles={[
          { label: "Snack", hint: "[ Photo ]<br/>Apple slices<br/>with almond butter" },
          { label: "Side", hint: "[ Photo ]<br/>Sesame miso lentils" },
        ]}
      />

      <Scenario
        id="scn02"
        num="02"
        headline="The day isn't landing. Fix it by the numbers."
        lede="Good Measure was built for people who want real control over what they cook, for one person or a whole household. My husband and I cook from the same kitchen with different goals, so every person has their own plan and their own targets, running against the shared recipe and pantry library. When a day comes up short, you don't rebuild it by hand. You optimize it."
        beats={[
          {
            tag: "Off target",
            heading: "The meals are in. The numbers aren't there yet.",
            body: "The meals are fine. The balance isn't. Protein's short, sodium's over. Open the day, tap Optimize, and tell it what matters.",
          },
          {
            tag: "Your targets",
            heading: "Pick up to three things to hit.",
            body: "Protein up. Sodium down. Fiber where you want it. You set the goals. The optimizer searches your whole library for the meals that get you there.",
          },
          {
            tag: "Three ways",
            heading: "It gives you three ways to get there.",
            body: "Each option swaps real meals from your library, favorites first, matched to the right slot, and shows exactly what changes and what it does to every number. Nothing moves until you choose.",
          },
          {
            tag: "Applied",
            heading: "Apply the one you like. The day settles.",
            body: "The swaps land in the planner and the daily totals settle where you wanted them. Same day, same targets, same options every time.",
          },
        ]}
        states={[
          /* SCREENSHOT SLOT: Day with totals off target — scn02 state A */
          <PhDay key="02-a" />,
          /* SCREENSHOT SLOT: Optimizer target picker (up to 3 nutrients) — scn02 state B */
          <PhDialog key="02-b" />,
          /* SCREENSHOT SLOT: Optimizer three variations — scn02 state C */
          <PhOptResults key="02-c" />,
          /* SCREENSHOT SLOT: Day after applying, totals clean — scn02 state D */
          <PhDay key="02-d" clean />,
        ]}
      />

      <Interstitial
        tiles={[
          { label: "Breakfast", hint: "[ Photo ]<br/>Overnight oats<br/>with peanut butter" },
          { label: "Dinner", hint: "[ Photo ]<br/>One-pan Indian style<br/>fish &amp; chickpeas" },
        ]}
      />

      <Scenario
        id="scn03"
        num="03"
        headline="A day that worked is a day you can reuse."
        lede="When a day pulls clean, calories right, protein on, fiber where it should be, save it as a template. Apply it to any future day in one tap, or build a rotation from the handful of days that consistently work. The next week starts with something to build from."
        beats={[
          {
            tag: "A clean day",
            heading: "Some days just hit.",
            body: "Calories landed, protein was on, fiber was where it should be. Instead of rebuilding that day from scratch next week, save it.",
          },
          {
            tag: "Save it",
            heading: "Name it for what it is.",
            body: "Workout day. Light Friday. Mediterranean. The formula is captured once, every meal, every amount, ready to drop in whenever you need it.",
          },
          {
            tag: "Empty week",
            heading: "Later, a new week.",
            body: "You're filling next Tuesday. A blank day waiting.",
          },
          {
            tag: "Applied",
            heading: "Apply the template. The day fills.",
            body: "A good formula, reused without effort. The planner stops being weekly busywork and becomes a set of patterns you trust.",
          },
          {
            tag: "The list",
            heading: "Once the week is built, the list writes itself.",
            body: "Every ingredient from every recipe, grouped by where you'll find it in the store, scaled to the servings you're actually making, down to the gram. Check things off as you shop, and share the list with whoever's going.",
          },
        ]}
        states={[
          /* SCREENSHOT SLOT: A clean day with totals — scn03 state A */
          <PhDay key="03-a" clean />,
          /* SCREENSHOT SLOT: Save-as-template dialog — scn03 state B */
          <PhDialog key="03-b" />,
          /* SCREENSHOT SLOT: Empty planner week — scn03 state C */
          <PhEmptyWeek key="03-c" />,
          /* SCREENSHOT SLOT: Template applied to one day — scn03 state D */
          <PhAppliedWeek key="03-d" dayIndex={1} />,
          /* SCREENSHOT SLOT: Shopping list grouped by category — scn03 state E */
          <PhShoppingList key="03-e" />,
        ]}
      />

      <Architecture
        eyebrow="Why it works this way"
        headline="Everything you cook. One place to run it."
        body="Good Measure does the daily work on its own. Optimize a day, save it, reuse it, shop it. When you want more, connect any MCP-compatible AI assistant and it gets read and write access to everything inside: your recipes, your goals, your weekly plan. Ask it to plan a whole week from scratch, write a new recipe, or talk through a dietary goal in plain language. It reads and writes directly to your data. Use the assistant subscription you already have, no separate account needed. You review what changes; it handles the detail work."
      />

      <Close
        eyebrow="The invitation"
        headline="Cook by the gram. Plan by the week."
        body="I built Good Measure for myself and I use it every day. If you've been looking for something that gives you real control over what you eat, without turning it into a chore, it's here for you to try. Right now it's invite-only, for friends and family."
      />

      <Footer />
    </div>
  );
}
