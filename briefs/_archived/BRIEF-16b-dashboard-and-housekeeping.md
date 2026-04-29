# Brief 16b — Dashboard first-run polish + user lifecycle housekeeping

Bundles dashboard fixes (P1 visible issues) with three small housekeeping items related to user lifecycle (schema default flip, dev wipe-user script, deletion policy decision tracker).

**Important: this brief depends on the onboarding persistence bug being fixed first.** The household-invite checklist work assumes household members are actually being saved to the database. If you receive this brief and the persistence bug is still open, surface that and pause this work until it merges.

---

## Part 1 — Dashboard polish

### 1. Don't auto-select dashboard stats

**Current:** New users land on the dashboard with 3 stats already selected (calories, sugar, protein). The "Choose 3 dashboard stats" checklist task is auto-checked even though the user hasn't engaged with that decision. Settings → Dashboard reads "3 OF 3 SELECTED."

**Fix:** New users land with no stats configured. Dashboard renders an empty state until the user picks 3 in Settings → Dashboard. The checklist task is genuinely incomplete on first login.

**Empty state for stats area:**

```
§ DASHBOARD STATS

Choose 3 stats to track here.

[CHOOSE STATS →]
```

- Eyebrow `§ DASHBOARD STATS` — DM Mono 9px `var(--muted)`
- Body line — DM Sans 13px `var(--fg-2)`
- `CHOOSE STATS →` link — DM Mono 9px `var(--fg)`, navigates to Settings → Dashboard
- Container — ruled-block treatment (left rule `var(--rule)`, no fill, sharp)
- Sits in the same vertical position the populated stats strip would

After the user picks stats, the empty state is replaced by the populated stats strip on next render.

**Implementation:** the localStorage check (`dashboard-stats` key with `enabledStats` array) currently defaults to a populated array. Change the default to an empty array (or null), and have the dashboard render the empty state when the array is empty. The Settings → Dashboard count should also read 0/3 by default.

### 2. Add household-invite tasks to checklist

To replace the invite UI removed from onboarding, the dashboard checklist becomes the place where users send invites.

**For each uninvited household member, a row at the top of the checklist:**

```
☐  Send {Name} an invite                         >
```

Click behavior: row expands inline (or opens a small panel) showing:

- Invite link in a ruled-block container (left rule, no fill, sharp), DM Mono 11px, the full URL
- A `COPY LINK` button to the right (sharp outlined)
- Caption below: `Send this link to {Name} so they can set up their own login.`

Clicking COPY LINK:

- Copies the link to clipboard
- Marks the task as complete (writes `inviteSentAt` timestamp on the HouseholdInvite record, or whichever field signals "user has sent this")
- Row collapses and shows the checked state
- The invite is also accessible later via Settings → People (existing flow); clicking COPY there does not affect checklist state, just re-copies the link

Per-member rows: if Jen has Garth and Theo as uninvited members, two separate rows appear. Each completes independently. Rows disappear when the corresponding member's invite is marked sent.

**Position in the checklist:** household-invite tasks come first, before the existing tasks. Order:

1. Send {Name} an invite (one row per uninvited member)
2. Set nutrition goals (auto-completes from onboarding Goals step)
3. Import your first recipe
4. Add your first ingredient
5. Plan your first week
6. Choose 3 dashboard stats (no longer auto-checked — see fix 1)
7. Set up AI optimization (optional, marked as such)

**Backend dependency:** confirm whether `HouseholdInvite` has a "sent" field. If not, add `inviteSentAt: DateTime?` to the model. The checklist task reads this field. The invite link itself should be generated server-side when the household member is created — verify this is happening.

### 3. Demote coral on the checklist

Per the locked color rule (theme color = identity, black = everything else, semantic = red/green only):

- **Checked checkmark:** black per the existing checkbox spec in `design-system.md §5f`. Background `var(--fg)`, check stroke `var(--bg)`.
- **Progress bar:** filled portion `var(--fg)` (black). Track `var(--rule)`.
- **"2 OF 5" pill:** drop the pill background entirely. Replace with a bare DM Mono label `2 / 5` in `var(--muted)`, no background, no border, no padding.

### 4. Padding fix between checklist and date

Currently the bottom of the checklist card sits flush with "MONDAY, APRIL 27, 2026" below it.

**Fix:** add `margin-top: 32px` to the date line, or equivalent `margin-bottom` on the checklist container. Verify in the browser and adjust to taste; 40px is acceptable if 32 looks too tight.

### 5. Stats cards baseline

In zero state (calories: 0, sugar: 0g, protein: 0g), the stats cards have no progress bar and no bottom border. When values are populated, a coral progress bar appears.

**Fix:** render the progress bar in zero state. Full-width 2px bar at `var(--rule)`, 0% filled. Same component, just always-rendered baseline whether the value is 0 or populated. When the value is non-zero, the filled portion is `var(--fg)` (black), not coral.

---

## Part 2 — User lifecycle housekeeping

### 6. Flip `Person.onboardingComplete` schema default

**Where:** `prisma/schema.prisma`, on the `Person` model.

**Current:**
```prisma
onboardingComplete Boolean @default(true)
```

**Change to:**
```prisma
onboardingComplete Boolean @default(false)
```

**Why:** the safe default for a brand-new Person is "not onboarded yet." Currently `provisionUser` always sets it explicitly, so the default never kicks in — but that's a convention waiting to be broken by a future code path (seed script, admin tool, new signup flow, MCP tool, etc.). One-line change, one migration, zero runtime risk because no current code relies on the default.

**Migration:**
```
npx prisma migrate dev --name flip_onboarding_default
```

Existing rows are unaffected; the migration only changes the default for future inserts.

### 7. Add `scripts/dev/wipe-user.ts`

**Where:** new file at `scripts/dev/wipe-user.ts`

**Purpose:** dev/test tool for clearing test accounts. Replaces the manual FK-chasing required during testing today.

**Implementation:**
```ts
// scripts/dev/wipe-user.ts
import { prisma } from "@/lib/prisma";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run in production.");
  process.exit(1);
}

async function wipeUser(email: string) {
  await prisma.$transaction(async (tx) => {
    const person = await tx.person.findFirst({ where: { email } });
    if (!person) {
      console.log(`No person found for ${email}`);
      return;
    }
    await tx.householdInvite.deleteMany({ where: { createdBy: person.id } });
    await tx.householdMember.deleteMany({ where: { personId: person.id } });
    await tx.mealLog.deleteMany({ where: { personId: person.id } });
    await tx.mealPlan.deleteMany({ where: { personId: person.id } });
    await tx.nutritionGoal.deleteMany({ where: { personId: person.id } });
    await tx.recipeFavorite.deleteMany({ where: { personId: person.id } });
    // Add additional FK cleanup as schema grows
    await tx.person.delete({ where: { id: person.id } });
    console.log(`Wiped ${email}`);
  });
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx scripts/dev/wipe-user.ts <email>");
  process.exit(1);
}
wipeUser(email).catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Important:**

- File lives in `scripts/dev/` so it's clearly a dev tool, not a production utility
- Hard-gated on `NODE_ENV !== 'production'` — refuses to run otherwise
- Does NOT use cascade deletes on the schema. The FK behavior in production remains restrictive (intentional — accidental Person deletes should fail loudly, not silently nuke history)
- Audit the FK list as the schema grows. Add new related tables to the transaction as needed.

**Usage:**
```
npx tsx scripts/dev/wipe-user.ts hello@example.com
```

### 8. Create `decisions-pending.md`

**Where:** project root, alongside `MEMORY.md` and other doc files.

**Purpose:** tracker for product/architecture decisions that have been deferred but need to be made before launch. First entry is account deletion strategy.

**Content:**

```markdown
# Decisions Pending

Tracker for product and architecture decisions that have been deferred but need to be made before public launch (or shortly after). Each entry should capture the question, why it's deferred, and what triggers needing to decide.

---

## Account deletion strategy

**Question:** What does "deleting a user" mean in production? Three competing answers:

1. **Cascade delete** — `onDelete: Cascade` on FK relations. Deleting a Person automatically removes their meal plans, logs, goals, etc. Aggressive and irreversible. Easy to implement, dangerous in production.
2. **SetNull on audit fields, cascade on personal data** — preserves shared artifacts (e.g., Recipes Garth created stay in Jen's library with `createdBy = null`) but removes Garth's personal data (his meal logs, goals). Mixed approach.
3. **Soft delete** — mark `deletedAt` timestamp, hide from queries, retain everything for recovery. Standard consumer-app pattern. Adds complexity to every query.

**Why deferred:** product decisions about GDPR, account deletion UX, and data retention policy aren't made yet. Picking a cascade policy commits to answers we haven't given.

**Current workaround:** `scripts/dev/wipe-user.ts` handles testing. Production has no user-facing deletion UI yet.

**Triggers needing to decide:**
- A user requests account deletion (GDPR right-to-be-forgotten)
- We add a "Delete account" button anywhere in Settings
- We need to comply with regional data laws

**Owner:** Jen

---

(Add new entries below as decisions get deferred.)
```

---

## Files affected

Dashboard polish:
- `app/page.tsx` (dashboard) — empty state for stats, checklist position, date margin
- `app/components/GettingStartedCard.tsx` — task list, household-invite rows, color demotion, layout
- `app/components/StatsStrip.tsx` (or wherever stats cards live) — baseline progress bar, color from coral to black
- `app/api/onboarding/route.ts` — household-invite status in checklist API response
- `prisma/schema.prisma` — `inviteSentAt` field on `HouseholdInvite` if not present
- `lib/dashboard-stats.ts` (or wherever localStorage logic lives) — default to empty array

Housekeeping:
- `prisma/schema.prisma` — flip `onboardingComplete` default
- `prisma/migrations/...` — generated migration file
- `scripts/dev/wipe-user.ts` — new file
- `decisions-pending.md` — new file at project root

Docs:
- `onboarding.md` — Layer 2 checklist tasks list
- `design-system.md §8c` — dashboard description: stats cards always have baseline, checklist is monochrome
- `MEMORY.md` — add `decisions-pending.md` to the doc index

## Acceptance

### Dashboard polish

1. Sign up as a new user, complete onboarding solo. Dashboard renders with no stats configured — shows empty state with `CHOOSE STATS →` link.
2. Settings → Dashboard reads `0 OF 3 SELECTED` until user picks stats.
3. After picking 3 stats in Settings, dashboard renders populated stats strip. Checklist task is now checked.
4. Sign up with 1 household member added during onboarding. Dashboard checklist shows "Send {Name} an invite" as the first task.
5. Click the row. Expands to show invite link, COPY LINK button, caption.
6. Click COPY LINK. Link copied to clipboard. Row collapses, checked state.
7. Sign up with 2 members. Two separate "Send {Name} an invite" rows appear, complete independently.
8. Checklist visual: checkmarks black, progress bar black, "2 / 5" bare mono no pill.
9. Margin between checklist and date is visible.
10. Stats cards in zero state show a hairline baseline. When populated, filled portion is black.

### Housekeeping

11. `prisma/schema.prisma` shows `onboardingComplete Boolean @default(false)`.
12. New migration file exists in `prisma/migrations/` for the default flip.
13. `scripts/dev/wipe-user.ts` runs successfully on a test account in dev. Refuses to run with `NODE_ENV=production`.
14. `decisions-pending.md` exists at project root with the account deletion entry.
15. `MEMORY.md` references `decisions-pending.md`.
16. `onboarding.md` and `design-system.md §8c` reflect the new dashboard spec.

## Effort

Medium to large. Dashboard polish is the main work — the household-invite-from-checklist interaction depends on the persistence bug being fixed and may require backend changes (`inviteSentAt` field). Housekeeping items are tiny but worth bundling for fewer round-trips. Probably 5–7 hours total.
