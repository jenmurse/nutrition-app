"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { BrandName } from "./BrandName";

/* ── Brand / person colors — all hardcoded to avoid theme bleeding ── */
const BRAND_SAGE   = "#5A9B6A";
const MICHAEL_RED  = "#E84828";
const LINDSEY_PRP  = "#7B5EA7";

const PEOPLE = [
  { init: "S", name: "Sarah",   color: BRAND_SAGE  },
  { init: "M", name: "Michael", color: MICHAEL_RED },
  { init: "L", name: "Lindsey", color: LINDSEY_PRP },
];

/* ── Feature descriptions for the bottom bar ── */
const FEATURES = [
  { num: "01", title: "At a glance",            sub: "A snapshot of today's nutrition, meals, and this week's plan." },
  { num: "02", title: "Build your pantry",       sub: "USDA lookup or manual entry. A customized library of ingredients to build and optimize your recipes." },
  { num: "03", title: "Import or create recipes",sub: "Paste a URL, upload a file, or build from scratch. Nutrition calculates live." },
  { num: "04", title: "Optimize with AI",        sub: "Your desktop AI agent reads the recipe, suggests swaps, creates meal prep plans, and saves it all back automatically." },
  { num: "05", title: "Plan your week",          sub: "Add everyone in your household and each person gets their own plan and nutrition targets. One shared pantry and recipe library." },
  { num: "06", title: "Track the household",     sub: "See each person's 7-day plan side by side. Drag meals between days and watch nutrition totals update live." },
];

const TAB_LABELS = ["Dashboard", "Pantry", "Recipes", "Optimize", "Planner", "Household"];

const MOB_FEATURES = [
  { num: "01", title: "At a Glance",       sub: "A snapshot of today's nutrition, meals, and this week's plan." },
  { num: "02", title: "Build Your Pantry", sub: "USDA lookup or manual entry. A customized library of ingredients to build and optimize your recipes." },
  { num: "03", title: "Recipes",           sub: "Paste a URL, upload a file, or build from scratch. Nutrition calculates live." },
  { num: "04", title: "Optimize with AI",  sub: "Your desktop AI agent reads the recipe, suggests swaps, creates meal prep plans, and saves it all back automatically." },
  { num: "05", title: "Plan Your Week",    sub: "Weekly grid per person. Add meals, see daily totals, and hit your targets." },
  { num: "06", title: "Household",         sub: "See each person's plan, side by side. Everyone shares the recipe and pantry library." },
];

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

/** Looping scroll animation — scrolls down then back up, repeating while active */
function useLoopScroll(ref: React.RefObject<HTMLDivElement | null>, target: number, opts: {
  downMs?: number; pauseDownMs?: number; upMs?: number; pauseUpMs?: number; startDelayMs?: number;
} = {}, isActive?: boolean) {
  const { downMs = 2200, pauseDownMs = 1800, upMs = 1200, pauseUpMs = 1000, startDelayMs = 1000 } = opts;
  useEffect(() => {
    const el = ref.current;
    if (!el || !isActive) { if (el) el.scrollTop = 0; return; }
    let cancelled = false;
    const cycle = () => {
      if (cancelled) return;
      el.scrollTop = 0;
      const t1 = setTimeout(() => {
        if (cancelled) return;
        smoothScroll(el, target, downMs);
        const t2 = setTimeout(() => {
          if (cancelled) return;
          smoothScroll(el, 0, upMs);
          const t3 = setTimeout(() => { if (!cancelled) cycle(); }, upMs + pauseUpMs);
        }, downMs + pauseDownMs);
      }, startDelayMs);
      return () => { clearTimeout(t1); };
    };
    cycle();
    return () => { cancelled = true; };
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps
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
          borderBottom: link === active ? `2px solid ${BRAND_SAGE}` : "2px solid transparent",
          paddingBottom: 3, marginTop: 5, flexShrink: 0,
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
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", flexShrink: 0 }}>
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
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
  useLoopScroll(scrollRef, 220, { downMs: 2200, pauseDownMs: 2000, upMs: 2600, pauseUpMs: 800 }, isActive);

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
            Sarah
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid rgba(0,0,0,0.1)", borderBottom: "1px solid rgba(0,0,0,0.1)", paddingLeft: 8 }}>
          {[
            { label: "Calories", val: "1,023", sub: "of 2,000", pct: 51 },
            { label: "Carbs",    val: "65",    sub: "of 225 g",  pct: 29 },
            { label: "Protein",  val: "71",    sub: "of 95 g",   pct: 75 },
          ].map((s, i) => (
            <div key={s.label} style={{ padding: "14px 20px 12px", borderRight: i < 2 ? "1px solid rgba(0,0,0,0.1)" : "none" }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
            {meals.map((m, i) => (
              <div key={m.n}>
                <div style={{ padding: "10px 0 8px", borderBottom: "1px solid rgba(0,0,0,0.1)" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>
                    {m.n} · {m.type}
                  </div>
                </div>
                <div style={{ padding: "10px 14px 12px 0" }}>
                  <div style={{ fontFamily: "var(--display)", fontSize: 13, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.25, color: "var(--fg)", marginBottom: 10 }}>{m.name}</div>
                  {[["Calories", m.kcal], ["Carbs", `${m.carbs}g`], ["Protein", `${m.protein}g`]].map(([l, v]) => (
                    <div key={l as string} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>{l}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ fontFamily: "var(--mono)", fontSize: 7.5, textTransform: "uppercase", letterSpacing: "0.08em", color: BRAND_SAGE, marginTop: 8 }}>See recipe →</div>
                </div>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {weekDays.map((d, i) => (
              <div key={d.abbr} style={{
                borderRight: i < 6 ? "1px solid rgba(0,0,0,0.1)" : "none",
                background: d.num === 7 ? "rgba(90,155,106,0.07)" : "transparent",
              }}>
                <div style={{ padding: "7px 5px 5px", borderBottom: "1px solid rgba(0,0,0,0.1)" }}>
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
    { cat: "Produce",       name: "Avocado",            unit: "per 100g",      cal: "160",  fat: "15g",  satfat: "2.1g", sodium: "7mg",   carbs: "9g",  sugar: "1g",  protein: "2g",  fiber: "7g"  },
    { cat: "Legume",        name: "Black Beans",        unit: "per 100g",      cal: "132",  fat: "1g",   satfat: "0.2g", sodium: "5mg",   carbs: "24g", sugar: "0g",  protein: "9g",  fiber: "9g"  },
    { cat: "Produce",       name: "Broccoli",           unit: "per 100g",      cal: "34",   fat: "0g",   satfat: "0g",   sodium: "33mg",  carbs: "7g",  sugar: "2g",  protein: "3g",  fiber: "3g"  },
    { cat: "Protein",       name: "Chicken Breast",     unit: "per 100g",      cal: "165",  fat: "4g",   satfat: "1g",   sodium: "74mg",  carbs: "0g",  sugar: "0g",  protein: "31g", fiber: "0g"  },
    { cat: "Dairy & Eggs",  name: "Greek Yogurt",       unit: "per 100g",      cal: "97",   fat: "5g",   satfat: "3.2g", sodium: "36mg",  carbs: "4g",  sugar: "4g",  protein: "9g",  fiber: "0g"  },
    { cat: "Grain",         name: "Rolled Oats",        unit: "per 100g",      cal: "389",  fat: "7g",   satfat: "1.3g", sodium: "2mg",   carbs: "66g", sugar: "1g",  protein: "17g", fiber: "10g" },
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
              border: "1px solid transparent",
              color: active ? "var(--fg)" : "var(--muted)",
            }}>{label as string}</span>
          ))}
        </div>
        {/* Right-side controls */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--muted)" }}>156 items</span>
          {/* GRID / LIST toggle */}
          <div style={{ display: "flex", border: "1px solid var(--rule)", borderRadius: 9999, overflow: "hidden" }}>
            {[["Grid", true], ["List", false]].map(([v, on]) => (
              <span key={v as string} style={{
                fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em",
                padding: "3px 8px", background: on ? "var(--bg-2)" : "transparent",
                color: on ? "var(--fg)" : "var(--muted)",
              }}>{v as string}</span>
            ))}
          </div>
          <input disabled placeholder="Search…" style={{
            width: 120, fontFamily: "var(--sans)", fontSize: 10,
            border: "1px solid var(--rule)", background: "var(--bg)", color: "var(--muted)",
            padding: "3px 10px", outline: "none", borderRadius: 9999,
          }} />
          <span style={{
            fontFamily: "var(--mono)", fontSize: 7.5, textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "4px 10px", background: BRAND_SAGE, color: "white", borderRadius: 9999,
          }}>+ Add</span>
        </div>
      </div>

      {/* Card grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", alignContent: "start", flex: 1, overflow: "hidden" }}>
        {cards.map((c, idx) => (
          <div key={c.name} style={{
            borderRight: (idx % 4) < 3 ? "1px solid var(--rule)" : "none",
            borderBottom: "1px solid var(--rule)",
            padding: "12px 14px",
          }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 6.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(17,17,17,0.45)", marginBottom: 3 }}>{c.cat}</div>
            <div style={{ fontFamily: "var(--display)", fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15, color: "#111111", marginBottom: 3 }}>{c.name}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "rgba(17,17,17,0.45)", marginBottom: 8, letterSpacing: "0.01em" }}>{c.unit}</div>
            <div style={{ height: 1, background: "rgba(17,17,17,0.1)", marginBottom: 6 }} />
            {([["Calories", c.cal], ["Fat", c.fat], ["Saturated Fat", c.satfat], ["Sodium", c.sodium], ["Carbs", c.carbs], ["Sugar", c.sugar], ["Protein", c.protein], ["Fiber", c.fiber]] as [string, string][]).map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "2.5px 0", borderBottom: "1px solid rgba(17,17,17,0.08)" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(17,17,17,0.45)" }}>{l}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "#111111", fontVariantNumeric: "tabular-nums" }}>{v}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Screen 2 — Recipe Detail  (Black Bean Chili)
   Left sidebar jump nav · image header · ingredients + nutrition · instructions
   ───────────────────────────────────────────────────────────── */
const CHILI_SECTIONS = [
  { n: "01", l: "Ingredients" },
  { n: "02", l: "Nutrition"   },
  { n: "03", l: "Instructions"},
  { n: "04", l: "Optimize"    },
  { n: "05", l: "Meal Prep"   },
];

function RecipeDetailScreen({ isActive }: { isActive?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const ingNutRef = useRef<HTMLDivElement>(null);
  const instructionsRef = useRef<HTMLDivElement>(null);

  // Looping scroll animation
  useLoopScroll(scrollRef, 340, { downMs: 2200, pauseDownMs: 1800, upMs: 1400, pauseUpMs: 1000, startDelayMs: 1200 }, isActive);

  const ingredients = [
    { qty: "800 g",    name: "Black beans, drained & rinsed" },
    { qty: "400 g",    name: "Crushed tomatoes" },
    { qty: "1 med",    name: "Onion, diced" },
    { qty: "3 cloves", name: "Garlic, minced" },
    { qty: "1 med",    name: "Red bell pepper, diced" },
    { qty: "1 tbsp",   name: "Olive oil" },
    { qty: "2 tsp",    name: "Ground cumin" },
    { qty: "1 tsp",    name: "Smoked paprika" },
    { qty: "240 ml",   name: "Vegetable broth" },
    { qty: "1",        name: "Lime, juiced" },
  ];
  const nutrition = [
    { label: "Calories", val: "318", goal: "2000", unit: "",   pct: 16 },
    { label: "Protein",  val: "15",  goal: "95",   unit: "g",  pct: 16 },
    { label: "Fat",      val: "5",   goal: "75",   unit: "g",  pct: 7  },
    { label: "Carbs",    val: "54",  goal: "225",  unit: "g",  pct: 24 },
    { label: "Fiber",    val: "14",  goal: "22",   unit: "g",  pct: 64 },
    { label: "Sodium",   val: "580", goal: "2300", unit: "mg", pct: 25 },
  ];
  const steps = [
    "Heat olive oil in a large pot over medium. Add onion and bell pepper; cook 6 min until soft.",
    "Add garlic, cumin, smoked paprika, and chili powder. Stir 1 min until fragrant.",
    "Pour in crushed tomatoes and vegetable broth. Stir to combine and bring to a simmer.",
    "Add drained black beans. Stir well to incorporate.",
    "Simmer uncovered 25–30 min, stirring occasionally, until chili has thickened.",
    "Remove from heat. Squeeze in lime juice and adjust seasoning with salt to taste.",
    "Serve topped with fresh cilantro, avocado slices, or a spoonful of Greek yogurt.",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <MiniNav active="Recipes" />

      {/* Body: floating sidebar + scrollable content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left sidebar — inline number + label, compact */}
        <div style={{ width: 96, flexShrink: 0, padding: "14px 0 0", display: "flex", flexDirection: "column" }}>
          {CHILI_SECTIONS.map((s, i) => (
            <div key={s.l} style={{
              padding: "6px 14px 6px 16px",
              display: "flex", alignItems: "center", gap: 7,
              fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.07em",
              color: "var(--muted)",
              borderBottom: i < CHILI_SECTIONS.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
            }}>
              <span style={{ color: "rgba(0,0,0,0.25)", fontFamily: "var(--mono)", fontSize: 7.5, fontWeight: 700, flexShrink: 0 }}>{s.n}</span>
              {s.l}
            </div>
          ))}
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "scroll", scrollbarWidth: "none", paddingLeft: 28, paddingRight: 28, position: "relative" }}>

          {/* Hero: title left + image right — image aligns with nutrition column */}
          <div style={{ display: "flex", alignItems: "stretch" }}>
            <div style={{ flex: 1, padding: "20px 12px 12px 0" }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 7, flexWrap: "wrap" }}>
                {["Dinner"].map(tag => (
                  <span key={tag} style={{
                    fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase", letterSpacing: "0.1em",
                    padding: "2px 8px", background: "var(--bg-2)", color: "var(--muted)", borderRadius: 9999,
                  }}>{tag}</span>
                ))}
              </div>
              <div style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--fg)", marginBottom: 5 }}>
                Black Bean Chili
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--muted)", marginBottom: 10 }}>
                4 servings · 20 min prep · 35 min cook
              </div>
              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                {["Edit", "Duplicate"].map(btn => (
                  <span key={btn} style={{
                    fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase", letterSpacing: "0.08em",
                    padding: "3px 9px", border: "1px solid rgba(0,0,0,0.18)", color: "var(--fg-2)", borderRadius: 9999,
                  }}>{btn}</span>
                ))}
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase", letterSpacing: "0.08em",
                  padding: "3px 9px", border: `1px solid rgba(232,72,40,0.35)`, color: MICHAEL_RED, borderRadius: 9999,
                }}>Delete</span>
                <span style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1 }}>♡</span>
              </div>
            </div>
            <div style={{ flex: 1, padding: "20px 0 10px 24px", display: "flex", alignItems: "flex-start" }}>
              <img src="/chili.png" alt="Black Bean Chili" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 0, display: "block" }} />
            </div>
          </div>

          {/* 01 Ingredients + 02 Nutrition side by side — no outer borders, no vertical divider */}
          <div ref={ingNutRef} style={{ display: "flex", padding: "14px 0 14px 0" }}>
            {/* Ingredients column */}
            <div style={{ flex: 1, paddingRight: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--muted)", flexShrink: 0 }}>01</span>
                <span style={{ fontFamily: "var(--display)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--fg)", flexShrink: 0 }}>Ingredients</span>
                <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.09)" }} />
              </div>
              {ingredients.map(ing => (
                <div key={ing.name} style={{ display: "flex", gap: 8, padding: "3.5px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--muted)", minWidth: 34, flexShrink: 0, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{ing.qty}</span>
                  <span style={{ fontSize: 9, lineHeight: 1.45, color: "var(--fg)" }}>{ing.name}</span>
                </div>
              ))}
            </div>
            {/* Nutrition column */}
            <div style={{ flex: 1, paddingLeft: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--muted)", flexShrink: 0 }}>02</span>
                <span style={{ fontFamily: "var(--display)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--fg)", flexShrink: 0 }}>Nutrition</span>
                <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.09)" }} />
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 6 }}>Per serving · vs goals</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-end" }}>
                <div>
                  <div style={{ fontFamily: "var(--display)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 }}>318</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase", color: "var(--muted)" }}>kcal</div>
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--muted)", paddingBottom: 2 }}>of 2,000</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {nutrition.map(n => (
                  <div key={n.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 1 }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-2)" }}>{n.label}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>
                        {n.val}{n.unit}<span style={{ fontSize: 6.5, color: "var(--muted)" }}> / {n.goal}{n.unit}</span>
                      </span>
                    </div>
                    <NutBar pct={n.pct} warn={n.pct > 85} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 03 Instructions */}
          <div ref={instructionsRef} style={{ padding: "16px 0 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--muted)", flexShrink: 0 }}>03</span>
              <span style={{ fontFamily: "var(--display)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--fg)", flexShrink: 0 }}>Instructions</span>
              <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.09)" }} />
            </div>
            {steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                <span style={{ fontFamily: "var(--display)", fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.18)", flexShrink: 0, minWidth: 18, lineHeight: 1.6 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ fontSize: 9.5, lineHeight: 1.6, color: "var(--fg-2)" }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Screen 3 — Optimize  (Black Bean Chili, 04 Optimize active)
   Left sidebar nav · optimization notes + table · meal prep table
   ───────────────────────────────────────────────────────────── */
function AIOptimizeScreen() {
  const messages = [
    { role: "user", text: "Optimize Black Bean Chili for higher protein and lower fat." },
    { role: "tool", name: "get_recipe", args: 'id: "black-bean-chili"', done: true },
    { role: "tool", name: "search_ingredients", args: 'query: "high protein swap olive oil"', done: true },
    { role: "assistant", text: "I found 3 optimizations for your Black Bean Chili:", swaps: [
      { from: "1 tbsp olive oil", to: "½ tbsp", delta: "−60 kcal, −7g fat" },
      { from: "Regular beans", to: "Low-sodium beans", delta: "−180mg sodium" },
      { from: "No topping", to: "+ Greek yogurt", delta: "+17 kcal, +3g protein" },
    ]},
    { role: "tool", name: "save_optimization_notes", args: 'recipe_id: "black-bean-chili"', done: true },
    { role: "assistant", text: "Changes saved to Good Measure. Your recipe is updated." },
  ];

  const BG = "#1C1C1E";
  const SURFACE = "#2C2C2E";
  const BORDER = "rgba(255,255,255,0.08)";
  const MUTED = "rgba(255,255,255,0.4)";
  const TEXT = "rgba(255,255,255,0.88)";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: BG, overflow: "hidden" }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "scroll", scrollbarWidth: "none", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((m, i) => {
          if (m.role === "user") return (
            <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ background: "#3A3A3C", borderRadius: "12px 12px 3px 12px", padding: "7px 11px", maxWidth: "80%", fontFamily: "var(--sans)", fontSize: 10, color: TEXT, lineHeight: 1.5 }}>
                {m.text}
              </div>
            </div>
          );
          if (m.role === "tool") return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 10px", background: SURFACE, borderRadius: 6, border: `1px solid ${BORDER}` }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: m.done ? BRAND_SAGE : MUTED, flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: TEXT, letterSpacing: "0.01em" }}>{m.name}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, color: MUTED, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.args}</span>
              {m.done && <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: BRAND_SAGE, flexShrink: 0 }}>done</span>}
            </div>
          );
          if (m.role === "assistant") return (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: SURFACE, border: `1px solid ${BORDER}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 9 }}>✦</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--sans)", fontSize: 10, color: TEXT, lineHeight: 1.55, marginBottom: m.swaps ? 6 : 0 }}>{m.text}</div>
                {m.swaps && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {m.swaps.map((s, si) => (
                      <div key={si} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "5px 8px" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: MUTED, textDecoration: "line-through" }}>{s.from}</span>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: MUTED }}>→</span>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: BRAND_SAGE }}>{s.to}</span>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, color: MUTED, marginLeft: "auto" }}>{s.delta}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
          return null;
        })}
      </div>

      {/* Input bar */}
      <div style={{ padding: "8px 14px 10px", borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: SURFACE, borderRadius: 8, padding: "6px 10px", border: `1px solid ${BORDER}` }}>
          <span style={{ fontFamily: "var(--sans)", fontSize: 9.5, color: MUTED, flex: 1 }}>Ask about your recipes…</span>
          <div style={{ width: 18, height: 18, borderRadius: "50%", background: BRAND_SAGE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 9, color: "white" }}>↑</span>
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
    let cancelled = false;
    const cycle = () => {
      if (cancelled) return;
      setPanelOpen(false);
      const t1 = setTimeout(() => {
        if (cancelled) return;
        setPanelOpen(true);
        const t2 = setTimeout(() => {
          if (cancelled) return;
          setPanelOpen(false);
          const t3 = setTimeout(() => { if (!cancelled) cycle(); }, 1800);
        }, 5000);
      }, 1600);
    };
    cycle();
    return () => { cancelled = true; setPanelOpen(false); };
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
        display: "flex", alignItems: "center", gap: 5,
        padding: "0 12px", height: 32, borderBottom: "1px solid var(--rule)", flexShrink: 0, flexWrap: "nowrap",
      }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, color: "var(--fg-2)", letterSpacing: "0.04em", flexShrink: 0 }}>Apr 5–11</span>
        {["‹ Prev", "Next ›", "This Week"].map(b => (
          <span key={b} style={{
            fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "1.5px 6px", border: "1px solid var(--rule)", borderRadius: 9999, color: "var(--muted)", flexShrink: 0,
          }}>{b}</span>
        ))}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", flexShrink: 0 }}>
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "2px 8px", background: BRAND_SAGE, color: "white", borderRadius: 9999,
          }}>+ New Plan</span>
          {["Edit", "‹ Nutrition"].map(b => (
            <span key={b} style={{
              fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "1.5px 6px", border: "1px solid var(--rule)", borderRadius: 9999,
              color: b === "‹ Nutrition" && panelOpen ? "var(--fg)" : "var(--muted)",
              background: b === "‹ Nutrition" && panelOpen ? "var(--bg-2)" : "transparent",
            }}>{b}</span>
          ))}
          {["Sarah", "Michael", "Everyone"].map(p => (
            <span key={p} style={{
              fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "1.5px 6px",
              border: p === "Sarah" ? `1px solid var(--fg)` : "1px solid var(--rule)",
              borderRadius: 9999, color: p === "Sarah" ? "var(--fg)" : "var(--muted)",
            }}>{p}</span>
          ))}
        </div>
      </div>

      {/* Grid + optional nutrition panel */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Week grid */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", overflowY: "scroll", scrollbarWidth: "none", paddingLeft: 8 }}>
          {days.map((day, i) => (
            <div key={day.abbr} style={{
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
          transition: `width ${panelOpen ? "800ms" : "1200ms"} cubic-bezier(0.23, 1, 0.32, 1)`,
          overflow: "hidden", flexShrink: 0,
          borderLeft: panelOpen ? "1px solid var(--rule)" : "none", background: "var(--bg)",
        }}>
          <div style={{ width: 230, padding: "14px 16px", overflowY: "scroll", scrollbarWidth: "none", height: "100%" }}>
            {/* Date + person inline */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontFamily: "var(--display)", fontSize: 13, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--fg)" }}>Sunday, Apr 5</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: BRAND_SAGE, flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>Sarah</span>
              </div>
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
            {/* Warnings */}
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 5 }}>
              {[
                "Saturated fat near limit",
                "Sodium 83% of daily goal",
                "Fiber close to exceeding",
              ].map(w => (
                <div key={w} style={{
                  padding: "5px 8px", borderRadius: 3,
                  background: "rgba(196,92,58,0.08)", border: "1px solid rgba(196,92,58,0.18)",
                  fontFamily: "var(--mono)", fontSize: 7, color: "#C45C3A", letterSpacing: "0.04em",
                }}>⚠ {w}</div>
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
   Person-row grid: day headers + Sarah / Michael / Lindsey rows
   ───────────────────────────────────────────────────────────── */

/* Animated wrapper: PlannerScreen (with nutrition panel) → crossfade → EveryoneScreen → loop
   Timing:
     0ms        — grid visible, panel closed
     1600ms     — nutrition panel opens
     6600ms     — nutrition panel closes
     8400ms     — panel fully settled; stop planner cycle, start crossfade to Everyone
     ~9200ms    — Everyone fully visible (800ms fade)
     13700ms    — fade back to Planner
     ~14500ms   — Planner visible, restart
*/
function PlannerCycleScreen({ isActive }: { isActive?: boolean }) {
  const [showEveryone, setShowEveryone] = useState(false);
  const [everyoneMounted, setEveryoneMounted] = useState(false);
  const [plannerActive, setPlannerActive] = useState(false);

  useEffect(() => {
    if (!isActive) {
      // Reset everything when section leaves view
      setShowEveryone(false);
      setEveryoneMounted(false);
      setPlannerActive(false);
      return;
    }

    let cancelled = false;
    // One full PlannerScreen panel cycle: 1600 open-delay + 5000 open + 1800 close-delay = 8400ms
    const PLANNER_MS   = 8400;
    const FADE_MS      = 800;
    const EVERYONE_MS  = 4500;

    const runCycle = () => {
      if (cancelled) return;
      setPlannerActive(true);
      setShowEveryone(false);
      setEveryoneMounted(false);

      // Mount Everyone layer just before we need it
      const tMount = setTimeout(() => {
        if (!cancelled) setEveryoneMounted(true);
      }, PLANNER_MS - 100);

      // At exactly one planner cycle: stop planner animation, start crossfade
      const tFade = setTimeout(() => {
        if (cancelled) return;
        setPlannerActive(false); // prevent second panel-open
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (!cancelled) setShowEveryone(true);
        }));

        // After Everyone has been shown, fade back to Planner
        const tReturn = setTimeout(() => {
          if (cancelled) return;
          setShowEveryone(false);
          setTimeout(() => {
            if (!cancelled) { setEveryoneMounted(false); runCycle(); }
          }, FADE_MS);
        }, EVERYONE_MS);
      }, PLANNER_MS);

      return () => { clearTimeout(tMount); clearTimeout(tFade); };
    };

    runCycle();
    return () => { cancelled = true; };
  }, [isActive]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Planner layer */}
      <div style={{
        position: "absolute", inset: 0,
        opacity: showEveryone ? 0 : 1,
        transition: "opacity 800ms ease",
        pointerEvents: showEveryone ? "none" : "auto",
      }}>
        <PlannerScreen isActive={plannerActive} />
      </div>
      {/* Everyone layer — only mounted when needed */}
      {everyoneMounted && (
        <div style={{
          position: "absolute", inset: 0,
          opacity: showEveryone ? 1 : 0,
          transition: "opacity 800ms ease",
          pointerEvents: showEveryone ? "auto" : "none",
        }}>
          <EveryoneScreen />
        </div>
      )}
    </div>
  );
}

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
    { name: "Sarah",   color: BRAND_SAGE,  week: [
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
      [{ t:"B", n:"Granola Bowl" }, { t:"L", n:"Noodle Soup" }, { t:"D", n:"Veggie Curry" }],
      [{ t:"B", n:"Granola Bowl" }, { t:"L", n:"Noodle Soup" }, { t:"D", n:"Pasta" }],
      [{ t:"B", n:"Granola Bowl" }, { t:"L", n:"Side Salad" }, { t:"D", n:"Stir Fry" }],
      [{ t:"L", n:"Noodle Soup" }, { t:"D", n:"Grain Bowl" }],
      [{ t:"B", n:"Yogurt" }, { t:"L", n:"Side Salad" }, { t:"D", n:"Lentil Soup" }],
      [{ t:"B", n:"Brunch" }, { t:"L", n:"Greek Salad" }],
      [{ t:"D", n:"Tacos" }],
    ]},
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <MiniNav active="Planner" />

      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "0 16px", height: 38, borderBottom: "1px solid var(--rule)", flexShrink: 0,
      }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--fg-2)", letterSpacing: "0.04em" }}>Apr 5–11</span>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em",
          padding: "3px 9px", border: "1px solid var(--rule)", borderRadius: 9999, color: "var(--muted)",
        }}>This Week</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", flexShrink: 0 }}>
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "4px 10px", background: BRAND_SAGE, color: "white", borderRadius: 9999,
          }}>+ New Plan</span>
          {["Sarah", "Michael", "Lindsey"].map(p => (
            <span key={p} style={{
              fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "3px 7px", border: "1px solid var(--rule)", borderRadius: 9999, color: "var(--muted)",
            }}>{p}</span>
          ))}
          <span style={{
            fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "3px 9px", border: "1px solid var(--fg)", borderRadius: 9999,
            color: "var(--fg)",
          }}>Everyone</span>
        </div>
      </div>

      {/* Day header row + person rows */}
      <div style={{ flex: 1, overflowY: "scroll", scrollbarWidth: "none" }}>
        {/* Day header */}
        <div style={{ position: "sticky", top: 0, background: "var(--bg)", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "72px repeat(7, 1fr)" }}>
            <div style={{ padding: "8px 10px" }} />
            {days.map((d, i) => (
              <div key={d.abbr} style={{
                padding: "8px 8px 6px",
                background: d.today ? "rgba(90,155,106,0.05)" : "transparent",
              }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.1em", color: d.today ? BRAND_SAGE : "var(--muted)" }}>{d.abbr}</div>
                <div style={{ fontFamily: "var(--display)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", color: d.today ? BRAND_SAGE : "var(--fg-2)", lineHeight: 1, marginTop: 1 }}>{d.num}</div>
              </div>
            ))}
          </div>
          <div style={{ margin: "0 16px", borderBottom: "1px solid var(--rule)" }} />
        </div>

        {/* Person rows */}
        {personRows.map((person, ri) => (
          <div key={person.name}>
            <div style={{
              display: "grid", gridTemplateColumns: "72px repeat(7, 1fr)",
            }}>
              {/* Person label */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 5, padding: "10px 10px 10px 20px" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: person.color, flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-2)", lineHeight: 1.4 }}>{person.name}</span>
              </div>
              {/* Day cells */}
              {person.week.map((dayMeals, di) => (
                <div key={di} style={{
                  padding: di === 6 ? "8px 14px 8px 6px" : "8px 6px",
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
            {ri < personRows.length - 1 && (
              <div style={{ margin: "0 16px", borderBottom: "1px solid var(--rule)" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Mobile phone demo — placeholder screens
   ───────────────────────────────────────────────────────────── */

function MobMiniNav({ active }: { active: string }) {
  return (
    <div style={{ height: 32, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", flexShrink: 0, background: "var(--bg)", position: "relative", zIndex: 1 }}>
      <span style={{ fontFamily: "var(--display)", fontSize: 11, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--fg)" }}>Good Measure</span>
      <span style={{ fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: BRAND_SAGE, borderBottom: `1.5px solid ${BRAND_SAGE}`, paddingBottom: 2 }}>{active}</span>
    </div>
  );
}

function MobScreenDash() {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const t = setTimeout(() => smoothScroll(el, 600, 3200), 1300);
    return () => clearTimeout(t);
  }, []);

  const stats = [
    { label: "Calories", val: "1,023", of: "2,000", unit: "",  pct: 51 },
    { label: "Carbs",    val: "65",    of: "225",   unit: "g", pct: 29 },
    { label: "Protein",  val: "71",    of: "95",    unit: "g", pct: 75 },
  ];
  const meals = [
    { num: "01", type: "Breakfast", name: "Cottage Cheese Bowl", kcal: "298", carbs: "14g", protein: "32g" },
    { num: "02", type: "Lunch",     name: "Salmon Salad",         kcal: "454", carbs: "16g", protein: "28g" },
    { num: "03", type: "Dinner",    name: "Thai Green Curry",     kcal: "390", carbs: "38g", protein: "22g" },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>
      {/* Top nav */}
      <div style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", flexShrink: 0 }}>
        <span style={{ fontFamily: "var(--display)", fontSize: 11, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--fg)" }}>Good Measure</span>
        <div style={{ display: "flex", gap: 4 }}>
          {PEOPLE.map((p, i) => (
            <span key={p.name} style={{
              fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase" as const, letterSpacing: "0.08em",
              padding: "2px 7px", borderRadius: 9999,
              border: i === 0 ? `1.5px solid ${p.color}` : "none",
              color: i === 0 ? p.color : "var(--muted)",
              background: i === 0 ? "transparent" : "var(--bg-2)",
              display: "flex", alignItems: "center", gap: 3,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
              {p.init}
            </span>
          ))}
        </div>
      </div>
      {/* Scrollable content */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "scroll", scrollbarWidth: "none" as const }}>
        {/* Greeting */}
        <div style={{ padding: "16px 12px 12px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 8 }}>Tuesday, April 7, 2026</div>
          <div style={{ fontFamily: "var(--display)", fontSize: 28, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.05, color: "var(--fg)" }}>
            Good evening,<br />
            <span style={{ color: BRAND_SAGE }}>Sarah</span>
          </div>
        </div>
        {/* Stats */}
        {stats.map((s, i) => (
          <div key={i} style={{ padding: "10px 12px 0" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--muted)" }}>{s.label}</div>
            <div style={{ fontFamily: "var(--display)", fontSize: 26, fontWeight: 700, letterSpacing: "-0.04em", color: "var(--fg)", lineHeight: 1.1 }}>
              {s.val}<span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>{s.unit}</span>
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 6.5, color: "var(--muted)", marginBottom: 5 }}>of {s.of}{s.unit ? " " + s.unit : ""}</div>
            <NutBar pct={s.pct} />
          </div>
        ))}
        {/* Meals header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 12px 6px" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--muted)" }}>Today's Key Meals</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 6.5, color: BRAND_SAGE, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Open Planner →</span>
        </div>
        {/* Meal cards */}
        {meals.map((m, i) => (
          <div key={i} style={{ padding: "10px 12px 10px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 4 }}>{m.num} · {m.type}</div>
            <div style={{ fontFamily: "var(--display)", fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--fg)", marginBottom: 8 }}>{m.name}</div>
            {[["Calories", m.kcal], ["Carbs", m.carbs], ["Protein", m.protein]].map(([label, val], j) => (
              <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderTop: "1px solid var(--rule)" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--muted)" }}>{label}</span>
                <span style={{ fontFamily: "var(--display)", fontSize: 11, fontWeight: 700, color: "var(--fg)" }}>{val}</span>
              </div>
            ))}
            <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: BRAND_SAGE, marginTop: 7, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>See Recipe →</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobScreenPantry() {
  const items = [
    "Almond Butter", "Almond Flour", "Avocado",
    "Black Beans", "Broccoli", "Chicken Breast",
    "Greek Yogurt", "Rolled Oats",
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>
      {/* Search bar */}
      <div style={{ padding: "8px 12px 8px", flexShrink: 0, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 1px 6px rgba(0,0,0,0.07)", position: "relative", zIndex: 1, background: "var(--bg)" }}>
        <div style={{ flex: 1, borderRadius: 20, padding: "7px 12px", display: "flex", alignItems: "center", gap: 7, border: "1px solid var(--rule)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--fg-2)", flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <span style={{ fontFamily: "var(--sans)", fontSize: 10, color: "var(--muted)" }}>Search pantry…</span>
        </div>
        <div style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid var(--rule)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--muted)" }}><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
        </div>
      </div>
      {/* Ingredient list */}
      <div style={{ flex: 1, overflowY: "scroll", scrollbarWidth: "none" }}>
        {items.map((name, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", padding: "10px 12px", borderBottom: i < items.length - 1 ? "1px solid var(--rule)" : "none" }}>
            <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.01em" }}>{name}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid var(--rule)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--muted)" }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </div>
              <div style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid var(--rule)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--muted)" }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobScreenRecipes() {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const t = setTimeout(() => smoothScroll(el, 1300, 8200), 1100);
    return () => clearTimeout(t);
  }, []);

  const ingredients = [
    { qty: "800 g",    name: "Black beans, drained" },
    { qty: "400 g",    name: "Crushed tomatoes" },
    { qty: "1 med",    name: "Onion, diced" },
    { qty: "3 cloves", name: "Garlic, minced" },
    { qty: "1 med",    name: "Red bell pepper, diced" },
    { qty: "1 tbsp",   name: "Olive oil" },
    { qty: "2 tsp",    name: "Ground cumin" },
    { qty: "1 tsp",    name: "Smoked paprika" },
    { qty: "240 ml",   name: "Vegetable broth" },
    { qty: "1",        name: "Lime, juiced" },
  ];
  const nutrition: [string, string, string, string, number][] = [
    ["Calories", "318", "2000", "",   16],
    ["Fat",      "5",   "75",   "g",  7 ],
    ["Sat Fat",  "1",   "18",   "g",  6 ],
    ["Sodium",   "580", "2300", "mg", 25],
    ["Carbs",    "54",  "225",  "g",  24],
    ["Sugar",    "4",   "25",   "g",  16],
    ["Protein",  "15",  "95",   "g",  16],
    ["Fiber",    "14",  "22",   "g",  64],
  ];
  const steps = [
    "Heat olive oil in a large pot over medium. Add onion and bell pepper; cook 6 min until soft.",
    "Add garlic, cumin, smoked paprika, and chili powder. Stir 1 min until fragrant.",
    "Pour in crushed tomatoes and vegetable broth. Stir to combine and bring to a simmer.",
    "Add drained black beans. Stir well to incorporate.",
    "Simmer uncovered 25–30 min, stirring occasionally, until thickened.",
    "Remove from heat. Squeeze in lime juice and adjust seasoning to taste.",
    "Serve topped with fresh cilantro, avocado slices, or Greek yogurt.",
  ];

  const sectionHead = (n: string, label: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--muted)", flexShrink: 0 }}>{n}</span>
      <span style={{ fontFamily: "var(--display)", fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--fg)", flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.09)" }} />
    </div>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "scroll", scrollbarWidth: "none" as const }}>

        {/* Hero image */}
        <img src="/chili.png" alt="Black Bean Chili" style={{ width: "100%", height: 140, objectFit: "cover", display: "block", flexShrink: 0 }} />

        {/* Tags */}
        <div style={{ display: "flex", gap: 5, padding: "10px 12px 5px", flexWrap: "wrap" as const }}>
          {["Dinner"].map(tag => (
            <span key={tag} style={{ fontFamily: "var(--mono)", fontSize: 6, textTransform: "uppercase" as const, letterSpacing: "0.08em", padding: "2px 8px", background: "rgba(0,0,0,0.07)", borderRadius: 9999, color: "var(--muted)" }}>{tag}</span>
          ))}
        </div>

        {/* Title + meta */}
        <div style={{ padding: "4px 12px 10px" }}>
          <div style={{ fontFamily: "var(--display)", fontSize: 21, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05, color: "var(--fg)", marginBottom: 5 }}>Black Bean Chili</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase" as const, letterSpacing: "0.09em", color: "var(--muted)", marginBottom: 10 }}>4 Servings · 20 min prep · 35 min cook</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {["Edit", "Duplicate"].map(btn => (
              <span key={btn} style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase" as const, letterSpacing: "0.06em", padding: "4px 10px", border: "1px solid var(--rule)", borderRadius: 9999, color: "var(--fg-2)" }}>{btn}</span>
            ))}
            <span style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase" as const, letterSpacing: "0.06em", padding: "4px 10px", border: "1px solid rgba(232,72,40,0.4)", borderRadius: 9999, color: MICHAEL_RED }}>Delete</span>
            <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: 3, lineHeight: 1 }}>♡</span>
          </div>
        </div>

        {/* 01 Ingredients */}
        <div style={{ padding: "12px 12px 0" }}>
          {sectionHead("01", "Ingredients")}
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--muted)" }}>Scale</span>
            {["1×", "2×", "4×", "6×"].map((s, i) => (
              <span key={s} style={{ fontFamily: "var(--mono)", fontSize: 7, padding: "3px 9px", borderRadius: 9999, background: i === 0 ? MICHAEL_RED : "transparent", border: i === 0 ? "none" : "1px solid var(--rule)", color: i === 0 ? "#fff" : "var(--fg-2)" }}>{s}</span>
            ))}
          </div>
          {ingredients.map((ing, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--rule)", alignItems: "baseline" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, color: "var(--muted)", minWidth: 46, flexShrink: 0, textAlign: "right" as const }}>{ing.qty}</span>
              <span style={{ fontSize: 11, color: "var(--fg)" }}>{ing.name}</span>
            </div>
          ))}
        </div>

        {/* 02 Nutrition */}
        <div style={{ padding: "14px 12px 0" }}>
          {sectionHead("02", "Nutrition")}
          <div style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase" as const, letterSpacing: "0.09em", color: "var(--muted)", marginBottom: 10 }}>Per Serving · vs Goals</div>
          {nutrition.map(([label, val, goal, unit, pct]) => (
            <div key={label} style={{ marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--muted)" }}>{label}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, color: "var(--fg)" }}>
                  {val}{unit}<span style={{ fontSize: 7, color: "var(--muted)" }}> / {goal}{unit}</span>
                </span>
              </div>
              <NutBar pct={pct} warn={pct > 85} />
            </div>
          ))}
        </div>

        {/* 03 Instructions */}
        <div style={{ padding: "14px 12px 0" }}>
          {sectionHead("03", "Instructions")}
          {steps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: i < steps.length - 1 ? "1px solid var(--rule)" : "none" }}>
              <span style={{ fontFamily: "var(--display)", fontSize: 15, fontWeight: 700, color: "rgba(0,0,0,0.15)", flexShrink: 0, lineHeight: 1.55, minWidth: 22 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ fontSize: 10, lineHeight: 1.65, color: "var(--fg-2)" }}>{step}</span>
            </div>
          ))}
        </div>

        {/* 04 Optimization */}
        <div style={{ padding: "14px 12px 0" }}>
          {sectionHead("04", "Optimization")}
          <div style={{ padding: "12px 14px", background: "var(--bg-2)", borderRadius: 6, fontSize: 10, lineHeight: 1.65, color: "var(--muted)" }}>
            This feature requires Claude Desktop on a Mac or PC. Notes you generate there will appear here automatically.
          </div>
        </div>

        {/* 05 Meal Prep */}
        <div style={{ padding: "14px 12px 28px" }}>
          {sectionHead("05", "Meal Prep")}
          <div style={{ padding: "12px 14px", background: "var(--bg-2)", borderRadius: 6, fontSize: 10, lineHeight: 1.65, color: "var(--muted)" }}>
            This feature requires Claude Desktop on a Mac or PC. Notes you generate there will appear here automatically.
          </div>
        </div>

      </div>
    </div>
  );
}

function MobScreenOptimize() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>
      <MobMiniNav active="Recipes" />
      <div style={{ height: 72, background: "#C07018", opacity: 0.18, flexShrink: 0 }} />
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
        <div style={{ fontFamily: "var(--display)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--fg)" }}>Curried Lentils</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--muted)", marginTop: 2 }}>271 kcal · 14g protein · 42g carbs</div>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {["Red lentils · 1 cup", "Coconut milk · 400 ml", "Curry powder · 2 tsp", "Spinach · 2 cups"].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid var(--rule)" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--muted)", flexShrink: 0 }} />
            <span style={{ fontSize: 9.5, color: "var(--fg)" }}>{item}</span>
          </div>
        ))}
      </div>
      <div style={{ background: BRAND_SAGE, padding: "10px 12px", flexShrink: 0 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "rgba(255,255,255,0.7)", marginBottom: 3 }}>AI Optimize</div>
        <div style={{ fontSize: 10, color: "#fff", lineHeight: 1.4 }}>3 suggestions to reduce sodium and boost fiber</div>
      </div>
    </div>
  );
}

function MobScreenPlanner() {
  const ACCENT = BRAND_SAGE;
  const days = [
    { abbr: "SU", num: 5 }, { abbr: "MO", num: 6 }, { abbr: "TU", num: 7, active: true },
    { abbr: "WE", num: 8 }, { abbr: "TH", num: 9 }, { abbr: "FR", num: 10 }, { abbr: "SA", num: 11 },
  ];
  const meals = [
    { type: "Breakfast", name: "Cottage Cheese Bowl",  kcal: "298 kcal" },
    { type: "Lunch",     name: "Salmon Salad",          kcal: "454 kcal" },
    { type: "Dinner",    name: "Thai Green Curry",      kcal: "390 kcal" },
  ];
  const nutRows: [string, string, number][] = [
    ["Fat", "58g", 77], ["Saturated Fat", "12g", 80],
    ["Sodium", "890mg", 39], ["Carbs", "65g", 29],
    ["Sugar", "18g", 72],   ["Protein", "71g", 75],
    ["Fiber", "19g", 86],
  ];

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMounted, setSheetMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightEveryone, setHighlightEveryone] = useState(false);

  useEffect(() => {
    const ts = [
      setTimeout(() => { setSheetMounted(true); requestAnimationFrame(() => requestAnimationFrame(() => setSheetOpen(true))); }, 2000),
      setTimeout(() => setSheetOpen(false), 5500),
      setTimeout(() => setSheetMounted(false), 6000),
      setTimeout(() => setDropdownOpen(true), 6900),
      setTimeout(() => setHighlightEveryone(true), 8100),
      // Close dropdown at exactly when fade-out begins (MOB_SCREEN_DURATIONS[4] - MOB_FADE_OUT_MS[4] = 9700 - 900 = 8800)
      setTimeout(() => setDropdownOpen(false), 8800),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden", position: "relative" }}>
      {/* Toolbar — layout shifts to match everyone screen when person=Everyone (prevents jog on transition) */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", flexShrink: 0, background: "var(--bg)", position: "relative", zIndex: 1 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, fontWeight: 700, color: "var(--fg)", letterSpacing: "0.04em", flexShrink: 0 }}>Apr 5–11</span>
        {/* Planner always shows Jen layout — fades out before ever switching, no jog */}
        <>
            {["‹ Prev", "Next ›"].map(b => (
              <span key={b} style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase" as const, letterSpacing: "0.06em", padding: "3px 8px", background: "rgba(0,0,0,0.05)", borderRadius: 9999, color: "var(--fg-2)", flexShrink: 0 }}>{b}</span>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 4, alignItems: "center" }}>
              {([
                <svg key="c" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--fg-2)" }}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
                <svg key="g" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--fg-2)" }}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
              ] as React.ReactNode[]).map((icon, i) => (
                <div key={i} style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
              ))}
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 6px 3px 5px", borderRadius: 9999, border: "1px solid var(--rule)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--fg)" }}>Sarah</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 6, color: "var(--muted)" }}>▼</span>
                </div>
                {dropdownOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 3px)", right: 0, background: "var(--bg)", borderRadius: 10, overflow: "hidden", minWidth: 120, boxShadow: "0 4px 24px rgba(0,0,0,0.14), 0 1px 6px rgba(0,0,0,0.06)", zIndex: 10, animation: "lp-dropdown-in 0.45s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                    {([["Sarah", BRAND_SAGE], ["Michael", MICHAEL_RED], ["Lindsey", LINDSEY_PRP], ["Everyone", "#888"]] as [string, string][]).map(([name, color], i, arr) => (
                      <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderBottom: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none", background: name === "Everyone" && highlightEveryone ? "rgba(0,0,0,0.05)" : "transparent", transition: "background 0.2s ease" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                        <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--fg)" }}>{name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
        </>
      </div>

      {/* Week strip */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.06)", flexShrink: 0 }}>
        {days.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "5px 2px 4px" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 6, textTransform: "uppercase" as const, color: d.active ? ACCENT : "var(--muted)" }}>{d.abbr}</span>
            <span style={{ fontFamily: "var(--display)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.03em", color: d.active ? ACCENT : "var(--fg-2)", lineHeight: 1.2 }}>{d.num}</span>
            {d.active && <div style={{ width: 10, height: 2, borderRadius: 9999, background: ACCENT, marginTop: 2 }} />}
          </div>
        ))}
      </div>

      {/* Day content */}
      <div style={{ flex: 1, overflowY: "scroll", scrollbarWidth: "none" as const }}>
        <div style={{ padding: "10px 14px 6px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: ACCENT, marginBottom: 2 }}>Tuesday</div>
          <div style={{ fontFamily: "var(--display)", fontSize: 30, fontWeight: 700, letterSpacing: "-0.04em", color: ACCENT, lineHeight: 1 }}>7</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--muted)", margin: "4px 0 5px" }}>1,142 kcal</div>
          <NutBar pct={57} />
        </div>
        {meals.map((m, i) => (
          <div key={i} style={{ padding: "10px 14px 2px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 3 }}>{m.type}</div>
            <div style={{ fontFamily: "var(--display)", fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--fg)", marginBottom: 1 }}>{m.name}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--muted)" }}>{m.kcal}</div>
          </div>
        ))}
        <div style={{ padding: "12px 14px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", border: "1px solid var(--rule)", borderRadius: 9999 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--muted)" }}>+ Add</span>
          </div>
        </div>
      </div>

      {/* Scrim */}
      {sheetMounted && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.22)", opacity: sheetOpen ? 1 : 0, transition: "opacity 320ms ease", zIndex: 5 }} />
      )}

      {/* Bottom sheet */}
      {sheetMounted && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "var(--bg)", borderRadius: "12px 12px 0 0",
          transform: sheetOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 380ms cubic-bezier(0.32, 0.72, 0, 1)",
          zIndex: 6, maxHeight: "76%", overflowY: "scroll", scrollbarWidth: "none" as const,
        }}>
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
            <div style={{ width: 30, height: 4, borderRadius: 9999, background: "var(--rule)" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 14px 10px" }}>
            <span style={{ fontFamily: "var(--display)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--fg)" }}>Tuesday, Apr 7</span>
            <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1 }}>✕</span>
          </div>
          <div style={{ padding: "0 14px 12px", borderBottom: "1px solid var(--rule)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 4 }}>Calories</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontFamily: "var(--display)", fontSize: 26, fontWeight: 700, letterSpacing: "-0.04em", color: "var(--fg)" }}>1,142</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--muted)" }}>/ 2,000</span>
            </div>
            <div style={{ marginTop: 5 }}><NutBar pct={57} /></div>
          </div>
          <div style={{ padding: "10px 14px 8px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 6.5, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 8 }}>Nutrients</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px 10px" }}>
              {nutRows.map(([label, val, pct]) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 6, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--muted)" }}>{label}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, color: "var(--fg)" }}>{val}</span>
                  </div>
                  <div style={{ marginTop: 3 }}><NutBar pct={pct} warn={pct >= 100} /></div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 5 }}>
            {["Calories -858 kcal below goal", "Protein -24g below min"].map(w => (
              <div key={w} style={{ padding: "5px 8px", borderRadius: 4, background: "rgba(196,92,58,0.08)", border: "1px solid rgba(196,92,58,0.18)", fontFamily: "var(--mono)", fontSize: 6.5, color: "#C45C3A", letterSpacing: "0.04em" }}>△ {w}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MobScreenEveryone() {
  const ACCENT = BRAND_SAGE;
  const days = [
    { abbr: "SU", num: 5 }, { abbr: "MO", num: 6 }, { abbr: "TU", num: 7, active: true },
    { abbr: "WE", num: 8 }, { abbr: "TH", num: 9 }, { abbr: "FR", num: 10 }, { abbr: "SA", num: 11 },
  ];
  const people = [
    { name: "Sarah",   color: BRAND_SAGE,  meals: [["B","Cottage Cheese Bowl"],["L","Salmon Salad"],["D","Thai Green Curry"]] },
    { name: "Michael", color: MICHAEL_RED, meals: [["B","Overnight Oats"],["D","Thai Curry"]] },
    { name: "Lindsey", color: LINDSEY_PRP, meals: [["B","Granola Bowl"],["L","Side Salad"],["D","Stir Fry"]] },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", flexShrink: 0, background: "var(--bg)", position: "relative", zIndex: 1 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, fontWeight: 700, color: "var(--fg)", letterSpacing: "0.04em" }}>Apr 5–11</span>
        {([
          <svg key="c" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--fg-2)" }}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
          <svg key="g" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--fg-2)" }}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
        ] as React.ReactNode[]).map((icon, i) => (
          <div key={i} style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, padding: "3px 8px 3px 6px", borderRadius: 9999, border: "1px solid var(--rule)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#888", flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--fg)" }}>Everyone</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 6, color: "var(--muted)" }}>▼</span>
        </div>
      </div>
      {/* Week strip */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.06)", flexShrink: 0 }}>
        {days.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "5px 2px 4px" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 6, textTransform: "uppercase" as const, color: d.active ? ACCENT : "var(--muted)" }}>{d.abbr}</span>
            <span style={{ fontFamily: "var(--display)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.03em", color: d.active ? ACCENT : "var(--fg-2)", lineHeight: 1.2 }}>{d.num}</span>
            {d.active && <div style={{ width: 10, height: 2, borderRadius: 9999, background: ACCENT, marginTop: 2 }} />}
          </div>
        ))}
      </div>
      {/* Day header */}
      <div style={{ padding: "8px 14px 6px", flexShrink: 0 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 7, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: ACCENT }}>Tue</div>
        <div style={{ fontFamily: "var(--display)", fontSize: 26, fontWeight: 700, letterSpacing: "-0.04em", color: ACCENT, lineHeight: 1 }}>7</div>
      </div>
      {/* People */}
      <div style={{ flex: 1, overflowY: "scroll", scrollbarWidth: "none" as const }}>
        {people.map((p, pi) => (
          <div key={pi} style={{ padding: "10px 14px 8px", borderBottom: pi < people.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--fg-2)" }}>{p.name}</span>
            </div>
            {p.meals.map(([type, name], mi) => (
              <div key={mi} style={{ display: "flex", gap: 8, padding: "1px 0" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 6.5, color: "var(--muted)", marginTop: 1, flexShrink: 0, width: 10 }}>{type}</span>
                <span style={{ fontSize: 11, color: "var(--fg-2)", lineHeight: 1.65 }}>{name}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const MOB_SCREENS = [MobScreenDash, MobScreenPantry, MobScreenRecipes, MobScreenPlanner, MobScreenEveryone];
// 0=Home 1=Planner 2=Recipes 3=Pantry 4=Settings
const MOB_NAV_ACTIVE = [0, 3, 2, 1, 1];
// Dashboard gets extra time to complete its scroll animation before advancing
const MOB_SCREEN_DURATIONS = [8000, 6000, 10000, 9700, 6000];
// Per-screen fade-out durations — planner→everyone is slower (900ms)
const MOB_FADE_OUT_MS = [500, 500, 500, 900, 500];

function MobilePhoneDemo() {
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [prevActive, setPrevActive] = useState(-1);
  useEffect(() => {
    const duration = MOB_SCREEN_DURATIONS[active];
    const fadeOut = MOB_FADE_OUT_MS[active];
    const t1 = setTimeout(() => setLeaving(true), duration - fadeOut);
    const t2 = setTimeout(() => {
      setPrevActive(active);
      setActive(i => (i + 1) % 5);
      setLeaving(false);
    }, duration);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active]);
  const Screen = MOB_SCREENS[active];
  const navItems = [
    { label: "Home",     icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { label: "Planner",  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
    { label: "Recipes",  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
    { label: "Pantry",   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2 1.1 0 2-.9 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg> },
    { label: "Settings", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
  ];
  return (
    <div className="lp-mob-phone">
      <div className="lp-mob-status-bar">
        <div style={{ width: 56, height: 5, borderRadius: 9999, background: "var(--fg)", opacity: 0.1 }} />
      </div>
      <div className="lp-mob-screen-area">
        {/* Reveal layer: everyone screen visible beneath planner during its fade-out */}
        {active === 3 && leaving && (
          <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            <MobScreenEveryone />
          </div>
        )}
        <div key={active} className={`lp-mob-screen-fade${leaving ? " lp-mob-leaving" : ""}${active === 4 && prevActive === 3 ? " lp-mob-no-anim" : ""}`} style={{ position: "relative", zIndex: 1, "--mob-fade-out-dur": `${MOB_FADE_OUT_MS[active] / 1000}s` } as React.CSSProperties}>
          <Screen />
        </div>
      </div>
      <div className="lp-mob-bottom-nav">
        {navItems.map((item, i) => (
          <div key={i} className={`lp-mob-nav-item${i === MOB_NAV_ACTIVE[active] ? " lp-mob-nav-item--active" : ""}`}>
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   AppFrame — reusable chrome wrapper for feature sections
   ───────────────────────────────────────────────────────────── */
function AppFrame({ children, dark, className, label }: { children: React.ReactNode; dark?: boolean; className?: string; label?: string }) {
  return (
    <div className={`lp-cycle-app-frame lp-feat-frame${dark ? " lp-feat-frame--dark" : ""}${className ? " " + className : ""}`}>
      <div className="lp-cycle-chrome">
        <div className="lp-cycle-chrome-dots">
          <span className="lp-cycle-chrome-dot lp-cycle-chrome-dot--red" />
          <span className="lp-cycle-chrome-dot lp-cycle-chrome-dot--yellow" />
          <span className="lp-cycle-chrome-dot lp-cycle-chrome-dot--green" />
        </div>
        {label && (
          <span style={{ fontFamily: "var(--mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(250,248,244,0.5)", position: "absolute", left: 0, right: 0, textAlign: "center", pointerEvents: "none" }}>
            {label}
          </span>
        )}
      </div>
      <div className="lp-cycle-screen-wrap lp-feat-screen-wrap" aria-label="App screen demo">
        <div className="lp-cycle-screen lp-cycle-screen--active">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main export — scroll-snap multi-section layout
   ───────────────────────────────────────────────────────────── */
export default function LandingScreenCycle() {
  const [activeSection, setActiveSection] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  // IntersectionObserver — track which section is in view
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    sectionRefs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(i); },
        { root: scrollRef.current, threshold: 0.5 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  const scrollToSection = (i: number) => {
    const el = sectionRefs.current[i];
    const container = scrollRef.current;
    if (!el) return;
    // On desktop the lp-scroll div is the scroll container; on mobile use scrollIntoView
    if (container && container.scrollHeight > container.clientHeight) {
      container.scrollTo({ top: el.offsetTop, behavior: "smooth" });
    } else {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Dark sections: S1, S3, S5 (indices 1, 3, 5)
  const DARK_SECTIONS = new Set([1, 3, 5]);

  return (
    <div className="lp-scroll" ref={scrollRef}>

      {/* ── Fixed header ── */}
      <header className="lp-hdr" role="banner">
        <Link href="/" className="lp-split-brand" aria-label="Good Measure home">
          <BrandName />
        </Link>
        <Link href="/login?signup=1" className="lp-cta-btn lp-hdr-cta">
          Get Started →
        </Link>
      </header>

      {/* ── Vertical dot nav ── */}
      <nav className="lp-dots" aria-label="Section navigation">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            className={`lp-dot${activeSection === i ? " lp-dot--active" : ""}${DARK_SECTIONS.has(activeSection) ? " lp-dot--cream" : ""}`}
            onClick={() => scrollToSection(i)}
            aria-label={`Go to section ${i + 1}`}
          />
        ))}
      </nav>

      {/* ── S0: Hero ── */}
      <section
        className="lp-s lp-s-hero"
        ref={el => { sectionRefs.current[0] = el; }}
        aria-labelledby="lp-hero-headline"
      >
        <div className="lp-hero-inner">
          <h1 id="lp-hero-headline" className="lp-s-headline">
            Measure what<br /><span>matters.</span>
          </h1>
          <p className="lp-s-subhead">
            Know exactly what&apos;s in everything you cook. Build and optimize recipes, track nutrition live, and easily plan the week for your entire household.
          </p>
          <div className="lp-hero-btns">
            <Link href="/login?signup=1" className="lp-cta-btn lp-cta-btn--dark">
              GET STARTED ↗
            </Link>
            <button
              className="lp-outline-btn"
              onClick={() => scrollToSection(1)}
              aria-label="See how it works, scroll to first feature"
            >
              SEE HOW IT WORKS ↓
            </button>
          </div>
          {/* Desktop app frame */}
          <div className="lp-hero-frame" aria-hidden="true">
            <AppFrame>
              <DashboardScreen isActive={activeSection === 0} />
            </AppFrame>
          </div>
          {/* Mobile: phone demo */}
          <div className="lp-mob-demo-wrap" aria-hidden="true">
            <MobilePhoneDemo />
          </div>
          {/* Mobile: feature list */}
          <div className="lp-mob-features lp-s-mob-features" aria-label="Features">
            {MOB_FEATURES.map((f) => (
              <div key={f.num} className="lp-mob-feature-item lp-s-mob-feature-item">
                <div className="lp-mob-feature-title-row">
                  <span className="lp-mob-feature-num">{f.num}</span>
                  <span className="lp-mob-feature-label">{f.title}</span>
                </div>
                <p className="lp-mob-feature-desc">{f.sub}</p>
              </div>
            ))}
          </div>
          {/* Mobile: bottom padding */}
          <div style={{ height: 40 }} />
        </div>
      </section>

      {/* ── S1: Pantry (dark) ── */}
      <section
        className="lp-s lp-s-feat lp-s-dark"
        ref={el => { sectionRefs.current[1] = el; }}
        aria-label="Pantry feature"
      >
        <div className="lp-feat-grid lp-feat-grid--copy-left">
          <div className="lp-feat-copy">
            <p className="lp-feat-eyebrow">01 / PANTRY</p>
            <h2 className="lp-feat-h2">Build your library.</h2>
            <p className="lp-feat-body">
              Every ingredient you cook with, stored exactly how you use it. USDA lookup, custom units, per-100g or per-serving. Your pantry powers every recipe&apos;s nutrition automatically.
            </p>
            <div className="lp-feat-tags" aria-label="Key features">
              {["USDA LOOKUP", "CUSTOM UNITS", "156 ITEMS"].map(tag => (
                <span key={tag} className="lp-feat-tag">{tag}</span>
              ))}
            </div>
          </div>
          <div className="lp-feat-visual">
            <AppFrame dark>
              <PantryScreen />
            </AppFrame>
          </div>
        </div>
      </section>

      {/* ── S2: Recipes (light) ── */}
      <section
        className="lp-s lp-s-feat"
        ref={el => { sectionRefs.current[2] = el; }}
        aria-label="Recipes feature"
      >
        <div className="lp-feat-grid lp-feat-grid--copy-right">
          <div className="lp-feat-visual">
            <AppFrame>
              <RecipeDetailScreen isActive={activeSection === 2} />
            </AppFrame>
          </div>
          <div className="lp-feat-copy">
            <p className="lp-feat-eyebrow">02 / RECIPES</p>
            <h2 className="lp-feat-h2">Import or build from scratch.</h2>
            <p className="lp-feat-body">
              Paste a URL, upload a file, or add ingredients one by one. Nutrition totals calculate live. No guesswork, ever.
            </p>
            <div className="lp-feat-tags" aria-label="Key features">
              {["URL IMPORT", "MANUAL ENTRY", "LIVE NUTRITION"].map(tag => (
                <span key={tag} className="lp-feat-tag">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── S3: AI Optimize (dark) ── */}
      <section
        className="lp-s lp-s-feat lp-s-dark lp-s-navy"
        ref={el => { sectionRefs.current[3] = el; }}
        aria-label="AI optimization feature"
      >
        <div className="lp-feat-grid lp-feat-grid--copy-left">
          <div className="lp-feat-copy">
            <p className="lp-feat-eyebrow">03 / OPTIMIZE</p>
            <h2 className="lp-feat-h2">Your AI reads the recipe.</h2>
            <p className="lp-feat-body">
              Connect your AI agent via MCP. It reads your recipes, evaluates them against your goals, suggests targeted swaps, and saves changes back automatically.
            </p>
            <p className="lp-feat-body" style={{ marginTop: "1em" }}>
              Batch meal prep. Optimize macros. Build weekly plans from scratch. The app is the data layer. Your AI does the reasoning.
            </p>
            <div className="lp-feat-tags" aria-label="Key features">
              {["AI AGENT", "MCP PROTOCOL", "SAVES BACK AUTOMATICALLY"].map(tag => (
                <span key={tag} className="lp-feat-tag">{tag}</span>
              ))}
            </div>
          </div>
          <div className="lp-feat-visual">
            <AppFrame dark label="AI Agent">
              <AIOptimizeScreen />
            </AppFrame>
          </div>
        </div>
      </section>

      {/* ── S4: Planner (light) ── */}
      <section
        className="lp-s lp-s-feat"
        ref={el => { sectionRefs.current[4] = el; }}
        aria-label="Planner feature"
      >
        <div className="lp-feat-grid lp-feat-grid--copy-right">
          <div className="lp-feat-visual">
            <AppFrame>
              <PlannerCycleScreen isActive={activeSection === 4} />
            </AppFrame>
          </div>
          <div className="lp-feat-copy">
            <p className="lp-feat-eyebrow">04 / PLANNER</p>
            <h2 className="lp-feat-h2">One week.<br />Every person.<br />On target.</h2>
            <p className="lp-feat-body">
              Add everyone in your household and each person gets their own 7-day plan, nutrition goals, and targets. One shared pantry and recipe library. Drag meals between days, watch totals update live, and see the whole household side by side.
            </p>
            <div className="lp-feat-tags" aria-label="Key features">
              {["SHARED LIBRARY", "WEEKLY GRID", "NUTRITION SUMMARY"].map(tag => (
                <span key={tag} className="lp-feat-tag">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── S5: CTA (dark) ── */}
      <section
        className="lp-s lp-s-cta lp-s-dark"
        ref={el => { sectionRefs.current[5] = el; }}
        aria-label="Get started"
      >
        <div className="lp-cta-inner">
          <h2 className="lp-s-headline lp-cta-headline">
            Start measuring <br className="lp-mob-br" />what <span>matters.</span>
          </h2>
          <Link href="/login?signup=1" className="lp-cta-btn lp-cta-btn--sage" aria-label="Get started with Good Measure">
            GET STARTED ↗
          </Link>
        </div>
        <footer className="lp-cta-footer lp-cta-footer--pinned">
          © 2026 Made by{" "}
          <a href="https://www.jenmurse.com/" target="_blank" rel="noopener noreferrer" className="lp-mob-legal-link">
            Jen Murse
          </a>
        </footer>
      </section>

    </div>
  );
}
