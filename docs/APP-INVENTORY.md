# Good Measure — Remaining Work

Tracker for what's left to do, design decisions locked, known stragglers, and open questions. For design rules, see [design-system.md](design-system.md) and [feedback_design_system_enforcement.md](feedback_design_system_enforcement.md).

---

## What's left

### In-flight queue: empty

All briefs from the April 26–27 sessions have shipped and verified. The visual reset, onboarding flow, dashboard polish, dialog sweep, empty states, and Person/Invite model are all in production.

What remains is the design pass and a few deferred decisions.

### Queued — design pass across everything

After the in-flight briefs land, the remaining work is no longer a list of small fixes. It's a coherent design pass across the system. Pieces:

**Linework audit.** Walk every key surface and capture what's there: what hairlines exist, what feels under-ruled, what feels over-ruled. Trigger was onboarding chrome feeling lacking but the question opens up: is onboarding under-ruled, or is the rest of the app over-ruled? Document patterns, then standardize.

**Onboarding logo placement.** Tied to linework decision. Options: add hairlines to onboarding so it rhymes with the app, OR quieter chrome that doesn't need rules, OR brand mark redesign that does its own visual work.

**Brand mark question.** Current "Good Measure" wordmark is DM Sans 700 — functional but not identity-forward. Open question: should it be a more designed wordmark (custom letterforms, custom kerning, possibly a small mark) that does heavier lifting? This decision affects auth, onboarding, mobile chrome, and what linework needs to do. Worth pulling references and discussing before committing.

**Mobile cleanup.** Mobile views feel slightly less editorial than desktop. Tension between content-heavy editorial app and mobile app conventions (bottom nav, FABs, bottom sheets). Surfaces to look at: index pages, dashboard, bottom sheets, recipe detail, auth/onboarding. The fix isn't to make mobile feel exactly like desktop — it's to find the mobile expression of the editorial language.

**Type leading consistency.** Leading on big type may differ across landing, auth, and onboarding. Hero on landing might be tighter than the same scale used elsewhere. Worth measuring and standardizing. Small fix with a big impact on whether the system reads as one family.

**Recommended approach:** don't write small briefs for these items individually. They're interrelated. Suggested flow:

1. Audit pass first — walk every surface, take screenshots, annotate
2. Discuss brand mark direction (with references) before committing to other visual decisions
3. Then write the design pass brief(s) — could be one big "Visual coherence pass" or split by area

This pass is post-launch polish, not a launch blocker.

### Deferred indefinitely

**RLS (Row Level Security).** Documented in `rls_plan.md`. Not blocking launch.

**Account deletion strategy.** Tracked in `decisions-pending.md`. Wipe-user dev script handles testing in the meantime.

---

## Design decisions locked

These are settled. Do not re-litigate without a strong reason.

For full rationale and code examples, see `design-system.md`. Headlines:

**From earlier sessions:**
- No page headers on index pages. Dashboard's "Good morning, Jen" is the only h1 moment in the app.
- Sharp is the default shape. Round = identity markers only. Pill = legacy holdover.
- Theme color = identity. Black = everything else. Red/green = semantic.
- Outlined button border = `var(--rule)` (warm grey, never black).
- Settings left rail stays as bare numbered labels. Not adopting the landing's two-column descriptor pattern.
- DESSERT-style category labels are bare eyebrows, no container.
- MCP prompts and paste-notes textareas use the same container (left rule, no fill, sharp).
- Over-limit warnings use margin-note styling (left rule in `--err`, no tinted fill).
- Index pages break to full viewport width. Forms / detail / settings / auth / onboarding stay at 1100px max-width.

**Locked this session (April 26–27):**
- Filled black is reserved for one primary action per page. Outlined is the default for everything else.
- Onboarding wizard is single-column centered, all five steps. Continuity with auth comes from typography, not layout.
- Sage `<em>` accent on onboarding bookends only (Welcome, Complete). Dropped on interior steps.
- Onboarding chrome aligns to content column max-width on each step.
- Person and HouseholdInvite are paired by default. Tracked-only is an explicit Settings-only checkbox.
- Empty state pattern: "An empty X" / "A blank X" headlines with mono eyebrow + DM Sans 500 36px headline + DM Sans 13px lede + outlined CTA. No icons.
- Confirmation dialogs and action dialogs share the same visual language: sharp corners, outlined destructive in `var(--rule)`, ghost cancel, sharp buttons throughout.
- Account deletion strategy is deferred. Wipe-user dev script handles testing.

---

## Open questions

For the next session:

1. **Linework audit framework** — what to measure, what's the criteria for adding or removing rules?
2. **Brand mark** — designed wordmark or stick with DM Sans 700? References to pull?
3. **Mobile editorial expression** — what does the mobile version of this design system look like?
4. **Type leading** — measure the gap between landing/auth/onboarding headlines and standardize
5. **Account deletion** (in `decisions-pending.md`) — when does this need to be answered?

Resolved this session, no longer open:
- ~~Mobile recipes card view~~ — deferred to post-launch design pass
- ~~Onboarding mockup direction~~ — resolved (single-column centered)
- ~~Compare selection overlay~~ — confirmed shipped

---

## How this doc has evolved

The prior `APP-INVENTORY.md` was a 700-line audit at the start of the design reset. Then it became a smaller tracker for what's left. Now most of that tracker has shipped, and the remaining work is a single coherent design pass plus one deferred decision.

After the design pass, this doc may stop being useful as a tracker and become purely historical. At that point, `decisions-pending.md` carries the active forward-looking work.
