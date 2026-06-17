---
name: Good Measure — Monetization Decision Record
description: Closes the open monetization question in going-native-b2-plan.md §9. What was decided, why, and the one thing to build now. Decision doc, not an implementation brief.
type: planning
status: Decided — June 16, 2026
author: Jen (with Claude)
supersedes: going-native-b2-plan.md §9 (OPEN STRATEGIC QUESTION — Monetization)
companion: positioning-social-decision.md (positioning lane + social plan)
---

# Monetization decision record

This closes `going-native-b2-plan.md` §9 and the pricing fork left open in
`launch-viability-plan.md` §5/§9. Both docs framed monetization as unresolved;
this is the resolution. Implementation briefs spin off this later, when native
launch is the active concern — not now.

---

## 1. The decision in one paragraph

Good Measure goes to market as a **two-tier subscription**: a genuinely useful
**Free** tier (single person, manual planning, a capped taste of the day
optimizer) and one **Pro** tier (**$7/mo or $60/yr**) that unlocks households,
unlimited day optimizer, day templates, and the entire MCP/AI layer. The in-app
AI chat is **cut** — MCP (bring your own Claude) is the whole AI story, and it
lives in Pro. **No ads, ever** (conflicts with the stated privacy stance and
pays poorly at this scale). **Friends and family get everything free** via a
comp flag; paid tiers switch on only at **native launch**, not on web.

---

## 2. Why two tiers, not three (the chat got cut)

Earlier thinking floated a third "Pro + AI" tier with a metered in-app chat. It
was dropped, for good reasons:

- The in-app chat was the **only** surface carrying real per-interaction API
  cost, and it **duplicated** what MCP already does (talk to your plan/recipes in
  natural language).
- With MCP moving to a **hosted remote connector** (B2 §4) — add by URL, sign in,
  no desktop npm install — the "zero-setup AI" justification for a separate
  in-app chat largely evaporates for the power user it serves.
- Cutting it removes the single biggest variable-cost line **and** the biggest
  ongoing maintenance surface. The chat is already behind a feature flag and out
  of the app today, so this is ratifying reality, not removing shipped work.

**The tradeoff we are accepting:** a Free (or Pro) user who does **not** have
their own Claude gets **no conversational AI experience at all** — they get the
optimizer instead. This is judged acceptable because the optimizer is the
reachable, demonstrable, free hero and the AI is a power-user ceiling. Named here
so it is a deliberate bet, not an accident: *the day optimizer alone is a strong
enough free hook; AI is a Pro bonus.*

---

## 3. The two capabilities people keep conflating

Critical distinction that drives the entire tier boundary. There are **two**
different things, and only one of them is AI:

| | **Day optimizer** | **Recipe-level AI editing** |
|---|---|---|
| What it does | Swaps **whole meals** in/out of a day to hit targets ("3 ways to optimize / best balance / 5 swaps") | Rewrites the **inside of a recipe** — cut the miso, switch to low-sodium soy, sodium 1,858 → 950 |
| How | Server-side TS engine (`lib/mealOptimizer.ts`) | MCP — the user's own Claude calls `get_recipe`, `search_ingredients`, `save_recipe`, etc. |
| Needs the user's own AI? | **No** | **Yes** |
| Cost to us | ~zero (own compute) | egress (the real variable cost) |
| Tier | **Free** (capped) / Pro (unlimited) | **Pro only** |

The landing page's hero "sodium swap" moment is **recipe-level AI editing** — it
is a Pro/MCP feature and **cannot** be done by the optimizer. The optimizer never
touches the inside of a recipe. (This was misstated twice in discussion before
being corrected; preserved here so the doc is not re-litigated.)

The recipe detail page's **Optimization** and **Meal Prep** tabs are **MCP
affordances** — they hold prompts the user copies into their connected AI, which
then writes notes back via `save_optimization_notes` / `save_meal_prep_notes`.
They are useless without a connected MCP client. They belong with MCP, in Pro.

---

## 4. The tiers

| | **Free** | **Pro** — $7/mo or $60/yr |
|---|---|---|
| Pantry, recipes, nutrition to the gram | ✓ | ✓ |
| Manual weekly planning + shopping list | ✓ | ✓ |
| Single person | ✓ | ✓ |
| **Day optimizer** (planner, 3 options) | **capped — ~5 runs lifetime** | unlimited |
| **Household** (multi-person) | — | ✓ |
| Day templates / rotations | — | ✓ |
| **Recipe Optimization tab** (MCP prompt) | locked (upsell) | ✓ |
| **Recipe Meal Prep tab** (MCP prompt) | locked (upsell) | ✓ |
| **MCP connection** (settings, checklist, read/write) | — | ✓ |

**The tier line is razor-sharp and easy to explain:** everything that runs on our
own server is Free (capped where it converts); everything that needs the user's
own AI is Pro. No fuzzy "is this AI or not" cases, because the day optimizer is
unambiguously ours and the recipe tabs are unambiguously MCP.

### Why Free is generous on purpose
Free is already more precise than most *paid* recipe managers (nutrition to the
gram, real serving sizes, manual planning, shopping list). It is the funnel —
let people fall in love with the core before paying. The capped optimizer lets
them *feel* the hero feature a few times before the wall.

### The capped optimizer — how
Not metered for compute (nearly free to run); capped as a **conversion lever**.
**Chosen: ~5 runs lifetime** (a single integer on the user record). A lifetime
cap converts better than a monthly allowance because "5 ever" forces a decision,
while "5 a month" lets a casual user ration forever and never pay. Front-loads
the wow, then asks. (Exact number tunable; 5 is the starting point.)

### Locked tabs as upsell surface (decided: show locked, don't hide)
The recipe **Optimization** and **Meal Prep** tabs show for Free users as
**locked with a one-line upsell** ("Connect your AI assistant with Pro"), not
hidden. They sit exactly where the value is, so they are a natural, non-naggy
upsell — same logic as the household-invite step in onboarding becoming a Pro
moment. Visible-but-locked beats invisible for conversion.

---

## 5. Pricing rationale

**Locked: $7/mo or $60/yr** ($60 annual = ~29% off monthly, a "two months free"
framing; reward for the annual commitment + lower churn).

- **$7/mo sits deliberately between two reference prices.** Below it: non-AI
  recipe managers ($2.99–5.99 — Mealime, Plan to Eat) that have **no AI feature
  Good Measure has**. Above it: the conversational-AI planners at $12–15/mo
  (MealThinker, Ollie). Pricing *at* the non-AI floor ($5) would blend Good
  Measure in with apps that do less and risk signaling "lightweight" to the
  deliberate, quality-seeking buyer. $7 reads as "a real tool," still feels like a
  deal next to the $12–15 AI apps.
- **We can price under the AI apps because we don't run the model** — the user's
  own Claude does (MCP). MCP is our structural escape hatch from the category's
  cost economics. But "under" doesn't have to mean "half."
- The one real variable cost — MCP egress — sits **inside the paid tier**, so the
  people generating load are the people paying. Clean who-pays-equals-who-costs
  alignment, achieved without metering anything.
- **Annual number is $60 (flat), not $59.99.** Charm pricing (the .99s) slightly
  undercuts the editorial, anti-typical-app brand. A round number signals
  confidence and suits the positioning better. (If a discount is ever wanted,
  $48/$5 is the fallback — see below.)

### Why start here, not lower
It is far easier to **lower** a price later (reads as a gift) than to **raise**
one (reads as a penalty, even when existing subs are grandfathered). That
asymmetry argues for starting at the top of the range and dropping only if
conversion disappoints. **Fallback if needed: $5/mo + $48/yr** — clean math,
"two months free," still on-brand. Do not go below that floor.

### Break-even (why this is low-risk)
Fixed floor ≈ **$25–65/mo + $99/yr** (~$400–900/yr all-in; see B2 §8). Apple/Google
take 15% under $1M revenue, so a **$60/yr Pro nets ~$51/user/yr** (vs ~$41 at
$48/yr — a 25% revenue difference the buyer barely feels). **Break-even ≈ 10–18
paying subscribers.** Real money (a few $k/yr) needs ~50–100 subs — which is a
**distribution** problem, not a pricing problem. Distribution is already named as
the actual risk in `launch-viability-plan.md` §1/§8 (MealThinker: a near-twin
with one rating). Pricing is settled; distribution is the open work.

---

## 6. Ads — rejected (reaffirms B2 §9 option 4)

Not explored as viable, and held as a firm no:

- **Brand conflict.** The privacy policy explicitly promises *no advertising or
  tracking identifiers of any kind*. An ad SDK reverses a stated principle and
  imports the exact tracking the product currently advertises **not** having. The
  privacy stance is a selling point; trading it for ads is an undoable trust cost.
- **Economics don't reward the betrayal.** Privacy-safe, non-tracking ads pay
  pennies/user/mo. To beat a single $7 subscriber you'd need thousands of DAU we
  don't have and the distribution constraints make unlikely.
- **Wrong audience.** Ads suit high-volume, low-intent, frequent-open apps. Good
  Measure is low-volume, high-intent, deliberate — that user **converts to
  subscription** far better than they monetize via ads.

Ads only make sense if the precision/editorial/privacy positioning is abandoned
for a mass-market product — a different product than the one being built. So: no
ads. Break-even is low enough (~10–18 subs) that no second revenue stream is
needed to survive.

---

## 7. Friends-and-family: everything free (the current phase)

Friends get **full access, no charge** — the explicit goal is unpressured trial
and honest feedback, not revenue. Rationale:

- Friends pay from loyalty, not conviction, so a friend converting tells us
  little and a friend declining (awkward to pay a friend) tells us less. The
  willingness-to-pay signal is **not** what friends are good for.
- What friends **are** good for is **"do they use it unprompted, and where do they
  get stuck"** — the friction signal, which `launch-viability-plan.md` §3 (Phase 3)
  names as the gate for everything after. Friends-free chooses the validation
  friends can actually give.
- **The willingness-to-pay test moves to native launch, against strangers** —
  where it is real. (Earlier we discussed a web paywall to validate price before
  native spend; that is **superseded** by this decision. Friends-free on web,
  paid at native launch.)

---

## 8. ⚙️ BUILD THIS NOW (the one implementation-relevant item)

Everything else in this doc is deferred to native-launch briefs. **This one piece
should be architected now**, even though monetization is weeks away, because
getting it wrong forces a code fork later:

> **Entitlement as a flag, not a fork.** Add a **`plan`** field to the account
> model: `free` / `pro` / `comp`. All feature gating reads this one flag. Friends
> get **`comp`** (full access, no charge). At native launch, new signups get the
> real `free` / `pro` split by **flipping the flag**, with no rebuild.

If "everything is free" ships as hardcoded behavior instead of a flag, it gets
paid for twice when the paywall arrives. Tell Claude Code to build the flag from
the start.

### The flag is checked in three places (one system, three surfaces)
1. **App UI** — gates household, optimizer cap, locked recipe tabs, MCP settings.
2. **MCP server** — see §9. The real enforcement for the AI layer.
3. **RLS** (B2 §5a) — per-household row access; sits alongside the plan check on
   the backend.

---

## 9. "Turning off MCP" for non-Pro — how it actually works

MCP has a client side and a server side. Only one is enforceable, and it's the
one that matters.

- **Client side — not policeable, and that's fine.** MCP works because the user
  adds our server to *their own* Claude. Once they hold the connection URL + a
  valid token, the request originates from their machine; we can't remove it from
  their Claude. "Off" therefore can't mean "the user can't point Claude at us."
- **Server side — fully controlled, this is the lever.** Every MCP tool call hits
  **our** backend (Supabase, post-migration) carrying the user's auth token. The
  MCP server checks the account's **`plan`** flag on **every call**; non-Pro
  accounts get refused (`get_recipe`, `save_recipe`, `save_optimization_notes`,
  etc. return "requires Good Measure Pro" instead of data). The connection can
  exist; it simply does nothing. Because the data lives in our cloud and the MCP
  server is a client of that cloud (B2 §4), the check is **server-side and
  unbypassable** — even a Free user who copies a Pro friend's connection URL is
  refused.
- **UI side — hygiene.** Locked recipe tabs + MCP settings shape what Free users
  *see* and feel the upsell; the server check is what *enforces*. Need both: UI
  so the boundary is legible, server so it's real.

**Concretely:** "turn off MCP" = the MCP server rejects tool calls from non-Pro
accounts — a few lines at the top of each tool handler checking the same `plan`
flag the rest of the app uses. A connection that returns nothing is off in every
way that counts. For friends (`comp`), nothing fires; it switches on only when
real tiers flip at native launch.

---

## 10. Positioning + landing page — DECIDED (see positioning doc)

This was open when this doc was first written; it is now **decided**. Full
rationale, social plan, and content units live in the companion
**`positioning-social-decision.md`**. Summary of what was settled:

- **Lead with AI.** The recipe-rewrite-via-Claude moment (AI acting *inside* the
  real app) is the one un-copyable, coverage-worthy, face-free asset — no funded
  competitor can show it. The day optimizer is the secondary "and it also does
  this on its own, no AI" beat.
- **Ship a free Pro trial at native launch** (14-day, card up front, MCP
  included) so "AI upfront" is honest for every new install — a new user actually
  experiences the AI before the gate. Native-launch mechanic (store-managed via
  Apple/Google); deferred with the rest of the paywall. Friends-free means no
  trial is needed now.
- **Sequence held:** lock tiers (done) → pick positioning lane (done) → rewrite
  page (still pending, now unblocked). The page is the last step.

---

## 11. What changes in the product (UI/onboarding/settings surgery)

Captured for the eventual brief — **not built now** (friends are `comp`, so none
of this fires until launch):

- **Onboarding** — the "invite your household" step becomes a **Pro upsell
  moment** for Free users (upsell sits where the limit is felt).
- **Settings** — household section gates behind Pro; MCP instructions gate behind
  Pro.
- **Recipe detail** — Optimization + Meal Prep tabs show **locked with upsell**
  for Free (not hidden).
- **Post-onboarding checklist** — the MCP connection item gates behind Pro.
- **Planner** — day optimizer hits the ~5-run lifetime cap for Free, then a Pro
  upsell wall.
- **Day optimizer is single-person on Free** by definition (household is Pro).

### Free is permanent and real (downgrade rules — decide before launch)
Free is not a crippled demo with a countdown; it is a real product someone can
use every day, forever. After a trial ends (or for any non-Pro user), they keep:
full pantry, all recipes, nutrition to the gram, manual weekly planning, shopping
list, and the capped optimizer. They lose: AI/MCP, household, unlimited
optimizer, templates.

Two rules that make "free is real" actually true — **honor these, they're the
goodwill load-bearing parts:**

- **Never hold user-created data hostage.** On downgrade, the user's own recipes
  and pantry stay fully theirs and fully usable. The gate is on **new Pro
  actions**, never on access to what they already built. Stranding someone's own
  recipes behind the paywall is the one move that poisons the goodwill — don't.
- **Household downgrade needs an explicit rule (the one tricky case).** If a
  two-person household's trial ends with no upgrade, you can't delete the second
  person's data. Decide the rule before launch: household stays intact and
  **readable**, but multi-person editing/planning gates — or the account reverts
  to the primary person's plan with the second person's data **preserved but
  dormant** until someone upgrades. Annoying to retrofit; settle it in the brief.

---

## 12. Status of the source docs

- `going-native-b2-plan.md` §9 — **closed by this doc.** (Leave §9 in place as the
  question; this record is the answer.)
- `launch-viability-plan.md` §5 (pricing) / §9 (open pricing question) —
  **resolved**: two-tier, **Pro at $7/mo or $60/yr**, no metered chat (chat cut),
  no ads.
- The "validate paid conversion on web before native" idea (discussed) — **not
  pursued**; friends-free on web, paid at native launch (§7).
