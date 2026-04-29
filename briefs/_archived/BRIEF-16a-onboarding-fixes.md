# Brief 16a — Onboarding fixes

Follow-up to Brief 16. Five fixes after first-run review of the implemented onboarding wizard.

## Fixes

### 1. Chrome alignment

The wordmark (top-left) and step counter (top-right) currently sit at the absolute page edges while the content column is centered. This makes the chrome look orphaned from the content — there's a vast empty zone between them.

**Fix:** wordmark and step counter constrain to the same content column max-width as the headline below them. The chrome row sits inside the same centered container, with the wordmark at the left edge of the column and the step counter at the right edge.

Each step has its own content max-width:
- Welcome: 480px
- Profile: 480px
- Household: 520px
- Goals: 560px
- Complete: 480px

The chrome inherits whichever max-width the step uses. So on Goals, the wordmark and step counter sit at the 560px column edges; on Profile, at the 480px column edges.

The chrome row sits at the top of the centered container, with `padding-bottom: 32px` between the chrome row and the content (eyebrow → headline → ...). No border or rule between chrome and content.

Mobile: same pattern, just at narrower widths. Chrome aligns to whatever the content column's mobile width is (full width minus 24px horizontal padding).

### 2. Wordmark size + weight

The current implementation looks too large or weighted differently from auth. Verify and correct against the design system spec:

- Font: DM Sans
- Weight: 700
- Size: 18px (per `design-system.md §1b "Wordmark (auth, onboarding)"`)
- Letter-spacing: `-0.02em`
- Color: `var(--fg)`

Use the shared `<BrandName />` component (or whatever the canonical wordmark component is called in the codebase). Don't hardcode the text or styles inline. If the current implementation hardcodes the wordmark, switch to the shared component so future brand-mark swaps cascade automatically across nav, auth, and onboarding.

### 3. Drop COPY INVITE LINK from member rows

The current Household step has a `COPY INVITE LINK` action on each non-self member row. The action provides no feedback about what was copied or what to do with it, and a new user has no context for the invite link mechanic.

**Remove the action.** Each member row becomes:

- Self row: theme dot + name + `YOU` mono tag right-aligned
- Other member row: theme dot + name + (subtle `✕` remove icon on hover, right-aligned, only on non-self rows)

The "Add another person..." dashed-circle row at the bottom stays as it is.

Inviting members to claim their own login is now handled post-onboarding via the dashboard checklist (covered in Brief 16b).

### 4. Add Settings hint below members list

To make sure users understand they can add and invite people later in Settings, add a small mono caption below the members list:

```
→ ADD AND INVITE PEOPLE ANYTIME IN SETTINGS
```

Spec:
- DM Mono 9px
- Letter-spacing `0.14em`
- `text-transform: uppercase`
- Color: `var(--muted)`
- `margin-top: 16px` from the bottom of the members list
- Left-aligned (intentionally — sits as a footnote to the form, not as centered editorial copy)
- Single string, applies regardless of how many members the user has added

### 5. Adapt Complete screen lede based on household state

The Complete screen currently always shows the same lede ("Now let's add a recipe or two. The dashboard has a checklist to walk you through it."). Adapt it to the user's household state so the next step is relevant to what they actually did.

Three states:

**Solo (just user, no other members added):**
> Now let's add a recipe or two.
> The dashboard has a checklist to walk you through it.

**One uninvited member:**
> First, send {Name} a link to join.
> The dashboard has a checklist to walk you through it.

**Multiple uninvited members:**
> First, send invites to {Name1} and {Name2}.
> The dashboard has a checklist to walk you through it.

(For 3+ members: `{Name1}, {Name2}, and {Name3}` — Oxford comma. If 4+, list all of them — this is onboarding, the count is going to be small.)

The first line uses `<br/>` for the line break, same as other ledes.

The headline ("You're all set.") and the rest of the screen are unchanged. Only the lede adapts.

## Files

- `app/onboarding/page.tsx` — wizard component, all five steps
- `app/components/BrandName.tsx` (or wherever the wordmark component lives) — verify it's used in onboarding
- `globals.css` or onboarding-specific CSS — chrome layout adjustments
- `onboarding.md` — update Layer 1 description: chrome alignment, no invite UI in onboarding, Complete screen adapts to household state
- `design-system.md §8b` — update onboarding wizard description: chrome aligns to content column, no invite UI, Complete lede is state-adaptive

## Acceptance

After merge:

1. Walk through onboarding as a new user. On every step, the wordmark sits directly above where the headline starts (left edge of content column), and the step counter sits directly above where the headline ends (right edge of content column). The page reads as one column.
2. Wordmark is the same size and weight on onboarding as it is on auth. Side-by-side comparison should be indistinguishable.
3. Household step shows the members list without any COPY INVITE LINK actions.
4. Below the members list, the mono caption `→ ADD AND INVITE PEOPLE ANYTIME IN SETTINGS` is visible.
5. Complete screen lede adapts:
   - Solo onboarding: "Now let's add a recipe or two..."
   - One added member: "First, send {Name} a link to join..."
   - Multiple added members: "First, send invites to {Name1} and {Name2}..."
6. `onboarding.md` and `design-system.md §8b` reflect the changes.

## Effort

Small to medium. Chrome layout change is a wrapper restructure. Wordmark verification is quick. Member row simplification is removing UI. Complete screen lede needs the household state passed in. Probably 2–3 hours.
