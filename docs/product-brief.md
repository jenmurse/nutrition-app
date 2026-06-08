# Good Measure — Product Brief

**For competitive analysis and market evaluation. Written to be shared with an outside reader.**

---

## What it is

Good Measure is a personal nutrition tracking and meal planning tool for people who actually cook. It is not a calorie logging app. It is a tool for people who want to understand the nutritional content of the food they make from scratch, plan their meals by the week, and use AI to help optimize and manage that plan.

It is currently invite-only, used by a small group of friends and family. It is live at **withgoodmeasure.com**.

---

## The problem it solves

Most nutrition apps are built around logging food you've already eaten. You open the app after a meal and search for what you had. The apps are optimized for this — huge food databases, barcode scanners, restaurant menu lookups.

Good Measure is built for a different workflow: **cooking at home from your own recipe library.** The user builds a pantry of ingredients (with precise USDA-sourced nutrition data), builds or imports recipes from that pantry, and plans their week from those recipes. Nutrition calculates live as they build, not after the fact.

The core insight: **if you cook, you know exactly what's in your food.** Most nutrition apps don't take advantage of that. Good Measure does.

---

## What makes it different

### 1. Recipe-first, not food-log-first
The unit of planning is a recipe, not a meal log entry. Recipes pull from a shared ingredient library. Change an ingredient once and every recipe that uses it updates automatically. This is fundamentally different from apps where each "meal" is a disconnected entry.

### 2. Household model
Multiple people share one ingredient library and recipe library, but each person has their own meal plan and nutrition goals. A couple who cooks together can plan meals together — Jen has her targets, Garth has his, the pantry is shared. No other mainstream app handles this cleanly.

### 3. AI via MCP — not built-in AI
Good Measure doesn't call an AI API. Instead, it exposes an MCP (Model Context Protocol) server that connects to whatever AI the user already uses (Claude Desktop, etc.). The AI can read the user's full recipe library, pantry, goals, and meal plan — and write back to it. This means: plan a whole week of meals by describing what you want, swap a meal out loud, optimize a recipe for lower sodium. The user owns the AI relationship; Good Measure provides the data layer.

This is a real architectural bet: AI features without AI infrastructure costs, without data privacy concerns about sending food logs to a third-party API, and without being tied to one AI provider.

### 4. Precision
Nutrition calculates to the gram. Serving sizes are real (not "1 medium apple"). When you reduce olive oil from 2 tablespoons to 1, the numbers update. The app is built for people who want to actually know the numbers, not estimate them.

### 5. Design
The app has a real design system — editorial, typographic, intentional. It doesn't look like a health app. It looks more like a well-made productivity tool. This is deliberate: the target user doesn't want to be reminded they're tracking calories; they want a clean tool that respects their intelligence.

---

## What it is not

- **Not a calorie deficit / weight loss app.** It tracks nutrition precisely, but it doesn't nag or gamify. There are no streaks, badges, or progress rings.
- **Not a recipe discovery app.** It doesn't suggest recipes from the internet. Your library is your recipes — imported from URLs, typed in, or imported from markdown. It is a tool for the food you already cook.
- **Not a barcode scanner app.** It's not built for processed food tracking. If you mostly eat from packages, this is the wrong tool.
- **Not a subscription service.** No AI API fees passed through. No premium tier currently.

---

## The target user

A serious home cook — someone who plans meals, cooks from scratch most nights, has nutrition goals they actually care about (not just "eat less"), and is already using an AI tool like Claude. Probably 30–50, probably cooking for a household of 2, probably has tried MyFitnessPal and found it too focused on logging rather than planning.

This is a narrow target. That's intentional for now.

---

## Current state

- Live at withgoodmeasure.com
- Invite-only (friends and family)
- Waitlist open for the general public
- iOS App Store submission in progress (Capacitor wrap)
- MCP package published: `good-measure-mcp` on npm

---

## The honest question for evaluation

Good Measure solves a real problem for a specific type of person. The question is whether that person exists in enough numbers to be a product, or whether this is a personal tool that happens to be well-built.

**Comparisons worth evaluating against:**
- MyFitnessPal — the dominant calorie tracker. Built for logging, not planning. No recipe-as-unit model.
- Cronometer — the precision nutrition tracker. Strong on data, weak on meal planning and recipe management. No AI layer.
- Mealime / Plan to Eat — meal planning apps. Strong on planning, weak on nutrition precision. No AI layer.
- Paprika — recipe manager. Strong on recipe storage, no nutrition, no planning.
- MacroFactor / Carbon — AI-coached nutrition. Strong on coaching/adjustment, still log-first.

Good Measure's gap: **no app does recipe-first precision nutrition + weekly meal planning + household model + AI integration together.** The question is whether enough people want all of those things at once, or whether they're comfortable stitching together Cronometer + Paprika + a spreadsheet.
