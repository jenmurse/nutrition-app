"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { BrandName } from "./BrandName";

/* ── Brand / person colors — all hardcoded to avoid theme bleeding ── */
const BRAND_SAGE   = "#5A9B6A";
const MICHAEL_RED  = "#E84828";
const LINDSEY_PRP  = "#7B5EA7";

const PEOPLE = [
  { init: "C", name: "Chloe",   color: BRAND_SAGE  },
  { init: "M", name: "Michael", color: MICHAEL_RED },
  { init: "L", name: "Lindsey", color: LINDSEY_PRP },
];

/* ── Feature descriptions for the bottom bar ── */
const FEATURES = [
  { num: "01", title: "At a glance",            sub: "Today's nutrition, meals, and this week's plan — all on one screen." },
  { num: "02", title: "Build your pantry",       sub: "USDA lookup or manual entry. Your ingredient library, your way." },
  { num: "03", title: "Import or create recipes",sub: "Paste a URL, upload a file, or build from scratch. Nutrition calculates live." },
  { num: "04", title: "Optimize with AI",        sub: "Claude reads the recipe, suggests swaps, and saves notes back automatically." },
  { num: "05", title: "Plan your week",          sub: "Weekly grid per person. Add meals, see daily totals, hit your targets." },
  { num: "06", title: "Track the household",     sub: "Each person's plan, side by side. One recipe library shared by everyone." },
];

const TAB_LABELS = ["At a Glance", "Pantry", "Recipes", "Optimize", "Planner", "Everyone"];

/* ─────────────────────────────────────────────────────────────
   Shared helpers
   ───────────────────────────────────────────────────────────── */

/** Smooth-scroll a container element from its current position to `to` px */
function smoothScroll(el: HTMLElement, to: number, durationMs: number) {
  const from = el.scrollTop;
  const start = performance.now();
  const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const step = (now: number) => {
    const p = Math.min((now - start) / durationMs, 1);
    el.scrollTop = from + (to - from) * ease(p);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Thin nutrition progress bar */
function NutBar({ pct, warn }: { pct: number; warn?: boolean }) {
  return (
    <div style={{ height: 2, background: "var(--rule)", borderRadius: 9999, overflow: "hidden", marginTop: 3 }}>
      <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: warn ? "#C45C3A" : BRAND_SAGE, borderRadius: 9999 }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Shared mini nav (matches real app)
   ───────────────────────────────────────────────────────────── */
function MiniNav({ active }: { active: "Planner" | "Recipes" | "Pantry" | null }) {
  return (
    <div style={{
      height: 38, minHeight: 38, display: "flex", alignItems: "center",
      padding: "0 16px", gap: 14, background: "var(--bg)",
      borderBottom: "1px solid var(--rule)", flexShrink: 0,
    }}>
      <span style={{
        fontFamily: "var(--display)", fontSize: 13, fontWeight: 700,
        letterSpacing: "-0.02em", color: "var(--fg)", marginRight: 2, flexShrink: 0,
      }}>Good Measure</span>
      {(["Planner", "Recipes", "Pantry"] as const).map(link => (
        <span key={link} style={{
          fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.12em",
          color: link === active ? "var(--fg)" : "var(--muted)",
          borderBottom: link === active ? `1.5px solid ${BRAND_SAGE}` : "1.5px solid transparent",
          paddingBottom: 2, flexShrink: 0,
        }}>{link}</span>
      ))}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex" }}>
          {PEOPLE.map((p, i) => (
            <div key={p.init} style={{
              width: 18, height: 18, borderRadius: "50%", background: p.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 7, fontFamily: "var(--mono)", color: "white", fontWeight: 600,
              marginLeft: i === 0 ? 0 : -4, border: "2px solid var(--bg)", flexShrink: 0,
            }}>{p.init}</div>
          ))}
        </div>
        <span style={{ fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Sign out</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Screen 0 — Dashboard (At a Glance)
   Auto-scrolls from greeting → meals section → week mini-grid
   ───────────────────────────────────────────────────────────── */
function DashboardScreen({ isActive }: { isActive?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
    if (!isActive) return;
    const t1 = setTimeout(() => smoothScroll(el, 220, 2200), 1000);
    return () => clearTimeout(t1);
  }, [isActive]);

  const meals = [
    { n: "01", type: "Breakfast", name: "Cottage Cheese Bowl", kcal: 298, carbs: 14, protein: 32 },
    { n: "02", type: "Lunch",     name: "Salmon Salad",         kcal: 454, carbs: 16, protein: 28 },
    { n: "03", type: "Dinner",    name: "Thai Green Curry",     kcal: 390, carbs: 38, protein: 22 },
  ];
  const weekDays = [
    { abbr: "SUN", num: 5,  kcal: "1,107", meals: ["Eggs & Toast","Pasta"] },
    { abbr: "MON", num: 6,  kcal: "1,629", meals: ["Yogurt Bowl","Thai Curry"] },
    { abbr: "TUE", num: 7,  kcal: "1,142", meals: ["Cottage Cheese","Salmon Salad","Thai Curry"] },
    { abbr: "WED", num: 8,  kcal: "594",   meals: ["Cottage Cheese"] },
    { abbr: "THU", num: 9,  kcal: "—",     meals: [] },
    { abbr: "FRI", num: 10, kcal: "—",     meals: [] },
    { abbr: "SAT", num: 11, kcal: "328",   meals: ["Shrimp Tacos"] },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <MiniNav active={null} />
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: "scroll", scrollbarWidth: "none" }}
      >
        {/* Date + Greeting */}
        <div style={{ padding: "24px 28px 0" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--muted)", marginBottom: 12 }}>
            Tuesday, April 7, 2026
          </div>
          <div style={{ fontFamily: "var(--display)", fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05, color: "var(--fg)" }}>
            Good afternoon,
          </div>
          <div style={{ fontFamily: "var(--display)", fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05, color: BRAND_SAGE, marginBottom: 20 }}>
            Chloe
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)", margin: "0 0 0 0" }}>
          {[
            { label: "Calories", val: "1,023", sub: "of 2,000", pct: 51 },
            { label: "Carbs",    val: "65",    sub: "of 225 g",  pct: 29 },
            { label: "Protein",  val: "71",    sub: "of 95 g",   pct: 75 },
          ].map((s, i) => (
            <div key={s.label} style={{ padding: "14px 20px 12px", borderRight: i < 2 ? "1px solid var(--rule)" : "none" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--fg)", lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--muted)", margin: "3px 0 8px" }}>{s.sub}</div>
              <NutBar pct={s.pct} warn={s.pct > 90} />
            </div>
          ))}
        </div>

        {/* Today's key meals */}
        <div style={{ padding: "18px 28px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>Today's key meals</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.08em", color: BRAND_SAGE }}>Open planner →</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, border: "1px solid var(--rule)" }}>
            {meals.map((m, i) => (
              <div key={m.n} style={{ padding: "14px 16px", borderRight: i < 2 ? "1px solid var(--rule)" : "none" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 6 }}>
                  {m.n} · {m.type}
                </div>
                <div style={{ fontFamily: "var(--display)", fontSize: 13, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.25, color: "var(--fg)", marginBottom: 10 }}>{m.name}</div>
                {[["Calories", m.kcal], ["Carbs", `${m.carbs}g`], ["Protein", `${m.protein}g`]].map(([l, v]) => (
                  <div key={l as string} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderTop: "1px solid var(--rule)" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>{l}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>{v}</span>
                  </div>
                ))}
                <div style={{ fontFamily: "var(--mono)", fontSize: 7.5, textTransform: "uppercase", letterSpacing: "0.08em", color: BRAND_SAGE, marginTop: 8 }}>See recipe →</div>
              </div>
            ))}
          </div>
        </div>

        {/* This week mini-grid */}
        <div style={{ padding: "22px 28px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>This week</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.08em", color: BRAND_SAGE }}>Full planner →</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", border: "1px solid var(--rule)" }}>
            {weekDays.map((d, i) => (
              <div key={d.abbr} style={{
                borderRight: i < 6 ? "1px solid var(--rule)" : "none",
                background: d.num === 7 ? "rgba(90,155,106,0.05)" : "transparent",
              }}>
                <div style={{ padding: "7px 5px 5px", borderBottom: "1px solid var(--rule)" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>{d.abbr}</div>
                  <div style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em", color: d.num === 7 ? BRAND_SAGE : "var(--fg-2)", lineHeight: 1, marginTop: 1 }}>{d.num}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 6.5, color: "var(--muted)", marginTop: 2 }}>{d.kcal} kcal</div>
                  <NutBar pct={d.kcal === "—" ? 0 : 60} />
                </div>
                <div style={{ padding: "4px 5px" }}>
                  {d.meals.map(m => (
                    <div key={m} style={{ fontSize: 8.5, lineHeight: 1.35, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>{m}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Screen 1 — Pantry
   Accurate toolbar (ALL/ITEMS/INGREDIENTS + count + GRID/LIST + ADD)
   4-col ingredient grid with full nutrient rows
   ───────────────────────────────────────────────────────────── */
function PantryScreen() {
  const cards = [
    { cat: "Nuts & Seeds",  name: "Almond Butter",    unit: "2 Tbsp (32g)",  cal: "656",  fat: "56g",  satfat: "4.7g", sodium: "0mg",   carbs: "19g", sugar: "3g",  protein: "19g", fiber: "6g"  },
    { cat: "Baking",        name: "Almond Flour",      unit: "2 Tbsp (14g)",  cal: "571",  fat: "43g",  satfat: "3.3g", sodium: "0mg",   carbs: "21g", sugar: "7g",  protein: "29g", fiber: "14g" },
    { cat: "Dairy & Eggs",  name: "Greek Yogurt",      unit: "per 100g",      cal: "97",   fat: "5g",   satfat: "3.2g", sodium: "36mg",  carbs: "4g",  sugar: "4g",  protein: "9g",  fiber: "0g"  },
    { cat: "Produce",       name: "Broccoli",           unit: "per 100g",      cal: "34",   fat: "0g",   satfat: "0g",   sodium: "33mg",  carbs: "7g",  sugar: "2g",  protein: "3g",  fiber: "3g"  },
    { cat: "Protein",       name: "Chicken Breast",     unit: "per 100g",      cal: "165",  fat: "4g",   satfat: "1g",   sodium: "74mg",  carbs: "0g",  sugar: "0g",  protein: "31g", fiber: "0g"  },
    { cat: "Grain",         name: "Rolled Oats",        unit: "per 100g",      cal: "389",  fat: "7g",   satfat: "1.3g", sodium: "2mg",   carbs: "66g", sugar: "1g",  protein: "17g", fiber: "10g" },
    { cat: "Legume",        name: "Black Beans",        unit: "per 100g",      cal: "132",  fat: "1g",   satfat: "0.2g", sodium: "5mg",   carbs: "24g", sugar: "0g",  protein: "9g",  fiber: "9g"  },
    { cat: "Produce",       name: "Avocado",            unit: "per 100g",      cal: "160",  fat: "15g",  satfat: "2.1g", sodium: "7mg",   carbs: "9g",  sugar: "1g",  protein: "2g",  fiber: "7g"  },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <MiniNav active="Pantry" />
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "0 16px", height: 38, borderBottom: "1px solid var(--rule)", flexShrink: 0,
      }}>
        {/* Filter pills */}
        <div style={{ display: "flex", gap: 4 }}>
          {[["ALL", true], ["Items", false], ["Ingredients", false]].map(([label, active]) => (
            <span key={label as string} style={{
              fontFamily: "var(--mono)", fontSize: 7.5, textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "3px 9px", borderRadius: 9999,
              background: active ? "var(--bg-3)" : "transparent",
              border: active ? "1px solid var(--fg)" : "1px solid transparent",
              color: active ? "var(--fg)" : "var(--muted)",
            }}>{label as string}</span>
          ))}
        </div>
        <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--muted)", marginLeft: 4 }}>156 items</span>
        {/* GRID / LIST toggle */}
        <div style={{ display: "flex", border: "1px solid var(--rule)", borderRadius: 2, overflow: "hidden", marginLeft: 4 }}>
          {[["Grid", true], ["List", false]].map(([v, on]) => (
            <span key={v as string} style={{
              fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "3px 8px", background: on ? "var(--bg-2)" : "transparent",
              color: on ? "var(--fg)" : "var(--muted)",
            }}>{v as string}</span>
          ))}
        </div>
        <input disabled placeholder="Search…" style={{
          flex: 1, maxWidth: 160, fontFamily: "var(--sans)", fontSize: 10,
          border: "1px solid var(--rule)", background: "var(--bg)", color: "var(--muted)",
          padding: "3px 10px", outline: "none", borderRadius: 2,
        }} />
        <span style={{
          fontFamily: "var(--mono)", fontSize: 7.5, textTransform: "uppercase", letterSpacing: "0.08em",
          padding: "4px 10px", background: BRAND_SAGE, color: "white", borderRadius: 9999,
        }}>+ Add</span>
      </div>

      {/* Card grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", flex: 1, overflow: "hidden" }}>
        {cards.map((c, idx) => (
          <div key={c.name} style={{
            borderRight: (idx % 4) < 3 ? "1px solid var(--rule)" : "none",
            borderBottom: idx < 4 ? "1px solid var(--rule)" : "none",
            padding: "14px 16px", overflow: "hidden",
          }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 7, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>{c.cat}</div>
            <div style={{ fontFamily: "var(--display)", fontSize: 13, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 2 }}>{c.name}</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 9, color: "var(--muted)", marginBottom: 8 }}>{c.unit}</div>
            <div style={{ fontFamily: "var(--display)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>{c.cal}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 6 }}>Calories</div>
            {([["Fat", c.fat], ["Sat Fat", c.satfat], ["Sodium", c.sodium], ["Carbs", c.carbs], ["Sugar", c.sugar], ["Protein", c.protein], ["Fiber", c.fiber]] as [string, string][]).map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "2.5px 0", borderTop: "1px solid var(--rule)" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>{l}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>{v}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Screen 2 — Recipe Detail
   Jump nav · 2-col ingredients + nutrition · auto-scrolls to instructions
   ───────────────────────────────────────────────────────────── */
function RecipeDetailScreen({ isActive }: { isActive?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
    if (!isActive) return;
    const t = setTimeout(() => smoothScroll(el, 280, 1800), 1200);
    return () => clearTimeout(t);
  }, [isActive]);

  const ingredients = [
    { qty: "400 g", name: "Salmon fillet" },
    { qty: "1 tbsp", name: "Olive oil" },
    { qty: "2 cloves", name: "Garlic, minced" },
    { qty: "1 tsp", name: "Fresh ginger" },
    { qty: "2 tbsp", name: "Soy sauce (low sodium)" },
    { qty: "1 tsp", name: "Sesame oil" },
    { qty: "200 g", name: "Baby bok choy" },
  ];
  const nutrition = [
    { label: "Calories", val: "480", goal: "2000", unit: "",   pct: 24 },
    { label: "Protein",  val: "52",  goal: "95",   unit: "g",  pct: 55 },
    { label: "Fat",      val: "24",  goal: "75",   unit: "g",  pct: 32 },
    { label: "Carbs",    val: "12",  goal: "225",  unit: "g",  pct: 5  },
    { label: "Fiber",    val: "3",   goal: "22",   unit: "g",  pct: 14 },
    { label: "Sodium",   val: "620", goal: "2300", unit: "mg", pct: 27 },
  ];
  const steps = [
    "Pat salmon dry. Season both sides with salt and white pepper.",
    "Mix soy sauce, sesame oil, and ginger in a small bowl. Set aside.",
    "Heat olive oil in a large skillet over medium-high. Add garlic, sauté 30 seconds until fragrant.",
    "Add salmon skin-side up. Cook 4 minutes without moving. Flip, cook 3 more minutes.",
    "Pour sauce over salmon. Add bok choy to pan, toss to coat. Cover and steam 2 minutes.",
    "Serve immediately, spooning pan sauce over the top.",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <MiniNav active="Recipes" />
      {/* Recipe header */}
      <div style={{ padding: "10px 24px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          {["Dinner", "High Protein"].map(tag => (
            <span key={tag} style={{
              fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.1em",
              padding: "2px 7px", background: "var(--bg-2)", color: "var(--muted)", borderRadius: 2,
            }}>{tag}</span>
          ))}
        </div>
        <div style={{ fontFamily: "var(--display)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05, color: "var(--fg)", marginBottom: 4 }}>
          Ginger Soy Salmon
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 0 }}>
          2 servings · 20 min prep · 15 min cook
        </div>
      </div>
      {/* Jump nav */}
      <div style={{ display: "flex", padding: "0 24px", borderBottom: "1px solid var(--rule)", flexShrink: 0, marginTop: 8 }}>
        {[
          { n: "01", l: "Ingredients", active: true },
          { n: "02", l: "Nutrition" },
          { n: "03", l: "Instructions" },
          { n: "04", l: "Optimize" },
          { n: "05", l: "Meal Prep" },
        ].map(s => (
          <div key={s.l} style={{
            display: "flex", alignItems: "center", gap: 4, padding: "6px 8px",
            fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em",
            color: s.active ? "var(--fg)" : "var(--muted)",
            borderBottom: s.active ? `2px solid ${BRAND_SAGE}` : "2px solid transparent",
            marginBottom: -1,
          }}>
            <span style={{ fontFamily: "var(--display)", fontSize: 8, fontWeight: 700, color: s.active ? BRAND_SAGE : "var(--rule)" }}>{s.n}</span>
            {s.l}
          </div>
        ))}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "scroll", scrollbarWidth: "none" }}>
        {/* 2-col: ingredients + nutrition */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, padding: "14px 24px 20px" }}>
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", paddingBottom: 6, borderBottom: "1px solid var(--rule)", marginBottom: 8 }}>Ingredients</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {ingredients.map(ing => (
                <li key={ing.name} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--rule)" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 8.5, color: "var(--muted)", minWidth: 46, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{ing.qty}</span>
                  <span style={{ fontSize: 11.5, lineHeight: 1.4, color: "var(--fg)" }}>{ing.name}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", paddingBottom: 6, borderBottom: "1px solid var(--rule)", marginBottom: 4 }}>
              Per serving · vs goals
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {nutrition.map(n => (
                <div key={n.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-2)" }}>{n.label}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 8.5, color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>
                      {n.val}{n.unit}<span style={{ fontSize: 7.5, color: "var(--muted)" }}> / {n.goal}{n.unit}</span>
                    </span>
                  </div>
                  <NutBar pct={n.pct} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 03 Instructions — revealed by scroll */}
        <div style={{ padding: "0 24px 28px", borderTop: "1px solid var(--rule)" }}>
          <div style={{ fontFamily: "var(--display)", fontSize: 10, fontWeight: 700, color: "var(--rule)", display: "inline", marginRight: 8 }}>03</div>
          <span style={{ fontFamily: "var(--display)", fontSize: 14, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--fg)" }}>Instructions</span>
          <div style={{ height: 1, background: "var(--rule)", marginBottom: 12, marginTop: 6 }} />
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 0 }}>
            {steps.map((step, i) => (
              <li key={i} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--rule)" }}>
                <span style={{ fontFamily: "var(--display)", fontSize: 11, fontWeight: 700, color: BRAND_SAGE, minWidth: 18, flexShrink: 0, lineHeight: 1.6 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ fontSize: 11.5, lineHeight: 1.65, color: "var(--fg-2)" }}>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Screen 3 — Optimize (same recipe, scrolled to 04 Optimize + 05 Meal Prep)
   ───────────────────────────────────────────────────────────── */
function AIOptimizeScreen() {
  const swaps = [
    { from: "Soy sauce (2 tbsp)", to: "Coconut aminos",  why: "−440mg sodium" },
    { from: "Sesame oil (1 tsp)", to: "Extra olive oil",  why: "+polyphenols" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <MiniNav active="Recipes" />
      {/* Recipe header (condensed) */}
      <div style={{ padding: "10px 24px 0", flexShrink: 0 }}>
        <div style={{ fontFamily: "var(--display)", fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--fg)", marginBottom: 2 }}>Ginger Soy Salmon</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>2 servings · 20 min prep</div>
      </div>
      {/* Jump nav — 04 Optimize active */}
      <div style={{ display: "flex", padding: "0 24px", borderBottom: "1px solid var(--rule)", flexShrink: 0, marginTop: 8 }}>
        {[
          { n: "01", l: "Ingredients" },
          { n: "02", l: "Nutrition" },
          { n: "03", l: "Instructions" },
          { n: "04", l: "Optimize", active: true },
          { n: "05", l: "Meal Prep" },
        ].map(s => (
          <div key={s.l} style={{
            display: "flex", alignItems: "center", gap: 4, padding: "6px 8px",
            fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em",
            color: s.active ? "var(--fg)" : "var(--muted)",
            borderBottom: s.active ? `2px solid ${BRAND_SAGE}` : "2px solid transparent",
            marginBottom: -1,
          }}>
            <span style={{ fontFamily: "var(--display)", fontSize: 8, fontWeight: 700, color: s.active ? BRAND_SAGE : "var(--rule)" }}>{s.n}</span>
            {s.l}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, padding: "16px 24px", overflowY: "scroll", scrollbarWidth: "none" }}>
        {/* 04 Optimization */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: "var(--display)", fontSize: 11, fontWeight: 700, color: "var(--rule)" }}>04</span>
            <span style={{ fontFamily: "var(--display)", fontSize: 14, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--fg)" }}>Optimization</span>
            <div style={{ flex: 1, height: 1, background: "var(--rule)", alignSelf: "center" }} />
          </div>
          <div style={{ fontSize: 11.5, lineHeight: 1.65, color: "var(--fg-2)", marginBottom: 12 }}>
            Recipe is high-protein with good fat profile. To further reduce sodium and boost micronutrients, consider these ingredient swaps:
          </div>
          {swaps.map(swap => (
            <div key={swap.from} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
              background: "rgba(90,155,106,0.07)", border: `1px solid rgba(90,155,106,0.20)`,
              borderRadius: 3, marginBottom: 6,
            }}>
              <span style={{ fontSize: 10.5, color: "var(--muted)", textDecoration: "line-through" }}>{swap.from}</span>
              <span style={{ fontSize: 10.5, color: BRAND_SAGE }}>→</span>
              <span style={{ fontSize: 10.5, color: "var(--fg)", fontWeight: 500 }}>{swap.to}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, color: "var(--muted)", marginLeft: "auto" }}>{swap.why}</span>
            </div>
          ))}
        </div>

        {/* 05 Meal Prep */}
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: "var(--display)", fontSize: 11, fontWeight: 700, color: "var(--rule)" }}>05</span>
            <span style={{ fontFamily: "var(--display)", fontSize: 14, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--fg)" }}>Meal Prep</span>
            <div style={{ flex: 1, height: 1, background: "var(--rule)", alignSelf: "center" }} />
          </div>
          <div style={{ fontSize: 11.5, lineHeight: 1.7, color: "var(--fg-2)" }}>
            Prep the sauce (soy, ginger, sesame) up to 3 days ahead and refrigerate. Salmon is best cooked fresh — 8 minutes total from cold. Bok choy can be blanched in advance and added at the last minute. Leftovers keep 2 days; reheat gently to avoid drying out the fish.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Screen 4 — Planner
   Weekly grid · nutrition panel animates in and out
   ───────────────────────────────────────────────────────────── */
function PlannerScreen({ isActive }: { isActive?: boolean }) {
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    if (!isActive) { setPanelOpen(false); return; }
    const t1 = setTimeout(() => setPanelOpen(true),  1400);
    const t2 = setTimeout(() => setPanelOpen(false), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isActive]);

  const days = [
    { abbr: "SUN", num: 5,  kcal: "1,107", meals: [{ type: "B", name: "Eggs & Toast", kcal: 380 }, { type: "D", name: "One-pan Fish", kcal: 460 }, { type: "De", name: "Dark Chocolate", kcal: 95 }] },
    { abbr: "MON", num: 6,  kcal: "1,629", meals: [{ type: "B", name: "Cottage Cheese Bowl", kcal: 298 }, { type: "L", name: "Salmon Salad", kcal: 449 }, { type: "D", name: "Thai Curry", kcal: 732 }] },
    { abbr: "TUE", num: 7,  kcal: "1,142", today: true, meals: [{ type: "B", name: "Cottage Cheese Bowl", kcal: 298 }, { type: "L", name: "Ginger Soy Salmon", kcal: 480 }, { type: "D", name: "Curried Lentils", kcal: 271 }] },
    { abbr: "WED", num: 8,  kcal: "298",   meals: [{ type: "B", name: "Cottage Cheese Bowl", kcal: 298 }] },
    { abbr: "THU", num: 9,  kcal: "—",     meals: [] },
    { abbr: "FRI", num: 10, kcal: "—",     meals: [] },
    { abbr: "SAT", num: 11, kcal: "328",   meals: [{ type: "D", name: "Shrimp Tacos", kcal: 328 }] },
  ];

  const nutRows = [
    { label: "Fat",          val: "54", goal: "75",    unit: "g",  pct: 72, warn: false },
    { label: "Saturated Fat",val: "16", goal: "18",    unit: "g",  pct: 87, warn: true  },
    { label: "Sodium",       val: "1,913", goal: "2,300", unit: "mg", pct: 83, warn: true },
    { label: "Carbs",        val: "80", goal: "225",   unit: "g",  pct: 36, warn: false },
    { label: "Sugar",        val: "17", goal: "25",    unit: "g",  pct: 68, warn: false },
    { label: "Protein",      val: "68", goal: "95",    unit: "g",  pct: 72, warn: false },
    { label: "Fiber",        val: "19", goal: "22",    unit: "g",  pct: 85, warn: true  },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <MiniNav active="Planner" />

      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "0 14px", height: 38, borderBottom: "1px solid var(--rule)", flexShrink: 0, flexWrap: "nowrap",
      }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--fg-2)", letterSpacing: "0.04em", flexShrink: 0 }}>Apr 5–11</span>
        {["‹ Prev", "Next ›", "This Week"].map(b => (
          <span key={b} style={{
            fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "3px 7px", border: "1px solid var(--rule)", borderRadius: 9999, color: "var(--muted)", flexShrink: 0,
          }}>{b}</span>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "4px 10px", background: BRAND_SAGE, color: "white", borderRadius: 9999,
          }}>+ New Plan</span>
          {["Edit", "‹ Nutrition"].map(b => (
            <span key={b} style={{
              fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "3px 7px", border: "1px solid var(--rule)", borderRadius: 9999,
              color: b === "‹ Nutrition" && panelOpen ? "var(--fg)" : "var(--muted)",
              background: b === "‹ Nutrition" && panelOpen ? "var(--bg-2)" : "transparent",
            }}>{b}</span>
          ))}
          {["Chloe", "Michael", "Everyone"].map(p => (
            <span key={p} style={{
              fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "3px 7px",
              border: p === "Chloe" ? `1.5px solid ${BRAND_SAGE}` : "1px solid var(--rule)",
              borderRadius: 9999, color: p === "Chloe" ? "var(--fg)" : "var(--muted)",
              fontWeight: p === "Chloe" ? 600 : 400,
            }}>{p}</span>
          ))}
        </div>
      </div>

      {/* Grid + optional nutrition panel */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Week grid */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", overflowY: "scroll", scrollbarWidth: "none" }}>
          {days.map((day, i) => (
            <div key={day.abbr} style={{
              borderRight: i < 6 ? "1px solid var(--rule)" : "none",
              background: day.today ? "rgba(90,155,106,0.05)" : "transparent",
              overflow: "hidden",
            }}>
              {/* Day header */}
              <div style={{ padding: "8px 8px 6px", borderBottom: "1px solid var(--rule)" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.1em", color: day.today ? BRAND_SAGE : "var(--muted)" }}>{day.abbr}</div>
                <div style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", color: day.today ? BRAND_SAGE : "var(--fg-2)", lineHeight: 1, marginTop: 2 }}>{day.num}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--muted)", marginTop: 2 }}>{day.kcal} kcal</div>
                <NutBar pct={day.kcal === "—" ? 0 : 55} />
              </div>
              {/* Meals */}
              <div style={{ padding: "5px 0" }}>
                {day.meals.map((m, mi) => (
                  <div key={mi} style={{ padding: "5px 6px 3px" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 1 }}>{m.type}</div>
                    <div style={{ fontSize: 9.5, lineHeight: 1.3, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--muted)" }}>{m.kcal}</div>
                  </div>
                ))}
                {day.meals.length === 0 && (
                  <div style={{ padding: "6px 6px", fontFamily: "var(--mono)", fontSize: 7, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>+ Add</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Nutrition panel — slides in/out */}
        <div style={{
          width: panelOpen ? 230 : 0,
          transition: `width ${panelOpen ? "500ms" : "380ms"} cubic-bezier(0.23, 1, 0.32, 1)`,
          overflow: "hidden", flexShrink: 0,
          borderLeft: "1px solid var(--rule)", background: "var(--bg)",
        }}>
          <div style={{ width: 230, padding: "14px 16px", overflowY: "scroll", scrollbarWidth: "none", height: "100%" }}>
            <div style={{ fontFamily: "var(--display)", fontSize: 13, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--fg)", marginBottom: 2 }}>Sunday, Apr 5</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: BRAND_SAGE, flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>Chloe</span>
            </div>
            <div style={{ fontFamily: "var(--display)", fontSize: 32, fontWeight: 700, letterSpacing: "-0.04em", color: "var(--fg)", lineHeight: 1 }}>1,107</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 7.5, color: "var(--muted)", marginBottom: 4 }}>of 2,000 kcal · 55%</div>
            <NutBar pct={55} />
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {nutRows.map(n => (
                <div key={n.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-2)" }}>{n.label}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>
                      {n.val} / {n.goal} {n.unit}
                    </span>
                  </div>
                  <NutBar pct={n.pct} warn={n.warn} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Screen 5 — Everyone
   Person-row grid: day headers + Chloe / Michael / Lindsey rows
   ───────────────────────────────────────────────────────────── */
function EveryoneScreen() {
  const days = [
    { abbr: "SUN", num: 5  },
    { abbr: "MON", num: 6  },
    { abbr: "TUE", num: 7, today: true },
    { abbr: "WED", num: 8  },
    { abbr: "THU", num: 9  },
    { abbr: "FRI", num: 10 },
    { abbr: "SAT", num: 11 },
  ];
  const personRows = [
    { name: "Chloe",   color: BRAND_SAGE,  week: [
      [{ t:"B", n:"Eggs & Toast" }, { t:"D", n:"One-pan Fish" }],
      [{ t:"B", n:"Cottage Cheese" }, { t:"L", n:"Salmon Salad" }, { t:"D", n:"Thai Curry" }],
      [{ t:"B", n:"Cottage Cheese" }, { t:"L", n:"Ginger Salmon" }, { t:"D", n:"Curried Lentils" }],
      [{ t:"B", n:"Cottage Cheese" }],
      [],
      [],
      [{ t:"D", n:"Shrimp Tacos" }],
    ]},
    { name: "Michael", color: MICHAEL_RED, week: [
      [{ t:"B", n:"Overnight Oats" }, { t:"D", n:"Pasta Bolognese" }],
      [{ t:"B", n:"Overnight Oats" }, { t:"D", n:"Thai Curry" }],
      [{ t:"B", n:"Overnight Oats" }, { t:"D", n:"Thai Curry" }],
      [{ t:"B", n:"Overnight Oats" }, { t:"D", n:"Stir Fry" }],
      [{ t:"B", n:"Overnight Oats" }, { t:"L", n:"Chicken Wrap" }, { t:"D", n:"Thai Curry" }],
      [{ t:"B", n:"Overnight Oats" }, { t:"D", n:"Thai Curry" }],
      [{ t:"De", n:"Shrimp Tacos" }],
    ]},
    { name: "Lindsey", color: LINDSEY_PRP, week: [
      [{ t:"B", n:"Granola Bowl" }, { t:"L", n:"Noodle Soup" }],
      [{ t:"B", n:"Granola Bowl" }, { t:"L", n:"Noodle Soup" }],
      [{ t:"B", n:"Granola Bowl" }, { t:"L", n:"Side Salad" }],
      [{ t:"L", n:"Noodle Soup" }],
      [{ t:"L", n:"Side Salad" }],
      [{ t:"B", n:"Brunch" }],
      [{ t:"D", n:"Tacos" }],
    ]},
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <MiniNav active="Planner" />

      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "0 14px", height: 38, borderBottom: "1px solid var(--rule)", flexShrink: 0,
      }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--fg-2)", letterSpacing: "0.04em" }}>Apr 5–11</span>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em",
          padding: "3px 9px", border: "1px solid var(--rule)", borderRadius: 9999, color: "var(--muted)",
        }}>This Week</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "4px 10px", background: BRAND_SAGE, color: "white", borderRadius: 9999,
          }}>+ New Plan</span>
          {["Chloe", "Michael", "Lindsey"].map(p => (
            <span key={p} style={{
              fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "3px 7px", border: "1px solid var(--rule)", borderRadius: 9999, color: "var(--muted)",
            }}>{p}</span>
          ))}
          <span style={{
            fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "3px 9px", border: `1.5px solid ${BRAND_SAGE}`, borderRadius: 9999,
            color: "var(--fg)", fontWeight: 600,
          }}>Everyone</span>
        </div>
      </div>

      {/* Day header row + person rows */}
      <div style={{ flex: 1, overflowY: "scroll", scrollbarWidth: "none" }}>
        {/* Day header */}
        <div style={{ display: "grid", gridTemplateColumns: "72px repeat(7, 1fr)", borderBottom: "1px solid var(--rule)", position: "sticky", top: 0, background: "var(--bg)", zIndex: 1 }}>
          <div style={{ borderRight: "1px solid var(--rule)", padding: "8px 10px" }} />
          {days.map((d, i) => (
            <div key={d.abbr} style={{
              padding: "8px 8px 6px",
              borderRight: i < 6 ? "1px solid var(--rule)" : "none",
              background: d.today ? "rgba(90,155,106,0.05)" : "transparent",
            }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.1em", color: d.today ? BRAND_SAGE : "var(--muted)" }}>{d.abbr}</div>
              <div style={{ fontFamily: "var(--display)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", color: d.today ? BRAND_SAGE : "var(--fg-2)", lineHeight: 1, marginTop: 1 }}>{d.num}</div>
            </div>
          ))}
        </div>

        {/* Person rows */}
        {personRows.map((person, ri) => (
          <div key={person.name} style={{
            display: "grid", gridTemplateColumns: "72px repeat(7, 1fr)",
            borderBottom: ri < personRows.length - 1 ? "1px solid var(--rule)" : "none",
          }}>
            {/* Person label */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 5, padding: "10px 10px", borderRight: "1px solid var(--rule)" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: person.color, flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-2)", lineHeight: 1.4 }}>{person.name}</span>
            </div>
            {/* Day cells */}
            {person.week.map((dayMeals, di) => (
              <div key={di} style={{
                padding: "8px 6px",
                borderRight: di < 6 ? "1px solid var(--rule)" : "none",
                background: di === 2 ? "rgba(90,155,106,0.04)" : "transparent",
                minHeight: 70,
              }}>
                {dayMeals.map((m, mi) => (
                  <div key={mi} style={{ display: "flex", gap: 4, marginBottom: 3 }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 6.5, color: "var(--muted)", flexShrink: 0, marginTop: 1, minWidth: 10 }}>{m.t}</span>
                    <span style={{ fontSize: 9, lineHeight: 1.35, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis" }}>{m.n}</span>
                  </div>
                ))}
                {dayMeals.length === 0 && (
                  <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--muted)" }}>—</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Screens index
   ───────────────────────────────────────────────────────────── */
type ScreenProps = { isActive?: boolean };
const SCREEN_COMPONENTS: Array<(props: ScreenProps) => React.ReactElement | null> = [
  DashboardScreen,
  PantryScreen,
  RecipeDetailScreen,
  AIOptimizeScreen,
  PlannerScreen,
  EveryoneScreen,
];

/* ─────────────────────────────────────────────────────────────
   Main export
   ───────────────────────────────────────────────────────────── */
export default function LandingScreenCycle() {
  const [active, setActive] = useState(0);

  return (
    <section className="lp-fs" aria-labelledby="lp-hero-headline">

      {/* ── Left: brand + headline + subhead + CTA ── */}
      <div className="lp-fs-left">
        <Link href="/" className="lp-split-brand" aria-label="Good Measure home">
          <BrandName />
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

      {/* ── Right: app frame ── */}
      <div className="lp-fs-right" aria-hidden="true">
        <div className="lp-cycle-app-frame lp-fs-frame">
          <div className="lp-cycle-chrome">
            <div className="lp-cycle-chrome-dots">
              <span className="lp-cycle-chrome-dot lp-cycle-chrome-dot--red" />
              <span className="lp-cycle-chrome-dot lp-cycle-chrome-dot--yellow" />
              <span className="lp-cycle-chrome-dot lp-cycle-chrome-dot--green" />
            </div>
          </div>
          <div className="lp-cycle-screen-wrap" aria-label="App screen demo">
            {SCREEN_COMPONENTS.map((Screen, i) => (
              <div
                key={i}
                className={`lp-cycle-screen${i === active ? " lp-cycle-screen--active" : ""}`}
                aria-hidden={i !== active}
              >
                <Screen isActive={i === active} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom: tabs + description ── */}
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
        <div className="lp-fs-legal">
          © 2026 Made by{" "}
          <a href="https://jenmurse.com" target="_blank" rel="noopener noreferrer" className="lp-fs-legal-link">
            Jen Murse
          </a>
        </div>
      </div>
    </section>
  );
}
