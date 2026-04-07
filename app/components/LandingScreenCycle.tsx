"use client";

import { useState } from "react";
import Link from "next/link";

const FEATURES = [
  {
    num: "01",
    title: "Build your pantry",
    sub: "USDA lookup or manual entry. Your ingredient library, your way.",
  },
  {
    num: "02",
    title: "Import or create recipes",
    sub: "Paste a URL, upload a file, or build from scratch. Nutrition calculates live.",
  },
  {
    num: "03",
    title: "Optimize with AI",
    sub: "Claude reads the recipe, suggests swaps, and saves notes back automatically.",
  },
  {
    num: "04",
    title: "Plan your week",
    sub: "Weekly grid per person. Meals in, nutrition totals update as you go.",
  },
  {
    num: "05",
    title: "Track the household",
    sub: "Each person's goals, side by side. One recipe library, everyone on the same page.",
  },
  {
    num: "06",
    title: "Hit your daily targets",
    sub: "Day-level nutrition summary. Swap meals to close the gap on any nutrient.",
  },
];

/* ── Shared mini nav ── */
function MiniNav({ active }: { active: "Planner" | "Recipes" | "Pantry" }) {
  return (
    <div style={{
      height: 38, minHeight: 38, display: "flex", alignItems: "center",
      padding: "0 20px", gap: 18, background: "var(--bg)",
      borderBottom: "1px solid var(--rule)", flexShrink: 0,
    }}>
      <span style={{ fontFamily: "var(--display)", fontSize: 13, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--fg)", marginRight: 6, flexShrink: 0 }}>
        Good Measure
      </span>
      {(["Planner", "Recipes", "Pantry"] as const).map(link => (
        <span key={link} style={{
          fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase",
          letterSpacing: "0.12em", color: link === active ? "var(--fg)" : "var(--muted)",
          flexShrink: 0,
        }}>{link}</span>
      ))}
      <div style={{ marginLeft: "auto", display: "flex" }}>
        {([["J", "#5A9B6A"], ["G", "#4A7AB5"]] as [string, string][]).map(([init, color], i) => (
          <div key={init} style={{
            width: 20, height: 20, borderRadius: "50%", background: color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 7, fontFamily: "var(--mono)", color: "white", fontWeight: 600,
            marginLeft: i === 0 ? 0 : -5, border: "2px solid var(--bg)", flexShrink: 0,
          }}>{init}</div>
        ))}
      </div>
    </div>
  );
}

/* ── Screen 1: Pantry Grid ── */
function PantryScreen() {
  const cards = [
    { cat: "PROTEIN", name: "Chicken Breast", unit: "per 100g", cal: 165, rows: [{ l: "PROTEIN", v: "31g" }, { l: "FAT", v: "3.6g" }] },
    { cat: "DAIRY", name: "Plain Yogurt", unit: "per 100g", cal: 150, rows: [{ l: "PROTEIN", v: "17g" }, { l: "FAT", v: "8g" }] },
    { cat: "OIL", name: "Olive Oil", unit: "per tbsp", cal: 119, rows: [{ l: "FAT", v: "14g" }, { l: "SAT FAT", v: "2g" }] },
    { cat: "GRAIN", name: "Rolled Oats", unit: "per 100g", cal: 389, rows: [{ l: "PROTEIN", v: "17g" }, { l: "FIBER", v: "10g" }] },
    { cat: "VEGETABLE", name: "Broccoli", unit: "per 100g", cal: 34, rows: [{ l: "PROTEIN", v: "2.8g" }, { l: "FIBER", v: "2.6g" }] },
    { cat: "LEGUME", name: "Black Beans", unit: "per 100g", cal: 132, rows: [{ l: "PROTEIN", v: "8.9g" }, { l: "FIBER", v: "8.7g" }] },
    { cat: "DAIRY", name: "Cheddar Cheese", unit: "per 100g", cal: 403, rows: [{ l: "FAT", v: "33g" }, { l: "PROTEIN", v: "25g" }] },
    { cat: "FRUIT", name: "Banana", unit: "per medium", cal: 89, rows: [{ l: "CARBS", v: "23g" }, { l: "FIBER", v: "2.6g" }] },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <MiniNav active="Pantry" />
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 20px", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
        <span style={{ fontFamily: "var(--display)", fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--fg)" }}>Pantry</span>
        <input disabled placeholder="Search pantry…" style={{ flex: 1, maxWidth: 200, fontFamily: "var(--sans)", fontSize: 11, border: "1px solid var(--rule)", background: "var(--bg)", color: "var(--muted)", padding: "4px 10px", outline: "none" }} />
        <div style={{ marginLeft: "auto", display: "flex", border: "1px solid var(--rule)", overflow: "hidden" }}>
          {["Grid", "List"].map((v, i) => (
            <span key={v} style={{ fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.1em", padding: "3px 7px", background: i === 0 ? "var(--bg-2)" : "transparent", color: i === 0 ? "var(--fg)" : "var(--muted)" }}>{v}</span>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", flex: 1, overflow: "hidden" }}>
        {cards.map((card) => (
          <div key={card.name} style={{ borderRight: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)", padding: 14, overflow: "hidden" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 7, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 5 }}>{card.cat}</div>
            <div style={{ fontFamily: "var(--display)", fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.2, marginBottom: 3 }}>{card.name}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--muted)", marginBottom: 8 }}>{card.unit}</div>
            <div style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{card.cal}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", margin: "2px 0 8px" }}>Calories</div>
            {card.rows.map(row => (
              <div key={row.l} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderTop: "1px solid var(--rule)" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>{row.l}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>{row.v}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Screen 2: Recipe Detail ── */
function RecipeDetailScreen() {
  const ingredients = [
    { qty: "200 g", name: "Chicken Breast" },
    { qty: "1 tbsp", name: "Olive Oil" },
    { qty: "2 tbsp", name: "Lemon Juice" },
    { qty: "150 g", name: "Greek Yogurt" },
    { qty: "2 cloves", name: "Garlic" },
  ];
  const nutrition = [
    { label: "Calories", val: "422", goal: "2000", unit: "", pct: 21 },
    { label: "Protein", val: "65", goal: "80", unit: "g", pct: 81 },
    { label: "Carbs", val: "12", goal: "250", unit: "g", pct: 5 },
    { label: "Fat", val: "19", goal: "65", unit: "g", pct: 29 },
    { label: "Fiber", val: "2", goal: "28", unit: "g", pct: 7 },
    { label: "Sodium", val: "280", goal: "2300", unit: "mg", pct: 12 },
  ];
  const S = { fontFamily: "var(--display)", fontSize: 11, fontWeight: 700, color: "var(--rule)" } as const;
  const L = { fontFamily: "var(--display)", fontSize: 14, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--fg)" } as const;
  const rule = { flex: 1, height: 1, background: "var(--rule)", alignSelf: "center" as const };
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <MiniNav active="Recipes" />
      <div style={{ padding: "12px 24px 10px", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--muted)", marginBottom: 5 }}>2 servings · 25 min prep</div>
        <div style={{ fontFamily: "var(--display)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05, color: "var(--fg)" }}>Lemon Herb Chicken</div>
      </div>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, padding: "18px 24px", overflow: "hidden" }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
            <span style={S}>01</span><span style={L}>Ingredients</span><span style={rule} />
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {ingredients.map(ing => (
              <li key={ing.name} style={{ display: "flex", gap: 12, padding: "7px 0", alignItems: "baseline", borderBottom: "1px solid var(--rule)" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--fg-2)", minWidth: 48, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{ing.qty}</span>
                <span style={{ fontSize: 12.5, lineHeight: 1.4, color: "var(--fg)" }}>{ing.name}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
            <span style={S}>02</span><span style={L}>Nutrition</span><span style={rule} />
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--muted)", marginBottom: 10 }}>Per serving · vs goals</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {nutrition.map(n => (
              <div key={n.label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-2)" }}>{n.label}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>
                    {n.val}{n.unit}<span style={{ fontSize: 8, color: "var(--muted)" }}> / {n.goal}{n.unit}</span>
                  </span>
                </div>
                <div style={{ height: 3, background: "var(--rule)", borderRadius: 9999, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "var(--ok)", borderRadius: 9999, width: `${n.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Screen 3: AI Optimize + Meal Prep ── */
function AIOptimizeScreen() {
  const S = { fontFamily: "var(--display)", fontSize: 11, fontWeight: 700, color: "var(--rule)" } as const;
  const L = { fontFamily: "var(--display)", fontSize: 14, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--fg)" } as const;
  const rule = { flex: 1, height: 1, background: "var(--rule)", alignSelf: "center" as const };
  const swaps = [
    { from: "Butter", to: "Olive Oil", why: "−4g sat fat" },
    { from: "Heavy cream", to: "Greek Yogurt", why: "+12g protein" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <MiniNav active="Recipes" />
      {/* Jump nav */}
      <div style={{ display: "flex", padding: "0 24px", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
        {[
          { n: "01", l: "Ingredients" },
          { n: "02", l: "Nutrition" },
          { n: "03", l: "Instructions" },
          { n: "04", l: "Optimize", active: true },
          { n: "05", l: "Meal Prep" },
        ].map(s => (
          <div key={s.l} style={{
            display: "flex", alignItems: "center", gap: 5, padding: "7px 10px",
            fontFamily: "var(--mono)", fontSize: 7.5, textTransform: "uppercase", letterSpacing: "0.1em",
            color: s.active ? "var(--fg)" : "var(--muted)",
            borderBottom: s.active ? "2px solid var(--accent)" : "2px solid transparent",
            marginBottom: -1,
          }}>
            <span style={{ fontFamily: "var(--display)", fontSize: 8, fontWeight: 700, color: s.active ? "var(--accent)" : "var(--rule)" }}>{s.n}</span>
            {s.l}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, padding: "16px 24px", overflow: "hidden" }}>
        <div style={{ fontFamily: "var(--display)", fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--fg)", marginBottom: 14 }}>Lemon Herb Chicken</div>
        {/* 04 Optimization */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
            <span style={S}>04</span><span style={L}>Optimization</span><span style={rule} />
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--fg-2)", marginBottom: 10 }}>
            Recipe is protein-forward. To boost satiety and reduce saturated fat, consider these swaps:
          </div>
          {swaps.map(swap => (
            <div key={swap.from} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(90,155,106,0.07)", border: "1px solid rgba(90,155,106,0.18)", borderRadius: 4, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "var(--muted)", textDecoration: "line-through" }}>{swap.from}</span>
              <span style={{ fontSize: 11, color: "var(--accent)" }}>→</span>
              <span style={{ fontSize: 11, color: "var(--fg)", fontWeight: 500 }}>{swap.to}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, color: "var(--muted)", marginLeft: "auto" }}>{swap.why}</span>
            </div>
          ))}
        </div>
        {/* 05 Meal Prep */}
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
            <span style={S}>05</span><span style={L}>Meal Prep</span><span style={rule} />
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.65, color: "var(--fg-2)" }}>
            Double the recipe on Sunday. Portions store well for 3–4 days refrigerated. Reheat with a splash of water — add fresh lemon before serving.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Screen 4: Meal Planner — Individual ── */
function MealPlannerScreen() {
  const days = [
    { abbr: "MON", num: 6, meals: { Breakfast: { name: "Overnight Oats", kcal: 340 }, Lunch: { name: "Chicken Salad", kcal: 480 }, Dinner: { name: "Lemon Herb Chicken", kcal: 420 } } },
    { abbr: "TUE", num: 7, meals: { Dinner: { name: "Pasta", kcal: 520 } } },
    { abbr: "WED", num: 8, meals: { Breakfast: { name: "Overnight Oats", kcal: 340 }, Dinner: { name: "Stir Fry", kcal: 380 } } },
    { abbr: "THU", num: 9, meals: { Lunch: { name: "Tuna Wrap", kcal: 360 }, Dinner: { name: "Lemon Herb Chicken", kcal: 420 } } },
    { abbr: "FRI", num: 10, meals: { Lunch: { name: "Chicken Salad", kcal: 480 } } },
    { abbr: "SAT", num: 11, meals: { Breakfast: { name: "Avocado Toast", kcal: 320 } } },
    { abbr: "SUN", num: 12, meals: { Dinner: { name: "Pizza Night", kcal: 560 } } },
  ];
  const persons = [
    { name: "Jen", color: "#5A9B6A", active: true },
    { name: "Garth", color: "#4A7AB5" },
    { name: "Maya", color: "#E84828" },
    { name: "Everyone" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <MiniNav active="Planner" />
      <div style={{ display: "flex", alignItems: "center", padding: "0 16px", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
        {persons.map(p => (
          <div key={p.name} style={{
            display: "flex", alignItems: "center", gap: 5, padding: "7px 10px",
            fontFamily: "var(--mono)", fontSize: 7.5, textTransform: "uppercase", letterSpacing: "0.08em",
            color: p.active ? "var(--fg)" : "var(--muted)",
            borderBottom: p.active ? `2px solid ${p.color || "var(--fg)"}` : "2px solid transparent",
            marginBottom: -1,
          }}>
            {p.color && <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />}
            {p.name}
          </div>
        ))}
        <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 7.5, color: "var(--muted)" }}>April 2026</span>
      </div>
      <div style={{ flex: 1, overflow: "hidden", display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {days.map((day, i) => (
          <div key={day.abbr} style={{ borderRight: i < 6 ? "1px solid var(--rule)" : "none", overflow: "hidden" }}>
            <div style={{ padding: "10px 6px", borderBottom: "1px solid var(--rule)" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>{day.abbr}</div>
              <div style={{ fontFamily: "var(--display)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--fg-2)", lineHeight: 1, marginTop: 2 }}>{day.num}</div>
            </div>
            <div style={{ padding: "4px 0" }}>
              {(["Breakfast", "Lunch", "Dinner"] as const).map(type => {
                const meal = day.meals[type as keyof typeof day.meals];
                if (!meal) return null;
                return (
                  <div key={type} style={{ padding: "5px 5px 3px" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 2 }}>{type.slice(0, 5)}</div>
                    <div style={{ fontSize: 9.5, lineHeight: 1.3, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meal.name}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--muted)", marginTop: 1 }}>{meal.kcal}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Screen 5: Meal Planner — Everyone ── */
function EveryoneScreen() {
  const days = ["MON 6", "TUE 7", "WED 8", "THU 9", "FRI 10", "SAT 11", "SUN 12"];
  const persons = [
    { name: "Jen", color: "#5A9B6A",
      week: [["Overnight Oats", "Chicken Salad", "Lemon Herb Chicken"], ["Pasta"], ["Overnight Oats", "Stir Fry"], ["Tuna Wrap", "Lemon Herb Chicken"], ["Chicken Salad"], ["Avocado Toast"], ["Pizza Night"]] },
    { name: "Garth", color: "#4A7AB5",
      week: [["Eggs", "Pasta"], ["Stir Fry"], ["Eggs"], ["Pasta"], ["Chicken"], ["Brunch"], ["Leftovers"]] },
    { name: "Maya", color: "#E84828",
      week: [["Granola", "Noodles"], ["Granola", "Noodles"], ["Granola", "Salad"], ["Noodles"], ["Salad"], ["Brunch"], ["Tacos"]] },
  ];
  const pTabs = [
    { name: "Jen", color: "#5A9B6A" },
    { name: "Garth", color: "#4A7AB5" },
    { name: "Maya", color: "#E84828" },
    { name: "Everyone", active: true },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <MiniNav active="Planner" />
      <div style={{ display: "flex", alignItems: "center", padding: "0 16px", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
        {pTabs.map(p => (
          <div key={p.name} style={{
            display: "flex", alignItems: "center", gap: 5, padding: "7px 10px",
            fontFamily: "var(--mono)", fontSize: 7.5, textTransform: "uppercase", letterSpacing: "0.08em",
            color: p.active ? "var(--fg)" : "var(--muted)",
            borderBottom: p.active ? "2px solid var(--accent)" : "2px solid transparent",
            marginBottom: -1,
          }}>
            {p.color && !p.active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />}
            {p.name}
          </div>
        ))}
        <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 7.5, color: "var(--muted)" }}>April 2026</span>
      </div>
      {/* Header row */}
      <div style={{ display: "grid", gridTemplateColumns: "100px repeat(7, 1fr)", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
        <div style={{ borderRight: "1px solid var(--rule)", padding: "7px 10px" }} />
        {days.map((d, i) => (
          <div key={d} style={{ padding: "7px 5px", borderRight: i < 6 ? "1px solid var(--rule)" : "none", fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>{d}</div>
        ))}
      </div>
      {/* Person rows */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {persons.map((person) => (
          <div key={person.name} style={{ display: "grid", gridTemplateColumns: "100px repeat(7, 1fr)", borderBottom: "1px solid var(--rule)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 10px", borderRight: "1px solid var(--rule)" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: person.color, flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-2)" }}>{person.name}</span>
            </div>
            {person.week.map((dayMeals, di) => (
              <div key={di} style={{ padding: "8px 5px", borderRight: di < 6 ? "1px solid var(--rule)" : "none" }}>
                {dayMeals.map(meal => (
                  <div key={meal} style={{ fontSize: 9, lineHeight: 1.35, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 1 }}>{meal}</div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Screen 6: Day Nutrition + Swap ── */
function DayNutritionScreen() {
  const bars = [
    { label: "Calories", val: "1,240", goal: "2000", unit: "", pct: 62 },
    { label: "Protein", val: "88", goal: "120", unit: "g", pct: 73 },
    { label: "Fat", val: "52", goal: "65", unit: "g", pct: 80 },
    { label: "Fiber", val: "18", goal: "30", unit: "g", pct: 60 },
    { label: "Sodium", val: "2,100", goal: "2,300", unit: "mg", pct: 91 },
    { label: "Sat Fat", val: "14", goal: "20", unit: "g", pct: 70 },
  ];
  const meals = [
    { type: "Breakfast", name: "Overnight Oats", kcal: 340 },
    { type: "Lunch", name: "Chicken Salad", kcal: 480 },
    { type: "Dinner", name: "Lemon Herb Chicken", kcal: 420 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <MiniNav active="Planner" />
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 24px", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5A9B6A" }} />
        <span style={{ fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--fg-2)" }}>Jen</span>
        <span style={{ fontFamily: "var(--display)", fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--fg)", marginLeft: 4 }}>Monday, April 6</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--muted)", marginLeft: 6 }}>1,240 kcal</span>
      </div>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, padding: "16px 24px", overflow: "hidden" }}>
        {/* Nutrition bars */}
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid var(--rule)" }}>Day totals · vs goals</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {bars.map(n => (
              <div key={n.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-2)" }}>{n.label}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>
                    {n.val}{n.unit}<span style={{ fontSize: 8, color: "var(--muted)" }}> / {n.goal}{n.unit}</span>
                  </span>
                </div>
                <div style={{ height: 3, background: "var(--rule)", borderRadius: 9999, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: n.pct > 85 ? "var(--warn)" : "var(--ok)", borderRadius: 9999, width: `${n.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Meals + swap */}
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid var(--rule)" }}>Meals today</div>
          {meals.map(meal => (
            <div key={meal.type} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--rule)", gap: 8 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", minWidth: 56, flexShrink: 0 }}>{meal.type}</span>
              <span style={{ fontSize: 12, color: "var(--fg)", flex: 1 }}>{meal.name}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--muted)" }}>{meal.kcal}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: "10px", background: "rgba(90,155,106,0.06)", border: "1px solid rgba(90,155,106,0.18)", borderRadius: 4 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 7.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", marginBottom: 6 }}>Swap suggestion</div>
            <div style={{ fontSize: 11, color: "var(--fg-2)", lineHeight: 1.55 }}>
              Replace <span style={{ textDecoration: "line-through", color: "var(--muted)" }}>Overnight Oats</span> with <strong style={{ color: "var(--fg)", fontWeight: 600 }}>High Protein Yogurt Bowl</strong> to add 22g protein toward your daily goal.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SCREENS = [
  PantryScreen,
  RecipeDetailScreen,
  AIOptimizeScreen,
  MealPlannerScreen,
  EveryoneScreen,
  DayNutritionScreen,
];

/* Short labels for the tab strip */
const TAB_LABELS = ["Pantry", "Recipes", "Optimize", "Planner", "Everyone", "Targets"];

/* ── Main export ── */
export default function LandingScreenCycle() {
  const [active, setActive] = useState(0);

  return (
    <section className="lp-fs" aria-labelledby="lp-hero-headline">

      {/* ── Left: brand + headline + subhead + CTA only ── */}
      <div className="lp-fs-left">
        <Link href="/" className="lp-split-brand" aria-label="Good Measure home">
          Good Measure
        </Link>
        <div className="lp-fs-mid">
          <h1 id="lp-hero-headline" className="lp-headline">
            Measure what matters.
          </h1>
          <p className="lp-subhead">
            Know exactly what&apos;s in everything you cook.
            Build recipes, track nutrition live, plan the week —
            for your whole household.
          </p>
          <div className="lp-hero-ctas">
            <Link href="/login?signup=1" className="lp-cta-btn">
              Start cooking smarter →
            </Link>
            <Link href="/login" className="lp-nav-signin">Sign in</Link>
          </div>
        </div>
      </div>

      {/* ── Right: app frame only ── */}
      <div className="lp-fs-right" aria-hidden="true">
        <div className="lp-cycle-app-frame lp-fs-frame">
          <div className="lp-cycle-chrome">
            <div className="lp-cycle-chrome-dots">
              <span className="lp-cycle-chrome-dot lp-cycle-chrome-dot--red" />
              <span className="lp-cycle-chrome-dot lp-cycle-chrome-dot--yellow" />
              <span className="lp-cycle-chrome-dot lp-cycle-chrome-dot--green" />
            </div>
            <div className="lp-cycle-chrome-url">
              <span className="lp-cycle-chrome-urlbar">goodmeasure.app</span>
            </div>
          </div>
          <div className="lp-cycle-screen-wrap" aria-label="App screen demo">
            {SCREENS.map((Screen, i) => (
              <div
                key={i}
                className={`lp-cycle-screen${i === active ? " lp-cycle-screen--active" : ""}`}
                aria-hidden={i !== active}
              >
                <Screen />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom: full-width tabs + description — unifies both columns ── */}
      <div className="lp-fs-bottom">
        <nav className="lp-fs-tabs" aria-label="Feature navigation">
          {FEATURES.map((f, i) => (
            <button
              key={f.num}
              className={`lp-fs-tab${i === active ? " lp-fs-tab--active" : ""}`}
              onClick={() => setActive(i)}
              aria-pressed={i === active}
            >
              <span className="lp-fs-tab-num">{f.num}</span>
              <span className="lp-fs-tab-label">{TAB_LABELS[i]}</span>
            </button>
          ))}
        </nav>
        <div className="lp-fs-desc-wrap" aria-live="polite">
          {FEATURES.map((f, i) => (
            <div
              key={f.num}
              className={`lp-fs-desc${i === active ? " lp-fs-desc--active" : ""}`}
              aria-hidden={i !== active}
            >
              <span className="lp-fs-desc-title">{f.title}</span>
              <span className="lp-fs-desc-sep" aria-hidden="true"> · </span>
              <span className="lp-fs-desc-sub">{f.sub}</span>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
