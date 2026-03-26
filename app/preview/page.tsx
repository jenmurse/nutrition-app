"use client";

/**
 * UI Preview — renders real app components with mock data, no auth required.
 * Use this to verify visual changes in the preview tool.
 * Route: /preview
 */

import { useState } from "react";

const mockRecipes = [
  { id: 1, name: "Almond Croissant Bars" },
  { id: 2, name: "Black Bean Avocado Brownies" },
  { id: 3, name: "Cauliflower Salad with Dates" },
  { id: 4, name: "Cottage Cheese Breakfast" },
  { id: 5, name: "Crispy Salmon w/ Coconut Rice" },
  { id: 6, name: "Curried Red Lentils" },
  { id: 7, name: "Lunch Salad w/Salmon" },
];

const mockNutrients = [
  { label: "KCAL", value: "678.4", unit: "kcal" },
  { label: "FAT", value: "0", unit: "" },
  { label: "SAT FAT", value: "6.1", unit: "g" },
  { label: "SODIUM", value: "3.7", unit: "mg" },
  { label: "CARBS", value: "58.3", unit: "g" },
  { label: "SUGAR", value: "8", unit: "g" },
  { label: "PROTEIN", value: "22.4", unit: "g" },
  { label: "FIBER", value: "12.3", unit: "g" },
];

const mockGoals = [
  { name: "CALORIES", value: 678, goal: 2000, pct: 34 },
  { name: "FAT", value: 39, goal: 75, pct: 52 },
  { name: "CARBS", value: 58, goal: 225, pct: 26 },
  { name: "PROTEIN", value: 22, goal: 95, pct: 23 },
  { name: "FIBER", value: 12, goal: 22, pct: 55 },
];

const mockTags = ["BREAKFAST", "LUNCH", "DINNER", "SNACK", "SIDE", "DESSERT"];

type Tab = "goals" | "optimize" | "mealprep";

export default function PreviewPage() {
  const [selectedRecipe, setSelectedRecipe] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("goals");
  const [settingsTab, setSettingsTab] = useState<"household" | "ai" | "mcp" | "data">("household");

  const tabs: { key: Tab; label: string }[] = [
    { key: "goals", label: "Goals" },
    { key: "optimize", label: "Optimize" },
    { key: "mealprep", label: "Meal Prep" },
  ];

  const settingsTabs = [
    { key: "household" as const, label: "Household" },
    { key: "ai" as const, label: "AI API" },
    { key: "mcp" as const, label: "MCP" },
    { key: "data" as const, label: "Data" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* ═══ TopNav ═══ */}
      <nav className="flex items-center h-[52px] bg-[var(--bg-nav)] px-6 shrink-0 relative z-10" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)' }}>
        <span className="font-serif text-[16px] text-[var(--fg)] mr-6 tracking-[0.02em]">Course</span>
        <div className="flex items-center flex-1 gap-[2px]">
          {["Meal Plans", "Recipes", "Pantry"].map((item, i) => (
            <span
              key={item}
              className={`font-mono text-[10px] uppercase tracking-[0.1em] px-[12px] py-[5px] rounded-[6px] whitespace-nowrap ${
                i === 1
                  ? "text-[var(--fg)] bg-[var(--accent-light)]"
                  : "text-[var(--muted)]"
              }`}
            >
              {item}
            </span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-[10px]">
          <div
            className="w-[28px] h-[28px] rounded-full flex items-center justify-center font-mono text-[10px] font-medium text-white"
            style={{
              background: "var(--accent)",
              boxShadow: "0 0 0 2px var(--bg-nav), 0 0 0 4px var(--accent)",
            }}
          >
            J
          </div>
          <div
            className="w-[28px] h-[28px] rounded-full flex items-center justify-center font-mono text-[10px] font-medium text-white opacity-40"
            style={{ background: "#7C8DA0" }}
          >
            G
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] px-3 py-[5px] text-[var(--muted)] rounded-[6px]">
            Sign out
          </span>
        </div>
      </nav>

      {/* ═══ Three-pane layout ═══ */}
      <div className="flex" style={{ height: 600 }}>
        {/* Left sidebar */}
        <div
          className="w-[220px] min-w-[220px] flex flex-col bg-[var(--bg-nav)] relative z-[1]"
          style={{ boxShadow: "1px 0 4px rgba(0,0,0,0.07), inset 0 1px 0 rgba(0,0,0,0.04)" }}
        >
          <div className="px-6 pt-3 pb-3 shrink-0">
            <div className="flex items-baseline justify-between mb-3">
              <h1 className="font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--fg)] leading-none">Recipes</h1>
              <span className="font-mono text-[9px] text-[var(--muted)] bg-[var(--bg-subtle)] py-[2px] px-[6px] rounded-full">{mockRecipes.length}</span>
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-[var(--bg-subtle)] border border-[var(--rule)] py-[7px] px-[10px] text-[11px] font-sans text-[var(--fg)] placeholder:text-[var(--placeholder)] focus:outline-none mb-2"
              readOnly
            />
            <div className="flex gap-[5px] flex-wrap mt-2">
              {mockTags.map((tag, i) => (
                <span
                  key={tag}
                  className={`py-[2px] px-[8px] font-mono text-[9px] tracking-[0.04em] uppercase rounded-full ${
                    i === 2 ? "bg-[var(--accent)] text-[var(--accent-text)]" : "bg-[var(--bg-subtle)] text-[var(--muted)]"
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {mockRecipes.map((recipe, i) => (
              <div
                key={recipe.id}
                className={`relative mx-[6px] my-[1px] py-[9px] px-[10px] rounded-[7px] cursor-pointer transition-[background] duration-[80ms] ease-in-out ${
                  i === selectedRecipe ? "bg-[var(--bg-selected)] pl-[14px]" : "hover:bg-[var(--bg-subtle)]"
                }`}
                onClick={() => setSelectedRecipe(i)}
              >
                {i === selectedRecipe && (
                  <span className="absolute left-0 top-[25%] bottom-[25%] w-[3px] rounded-full bg-[var(--accent)]" />
                )}
                <div className="text-[12px] font-medium text-[var(--fg)] leading-snug">{recipe.name}</div>
              </div>
            ))}
          </div>

          <button className="shrink-0 mx-[6px] mb-[6px] mt-[2px] py-[9px] px-[10px] font-mono text-[9px] tracking-[0.1em] uppercase bg-transparent text-[var(--muted)] border-0 cursor-pointer hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-colors text-left rounded-[7px]">
            + New Recipe
          </button>
        </div>

        {/* Center content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex items-start justify-between mb-4">
            <h2 className="font-serif text-[22px] text-[var(--fg)] leading-tight">
              {mockRecipes[selectedRecipe].name}
            </h2>
            <div className="flex gap-2">
              <button className="bg-[var(--accent)] text-[var(--accent-text)] py-[5px] px-3 text-[9px] font-mono tracking-[0.1em] uppercase border-0 cursor-pointer">
                Edit
              </button>
              <button className="bg-transparent border border-[var(--rule)] text-[var(--muted)] py-[5px] px-3 text-[9px] font-mono tracking-[0.1em] uppercase cursor-pointer">
                Duplicate
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4 text-[11px] text-[var(--muted)]">
            <span>9 servings</span>
            <span>·</span>
            <span>10 min prep</span>
            <span>·</span>
            <span>40 min cook</span>
            <span className="inline-block font-mono text-[9px] tracking-[0.04em] uppercase text-[var(--accent)] bg-[var(--accent-light)] py-[1px] px-[7px] rounded-full ml-2">
              Dessert
            </span>
            <span className="inline-block font-mono text-[9px] tracking-[0.04em] uppercase text-[var(--accent)] bg-[var(--accent-light)] py-[1px] px-[7px] rounded-full">
              Snack
            </span>
          </div>

          {/* Nutrition grid — gap technique */}
          <div className="mb-5">
            <div className="grid grid-cols-4 gap-[1px] bg-[var(--rule)] rounded-[var(--radius,12px)] overflow-hidden" style={{ boxShadow: "var(--shadow-md)" }}>
              {mockNutrients.map((n) => (
                <div key={n.label} className="py-[14px] px-3 text-center bg-[var(--bg-raised)]">
                  <div className="font-serif text-[22px] text-[var(--fg)] leading-none">
                    {n.value}{n.unit}
                  </div>
                  <div className="font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--muted)] mt-[3px]">{n.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Ingredients — no dividers */}
          <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--muted)] mb-2 mt-5">Ingredients</p>
          {["1 cup Almond flour", "2.33 cup Oats, raw", "0.5 cup Maple syrup", "0.25 cup Coconut oil"].map((ing, i, arr) => (
            <div key={ing} className={`flex items-center py-[8px] gap-[14px] ${i < arr.length - 1 ? 'border-b border-[var(--rule-faint)]' : ''}`}>
              <span className="font-mono text-[11px] text-[var(--mid)] min-w-[60px] tabular-nums">{ing.split(" ")[0]} {ing.split(" ")[1]}</span>
              <span className="text-[12px] text-[var(--fg)] flex-1">{ing.split(" ").slice(2).join(" ")}</span>
            </div>
          ))}
        </div>

        {/* Right panel */}
        <div
          className="w-[300px] min-w-[300px] h-full bg-[var(--bg-nav)] relative z-[1]"
          style={{ boxShadow: "-1px 0 4px rgba(0,0,0,0.07), inset 0 1px 0 rgba(0,0,0,0.04)" }}
        >
          {/* Pill tabs */}
          <div className="flex gap-[2px] shrink-0 px-4 pt-2 pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-[10px] py-[5px] font-mono text-[9px] tracking-[0.1em] uppercase rounded-[6px] transition-[background,color] duration-[120ms] border-0 cursor-pointer ${
                  activeTab === tab.key
                    ? "text-[var(--fg)] bg-[var(--bg-subtle)]"
                    : "text-[var(--muted)] bg-transparent hover:text-[var(--fg)] hover:bg-[rgba(0,0,0,0.03)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Goals content */}
          <div className="px-6 py-4 space-y-3">
            {mockGoals.map((g) => (
              <div key={g.name}>
                <div className="flex justify-between items-baseline mb-[5px]">
                  <span className="font-mono text-[10px] text-[var(--fg)] uppercase tracking-[0.06em]">{g.name}</span>
                  <span className="font-mono text-[10px] tabular-nums text-[var(--muted)]">
                    {g.value} / {g.goal} g
                  </span>
                </div>
                <div className="h-[4px] bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${g.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Meal Plan Grid Preview ═══ */}
      <div className="border-t border-[var(--rule)] mt-0">
        <div className="px-8 pt-6 pb-6">
          <h2 className="font-serif text-[18px] text-[var(--fg)] mb-4">Meal Plan Grid</h2>

          {/* Header bar with pill tabs */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] tracking-[0.06em] uppercase text-[var(--fg)]">Mar 22–28</span>
              <button className="py-[4px] px-[10px] font-mono text-[9px] tracking-[0.1em] uppercase rounded-[6px] border border-[var(--rule)] text-[var(--muted)] bg-transparent cursor-pointer">
                This Week
              </button>
              <button className="py-[4px] px-[10px] font-mono text-[9px] tracking-[0.1em] uppercase rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] border-0 cursor-pointer">
                + New Plan
              </button>
            </div>
            <div className="flex items-center gap-[2px]">
              <button className="py-[5px] px-3 font-mono text-[9px] tracking-[0.1em] uppercase rounded-[6px] border-0 text-[var(--accent)] bg-[var(--accent-light)] cursor-pointer mr-2">
                Nutrition ›
              </button>
              <button className="flex items-center gap-[5px] font-mono text-[9px] uppercase tracking-[0.1em] px-3 py-[5px] rounded-[6px] text-[var(--fg)] bg-[var(--accent-light)] border-0 cursor-pointer">
                <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-[var(--accent)]" />
                Jen
              </button>
              <button className="flex items-center gap-[5px] font-mono text-[9px] uppercase tracking-[0.1em] px-3 py-[5px] rounded-[6px] text-[var(--muted)] border-0 cursor-pointer">
                <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-[#7C8DA0]" />
                Garth
              </button>
              <button className="font-mono text-[9px] uppercase tracking-[0.1em] px-3 py-[5px] rounded-[6px] text-[var(--muted)] border-0 cursor-pointer">
                Everyone
              </button>
            </div>
          </div>

          {/* Grid */}
          {(() => {
            const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
            const dates = [22, 23, 24, 25, 26, 27, 28];
            const mealTypes = ["BREAKFAST", "LUNCH", "DINNER", "SNACK", "DESSERT"];
            const meals: Record<string, Record<number, { name: string; kcal: number }[]>> = {
              BREAKFAST: { 2: [{ name: "Overnight Oats P...", kcal: 308 }], 3: [{ name: "Overnight Oats P...", kcal: 308 }] },
              LUNCH: { 2: [{ name: "Lunch Salad w/Sa...", kcal: 479 }], 3: [{ name: "Lunch Salad w/Sa...", kcal: 454 }] },
              DINNER: { 2: [{ name: "Noodle bowl", kcal: 788 }], 3: [{ name: "One-pan Indian S...", kcal: 706 }] },
              SNACK: { 2: [{ name: "PB Protein Balls", kcal: 104 }, { name: "Almond Croissant...", kcal: 678 }], 3: [{ name: "PB Protein Balls", kcal: 104 }] },
              DESSERT: { 2: [{ name: "Black Bean Avoca...", kcal: 95 }] },
            };
            return (
              <div className="overflow-x-auto">
                <div style={{ display: "grid", gridTemplateColumns: "90px repeat(7, minmax(0, 1fr))", minWidth: 660 }}>
                  {/* Header row */}
                  <div className="bg-[var(--bg-nav)] border-b border-r border-[var(--rule-faint)] p-2" />
                  {days.map((day, i) => (
                    <div
                      key={day}
                      className={`border-b border-[var(--rule-faint)] ${i < 6 ? "border-r" : ""} p-2 text-center ${i === 4 ? "bg-[var(--bg-selected)]" : "bg-[var(--bg-nav)]"}`}
                    >
                      <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">{day}</div>
                      <div className={`font-serif text-[18px] leading-none ${i === 4 ? "text-[var(--accent)]" : "text-[var(--fg)]"}`}>{dates[i]}</div>
                    </div>
                  ))}

                  {/* Meal rows */}
                  {mealTypes.map((mealType) => (
                    <div key={mealType} className="contents">
                      <div className="bg-[var(--bg-nav)] border-r border-b border-[var(--rule-faint)] flex items-center px-[16px] py-1">
                        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">{mealType}</span>
                      </div>
                      {dates.map((_, dayIdx) => {
                        const dayMeals = meals[mealType]?.[dayIdx] || [];
                        return (
                          <div
                            key={`${mealType}-${dayIdx}`}
                            className={`border-b border-[var(--rule-faint)] ${dayIdx < 6 ? "border-r" : ""} p-1 flex flex-col gap-[3px] min-h-[48px] ${
                              dayIdx === 4 ? "bg-[color-mix(in_srgb,var(--bg-selected)_50%,var(--bg))]" : ""
                            }`}
                          >
                            {dayMeals.map((meal, mi) => (
                              <div
                                key={mi}
                                className="bg-[var(--bg-raised)] rounded-[6px] p-[4px_6px]"
                                style={{ boxShadow: "var(--shadow-sm)" }}
                              >
                                <div className="text-[10px] text-[var(--fg)] font-medium leading-[1.3] truncate">{meal.name}</div>
                                <div className="font-mono text-[9px] text-[var(--muted)] mt-[1px]">{meal.kcal} kcal</div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* +ADD row */}
                  <div className="bg-[var(--bg-nav)]" />
                  {dates.map((_, dayIdx) => (
                    <div key={`add-${dayIdx}`} className={`flex items-center justify-center p-[6px] ${dayIdx === 4 ? "bg-[color-mix(in_srgb,var(--bg-selected)_50%,var(--bg))]" : ""}`}>
                      <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--muted)] bg-[var(--bg-subtle)] px-[8px] py-[3px] rounded-[6px]">+ ADD</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ═══ Settings tabs preview ═══ */}
      <div className="border-t border-[var(--rule)] mt-0">
        <div className="px-8 pt-6 pb-2">
          <h2 className="font-serif text-[18px] text-[var(--fg)] mb-4">Settings Tabs</h2>
          <div className="flex gap-[2px] mb-4">
            {settingsTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSettingsTab(tab.key)}
                className={`px-[12px] py-[6px] font-mono text-[9px] tracking-[0.1em] uppercase rounded-[6px] transition-[background,color] duration-[120ms] border-0 cursor-pointer ${
                  settingsTab === tab.key
                    ? "text-[var(--fg)] bg-[var(--bg-subtle)]"
                    : "text-[var(--muted)] bg-transparent hover:text-[var(--fg)] hover:bg-[rgba(0,0,0,0.03)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-[var(--muted)]">Active: {settingsTab}</p>
        </div>
      </div>

      {/* ═══ Dashboard hero preview ═══ */}
      <div className="border-t border-[var(--rule)] mt-0">
        <div className="px-8 pt-6 pb-8">
          <h2 className="font-serif text-[18px] text-[var(--fg)] mb-4">Dashboard Hero</h2>
          <div className="max-w-[480px]">
            <div className="flex items-baseline gap-[6px] mb-[6px]">
              <span className="font-serif text-[32px] text-[var(--accent)] leading-none tabular-nums">1,840</span>
              <span className="font-mono text-[10px] text-[var(--muted)]">kcal</span>
              <span className="font-mono text-[10px] text-[var(--muted)] ml-auto tabular-nums">of 2,000 · 92%</span>
            </div>
            <div className="h-[4px] bg-[var(--rule)] mb-5 relative rounded-full">
              <div className="absolute top-0 left-0 h-full rounded-full bg-[var(--accent)]" style={{ width: "92%" }} />
            </div>
          </div>

          {/* No plan card */}
          <div className="rounded-[var(--radius,12px)] max-w-[380px] px-7 py-8 space-y-4 bg-[var(--bg-raised)] mt-6" style={{ boxShadow: "var(--shadow-md)" }}>
            <div className="font-serif text-[18px] text-[var(--fg)] leading-snug">No plan for this week</div>
            <p className="font-sans text-[12px] text-[var(--muted)] leading-relaxed">
              Create a weekly meal plan to start logging meals and tracking your nutrition.
            </p>
            <span className="inline-block bg-[var(--accent)] text-[var(--accent-text)] px-5 py-[8px] text-[9px] font-mono uppercase tracking-[0.1em]">
              + Create this week&apos;s plan
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
