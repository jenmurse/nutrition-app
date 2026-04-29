# Brief 15 — Button rule revision

## What's changing

The button rule is being reframed.

**Old rule:** filled black is the default. Outlined is a variant for secondary, equal-weight, and icon toolbar buttons.

**New rule:** filled black is reserved for the single primary action on a page. Outlined is everything else.

This is not a new visual treatment. Both filled and outlined already exist in the system (`.btn-primary` and `.btn-outline`). The rule for *when to use which* is what's changing.

## Why

The current toolbar `+ NEW` button on the index pages (Recipes, Pantry, Planner) reads as the heaviest thing on the page when it shouldn't be. The toolbar is utility chrome — counts, sort controls, view toggles, search, and the new action. None of those are dramatic. Putting a filled black rectangle at the end was making the row feel right-weighted and was competing for attention with the actual page content.

The same problem shows up on the landing page mobile nav, where a filled black GET STARTED in the nav corner sits within 100 vertical pixels of the hero's filled black GET STARTED. Two primaries arguing.

The new rule resolves both. One filled button per page, located where the primary action actually lives.

## Changes

### 1. App toolbar `+ NEW` buttons → outlined

Three places:

- `app/recipes/page.tsx` — toolbar `+ NEW`
- `app/pantry/page.tsx` — toolbar `+ NEW`
- `app/planner/page.tsx` — toolbar `+ NEW PLAN`

Switch each from `.btn-primary` (or whatever inline filled treatment is there) to `.btn-outline`. No size, padding, or font change — only the visual treatment swaps. Hover behavior of `.btn-outline` is `border-color: var(--rule)` → `var(--fg)` which is correct.

### 2. Mobile FAB stays filled

The mobile FAB (`+ New` on Recipes and Pantry list pages) is the *only* primary action visible on the mobile screen. It stays filled. No change.

### 3. Landing nav — remove GET STARTED, replace with SIGN IN

In `app/page.tsx` (the landing) or wherever the landing nav lives:

- Remove the GET STARTED button from the nav.
- Add a `SIGN IN` mono link in its place. DM Mono 9px, letter-spacing 0.14em, uppercase, color `var(--muted)`. Link target: `/login`.
- Hover: color → `var(--fg)`.

The hero GET STARTED button stays filled black and stays as it is. It's the page primary.

This applies to **both** desktop and mobile nav on the landing.

### 4. Design system update

In `design-system.md`, replace §5a Buttons' framing of when to use each variant.

**Find this section** (currently reads roughly):

> **One primitive: sharp black rectangle.** Sized to content. `padding: 8px 14px`. `border-radius: 0`. DM Mono 9px uppercase.
>
> [.btn-primary CSS]
>
> **Outlined variant** (secondary, equal-weight, icon toolbar buttons):
>
> [.btn-outline CSS]

**Replace the framing with:**

> **One primary per page.** The filled black rectangle (`.btn-primary`) is reserved for the single primary action on a given page or modal — auth submit, modal confirm, recipe form Save, onboarding CONTINUE, landing hero GET STARTED, mobile FAB. Outlined (`.btn-outline`) is everything else: toolbar `+ NEW` actions on index pages, recipe detail Edit/Duplicate/Delete, secondary actions in modals, all in-app utility actions.
>
> If a page has two filled black buttons fighting for attention, one of them is wrong. Demote whichever is the supporting action to outlined.
>
> [.btn-primary CSS unchanged]
>
> **Outlined variant.** The default for all in-app buttons that are not the page primary.
>
> [.btn-outline CSS unchanged]

Keep the existing CSS code blocks for both variants — the styling itself doesn't change, only the surrounding prose.

Also update §12 "What this system does NOT include" if the bullet about coral primary CTAs needs adjustment for clarity. Otherwise leave §12 alone.

### 5. Inventory tracker update

In `APP-INVENTORY.md` under "Known stragglers being mopped up", add a line:

```
- ✅ Toolbar + NEW buttons → outlined per Brief 15 (shipped)
- ✅ Landing nav GET STARTED → SIGN IN link per Brief 15 (shipped)
```

And in the "Design decisions locked" list, add:

```
- **Filled black is reserved for one primary action per page.** Outlined is the default for everything else, including toolbar `+ NEW` actions on index pages. See `design-system.md §5a`.
```

## What's NOT changing

- `.btn-primary` and `.btn-outline` CSS classes themselves — same styling
- Auth submit button — stays filled, it's the page primary
- Modal primary buttons — stay filled
- Recipe form Save button — stays filled
- Recipe detail Edit / Duplicate / Delete — already outlined, stays outlined
- Mobile FAB — stays filled, it's the only primary on mobile index pages
- Landing hero GET STARTED button — stays filled
- Filter chips, tabs, ghost buttons — no change
- Destructive button treatment — no change

## Acceptance

After merge:

1. Open `/recipes`, `/pantry`, `/planner` on desktop. The toolbar `+ NEW` button on each is outlined (warm grey border, paper bg, black text). On hover, border darkens to `var(--fg)`.
2. Open the same pages on mobile. The bottom-right FAB is still filled black circular. Unchanged.
3. Open the landing page (`withgoodmeasure.com`) on mobile. The nav has the wordmark on the left and a `SIGN IN` mono link on the right. No filled GET STARTED button in the nav.
4. The hero GET STARTED button below is still filled black and is the only filled CTA on the screen.
5. Same on landing desktop.
6. `design-system.md §5a` reflects the new framing.
7. `APP-INVENTORY.md` has the two new shipped items and the new locked decision.

## Effort

Small. CSS class swaps on 3 pages + landing nav restructure + doc updates. Should be 1–2 hours total.
