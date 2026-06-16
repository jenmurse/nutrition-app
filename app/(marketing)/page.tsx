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

export const metadata: Metadata = {
  title: "Good Measure — Measure what matters.",
  description:
    "A single tool for your pantry, your recipes, and your week of meals. One ingredient library, nutrition calculated to the gram, plans optimized with AI.",
  openGraph: {
    title: "Good Measure — Measure what matters.",
    description:
      "A single tool for your pantry, your recipes, and your week of meals. One ingredient library, nutrition calculated to the gram, plans optimized with AI.",
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

const PhChat = ({ children }: { children: React.ReactNode }) => (
  <div className="ln-ph-chat">
    <span className="ln-from">You → your AI</span>
    {children}
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

const PhFilledWeek = ({ swapAt }: { swapAt?: { day: number; meal: "brk" | "lun" | "din" } }) => (
  <div className="ln-ph">
    <div className="ln-ph-bar" />
    <div className="ln-ph-grid">
      {Array.from({ length: 7 }).map((_, day) => (
        <div key={day}>
          {(["brk", "lun", "din"] as const).map((meal) => (
            <div
              key={meal}
              className={`ln-ph-cell ${meal}${swapAt?.day === day && swapAt?.meal === meal ? " swap" : ""}`}
            />
          ))}
        </div>
      ))}
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

const PhDay = () => (
  <div className="ln-ph-day">
    <div className="ln-dh" />
    <div className="ln-ds">
      <div className="ln-ph-cell" />
      <div className="ln-ph-cell" />
      <div className="ln-ph-cell" />
    </div>
    <div className="ln-totals" />
  </div>
);

const PhDialog = () => (
  <div className="ln-ph-dialog">
    <div className="ln-dt" />
    <div className="ln-di" />
    <div className="ln-di" />
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
        headline="You found a recipe. Dial it in."
        lede="Save a recipe from anywhere. Chat with your AI about what you'd like to change. Actual ingredients, actual amounts. Save a new version that's yours. The original stays untouched."
        beats={[
          {
            step: "A",
            tag: "Original",
            heading: "It enters exactly as published.",
            body: "Paste a URL. Good Measure pulls the recipe apart to the gram and matches every ingredient against your pantry. Over a hundred USDA-sourced staples are there from day one, so most recipes match against something real on first import.",
          },
          {
            step: "B",
            tag: "Conversation",
            heading: "Ask for the version you actually want.",
            body: "Your AI reads the real recipe through the connection and returns specific swaps with the math attached. Not \"use less sugar,\" but which ingredient, what amount, what it does to the numbers.",
            prompt:
              "\"Cut the miso paste from 4 tsp to 2 tsp. Swap to no-salt cannellini beans. Drops the dish from 1,858mg sodium to about 950mg.\"",
          },
          {
            step: "C",
            tag: "Saved",
            heading: "Keep the version that's yours.",
            body: "You approve the change and the new version lands in your library. The original stays where it was. Recipes draw from the pantry, so the numbers follow the ingredients. Change two tablespoons of olive oil to one and the details update automatically.",
          },
        ]}
        states={[
          /* SCREENSHOT SLOT: Recipe import (original) — scn01 state A */
          <PhRecipe key="01-a" />,
          /* SCREENSHOT SLOT: Conversation with AI — scn01 state B */
          <PhChat key="01-b">
            Pull up this recipe. Lower the sodium without changing what the dish basically is.
          </PhChat>,
          /* SCREENSHOT SLOT: Saved optimized recipe — scn01 state C */
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
        headline="You're staring at a blank week. Describe what you want."
        lede="Good Measure was built for people who want more control over what they cook, whether it's for one person or a household. My husband and I cook from the same kitchen but we have different needs and goals. Every person has their own plan and their own targets running against the shared recipe and pantry library."
        beats={[
          {
            step: "A",
            tag: "Empty week",
            heading: "Seven days. Every slot. Nothing in them yet.",
            body: "The blank week is where most plans die. Good Measure assumes you don't want to fill it by hand, meal by meal, recipe by recipe.",
          },
          {
            step: "B",
            tag: "Asking",
            heading: "Describe the week you want.",
            body: "Your AI already sees your recipes, your goals, and your plan through the connection. You just say what you're going for, in plain language.",
            prompt:
              "\"Propose a week of dinners that hits my protein without going over on sodium, using what's already in my library.\"",
          },
          {
            step: "C",
            tag: "Filled",
            heading: "It writes the plan in.",
            body: "The actual meals, in the actual planner, with daily totals showing whether each day landed clean. Not a list of suggestions in a chat window. The week, in the app, ready to cook from.",
          },
          {
            step: "D",
            tag: "Swap",
            heading: "Change your mind out loud.",
            body: "The plan isn't final. You talk to it. The agent doesn't just suggest. It executes the swap, in place, in the app.",
            prompt: "\"Tuesday's protein is low. Swap the lunch for something with more.\"",
          },
          {
            step: "E",
            tag: "The list",
            heading: "Once the week is planned, the shopping list writes itself.",
            body: "Every ingredient from every recipe, grouped by where you'll find it in the store. Quantities scaled to the servings you're actually making, down to the gram. Check things off as you shop. Share the list with whoever's going.",
          },
        ]}
        states={[
          /* SCREENSHOT SLOT: Empty planner week — scn02 state A */
          <PhEmptyWeek key="02-a" />,
          /* SCREENSHOT SLOT: Conversation asking AI to fill week — scn02 state B */
          <PhChat key="02-b">
            Propose a week of dinners that hits my protein without going over on sodium, using what's already in my library.
          </PhChat>,
          /* SCREENSHOT SLOT: Planner with filled week — scn02 state C */
          <PhFilledWeek key="02-c" />,
          /* SCREENSHOT SLOT: Planner with a swapped lunch — scn02 state D */
          <PhFilledWeek key="02-d" swapAt={{ day: 2, meal: "lun" }} />,
          /* SCREENSHOT SLOT: Shopping list — scn02 state E */
          <PhShoppingList key="02-e" />,
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
        lede="When a day pulls clean (calories right, protein on, fiber where it should be), save it as a template. Apply it to any future day with one click, or build a rotation from the handful of days that consistently work."
        beats={[
          {
            step: "A",
            tag: "A clean day",
            heading: "Some days just hit.",
            body: "Calories landed, protein was on, fiber was where it should be. Instead of rebuilding that day from scratch next week, save it.",
          },
          {
            step: "B",
            tag: "Save it",
            heading: "Name it for what it is.",
            body: "Workout day. Light Friday. Mediterranean. Your AI can save templates too. \"Save this as Workout day\" and it does.",
          },
          {
            step: "C",
            tag: "Empty week",
            heading: "Later, a new week.",
            body: "You're filling next Tuesday. A blank day waiting.",
          },
          {
            step: "D",
            tag: "Applied",
            heading: "Apply the template. The day fills.",
            body: "A good formula, captured once, reused without effort. The planner stops being weekly busywork and becomes a set of patterns you reuse.",
          },
        ]}
        states={[
          /* SCREENSHOT SLOT: A clean day with totals — scn03 state A */
          <PhDay key="03-a" />,
          /* SCREENSHOT SLOT: Save-as-template dialog — scn03 state B */
          <PhDialog key="03-b" />,
          /* SCREENSHOT SLOT: Empty planner week — scn03 state C */
          <PhEmptyWeek key="03-c" />,
          /* SCREENSHOT SLOT: Template applied to one day — scn03 state D */
          <PhAppliedWeek key="03-d" dayIndex={1} />,
        ]}
      />

      <Architecture
        eyebrow="Why it works this way"
        headline="Everything you cook. Connected to your AI."
        body="One install connects your AI to everything in Good Measure. Your recipes, your goals, your weekly plan. All of it readable and writable by your assistant. And the agent doesn't just suggest. It executes. Plan a whole day, swap a meal, save a day that worked as a template, apply it to next week. You confirm the destructive moves; the agent handles the fussy edits."
      />

      <Close
        eyebrow="The invitation"
        headline="Cook by the gram. Plan by the week."
        body="I built Good Measure for myself and I use it every day. If you have been looking for something that can give you more control over what you eat, it's here for you to try. Right now it's invite-only, for friends and family."
      />

      <Footer />
    </div>
  );
}
