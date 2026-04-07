# Product Marketing Context

*Last updated: 2026-04-06*

## Product Overview
**One-liner:** Good Measure is the meal planning app for households that care about what they eat — without making food feel like a spreadsheet.

**What it does:** Good Measure helps health-conscious households plan meals, track nutrition, and build a personal recipe library — all together, per person. It connects to the USDA ingredient database for real nutrition data, generates shopping lists from meal plans, and integrates with AI tools (Claude Desktop via MCP) for recipe optimization and meal prep analysis.

**Product category:** Meal planning app / nutrition tracker — sits on the same shelf as Mealime, Plan to Eat, Yummly, and Cronometer, but with a household-first, editorial-design-forward approach.

**Product type:** Hosted SaaS web app (Next.js + Supabase + Vercel)

**Business model:** Currently personal/portfolio project. Multi-user potential — household-based subscription model is the natural fit.

---

## Target Audience
**Target users:** Health-conscious households of 1–4 people. Couples, families, roommates who cook together and want shared structure without losing individual goals.

**Decision-makers:** The household "food person" — whoever does most of the grocery shopping and meal planning. Usually one person takes ownership, but the whole household benefits.

**Primary use case:** Intentional weekly meal planning with real nutrition awareness — not obsessive calorie counting, but knowing roughly what you're eating and why.

**Jobs to be done:**
- "Help me plan what we're eating this week so I'm not staring at the fridge at 6pm"
- "Tell me if what I'm cooking actually hits our nutrition goals without me doing math"
- "Keep our family's recipes in one place so we stop losing them"

**Use cases:**
- Weekly meal prep planning (what to make, scale quantities, batch cook)
- Tracking nutrition across a household where each person has different goals
- Building a curated personal recipe library from URLs, files, or scratch
- Generating a categorized shopping list from the week's plan
- Using AI (Claude) to optimize recipes for nutrition or meal prep efficiency

---

## Problems & Pain Points
**Core problem:** Meal planning apps are either too simple (no real nutrition data) or too clinical (MyFitnessPal-style logging that feels like punishment). Household-aware tools barely exist — most apps are built for one person.

**Why alternatives fall short:**
- **MyFitnessPal / Cronometer**: Built for individual logging, not household planning. Clinical UI. Feels like tracking, not cooking.
- **Mealime / Plan to Eat**: Meal planning focus but weak nutrition depth. No per-person goals. Recipe libraries are locked to their content.
- **Notion/spreadsheets**: Flexible but zero nutrition data. High maintenance. Not purpose-built.
- **Paprika / AnyList**: Great recipe storage, no nutrition tracking or meal planning intelligence.

**What it costs them:** Time (figuring out what to cook each day), mental load (tracking what everyone needs to eat), wasted groceries (no plan = random shopping), drift from health goals.

**Emotional tension:** Wanting to eat well as a household without it feeling like a chore, a diet, or a second job.

---

## Competitive Landscape
**Direct:** Mealime, Plan to Eat, Whisk — meal planning focus, weak nutrition, no household per-person support.

**Secondary:** MyFitnessPal, Cronometer — strong nutrition data, but individual-only logging, clinical UX, no meal planning workflow.

**Indirect:** Recipe apps (Paprika, Yummly), grocery apps (AnyList), spreadsheets — solve parts of the problem but not the whole household nutrition + planning loop.

---

## Differentiation
**Key differentiators:**
- **Household-first**: Multiple people, each with their own goals, themes, and meal plans — sharing a recipe library and pantry
- **Real nutrition data**: USDA FDC integration with shared ingredient cache. Not estimates.
- **AI optimization**: MCP server (good-measure-mcp) connects to Claude Desktop for recipe optimization and meal prep planning — no locked-in AI subscription
- **Editorial design**: Feels like a beautiful magazine, not a fitness tracker. Warm palette, serif typography, grain texture, custom cursor.
- **Recipes as yours**: URL import from any recipe site, .md import, or build from scratch. Your recipes, in your library, with your categories.
- **Shopping list intelligence**: Auto-generated from meal plan, grouped by ingredient category, shareable

**How we do it differently:** Treats the household as the unit of organization, not the individual. Nutrition awareness is ambient (shown when relevant) rather than the primary interface. Design is warm and intentional, not clinical.

**Why that's better:** You can actually use it daily without it feeling like tracking. The whole household is in sync. You feel informed, not monitored.

---

## Objections
| Objection | Response |
|-----------|----------|
| "I can just use MyFitnessPal" | MFP is built for logging what you ate. Good Measure is built for planning what you'll eat — as a household, with real recipes. |
| "Setting up a whole recipe library sounds like work" | URL import means adding a recipe is one paste. Your existing recipes come in automatically. |
| "Do I have to be on a diet to use this?" | No. Good Measure is for people who want to eat intentionally, not restrictively. Goals are optional and flexible. |

**Anti-persona:** Someone who wants to count every macro obsessively. Someone who eats alone and has no interest in household coordination. Someone who just wants a grocery list app.

---

## Switching Dynamics
**Push:** "My current app doesn't understand that we're a family of different people with different needs." / "I'm sick of apps that feel like tracking punishment."

**Pull:** The design. The household concept. The AI recipe optimization. The feeling that this was made by someone who actually cooks.

**Habit:** Already have a system (even if it's just chaos or a Notes app). Existing recipe collection in another app.

**Anxiety:** "Will I have to re-enter all my recipes?" / "Is this going to be another app I set up and abandon?"

---

## Customer Language
**How they describe the problem:**
- "I spend so much mental energy just figuring out what to cook"
- "My husband and I have totally different nutrition goals"
- "I want to eat healthier but I don't want to track every bite"
- "We keep buying groceries and then not using them"

**How they describe what they want:**
- "Something that actually understands we're a household, not just one person"
- "Meal planning that doesn't feel like a chore"
- "I want to know roughly what I'm eating without it being a whole thing"

**Words to use:** intentional, household, plan, your recipes, nutrition, goals, week, together, real data

**Words to avoid:** diet, calories (as primary), tracking, logging, macros (as primary), count

**Glossary:**
| Term | Meaning |
|------|---------|
| Household | A group of 1–4 people sharing a Good Measure account |
| Meal plan | A weekly schedule of meals per person |
| Pantry | The ingredient library with nutrition data |
| MCP / AI optimization | Claude Desktop integration for recipe intelligence |
| Theme | A person's color identity within the household |

---

## Brand Voice
**Tone:** Warm, editorial, quietly confident. Knowledgeable without being preachy. Like a food-literate friend who happens to have a nutrition degree.

**Style:** Clear and direct. Short sentences. No jargon. Avoids "wellness" clichés. Feels designed, not generic.

**Personality:** Intentional · Warm · Considered · Unhurried · A little editorial

---

## Proof Points
**Metrics:** (Early-stage — no public metrics yet)

**Value themes:**
| Theme | Proof |
|-------|-------|
| Household-aware | Per-person goals, themes, meal plans — shared library |
| Real nutrition data | USDA FDC integration, shared cache across users |
| AI-powered optimization | good-measure-mcp npm package, Claude Desktop integration |
| Beautiful design | Editorial system: Bricolage Grotesque, grain, custom cursor |

---

## Goals
**Business goal:** Launch as a polished, publicly shareable product — portfolio visibility + eventual multi-user SaaS.

**Conversion action:** Sign up / create account. Secondary: explore the demo or see a screenshot tour.

**Current metrics:** Pre-launch. Vercel deployment live. Auth + full feature set complete.
