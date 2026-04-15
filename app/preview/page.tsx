"use client";

/**
 * UI Preview — comprehensive editorial layout showcase, no auth required.
 * Shows every major layout pattern with mock data.
 * Route: /preview
 */

import { useState, useEffect } from "react";
import { BrandName } from "@/app/components/BrandName";

/* ───────── Mock Data ───────── */

const mockRecipes = [
  { id: 1, name: "Almond Croissant Bars", tag: "dessert", kcal: 678, protein: 22, carbs: 58, fat: 39 },
  { id: 2, name: "Black Bean Avocado Brownies", tag: "dessert", kcal: 95, protein: 4, carbs: 12, fat: 3 },
  { id: 3, name: "Cauliflower Salad with Dates", tag: "lunch", kcal: 310, protein: 8, carbs: 42, fat: 14 },
  { id: 4, name: "Cottage Cheese Breakfast Bowl", tag: "breakfast", kcal: 268, protein: 32, carbs: 24, fat: 8 },
  { id: 5, name: "Crispy Salmon w/ Coconut Rice", tag: "dinner", kcal: 520, protein: 38, carbs: 45, fat: 18 },
  { id: 6, name: "Curried Red Lentils", tag: "dinner", kcal: 385, protein: 22, carbs: 52, fat: 6 },
  { id: 7, name: "Lunch Salad w/ Salmon", tag: "lunch", kcal: 479, protein: 34, carbs: 18, fat: 28 },
  { id: 8, name: "Overnight Oats Power Bowl", tag: "breakfast", kcal: 308, protein: 14, carbs: 48, fat: 8 },
];

const mockDetailIngredients = [
  { amt: "1 cup", name: "cottage cheese (2%)" },
  { amt: "1 cup", name: "blueberries" },
  { amt: "2 tbsp", name: "granola" },
  { amt: "1 tsp", name: "honey" },
  { amt: "1 tsp", name: "chia seeds" },
];

const mockNutrition = [
  { label: "CALORIES", value: 268, goal: 2000, unit: "" },
  { label: "FAT", value: 8, goal: 75, unit: "g" },
  { label: "SAT FAT", value: 4, goal: 20, unit: "g" },
  { label: "SODIUM", value: 420, goal: 2300, unit: "mg" },
  { label: "CARBS", value: 24, goal: 225, unit: "g" },
  { label: "SUGAR", value: 12, goal: 50, unit: "g" },
  { label: "PROTEIN", value: 32, goal: 95, unit: "g" },
  { label: "FIBER", value: 3, goal: 22, unit: "g" },
];

const mockSteps = [
  "Spoon cottage cheese into a wide bowl.",
  "Scatter blueberries and granola across the top.",
  "Drizzle with honey and dust with chia seeds.",
  "Eat immediately — the granola loses its crunch fast.",
];

const recipeTags = ["all", "breakfast", "lunch", "dinner", "snack", "side", "dessert"];

const mockTodayMeals = [
  { num: "01", type: "BREAKFAST", name: "Soft Boiled Eggs with Toast", kcal: 320 },
  { num: "02", type: "LUNCH", name: "Farro Grain Bowl", kcal: 480 },
  { num: "03", type: "DINNER", name: "Roasted Chicken Thighs", kcal: 380 },
];

const mockWeekDays = [
  { day: "Mon", date: 31, kcal: 1840, goal: 2000, meals: [
    { type: "B", name: "Overnight Oats", kcal: 308 },
    { type: "L", name: "Grain Bowl", kcal: 480 },
    { type: "D", name: "Salmon", kcal: 520 },
  ]},
  { day: "Tue", date: 1, kcal: 1620, goal: 2000, meals: [
    { type: "B", name: "Eggs & Toast", kcal: 320 },
    { type: "L", name: "Lentil Soup", kcal: 385 },
    { type: "D", name: "Chicken Thighs", kcal: 380 },
  ]},
  { day: "Wed", date: 2, kcal: 1450, goal: 2000, meals: [
    { type: "B", name: "Yogurt Bowl", kcal: 268 },
    { type: "D", name: "Red Lentils", kcal: 385 },
  ]},
  { day: "Thu", date: 3, kcal: 1980, goal: 2000, meals: [
    { type: "B", name: "Croissant Bars", kcal: 678 },
    { type: "L", name: "Cauliflower Salad", kcal: 310 },
    { type: "D", name: "Salmon Rice", kcal: 520 },
  ]},
  { day: "Fri", date: 4, kcal: 1180, goal: 2000, isToday: true, meals: [
    { type: "B", name: "Soft Boiled Eggs", kcal: 320 },
    { type: "L", name: "Farro Bowl", kcal: 480 },
    { type: "D", name: "Chicken Thighs", kcal: 380 },
  ]},
  { day: "Sat", date: 5, kcal: 0, goal: 2000, meals: [] },
  { day: "Sun", date: 6, kcal: 0, goal: 2000, meals: [] },
];

const mockIngredientCards = [
  { id: 1, name: "Chicken Breast", category: "FOOD", unit: "4 oz", kcal: 187, protein: 35, carbs: 0, fat: 4 },
  { id: 2, name: "Brown Rice", category: "FOOD", unit: "1 cup cooked", kcal: 216, protein: 5, carbs: 45, fat: 2 },
  { id: 3, name: "Olive Oil", category: "INGREDIENT", unit: "1 tbsp", kcal: 119, protein: 0, carbs: 0, fat: 14 },
  { id: 4, name: "Broccoli", category: "FOOD", unit: "1 cup", kcal: 55, protein: 4, carbs: 11, fat: 1 },
  { id: 5, name: "Sweet Potato", category: "FOOD", unit: "1 medium", kcal: 103, protein: 2, carbs: 24, fat: 0 },
  { id: 6, name: "Greek Yogurt", category: "FOOD", unit: "1 cup", kcal: 130, protein: 22, carbs: 8, fat: 0 },
];

const settingsJumpNav = [
  { n: "01", label: "People" },
  { n: "02", label: "Daily Goals" },
  { n: "03", label: "Dashboard" },
  { n: "04", label: "MCP" },
  { n: "05", label: "Data" },
];

const mockGoals = [
  { label: "Calories", value: "2,000", unit: "kcal" },
  { label: "Protein", value: "120", unit: "g" },
  { label: "Carbs", value: "225", unit: "g" },
  { label: "Fat", value: "75", unit: "g" },
  { label: "Fiber", value: "22", unit: "g" },
];

/* ───────── Section Label ───────── */

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="border-t-4 border-[var(--fg)] px-[var(--pad)] pt-4 pb-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</span>
    </div>
  );
}

/* ───────── Page ───────── */

export default function PreviewPage() {
  const [activeTag, setActiveTag] = useState("all");
  const [activeSection, setActiveSection] = useState("01");
  const [ingredientFilter, setIngredientFilter] = useState("all");

  // Force sage theme
  useEffect(() => {
    const prev = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = "sage";
    return () => { if (prev) document.documentElement.dataset.theme = prev; };
  }, []);

  const filteredRecipes = activeTag === "all" ? mockRecipes : mockRecipes.filter(r => r.tag === activeTag);
  const filteredIngredients = ingredientFilter === "all" ? mockIngredientCards :
    mockIngredientCards.filter(i => ingredientFilter === "foods" ? i.category === "FOOD" : i.category === "INGREDIENT");

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg)]">
      {/* ═══ TopNav ═══ */}
      <nav className="flex items-center h-[var(--nav-h)] bg-[var(--bg)] px-[var(--pad)] shrink-0 relative z-10 border-b border-[var(--rule)]" aria-label="Main navigation">
        <BrandName className="font-serif text-[13px] text-[var(--fg)] mr-6 tracking-[-0.02em] font-bold" />
        <div className="flex items-center flex-1 gap-5">
          {["Dashboard", "Meal Plans", "Recipes", "Pantry", "Settings"].map((item, i) => (
            <span
              key={item}
              className={`nav-link font-mono text-[9px] uppercase tracking-[0.12em] py-[6px] relative ${
                i === 0 ? "text-[var(--fg)]" : "text-[var(--muted)]"
              }`}
              {...(i === 0 ? { "aria-current": "page" as const } : {})}
            >
              {item}
            </span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-[10px]">
          <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center font-mono text-[9px] font-medium text-white"
            style={{ background: "var(--accent)", boxShadow: "0 0 0 2px var(--bg), 0 0 0 3.5px var(--accent)" }} aria-hidden="true">M</div>
          <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center font-mono text-[9px] font-medium text-white opacity-35"
            style={{ background: "#7C8DA0" }} aria-hidden="true">G</div>
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)] cursor-pointer hover:text-[var(--fg)] transition-colors">Sign out</span>
        </div>
      </nav>

      {/* ═══ 1. Dashboard Hero + Stats ═══ */}
      <SectionDivider label="1 / Dashboard Hero + Stats" />
      <section aria-label="Dashboard hero and stats">
        <div className="px-[var(--pad)] min-h-[80vh] flex flex-col justify-end pb-10">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] mb-4">
            Friday, April 4 2026
          </div>
          <h1
            className="font-serif font-medium leading-[0.91] tracking-[-0.03em] text-[var(--fg)]"
            style={{ fontSize: "11.5vw", marginLeft: "-6px" }}
          >
            Good afternoon,{" "}
            <span className="text-[var(--accent)]">Maya</span>
          </h1>
        </div>

        {/* Stats strip */}
        <div className="border-t border-[var(--rule)] flex">
          {/* Calories */}
          <div className="flex-1 px-8 py-6">
            <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--muted)] mb-2">Calories today</div>
            <div className="font-serif text-[28px] font-bold tabular-nums text-[var(--fg)] leading-none mb-1">1,180</div>
            <div className="font-mono text-[9px] text-[var(--muted)] mb-2">of 2,000 kcal</div>
            <div className="h-[2px] bg-[var(--rule)] w-full">
              <div className="h-full bg-[var(--accent)]" style={{ width: "59%" }} />
            </div>
          </div>
          {/* Protein */}
          <div className="flex-1 px-8 py-6 border-l border-[var(--rule)]">
            <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--muted)] mb-2">Protein</div>
            <div className="font-serif text-[28px] font-bold tabular-nums text-[var(--fg)] leading-none mb-1">82g</div>
            <div className="font-mono text-[9px] text-[var(--muted)] mb-2">of 120g goal</div>
            <div className="h-[2px] bg-[var(--rule)] w-full">
              <div className="h-full bg-[var(--accent)]" style={{ width: "68%" }} />
            </div>
          </div>
          {/* Meals */}
          <div className="flex-1 px-8 py-6 border-l border-[var(--rule)]">
            <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--muted)] mb-2">Meals today</div>
            <div className="font-serif text-[28px] font-bold tabular-nums text-[var(--fg)] leading-none mb-1">3</div>
            <div className="font-mono text-[9px] text-[var(--muted)] mb-2">logged</div>
            <div className="h-[2px] bg-[var(--rule)] w-full">
              <div className="h-full bg-[var(--accent)]" style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 2. Today's Meals ═══ */}
      <SectionDivider label="2 / Today's Meals" />
      <section aria-label="Today's meals">
        <div className="flex items-center justify-between px-[var(--pad)] py-4 border-b border-[var(--rule)]">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--fg)]">Today&apos;s Meals</span>
          <span className="font-mono text-[8.5px] text-[var(--accent)] cursor-pointer hover:opacity-80 transition-opacity">Open planner &rarr;</span>
        </div>
        <div className="flex" style={{ padding: "0 36px" }}>
          {mockTodayMeals.map((meal, i) => (
            <div key={meal.num} className="flex-1" style={{ padding: "32px 36px" }}>
              <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--muted)] pb-2 mb-3 border-b border-[var(--rule)]">
                {meal.num} &middot; {meal.type}
              </div>
              <div className="font-serif text-[20px] font-bold tracking-[-0.02em] leading-[1.15] mb-4" style={{ textWrap: "balance" }}>
                {meal.name}
              </div>
              <div className="flex items-baseline gap-2 pb-2 border-b border-[var(--rule)]">
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">Calories</span>
                <span className="font-serif text-[16px] tabular-nums text-[var(--fg)] ml-auto">{meal.kcal} kcal</span>
              </div>
              <div className="mt-[14px]">
                <span className="font-mono text-[8.5px] text-[var(--accent)] cursor-pointer hover:opacity-80 transition-opacity">See recipe &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 3. This Week Overview ═══ */}
      <SectionDivider label="3 / This Week Overview" />
      <section aria-label="This week overview">
        <div className="flex items-center justify-between px-[var(--pad)] py-4 border-b border-[var(--rule)]">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--fg)]">This Week</span>
          <span className="font-mono text-[8.5px] text-[var(--accent)] cursor-pointer hover:opacity-80 transition-opacity">Full planner &rarr;</span>
        </div>
        <div className="flex" style={{ minHeight: "55vh" }}>
          {mockWeekDays.map((d, i) => {
            const pct = d.goal > 0 ? Math.min((d.kcal / d.goal) * 100, 100) : 0;
            return (
              <div
                key={d.day}
                className={`flex-1 border-r border-[var(--rule)] last:border-r-0 px-3 py-4 flex flex-col ${
                  d.isToday ? "bg-[var(--accent-l)]" : ""
                }`}
              >
                <div className={`font-mono text-[9px] uppercase tracking-[0.12em] mb-1 ${
                  d.isToday ? "text-[var(--accent)] font-medium" : "text-[var(--muted)]"
                }`}>
                  {d.day}
                </div>
                <div className="font-serif text-[28px] font-bold tabular-nums text-[var(--fg)] leading-none mb-1">
                  {d.date}
                </div>
                <div className="font-mono text-[9px] text-[var(--muted)] tabular-nums mb-2">
                  {d.kcal > 0 ? `${d.kcal.toLocaleString()} kcal` : "—"}
                </div>
                <div className="h-[2px] bg-[var(--rule)] w-full mb-4">
                  <div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex flex-col gap-2 mt-auto">
                  {d.meals.map((m, mi) => (
                    <div key={mi}>
                      <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">{m.type}</div>
                      <div className="font-sans text-[11px] text-[var(--fg)] leading-[1.3]">{m.name}</div>
                      <div className="font-mono text-[9px] text-[var(--muted)] tabular-nums">{m.kcal} kcal</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ 4. Recipe Card Grid ═══ */}
      <SectionDivider label="4 / Recipe Card Grid" />
      <section aria-label="Recipe card grid preview">
        {/* Filter bar */}
        <div className="flex items-center gap-[4px] px-[var(--pad)] border-b border-[var(--rule)] bg-[var(--bg)] sticky top-0 z-10" style={{ height: "var(--filter-h)" }}>
          {recipeTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`font-mono text-[9px] tracking-[0.1em] uppercase py-[3px] px-[9px] border cursor-pointer transition-colors whitespace-nowrap active:scale-[0.97] ${
                activeTag === tag ? "text-[var(--fg)] border-[var(--rule)]" : "text-[var(--muted)] border-transparent hover:text-[var(--fg)]"
              }`}
              aria-label={`Filter by ${tag}`}
            >{tag}</button>
          ))}
          <div className="flex gap-[5px] items-center ml-auto">
            <span className="font-mono text-[9px] text-[var(--muted)] tracking-[0.04em] mr-[6px] tabular-nums">{filteredRecipes.length} recipes</span>
            <div className="flex border border-[var(--rule)]">
              <span className="font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--fg)] bg-transparent border-0 border-r border-[var(--rule)] py-[3px] pl-[9px] pr-[22px] relative">
                Name
                <span className="absolute right-[7px] top-1/2 -translate-y-1/2 border-[3px] border-transparent border-t-[4px] border-t-[var(--muted)] mt-[2px]" />
              </span>
              <span className="font-mono text-[11px] text-[var(--muted)] py-[3px] px-[9px]">&uarr;</span>
            </div>
            <div className="flex border border-[var(--rule)] overflow-hidden">
              <span className="font-mono text-[9px] tracking-[0.1em] uppercase py-[3px] px-[9px] bg-[var(--bg-3)] text-[var(--fg)] border-r border-[var(--rule)]">Grid</span>
              <span className="font-mono text-[9px] tracking-[0.1em] uppercase py-[3px] px-[9px] text-[var(--muted)]">List</span>
            </div>
            <span className="font-mono text-[9px] tracking-[0.06em] bg-transparent border border-[var(--rule)] text-[var(--muted)] py-[3px] px-[9px]">Search</span>
            <span className="font-mono text-[9px] tracking-[0.1em] uppercase bg-[var(--accent)] text-[var(--accent-fg)] py-[3px] px-[9px]">+ New</span>
          </div>
        </div>

        {/* Card Grid */}
        <div className="max-w-[1100px] mx-auto" style={{ padding: "32px 64px 48px" }}>
          <div className="grid gap-6 grid-cols-4" style={{ gridAutoRows: "auto" }}>
            {filteredRecipes.map((recipe) => (
              <div key={recipe.id} className="bg-[var(--bg)] cursor-pointer overflow-hidden relative group" data-cursor="card">
                <div className="overflow-hidden" style={{ aspectRatio: "4/3" }}>
                  <div className="w-full h-full bg-[var(--bg-3)] flex items-end p-4">
                    <span className="font-serif text-[clamp(22px,2.5vw,32px)] font-bold tracking-[-0.03em] leading-[0.92] text-[var(--fg)] opacity-[0.18]">{recipe.name}</span>
                  </div>
                </div>
                <div style={{ padding: "16px 18px 20px" }}>
                  <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)] mb-[7px]">{recipe.tag}</div>
                  <div className="font-serif text-[clamp(13px,1.4vw,16px)] font-semibold tracking-[-0.01em] leading-[1.2] mb-[10px]" style={{ textWrap: "balance" }}>{recipe.name}</div>
                  <div className="flex gap-2 items-baseline flex-wrap">
                    <span className="font-mono text-[11px] text-[var(--fg)] tabular-nums">{recipe.kcal} kcal</span>
                    <span className="font-mono text-[8.5px] text-[var(--muted)] tabular-nums">P {recipe.protein}g</span>
                    <span className="font-mono text-[8.5px] text-[var(--muted)] tabular-nums">C {recipe.carbs}g</span>
                    <span className="font-mono text-[8.5px] text-[var(--muted)] tabular-nums">F {recipe.fat}g</span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 5. Recipe Detail ═══ */}
      <SectionDivider label="5 / Recipe Detail" />
      <section className="border-t border-[var(--rule)]" aria-label="Recipe detail preview">
        <div className="relative">
          {/* Jump nav */}
          <nav className="absolute flex flex-col z-10" style={{ left: "var(--pad)", top: 48, width: 140 }} aria-label="Recipe sections">
            {[
              { n: "01", label: "Ingredients" },
              { n: "02", label: "Nutrition" },
              { n: "03", label: "Instructions" },
              { n: "04", label: "Optimize" },
              { n: "05", label: "Meal Prep" },
            ].map((s, i) => (
              <span key={s.n}
                className={`flex items-baseline gap-[10px] font-mono text-[9px] tracking-[0.1em] uppercase py-[8px] border-b border-[var(--rule)] ${
                  i === 0 ? "text-[var(--fg)] pt-0" : "text-[var(--muted)]"
                }`}
              >
                <span className={`font-serif text-[9px] font-bold min-w-[16px] ${i === 0 ? "text-[var(--accent)]" : "text-[var(--rule)]"}`}>{s.n}</span>
                {s.label}
              </span>
            ))}
          </nav>

          {/* Main content */}
          <div className="max-w-[1100px] mx-auto" style={{ padding: "0 64px 120px 196px" }}>
            {/* Hero */}
            <div className="grid gap-[56px] items-start" style={{ gridTemplateColumns: "1fr 1fr", padding: "48px 0 72px" }}>
              <div>
                <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)] mb-4">
                  <span>1 serving</span> &middot; <span>0 min</span>
                  <div className="flex gap-[6px] mt-[10px]">
                    <span className="font-mono text-[9px] tracking-[0.1em] uppercase py-[3px] px-[10px] bg-[var(--bg-3)] text-[var(--muted)]">breakfast</span>
                  </div>
                </div>
                <h2 className="font-serif font-bold tracking-[-0.03em] leading-[1.05] text-[var(--fg)] mb-12" style={{ fontSize: "clamp(30px, 3.4vw, 48px)" }}>
                  Cottage Cheese Breakfast Bowl
                </h2>
                <div className="flex gap-2 mt-6">
                  <span className="font-mono text-[9px] tracking-[0.12em] uppercase bg-transparent border border-[var(--rule)] text-[var(--muted)] py-[6px] px-[14px] cursor-pointer hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">Edit</span>
                  <span className="font-mono text-[9px] tracking-[0.12em] uppercase bg-transparent border border-[var(--rule)] text-[var(--muted)] py-[6px] px-[14px] cursor-pointer hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">Duplicate</span>
                  <span className="font-mono text-[9px] tracking-[0.12em] uppercase bg-transparent border border-[var(--rule)] text-[var(--err)] py-[6px] px-[14px] cursor-pointer hover:border-[var(--err)] transition-colors">Delete</span>
                </div>
              </div>
              <div className="w-full bg-[var(--bg-3)] flex items-end p-6" style={{ aspectRatio: "4/3" }}>
                <span className="font-serif text-[clamp(28px,3vw,40px)] font-bold tracking-[-0.03em] leading-[0.92] text-[var(--fg)] opacity-[0.12]">Cottage Cheese Breakfast Bowl</span>
              </div>
            </div>

            {/* Ingredients + Nutrition 2-col */}
            <div style={{ padding: "56px 0" }}>
              <div className="grid gap-[56px]" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <div className="flex items-baseline gap-3 mb-8">
                    <span className="font-serif text-[13px] font-bold text-[var(--rule)]">01</span>
                    <span className="font-serif font-semibold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>Ingredients</span>
                    <span className="flex-1 h-px bg-[var(--rule)]" />
                  </div>
                  <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)] mb-3 flex items-center gap-2">
                    <span>Scale</span>
                    <div className="flex gap-1">
                      {["1\u00d7", "2\u00d7", "4\u00d7", "6\u00d7"].map((s, i) => (
                        <span key={s} className={`font-mono text-[9px] tracking-[0.06em] px-[7px] py-[2px] border ${
                          i === 0 ? "bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)]" : "text-[var(--muted)] border-[var(--rule)]"
                        }`}>{s}</span>
                      ))}
                    </div>
                  </div>
                  {mockDetailIngredients.map((ing, idx) => (
                    <div key={ing.name} className={`flex gap-[18px] py-3 items-baseline ${idx < mockDetailIngredients.length - 1 ? "border-b border-[var(--rule)]" : ""}`}>
                      <span className="font-mono text-[11px] text-[var(--fg-2)] min-w-[70px] text-right shrink-0 tabular-nums">{ing.amt}</span>
                      <span className="text-[16px] leading-[1.4]">{ing.name}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-baseline gap-3 mb-8">
                    <span className="font-serif text-[13px] font-bold text-[var(--rule)]">02</span>
                    <span className="font-serif font-semibold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>Nutrition</span>
                    <span className="flex-1 h-px bg-[var(--rule)]" />
                  </div>
                  <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)] mb-3">Per serving &middot; vs goals</div>
                  <div className="flex flex-col gap-[10px]">
                    {mockNutrition.map(n => {
                      const pct = n.goal > 0 ? Math.min((n.value / n.goal) * 100, 100) : 0;
                      return (
                        <div key={n.label}>
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--fg-2)]">{n.label}</span>
                            <span className="font-mono text-[9px] text-[var(--fg)] tabular-nums">
                              {n.value}{n.unit}
                              <span className="text-[9px] text-[var(--muted)]"> / {n.goal}{n.unit}</span>
                            </span>
                          </div>
                          <div className="h-[3px] bg-[var(--rule)] rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[var(--ok)]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div style={{ padding: "56px 0" }}>
              <div className="flex items-baseline gap-3 mb-8">
                <span className="font-serif text-[13px] font-bold text-[var(--rule)]">03</span>
                <span className="font-serif font-semibold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>Instructions</span>
                <span className="flex-1 h-px bg-[var(--rule)]" />
              </div>
              <div className="flex flex-col" style={{ maxWidth: 600 }}>
                {mockSteps.map((step, idx) => (
                  <div key={idx} className={`flex gap-6 items-start py-5 ${idx < mockSteps.length - 1 ? "border-b border-[var(--rule)]" : ""}`}>
                    <span className="font-serif text-[28px] font-bold text-[var(--rule)] min-w-[40px] leading-none shrink-0 pt-[2px] tabular-nums">{String(idx + 1).padStart(2, "0")}</span>
                    <span className="text-[13px] leading-[1.7] text-[var(--fg-2)] pt-[6px]">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Optimization */}
            <div style={{ padding: "56px 0" }}>
              <div className="flex items-baseline gap-3 mb-8">
                <span className="font-serif text-[13px] font-bold text-[var(--rule)]">04</span>
                <span className="font-serif font-semibold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>Optimization</span>
                <span className="flex-1 h-px bg-[var(--rule)]" />
              </div>
              <div className="border border-[var(--accent-l)] bg-[var(--accent-l)] p-4 mb-4">
                <div className="font-mono text-[9px] tracking-[0.12em] uppercase text-[var(--accent)] mb-1 font-medium">AI Optimization</div>
                <p className="text-[11px] text-[var(--fg-2)] leading-[1.5]">Use the MCP prompt below to analyze this recipe with an AI assistant. It will suggest healthier swaps that fit your nutrition goals.</p>
              </div>
              <p className="text-[11px] text-[var(--muted)] mb-4">Copy this prompt into any MCP-connected AI assistant. Notes will save automatically once you approve.</p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[9px] tracking-[0.08em] uppercase bg-[var(--accent)] text-[var(--accent-fg)] py-[6px] px-4 cursor-pointer hover:opacity-90">Copy prompt &rarr;</span>
                <span className="font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--muted)] cursor-pointer hover:text-[var(--fg)]">Paste notes instead</span>
              </div>
            </div>

            {/* Meal Prep */}
            <div style={{ padding: "56px 0" }}>
              <div className="flex items-baseline gap-3 mb-8">
                <span className="font-serif text-[13px] font-bold text-[var(--rule)]">05</span>
                <span className="font-serif font-semibold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>Meal Prep</span>
                <span className="flex-1 h-px bg-[var(--rule)]" />
              </div>
              <div className="border border-[var(--accent-l)] bg-[var(--accent-l)] p-4 mb-4">
                <div className="font-mono text-[9px] tracking-[0.12em] uppercase text-[var(--accent)] mb-1 font-medium">AI Meal Prep</div>
                <p className="text-[11px] text-[var(--fg-2)] leading-[1.5]">Use the MCP prompt below to generate a meal prep plan for this recipe — batch cooking, storage, and reheat instructions.</p>
              </div>
              <p className="text-[11px] text-[var(--muted)] mb-4">Copy this prompt into any MCP-connected AI assistant. Notes will save automatically once you approve.</p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[9px] tracking-[0.08em] uppercase bg-[var(--accent)] text-[var(--accent-fg)] py-[6px] px-4 cursor-pointer hover:opacity-90">Copy prompt &rarr;</span>
                <span className="font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--muted)] cursor-pointer hover:text-[var(--fg)]">Paste notes instead</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 6. Ingredients Card Grid ═══ */}
      <SectionDivider label="6 / Ingredients Card Grid" />
      <section aria-label="Ingredients card grid preview">
        {/* Filter bar */}
        <div className="flex items-center gap-[4px] px-[var(--pad)] border-b border-[var(--rule)] bg-[var(--bg)] sticky top-0 z-10" style={{ height: "var(--filter-h)" }}>
          {[
            { key: "all", label: "All" },
            { key: "foods", label: "Foods" },
            { key: "ingredients", label: "Ingredients" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setIngredientFilter(f.key)}
              className={`font-mono text-[9px] tracking-[0.1em] uppercase py-[3px] px-[9px] border cursor-pointer transition-colors whitespace-nowrap active:scale-[0.97] ${
                ingredientFilter === f.key ? "text-[var(--fg)] border-[var(--rule)]" : "text-[var(--muted)] border-transparent hover:text-[var(--fg)]"
              }`}
              aria-label={`Filter by ${f.label}`}
            >{f.label}</button>
          ))}
          <div className="flex gap-[5px] items-center ml-auto">
            <span className="font-mono text-[9px] text-[var(--muted)] tracking-[0.04em] mr-[6px] tabular-nums">{filteredIngredients.length} items</span>
            <div className="flex border border-[var(--rule)]">
              <span className="font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--fg)] bg-transparent border-0 border-r border-[var(--rule)] py-[3px] pl-[9px] pr-[22px] relative">
                Name
                <span className="absolute right-[7px] top-1/2 -translate-y-1/2 border-[3px] border-transparent border-t-[4px] border-t-[var(--muted)] mt-[2px]" />
              </span>
              <span className="font-mono text-[11px] text-[var(--muted)] py-[3px] px-[9px]">&uarr;</span>
            </div>
            <div className="flex border border-[var(--rule)] overflow-hidden">
              <span className="font-mono text-[9px] tracking-[0.1em] uppercase py-[3px] px-[9px] bg-[var(--bg-3)] text-[var(--fg)] border-r border-[var(--rule)]">Grid</span>
              <span className="font-mono text-[9px] tracking-[0.1em] uppercase py-[3px] px-[9px] text-[var(--muted)]">List</span>
            </div>
            <span className="font-mono text-[9px] tracking-[0.06em] bg-transparent border border-[var(--rule)] text-[var(--muted)] py-[3px] px-[9px]">Search</span>
            <span className="font-mono text-[9px] tracking-[0.1em] uppercase bg-[var(--accent)] text-[var(--accent-fg)] py-[3px] px-[9px]">+ New</span>
          </div>
        </div>

        {/* Card Grid */}
        <div className="max-w-[1100px] mx-auto" style={{ padding: "32px 64px 48px" }}>
          <div className="grid gap-6 grid-cols-4" style={{ gridAutoRows: "auto" }}>
            {filteredIngredients.map((item) => (
              <div key={item.id} className="bg-[var(--bg)] cursor-pointer overflow-hidden relative group border border-[var(--rule)]">
                <div style={{ padding: "20px 18px 22px" }}>
                  <div className={`font-mono text-[9px] tracking-[0.14em] uppercase mb-[7px] py-[2px] px-[7px] inline-block ${
                    item.category === "FOOD" ? "bg-[var(--ok-l)] text-[var(--ok)]" : "bg-[var(--accent-l)] text-[var(--accent)]"
                  }`}>
                    {item.category}
                  </div>
                  <div className="font-serif text-[clamp(13px,1.4vw,16px)] font-semibold tracking-[-0.01em] leading-[1.2] mb-[6px]">{item.name}</div>
                  <div className="font-mono text-[9px] text-[var(--muted)] tracking-[0.06em] mb-[10px]">{item.unit}</div>
                  <div className="flex gap-2 items-baseline flex-wrap">
                    <span className="font-mono text-[11px] text-[var(--fg)] tabular-nums">{item.kcal} kcal</span>
                    <span className="font-mono text-[8.5px] text-[var(--muted)] tabular-nums">P {item.protein}g</span>
                    <span className="font-mono text-[8.5px] text-[var(--muted)] tabular-nums">C {item.carbs}g</span>
                    <span className="font-mono text-[8.5px] text-[var(--muted)] tabular-nums">F {item.fat}g</span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 7. Settings Jump Nav ═══ */}
      <SectionDivider label="7 / Settings Jump Nav" />
      <section aria-label="Settings layout preview">
        <div className="relative" style={{ minHeight: "80vh" }}>
          {/* Jump nav */}
          <nav className="absolute flex flex-col z-10" style={{ left: "var(--pad)", top: 48, width: 140 }} aria-label="Settings sections">
            {settingsJumpNav.map((s, i) => (
              <button
                key={s.n}
                onClick={() => setActiveSection(s.n)}
                className={`flex items-baseline gap-[10px] font-mono text-[9px] tracking-[0.1em] uppercase py-[8px] border-b border-[var(--rule)] text-left cursor-pointer bg-transparent ${
                  activeSection === s.n ? "text-[var(--fg)]" : "text-[var(--muted)]"
                } ${i === 0 ? "pt-0" : ""}`}
                aria-label={`Jump to ${s.label}`}
              >
                <span className={`font-serif text-[9px] font-bold min-w-[16px] ${activeSection === s.n ? "text-[var(--accent)]" : "text-[var(--rule)]"}`}>{s.n}</span>
                {s.label}
              </button>
            ))}
          </nav>

          {/* Content area */}
          <div style={{ paddingLeft: 196, paddingRight: 64, paddingTop: 48, paddingBottom: 80 }}>
            {/* 01 People */}
            <div className="mb-16">
              <div className="flex items-baseline gap-3 mb-8">
                <span className="font-serif text-[13px] font-bold text-[var(--accent)]">01</span>
                <span className="font-serif font-semibold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>People</span>
                <span className="flex-1 h-px bg-[var(--rule)]" />
              </div>
              {/* Mock person row */}
              <div className="flex items-center gap-4 py-4 border-b border-[var(--rule)]">
                <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center font-mono text-[11px] font-medium text-white"
                  style={{ background: "var(--accent)" }} aria-hidden="true">M</div>
                <div className="flex-1">
                  <div className="font-serif text-[16px] font-semibold tracking-[-0.01em] text-[var(--fg)]">Maya</div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">Active &middot; 2,000 kcal goal</div>
                </div>
                <span className="font-mono text-[9px] tracking-[0.12em] uppercase bg-transparent border border-[var(--rule)] text-[var(--muted)] py-[4px] px-[10px] cursor-pointer hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">Edit</span>
              </div>
              <div className="flex items-center gap-4 py-4 border-b border-[var(--rule)]">
                <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center font-mono text-[11px] font-medium text-white opacity-50"
                  style={{ background: "#7C8DA0" }} aria-hidden="true">G</div>
                <div className="flex-1">
                  <div className="font-serif text-[16px] font-semibold tracking-[-0.01em] text-[var(--fg)]">Greg</div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">Inactive &middot; 2,400 kcal goal</div>
                </div>
                <span className="font-mono text-[9px] tracking-[0.12em] uppercase bg-transparent border border-[var(--rule)] text-[var(--muted)] py-[4px] px-[10px] cursor-pointer hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">Edit</span>
              </div>
              <div className="mt-4">
                <span className="font-mono text-[9px] tracking-[0.1em] uppercase bg-[var(--accent)] text-[var(--accent-fg)] py-[5px] px-[12px] cursor-pointer hover:opacity-90">+ Add person</span>
              </div>
            </div>

            {/* 02 Daily Goals */}
            <div className="mb-16">
              <div className="flex items-baseline gap-3 mb-8">
                <span className="font-serif text-[13px] font-bold text-[var(--rule)]">02</span>
                <span className="font-serif font-semibold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>Daily Goals</span>
                <span className="flex-1 h-px bg-[var(--rule)]" />
              </div>
              <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)] mb-4">Maya&apos;s daily targets</div>
              {mockGoals.map((g, i) => (
                <div key={g.label} className={`flex items-baseline justify-between py-3 ${i < mockGoals.length - 1 ? "border-b border-[var(--rule)]" : ""}`}>
                  <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--fg-2)]">{g.label}</span>
                  <span className="font-mono text-[9px] text-[var(--fg)] tabular-nums">
                    {g.value} <span className="text-[9px] text-[var(--muted)]">{g.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
