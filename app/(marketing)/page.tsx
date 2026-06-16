import type { Metadata } from "next";
import Topbar from "./_components/Topbar";
import Hero from "./_components/Hero";
import ImageBand from "./_components/ImageBand";
import Interstitial from "./_components/Interstitial";
import StickyScene from "./_components/StickyScene";
import Architecture from "./_components/Architecture";
import Close from "./_components/Close";
import Footer from "./_components/Footer";
import AppWindow from "./_demo/AppWindow";
import FloatWindow from "./_demo/FloatWindow";
import PhoneFrame from "./_demo/PhoneFrame";
import Planner from "./_demo/screens/Planner";
import PlannerZoom from "./_demo/screens/PlannerZoom";
import RecipeView from "./_demo/screens/RecipeView";
import AgentView from "./_demo/screens/AgentView";
import OptimizerPicker from "./_demo/screens/OptimizerPicker";
import OptimizerResults from "./_demo/screens/OptimizerResults";
import TemplateSave from "./_demo/screens/TemplateSave";
import ShoppingList from "./_demo/screens/ShoppingList";
import MobileRecipeView from "./_demo/screens/MobileRecipeView";
import MobileAgentView from "./_demo/screens/MobileAgentView";
import MobilePlannerDay from "./_demo/screens/MobilePlannerDay";
import MobileOptimizerPicker from "./_demo/screens/MobileOptimizerPicker";
import MobileOptimizerResults from "./_demo/screens/MobileOptimizerResults";
import MobileTemplateSave from "./_demo/screens/MobileTemplateSave";
import MobileShoppingList from "./_demo/screens/MobileShoppingList";
import { week03 } from "./_demo/week";
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


export default function MarketingLanding() {
  return (
    <div className="ln">
      <Topbar />
      <Hero />

      <ImageBand
        tiles={[
          { label: "Breakfast", hint: "[ Photo ]<br/>Weekend eggs<br/>&amp; avocado" },
          { label: "Lunch", hint: "[ Photo ]<br/>Poke bowl" },
          { label: "Dinner", hint: "[ Photo ]<br/>Roasted tahini<br/>cauliflower &amp; lentils" },
          { label: "Dessert", hint: "[ Photo ]<br/>Lemon bars" },
        ]}
      />

      <StickyScene
        id="scn01"
        num="01"
        headline="You found a recipe. Make it yours."
        lede="Save a recipe from anywhere. Change any ingredient or amount and the nutrition recalculates as you go. Actual ingredients, actual numbers. Save a new version that's yours. The original stays untouched."
        beats={[
          {
            eyebrow: "Original",
            heading: "It enters exactly as published.",
            body: "Paste a URL. Good Measure pulls the recipe apart to the gram and matches every ingredient against your pantry. Over a hundred USDA-sourced staples are there from day one, so most recipes match against something real on first import.",
            visual: (
              <FloatWindow w={1040} h={760}>
                <AppWindow active="Recipes">
                  <RecipeView state="original" />
                </AppWindow>
              </FloatWindow>
            ),
            mobileVisual: (
              <FloatWindow w={390} autoHeight>
                <PhoneFrame>
                  <MobileRecipeView state="original" />
                </PhoneFrame>
              </FloatWindow>
            ),
          },
          {
            eyebrow: "Your edits",
            heading: "Change it like it's yours.",
            body: "Edit any ingredient or amount and the math follows instantly. Or talk it through: connect an AI assistant via MCP and it reads the real recipe, hands back specific swaps, and writes the change right back — which ingredient, what amount, what it does to the totals.",
            visual: (
              <FloatWindow w={1040} h={760}>
                <AgentView />
              </FloatWindow>
            ),
            mobileVisual: (
              <FloatWindow w={390} autoHeight>
                <MobileAgentView />
              </FloatWindow>
            ),
          },
          {
            eyebrow: "Saved",
            heading: "Keep the version that's yours.",
            body: "You save the change and the new version lands in your library. The original stays where it was. Two tablespoons of olive oil down to one, and every total updates with it.",
            visual: (
              <FloatWindow w={1040} h={760}>
                <AppWindow active="Recipes">
                  <RecipeView state="saved" saved />
                </AppWindow>
              </FloatWindow>
            ),
            mobileVisual: (
              <FloatWindow w={390} autoHeight>
                <PhoneFrame>
                  <MobileRecipeView state="saved" />
                </PhoneFrame>
              </FloatWindow>
            ),
          },
        ]}
      />

      <Interstitial
        tiles={[
          { label: "Snack", hint: "[ Photo ]<br/>Apple &amp; almond butter" },
          { label: "Dessert", hint: "[ Photo ]<br/>Tahini chocolate<br/>chip cookies" },
        ]}
      />

      <StickyScene
        id="scn02"
        num="02"
        headline="The day isn't landing. Fix it by the numbers."
        lede="Good Measure was built for people who want real control over what they cook, for one person or a whole household. My husband and I cook from the same kitchen with different goals, so every person has their own plan and their own targets, running against the shared recipe and pantry library. When a day comes up short, you don't rebuild it by hand. You optimize it."
        beats={[
          {
            eyebrow: "Off target",
            heading: "The meals are in. The numbers aren't there yet.",
            body: "The meals are fine. The balance isn't. Protein's short, sodium's over. Open the day, tap Optimize, and tell it what matters.",
            visual: (
              <FloatWindow w={1100} h={900}>
                <PlannerZoom mode="off" />
              </FloatWindow>
            ),
            mobileVisual: (
              <FloatWindow w={390} autoHeight>
                <PhoneFrame>
                  <MobilePlannerDay mode="off" />
                </PhoneFrame>
              </FloatWindow>
            ),
          },
          {
            eyebrow: "Your targets",
            heading: "Pick up to three things to hit.",
            body: "Protein up. Sodium down. Fiber where you want it. You set the goals. The optimizer searches your whole library for the meals that get you there.",
            visual: (
              <FloatWindow w={1100} h={1060}>
                <AppWindow>
                  <OptimizerPicker />
                </AppWindow>
              </FloatWindow>
            ),
            mobileVisual: (
              <FloatWindow w={390} autoHeight>
                <PhoneFrame>
                  <MobileOptimizerPicker />
                </PhoneFrame>
              </FloatWindow>
            ),
          },
          {
            eyebrow: "Three options",
            heading: "It gives you three options to get there.",
            body: "Each option swaps real meals from your library, favorites first, matched to the right slot, and shows exactly what changes and what it does to every number. Nothing moves until you choose.",
            visual: (
              <FloatWindow w={1100} h={900}>
                <AppWindow>
                  <OptimizerResults />
                </AppWindow>
              </FloatWindow>
            ),
            mobileVisual: (
              <FloatWindow w={390} autoHeight>
                <PhoneFrame>
                  <MobileOptimizerResults />
                </PhoneFrame>
              </FloatWindow>
            ),
          },
          {
            eyebrow: "Applied",
            heading: "Apply the one you like. The day settles.",
            body: "The swaps land in the planner and the daily totals settle where you wanted them. Same day, same targets, same options every time.",
            visual: (
              <FloatWindow w={1100} h={900}>
                <PlannerZoom mode="applied" />
              </FloatWindow>
            ),
            mobileVisual: (
              <FloatWindow w={390} autoHeight>
                <PhoneFrame>
                  <MobilePlannerDay mode="applied" />
                </PhoneFrame>
              </FloatWindow>
            ),
          },
        ]}
      />

      <Interstitial
        tiles={[
          { label: "Breakfast", hint: "[ Photo ]<br/>Overnight oats,<br/>peanut butter" },
          { label: "Dinner", hint: "[ Photo ]<br/>Noodle bowl<br/>w/ shrimp" },
        ]}
      />

      <StickyScene
        id="scn03"
        num="03"
        headline="A day that worked is a day you can reuse."
        lede="When a day pulls clean, calories right, protein on, fiber where it should be, save it as a template. Apply it to any future day in one tap, or build a rotation from the handful of days that consistently work. The next week starts with something to build from."
        beats={[
          {
            eyebrow: "A clean day",
            heading: "Some days just hit.",
            body: "Calories landed, protein was on, fiber was where it should be. Instead of rebuilding that day from scratch next week, save it.",
            visual: (
              <FloatWindow w={1100} h={900}>
                <AppWindow active="Planner">
                  <Planner days={week03("clean")} dateRange="Mar 16–22" />
                </AppWindow>
              </FloatWindow>
            ),
            mobileVisual: (
              <FloatWindow w={390} autoHeight>
                <PhoneFrame>
                  <MobilePlannerDay mode="clean" />
                </PhoneFrame>
              </FloatWindow>
            ),
          },
          {
            eyebrow: "Save it",
            heading: "Name it for what it is.",
            body: "Workout day. Light Friday. Mediterranean. The formula is captured once, every meal, every amount, ready to drop in whenever you need it.",
            visual: (
              <FloatWindow w={1100} h={900}>
                <AppWindow active="Planner">
                  <TemplateSave />
                </AppWindow>
              </FloatWindow>
            ),
            mobileVisual: (
              <FloatWindow w={390} autoHeight>
                <PhoneFrame>
                  <MobileTemplateSave />
                </PhoneFrame>
              </FloatWindow>
            ),
          },
          {
            eyebrow: "Empty week",
            heading: "Later, a new week.",
            body: "You're filling next Wednesday. A blank day waiting.",
            visual: (
              <FloatWindow w={1100} h={900}>
                <AppWindow active="Planner">
                  <Planner days={week03("empty")} dateRange="Mar 23–29" />
                </AppWindow>
              </FloatWindow>
            ),
            mobileVisual: (
              <FloatWindow w={390} autoHeight>
                <PhoneFrame>
                  <MobilePlannerDay mode="empty" />
                </PhoneFrame>
              </FloatWindow>
            ),
          },
          {
            eyebrow: "Applied",
            heading: "Apply the template. The day fills.",
            body: "A good formula, reused without effort. The planner stops being weekly busywork and becomes a set of patterns you trust.",
            visual: (
              <FloatWindow w={1100} h={900}>
                <AppWindow active="Planner">
                  <Planner days={week03("applied")} dateRange="Mar 23–29" />
                </AppWindow>
              </FloatWindow>
            ),
            mobileVisual: (
              <FloatWindow w={390} autoHeight>
                <PhoneFrame>
                  <MobilePlannerDay mode="template-applied" />
                </PhoneFrame>
              </FloatWindow>
            ),
          },
          {
            eyebrow: "The list",
            heading: "Once the week is built, the list writes itself.",
            body: "Every ingredient from every recipe, grouped by where you'll find it in the store, scaled to the servings you're actually making, down to the gram. Check things off as you shop, and share the list with whoever's going.",
            visual: (
              <FloatWindow w={1100} h={900}>
                <AppWindow active="Shopping">
                  <ShoppingList />
                </AppWindow>
              </FloatWindow>
            ),
            mobileVisual: (
              <FloatWindow w={390} autoHeight>
                <PhoneFrame>
                  <MobileShoppingList />
                </PhoneFrame>
              </FloatWindow>
            ),
          },
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
