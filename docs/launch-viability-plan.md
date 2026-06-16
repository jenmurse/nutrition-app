---
name: Good Measure — Launch Viability Plan
description: Competitive read, the front-door problem, and a sequenced plan to make Good Measure launch-viable. Decision doc, not a brief.
type: planning
status: Draft for discussion — June 2026 (rev. with source-tagged competitive sizing)
author: Jen (with Claude)
---

# Launch viability plan

> **Note (June 16, 2026):** the native/architecture sections below reference the older "Track 1, Railway-authoritative" plan. That has been superseded by the **B2 plan** (`briefs/going-native-b2-plan.md`): Capacitor + a **Supabase Pro backend** (Railway retired), MCP as a hosted remote connector, local-first rejected. The competitive/front-door analysis in this doc still stands; treat the Track-1/Railway specifics as out of date.

The question this doc answers: what has to change about Good Measure before it is
worth putting in front of more friends, then in front of the public. It is a
decision doc. Briefs come after, one concern at a time, as usual.

---

## 1. The honest competitive read

### Not the competition

- **Log-first calorie trackers** (MyFitnessPal, Cronometer, MyNetDiary, Lifesum,
  Calory): answer "what did I eat?" Different problem, unwinnable on database size,
  not the job Good Measure does.
- **Scanner / discovery apps** (Fig, Yuka, Fooducate): a packaged-grocery problem.
- **Pure recipe managers** (Paprika, Plan to Eat, AnyList): store recipes; no
  planning intelligence, no precision nutrition.

### The real shelf: AI meal planners

A note on how to read the numbers below. Apple and Google do **not** publish download
counts; nobody can pull a true figure. The most reliable public signal is the
**App Store / Play Store rating count** (only ~1–5% of users ever rate, so it is an
order-of-magnitude proxy, not a number). Self-reported "X million users" figures come
from company marketing and are directional at best. Every figure below is tagged with
its source and how much to trust it.

**Key finding: this category has many websites and very few products with real users.**
The search results make it look crowded; the rating counts show it is not. Several
"competitors" are solo founders whose SEO content vastly outweighs their userbase.

#### Tier 1 — Real scale (but a different model than Good Measure)

- **Eat This Much** — the big one in this category. ~22,000 iOS ratings + ~10,100
  Android ratings (App Store/Play, reliable). Real brand, real scale. *But:* an
  **algorithmic macro-generator**, not conversational; works from its own ~1,000-recipe
  database (you can add your own, but it is not the default flow); macro-only nutrition;
  single-person by design (reviewers note households are hard). The proven, popular,
  unsexy entry. Adjacent to Good Measure, not the same object.
- **Mealime** — large but old-generation. "4.5M downloads" (self-reported, skeptical);
  ~13.7k reviews (third-party cited, plausible). A curated-recipe *picker* with **no AI**
  (confirmed: no AI features added despite the category moving that way), no pantry
  inventory, no saved plans, servings capped at 2/4/6. Not a competitor so much as the
  incumbent everyone else positions against.

#### Tier 2 — Funded, real momentum, different buyer

- **Ollie (ollie.ai)** — the serious money. "90,000+ users" + 4.8 stars from 887 iOS
  ratings (competitor blog citing it, plausible); **funded by Khosla Ventures and the
  Allen Institute for AI**; profiled in the Washington Post (reliable). The most
  well-funded AI meal planner on the market. *But* aimed squarely at the **harried
  family / "what's for dinner" parent**: photo-your-fridge, AI-generates-recipes, not
  precision nutrition. Owns "busy family." Good Measure owns "deliberate cook."
  Different segment.

#### Tier 3 — SEO-heavy, traction-light (solo/small operations)

These flood "best AI meal planner 2026" search results with self-authored comparison
content. That content is what made the category look crowded. Their actual adoption is
near zero. Watch them as feature references, not market threats.

- **FoodiePrep** — feature-complete on paper (import from web/YouTube/IG/TikTok/photo,
  AI weekly planner, pantry, shopping lists, nutrition; iOS+Android+web). Adoption:
  **~12 App Store ratings, ~43 Instagram followers** (verified). A near-twin in
  *features*, a non-entity in *users*.
- **MealThinker** — the closest *philosophical* match found anywhere: solo-built
  conversational AI for "individual health-conscious cooks who want AI that remembers
  their kitchen and tracks nutrition over time," web+iOS+Android, tracks nutrition
  across the day/week and fills gaps. Adoption: **1 App Store rating** (verified). It
  has a dozen sharp comparison blog posts and essentially no users. Priced at
  **$15/mo ($12.50/mo annual)** — see §5, this is the most useful pricing signal in the
  set. Differs from Good Measure: its AI *generates* recipes; no true household model.
- **SummitPlate** — web-only, no app, **solo founder**, ~$8/mo. Nearly everything
  findable about it is its own SEO comparison content. A content play, not a product
  with a base.
- **MealPrepPro / Cooklist** — different jobs entirely (prep/portioning ~$5/mo;
  pantry/barcode tracking). Not really in Good Measure's set. Listed earlier in error.

### Where Good Measure genuinely differs (the four real edges)

1. **Operates on your library, not a generated one.** The funded players (Ollie,
   MealThinker) have their AI *invent* recipes. Good Measure's AI acts on recipes you
   chose and imported, and preserves the original. Control, not discovery.
2. **Precision nutrition is the point, not a badge.** The category treats nutrition as
   decoration (a "Protein 72%" ring). Good Measure calculates to the gram against
   per-person goals with real high-goal/low-goal logic. Cronometer-grade depth that
   nobody in the *planning* category has.
3. **Household is architected, not bolted on.** Shared pantry + library, separate
   per-person plans and goals. Eat This Much is single-person; MealThinker is
   individual; the family apps fake it with a shared login. Genuinely unclaimed.
4. **Taste.** Every app on this shelf looks the same — rounded cards, food photos,
   friendly gradients. Good Measure looks like nothing else. For the specific buyer,
   a real signal.

The product brief's old claim — "no app does recipe-first + planning + household + AI
together" — survives in spirit: no *funded* player holds all four. FoodiePrep gets
close on features but has no users. That four-way combination is still open.

### Verdict

Viable to release — as the precision/control/editorial entry in a category that is
**far less crowded by real products than it looks**. Narrow audience, on purpose. A
real, lovable small product, not a mass-market play; do not build or price it like one.

The two genuine risks are not the ones the search results suggest:
- **(a) The front-door problem** (§2). The headline feature is gated behind developer
  setup.
- **(b) Distribution, not product.** The lesson sitting in MealThinker's single rating:
  you can build a genuinely good conversational nutrition app and still have ~zero users
  because nobody knows it exists. What separates Eat This Much (22k ratings) from
  MealThinker (1 rating) is **distribution**, not quality. This is the muscle the
  category actually demands, and the part of the plan (friends test → Playbook → quiet
  artifact-based social) that matters most — those phases are the distribution
  experiment, not polish.

The moat is the *combination* plus execution quality plus a sustainable distribution
habit — not any single feature.

---

## 1b. Positioning note: the "it forgets you" trap

The entire AI-planner category now markets against general chatbots with one line:
*"ChatGPT/Claude forgets you every conversation; we remember."* (MealThinker leads with
it; Ollie and others echo it.) The market has been trained to distrust "just use your
AI assistant."

This is a **direct hazard for Good Measure's MCP story**, because the MCP path *is*
"use your own Claude" — the exact thing the category has taught people to distrust.

The answer is a reframe, not a retreat: **Good Measure is the memory and the hands.**
The app is the durable, structured store of your kitchen — recipes, pantry, goals, plan,
all persistent. Claude (in-app or via MCP) is only the conversation layer on top of that
store. So the pitch is never "ask a chatbot and hope it remembers." It is "your kitchen
has a real database, and your AI can read and write it." When wiring the in-app chat,
frame it explicitly as operating on durable structured data — that turns the category's
favorite objection into a point in Good Measure's favor.

---

## 2. The front-door problem (the one thing that matters most)

Good Measure's headline feature — AI that reads and writes your plan — is currently
only reachable by installing an npm package and connecting Claude Desktop. That is
developer-grade setup. It means the thing the entire landing page sells is invisible
and inaccessible to almost everyone who isn't Jen or a power-user friend.

**The fix is not to remove MCP. It is to add a second front door to the same tools.**

The hard part is already built: a structured read/write tool layer over the data.
MCP is one entrance (external agent). An in-app chat is a second entrance (a
server-side LLM call against the same tools). Same plumbing, two doors:

- **In-app chat** → the default door. Zero setup. Makes "describe your week and watch
  it fill" real for any user and any tester. This is the launch-critical addition.
- **MCP** → the power-user side door. "Bring Good Measure into your own Claude." Keep
  it, demote it from *the* way to use the AI to *an advanced* way.

This reintroduces per-use API cost, which the original architecture avoided. That is
fine and is what the paywall is for (see §5). The alternative — shipping without an
in-app door — means most users never experience the core feature. Not acceptable for
launch.

---

## 3. Sequenced plan

Ordered so that nothing later is wasted if something earlier invalidates it. Resist
reordering toward the polished-but-internal work; the front door comes first.

### Phase 0 — Decide and scope (now)
- Lock the decisions in this doc (front door, pricing shape, platform order, naming).
- Write the in-app chat brief (one concern, STOP-CHECK gates, as usual).
- Confirm AI provider + cost model for the in-app path. **(Decided: Sonnet 4.6 with
  prompt caching — see §8b.)**

### Phase 0.5 — Pre-pitch fixes (cheap, parallel, do now)
Two small fixes that gate showing the app to anyone outside the current circle. Neither
is the front door; both can run alongside Phase 0.
- **Google auth branding** ($0, config-only). Configure the OAuth consent screen in
  Google Cloud Console + verify the domain. Allow business days for Google verification.
- **First-load performance pass.** The dashboard/planner spinner is a pre-pitch blocker
  (a blogger's first 5 seconds cannot be a spinner). This is a query/loading-pattern
  fix, not a bigger-server fix. Brief, not a bill. See action notes.

### Phase 1 — Build the front door (launch-critical)
- In-app AI chat against the existing tool layer (read + write).
- Confirm-gates on destructive writes (mirror the MCP safety model).
- The empty-week and "seed my rotation" moments wired to the chat, so the landing
  page promise is literally true in the product.
- MCP stays, repositioned in Settings as "Advanced / connect your own AI."

### Phase 2 — Close table-stakes gaps for the audience
- **Per-person dietary restrictions field** on the Person model (already flagged in
  playbook story #6; it is table stakes for households and is how Fig won its base).
- Light pass on first-run: a real person can get from signup to a filled week without
  reading docs.
- Hold the line on *not* adding more internal-depth features here (no new offline,
  strip, or aggregation work until the front door is validated).

### Phase 3 — Test with friends on web/PWA  ← do this BEFORE the native app
- Ship the above to withgoodmeasure.com (already live, already PWA-installable).
- Expand the invite circle. Watch the front door: do non-Jen people reach a filled
  week and a shopping list without help?
- Collect the friction. This is the validation gate for everything after.
- **Auth note:** Google OAuth is in "Testing" status but sign-in works without adding
  testers to the test-user list. The consent screen will show the unbranded
  `…supabase.co` string until public launch (publish + verification) — cosmetic,
  expected, not a blocker for friends. See §10.

### Phase 4 — Native wrap (Capacitor, Track 1)
- Only after Phase 3 signal. Wrap for iOS + Android from the one codebase.
- Phone-led, iPad-supported (see §6). No iPad redesign — let responsive layouts fill.
- Privacy policy expansion, store listings, screenshots, TestFlight + Play Internal.

### Phase 5 — Public-launch prep (parallel-izable with Phase 4)
- RLS implementation (required before public; not a friends-and-family blocker).
- Restore tabbed login, remove invite gate, swap landing CTAs (per auth_and_access.md).
- Pricing/paywall wiring (§5).
- **Publish the Google OAuth app** (Google Auth Platform → Audience → "Publish app"),
  moving it from "Testing" to "In production" so anyone can sign in without being a
  test user. **This is a public-launch step, NOT a testing step** — see §10 for what
  publishing entails (it can trigger Google verification because of the logo + branded
  domains). Bundle with the Supabase custom-auth-domain work here too.
- Playbook stories, competitively positioned (each implicitly: "the thing Eat This
  Much / Paprika / ChatGPT can't do").

---

## 4. Product changes: add / reduce

### Add (only these, only now)
- In-app AI chat (Phase 1) — the single most important addition.
- Per-person dietary restrictions (Phase 2).

### Reduce / freeze
- Freeze new internal-depth features until the front door is validated. The offline
  service worker, monthly zoom-out strip, and added-sugar null-poisoning are excellent
  but they are depth for people already inside the house. The front door is the job.

### Explicitly NOT doing
- No recipe *discovery* / AI recipe *generation*. That is the competitors' game and it
  contradicts the control philosophy. Good Measure operates on your library.
- No coach/B2B tier at launch (real adjacent market later; ignore for now).
- No fight on logging speed, database size, or barcode scanning.

---

## 5. Pricing

The category splits into **two pricing realities**, and the split is the most useful
finding from the research:

- **Non-AI / fixed-library apps** cluster at **~$3–6/mo or ~$40–50/yr** (Mealime
  $2.99–5.99/mo, Plan to Eat ~$49/yr, Paprika pay-once ~$5). These do not run an LLM per
  interaction, so they can be cheap.
- **Conversational-AI apps** charge **$12–15/mo** (MealThinker $15/mo, $12.50 annual;
  Ollie ~$10/mo). Why: running a model on every interaction is genuinely expensive, and
  MealThinker says so explicitly. This is the bucket the in-app chat puts Good Measure in.

The implication: a flat **$4–6/mo "Pro with unlimited AI"** may not cover API cost once
the in-app chat is live and used. Don't blindly match the calorie-tracker price floor.

**Free**
- Full manual app: pantry, recipes, nutrition to the gram, manual weekly planning,
  shopping list, single person.
- Already more precise than most *paid* recipe managers. Let people fall in love with
  the core before paying.

**Pro (the paid tier — exact shape TBD, but built around AI cost reality)**
- Multi-person households, day templates, optimization + meal-prep prompts — the
  non-AI premium features. These are cheap to run and justify a modest base price.
- **The AI execution layer is the cost center.** Three viable structures:
  1. **Metered in-app AI** — Pro at a modest base (~$5–8/mo) with a monthly cap on
     in-app AI actions; heavy users hit a limit or buy more.
  2. **Higher AI tier** — a clearly-named AI plan closer to $8–10/mo if usage is
     uncapped, accepting the category's economics.
  3. **Bring-your-own-AI via MCP as the "unlimited" path** — the structural advantage
     only Good Measure has. Power users connect their own Claude (they pay their own AI
     bill), so "unlimited AI" costs Good Measure nothing. The in-app chat becomes the
     metered convenience for everyone else. This turns the MCP architecture from a
     liability (hard to install) into a pricing asset.
- A **lifetime option** suits a portfolio product where churn-management is unwanted —
  but only price lifetime against the *non-AI* features, or it becomes an unbounded API
  liability. (Lifetime + unlimited in-app AI = you pay forever for a one-time fee. Avoid.)

No $59/mo "Control"-style tier — wrong identity.

> **Open pricing question for §9:** does the in-app AI sit inside one Pro tier (metered),
> or is "bring your own AI via MCP" the unlimited path and in-app AI the metered
> convenience? The second is more defensible given the cost data.

---

## 6. Platform

**Order:** web/PWA testing first → Capacitor wrap after validation. Do **not** build
the native app before friend-testing; it hardens the packaging of an unvalidated core
and adds nothing to feedback collection. The native app is a *distribution* decision,
made after the product is known to work for non-Jen humans.

**Targets:** both phone and iPad, **phone-led.**
- Phone is the daily-use device: cooking, shopping, quick logging. The category lives
  on the phone; store ratings are the credibility and discovery channel.
- iPad earns its place for the two surfaces that need room: the planner matrix and
  recipe compare (already desktop/iPad-only). Suits the "planning the week at the
  table" moment.
- Capacitor yields both from one codebase, so there is no real choice to make. Just do
  not redesign for iPad — let existing responsive layouts fill the space.

Apple Sign-In becomes required once any third-party sign-in is offered in the store
build (already noted as pending). Current login set (email/password + Google + Apple)
is correct. Magic link and iCloud sync: not now (iCloud only matters under Track 2/3,
already deferred).

---

## 7. Naming / URLs / social

- **Primary domain: withgoodmeasure.com.** More brandable, scans as a name not a
  category, and all SEO/OG/email/copy already built around it. Keep goodmeasure.app as
  a redirect to protect the name; do not split identity across both.
- **Social handle: grab `@withgoodmeasure`** to match the primary domain; reserve
  `@goodmeasure.app` pointed at the same place. Domain/handle consistency beats the
  specific string.

---

## 8. Marketing, within the constraints that matter

Constraint, taken seriously: no on-camera, no personal brand. This product does not
need a face. But the governing truth from the research holds: **product quality is not
the bottleneck — distribution is.** MealThinker is a near-identical, genuinely good app
with one rating. So the marketing job is not "is the app good enough to write about." It
is "does the app produce a *demonstrable moment* worth stopping for."

### The demonstrable moment (the only hook that isn't wallpaper)

"AI plans your week" is now a claim every app makes and nobody believes. What is *not*
wallpaper, and what Good Measure uniquely has, is **the agent executing visibly inside
the real app.** The hook is the screen recording where someone types one sentence and
the planner fills itself in, the shopping list writes itself, a meal swaps in place —
real food, real numbers updating to the gram. Competitors cannot show this cleanly:
their AI returns suggestions *in a chat* that you then act on yourself. Good Measure
acts. The category's own reviewers handed over the framing — rival tools "can write a
meal plan as text but cannot act on it." The entire content strategy is proving that
sentence false, on camera, repeatedly.

Two moments, two jobs:
- **Attention** comes from the *executing-agent* clip: empty week → one typed sentence →
  week populates → daily totals land green → shopping list generates. 15–30 seconds.
- **Credibility** comes from *precision*: the exact-number swap ("miso 4 tsp → 2 tsp,
  no-salt beans, 1,858mg → 950mg sodium"). The thing a nutrition-literate viewer knows
  other apps fake.

### Honest expectation

This converts; it probably does not go viral. Meal planning is useful-not-emotional, and
virality needs emotion/controversy/spectacle. The realistic, honest goal: **findable and
convincing to the person already frustrated with ChatGPT meal-planning.** A warm,
high-intent, small audience — which suits the temperament better than chasing reach.

### Content units (all screenshot / screen-recording; no face)

- **"One sentence, one week" clip** — the executing-agent demo, remade per goal
  (high-protein week, lower-sodium week, pescatarian-household week, batch-cook Sunday).
  Each is a post *and* maps onto a Playbook story. This is why the Playbook is the
  marketing engine, not a help doc: write once, deploy as tutorial + carousel + clip.
- **Before/after recipe card** — a nutrition panel before and after optimization with
  the exact swaps. Pinterest/IG carousel format, beautiful given the editorial design,
  pure screenshots.
- **The household angle** — Jen + Garth, one kitchen, two goals, shared pantry. A real,
  relatable story almost no app can tell, and not personal-brand-y. "One dinner that
  hits two different macro targets." This is what makes an account followable vs. a
  brochure.

### Pitching (after a footprint exists — bloggers won't cover a zero-footprint app)

Targets are NOT the big "best nutrition app 2026" review sites — those are pay-to-play
SEO mills (SummitPlate/MealThinker game them). Targets:
- **Individual food / nutrition newsletter writers and small recipe bloggers** with a
  "deliberate cook" audience.
- **AI-tool newsletters** — "I connected Claude to my meal planner and it rewrote my
  week" is genuinely novel to a tech-curious reader. The MCP architecture, a liability
  for normal users, is *interesting* here.

What to hand them: a no-friction account (in-app chat, NOT the MCP install) plus a "try
these three sentences" card so they hit the wow moment in the first 90 seconds. The
top failure mode is signup → no fast wow → silent churn. **Engineer the first 90
seconds.** (This is also why the slow-load fix below is a pre-pitch blocker.)

Sequence: landing page finished → Playbook stories → social built from the stories.

---

## 8b. Cost reality (current figures, June 2026)

Corrected ranking — the worry order ("Claude API biggest, then pay Supabase for auth")
is wrong in a useful way. At friends-and-family scale the all-in is **under $50/mo**.

### Google auth jankiness — $0 to fix (config, not a paywall)

The `…supabase.co` string on the Google consent screen is a configuration gap, not a
missing paid feature. Fix it in Google Cloud Console (OAuth consent screen branding +
domain verification via Search Console); the screen then shows the app name and logo.
Google brand verification can take a few business days, so do it well before any pitch
or launch. Do **not** buy Supabase Pro custom domains ($10/mo) to solve this — that is
not what fixes the branding.

### Infra (Railway + Supabase) — small and gradual

- Railway: usage-based, ~$5/mo floor, realistically $5–20/mo well past test scale.
- Supabase: free now; $25/mo Pro wanted **before public launch** (auth volume, backups,
  no project pausing), NOT for friend testing.
- Estimate: ~$5–10/mo now; ~$30–45/mo at public launch.

### Claude API — the only meaningfully variable cost, smaller than feared

**Model decision: Sonnet 4.6** ($3 input / $15 output per million tokens). Haiku tested
and judged not good enough for this work. Opus is unnecessary for tool-calling against
structured data.

Working estimate per heavy "fill my week" interaction (~15k input incl. system prompt +
recipe/pantry/goal context + tool defs, ~2k output): ~$0.045 in + ~$0.03 out ≈
**~$0.075 per interaction on Sonnet, before caching.**

At test scale (10 testers × ~20 meaningful interactions/mo): **~$10–15/mo on Sonnet.**
A rounding error. It only becomes the dominant line item at public scale with heavy
daily users — which is exactly why §5 routes around it (meter in-app AI; offer
bring-your-own-AI via MCP as the unlimited tier so power users pay their own tokens).
MealThinker charges $15/mo because they eat every token; Good Measure has an escape
hatch they do not.

### Prompt caching — the main lever to cut Sonnet cost

The system prompt and the tool definitions are byte-identical on every call. Cache them:
- Mark the stable prefix (system prompt + tool/schema definitions, and ideally the
  rarely-changing slice of pantry/goals context) with cache control so it is written
  once and **read at ~90% off** on subsequent calls within the cache window.
- Order the request **most-stable-first, most-dynamic-last**: system prompt → tool defs
  → semi-stable user context (pantry, goals) → the volatile turn (the user's actual
  message + current week state). Caching only helps for the unchanged *prefix*, so
  anything that changes per call must come after everything that does not.
- Keep the cached prefix stable across a session so repeated turns in one planning
  session all hit the cache. Re-fetching/re-ordering context differently each call
  silently busts the cache and you pay full input price.
- Net effect: on a multi-turn planning session, turns after the first pay ~10% of input
  cost on the cached portion. Combined with Sonnet's already-modest per-call cost, this
  keeps even an engaged user well inside metered-tier economics.

---

## 9. Open questions to resolve before briefs

1. AI provider + cost ceiling for the in-app chat. Per-user cap? Soft limits on free?
2. Does the in-app chat need full write parity with MCP at launch, or read + a subset
   of writes (add/swap meal, fill week) to start? *(Lean: the subset — read + add meal,
   swap meal, fill week covers the entire landing-page promise with a far smaller, safer
   surface.)*
3. **Pricing structure** (the real fork, per §5): in-app AI metered inside one Pro tier,
   vs. "bring-your-own-AI via MCP" as the unlimited path + in-app AI as metered
   convenience? Subscription only, or subscription + lifetime (lifetime priced against
   non-AI features only)?
4. RLS before or after the first paid users (it is a public-launch blocker either way)?
5. Playbook: how many stories gate the `/playbook` nav entry going live (was ≥4)?
6. **Distribution** (the risk the research surfaced): what is the smallest sustainable
   habit — given the no-camera / no-personal-brand constraint — that gets Good Measure
   in front of people who aren't already friends? This is the muscle that separates the
   22k-rating apps from the 1-rating apps, and it cannot wait until after launch.

---

## 10. Deferred to-dos (parked, not blocking)

Small items surfaced during setup that have a clear path but should not derail the
front-door work. None are launch-critical for friends-and-family testing.

### Auth / email / DNS
- **Google OAuth consent screen logo** — currently a placeholder / wordmark that renders
  wrong (needs a square 120×120 image, not the wide wordmark). Swap to the square `gm`
  icon mark once finalized. Editable anytime in Google Cloud → Google Auth Platform →
  Branding. While in Testing status, changing the logo does **not** trigger Google
  verification. (Verification is only triggered by logo + "In production" + branded
  domains, i.e. at public launch.)
- **Email address for consent screen** — using `hello@jenmurse.com` / interim address
  for now. Switch the support + developer contact to `hello@withgoodmeasure.com` once
  the DNS conflict below is resolved.
- **DNS conflict (root MX vs Railway CNAME)** — `withgoodmeasure.com` root is a served
  Railway domain (CNAME), so Google MX can't be added on the root at Name.com (CNAME +
  MX can't coexist on one host). The app's outbound mail (Resend/Amazon SES) lives
  safely on the `send.` subdomain and is untouched. To get `hello@withgoodmeasure.com`
  inbound: **migrate DNS to Cloudflare** (free; keep Name.com as registrar) for CNAME
  flattening, then add Google MX on root. Do as a focused, standalone task when fresh —
  recreate ALL existing records in Cloudflare first (both Railway CNAMEs, the `send.`
  Resend DKIM/SPF, Railway verify TXTs, DMARC, + new Google MX), verify, then switch
  nameservers. Careless execution can drop the site AND app email.
- **Do NOT remove** the `…supabase.co` entry from Authorized Domains or the `send.`
  mail records — both are load-bearing.
- **Supabase custom auth domain** (kills the `…supabase.co` string in the OAuth
  "to continue to" line). Branding fixed the app name + logo but NOT this — it is the
  callback domain. Requires: Supabase Pro ($10/mo add-on) + a CNAME for an `auth.`
  subdomain (a subdomain CNAME does NOT hit the root conflict, so this is doable on
  Name.com without Cloudflare). **Trigger: bundle with public-launch prep**, when
  Supabase Pro is wanted anyway (backups, auth volume). Not worth paying for Pro early
  just to clean up one line of text for trusted testers.

### Google OAuth: Testing status, test users, and publishing
- **Sign-in works without being on the test-user list** (confirmed in use). The
  test-user list does NOT gate sign-in. (Earlier assumption that it did was wrong.)
- **The branding (name + logo) does not display on the consent screen while in Testing,
  and this is NOT fixable now.** Verified: the branding IS saved, on the correct OAuth
  client ("Good Measure", client `183020483252-…`), in the correct project, with the
  Supabase callback redirect — i.e. nothing is misconfigured. The consent screen still
  shows the `…supabase.co` string in the "continue to" + Privacy/Terms lines because
  Google does not display custom branding for unverified, Testing-status apps (and/or
  normal propagation lag). Conclusion: **cosmetic, expected, resolves at
  publish + verification (Phase 5). No further config reliably changes it now.**
- **Recurring during friend testing (optional):** adding a tester's Google email as a
  test user is only needed if/when Google enforces it; sign-in has worked without it.
  Keep the option in mind but it is not a hard blocker.
- **At public launch — "Publish app" (move Testing → In production).** This is what
  finally shows the branding to everyone AND removes any test-user gate. What it entails:
  - With a logo + branded/authorized domains, publishing **can trigger Google's OAuth
    verification review** — domain-ownership proof, scope justification, sometimes a
    demo video. For basic scopes (email / profile / openid) it is usually lighter, but
    plan for it to take days to weeks; do not trigger it casually.
  - Do it deliberately, bundled with the rest of Phase 5 public-launch prep (RLS,
    invite-gate removal, Supabase custom auth domain), so verification is absorbed once.
  - Until published, the app works fine for friends-and-family. So there is NO reason to
    publish before public launch, and NO reason to keep chasing the branding display.

### Legal / store-prep
- **Terms of Service page** (`/terms`) — not required while invite-only/Testing, but
  required for App Store + Play Store submission and for public launch. Build alongside
  the existing `/privacy` page. Add the link to the OAuth consent screen at that point.
- **Privacy policy expansion** — current `/privacy` exists; expand to meet App
  Store/Play Store requirements before native submission. *(Done June 16, 2026 — see `briefs/going-native-b2-plan.md`.)*

### Brand
- **Favicon / `gm` icon finalization** — explored and liked, not locked. Finalizing it
  also produces the square consent-screen logo above and the eventual app icon.

### Architecture / sync (revisit at Track 2 trigger, NOT pre-launch)
- **Mobile data hygiene (achievable within Track 1, partly = the loading-time fix):**
  Garth's instinct that the phone should "pull data only when it changes" rather than
  re-fetch everything is sound and compatible with the current Railway architecture. It
  is incremental/delta sync + on-device caching — a performance refinement, not a
  rearchitecture. Overlaps with the Phase 0.5 loading-time work (fetch less, fetch
  deltas, cache locally).
- **Household sync — keep Railway as source of truth (now and for a long while).** The
  other half of Garth's idea — sync household members via iCloud (Apple) with a Google
  equivalent for Android — conflates two different things and does not work as imagined:
  - iCloud/CloudKit only syncs ONE person's own Apple devices (iPhone ↔ iPad). It
    CANNOT sync between two different people (Jen ↔ Garth). So it can't do household
    sync at all.
  - Per-platform clouds (CloudKit + Google Drive/Firebase) = the Track 3 model, marked
    "not pursuing" — divergent, messy, no clean cross-person story.
  - The device-owned model that DOES handle cross-person sync is Track 2 (CRDT relay),
    which is the documented later bet (trigger: ~1k users). Its known hard parts
    (foreign-key references, two-people-edit-same-field conflicts) are exactly what
    Garth's iCloud framing runs into.
  - **Conclusion:** Railway-as-truth is the simpler AND more correct answer for
    household sync. Do not reopen the data-architecture question pre-launch. Decision
    already documented in `briefs/_archived/native-app-tracks.md` — **but note that the
    "Railway authoritative" framing is now superseded by `briefs/going-native-b2-plan.md`
    (Supabase-backed, cloud source of truth).** The conclusion still holds: a cloud source
    of truth (not local-first) is the right answer for household sync.
- **Mobile MCP reality (informs the in-app chat priority):** the MCP cannot run on a
  phone — it is an npm package needing a desktop + Claude Desktop. So on iOS/Android the
  in-app chat is the ONLY way the AI experience can exist. This is why the in-app chat
  is launch-critical, not optional. (A remote MCP server for mobile clients is a
  different, far-future architecture — set aside.)
