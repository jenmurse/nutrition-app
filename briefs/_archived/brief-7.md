# Brief 7 — SEO and meta update

**Status:** Ready to ship. Standalone brief, no dependencies.
**Date:** May 2, 2026
**Why now:** The current page title and meta description still describe Good Measure as "a nutrition app for people who actually cook." That framing was removed from the landing in Brief 6. Search results and link previews are still serving the old copy, which contradicts the live page.

---

## Reconciliation

This brief updates the SEO and meta layer to match the landing copy that shipped in Brief 6. It is intentionally narrow:

- **In scope:** page title, meta description, OG card text values (eyebrow + headline).
- **Out of scope:** OG card *image* regeneration, wordmark, favicon. These are gated on the Step 9 wordmark integration pass — when the locked `good · measure` wordmark lands, the OG card image needs to be regenerated. This brief leaves the OG card image as-is (it still uses the placeholder wordmark) but updates the text values that the image generator references.

---

## What's changing

1. **Page title** — replaces the old "nutrition app" framing with the §04 directive.
2. **Meta description** — new descriptive sentence covering precision, weekly planning, and one-or-household parity.
3. **OG card eyebrow text** — replaces `§ A nutrition & meal planning tool` with `§ A cooking tool for households`.
4. **OG card headline text** — replaces the old hero ("A nutrition app for people who actually cook.") with the §04 directive (`Cook by the gram. / Plan by the week.`).
5. **Twitter card** — verify it inherits the same title and description (Next.js metadata API typically handles this; confirm in code).

---

## Locked text values

### Page title

```
Good Measure — Cook by the gram. Plan by the week.
```

51 characters. Within the 50-60 character search results convention.

The em-dash separator is intentional and matches conventional title formatting in browser tabs. (Note: this is the only em-dash in the whole landing-related copy. Em-dashes were stripped from body copy in Brief 6, but the page title em-dash is a typographic separator between brand name and tagline, not a prose dash.)

### Meta description

```
A cooking tool that calculates nutrition to the gram, plans meals by the week, and works whether you're cooking for yourself or a whole household.
```

146 characters. Within the 150-160 character search results convention.

### OG card eyebrow

```
§ A cooking tool for households
```

Replaces the previous `§ A nutrition & meal planning tool` text in the OG card header position.

### OG card headline

```
Cook by the gram.
Plan by the week.
```

Two lines. The line break is intentional (mirrors the §04 headline treatment with `<br />` between the two sentences). In the OG image generation, this likely renders as a `<div>` with two child lines or via a manual line break in the JSX.

Replaces the previous OG headline text.

### OG card wordmark

**Not changed in this brief.** The OG card currently uses the placeholder "Good Measure" DM Sans wordmark. The locked `good · measure` wordmark from `brand-mark-spec.md` will be applied to the OG card during the Step 9 wordmark integration pass. Leave the wordmark generation code as-is in this brief.

Add a code comment in `app/opengraph-image.tsx` near the wordmark rendering:

```tsx
// TODO (Step 9): Replace placeholder wordmark with locked good·measure wordmark per brand-mark-spec.md.
// OG card image needs to be regenerated when this lands.
```

---

## Implementation steps

### Step 1 — Update `lib/seo.ts`

The file should export the default metadata config used by Next.js's metadata API. Find and update:

- **`title`** (or `title.default` if using template form) → `'Good Measure — Cook by the gram. Plan by the week.'`
- **`description`** → `'A cooking tool that calculates nutrition to the gram, plans meals by the week, and works whether you\'re cooking for yourself or a whole household.'`
- **`openGraph.title`** → same value as `title` above (or omit if it inherits from `title`)
- **`openGraph.description`** → same value as `description` above (or omit if it inherits)
- **`twitter.title`** → same value as `title` (or omit if it inherits)
- **`twitter.description`** → same value as `description` (or omit if it inherits)

If `lib/seo.ts` exports per-route metadata helpers, update only the default/landing metadata. Per-page overrides for in-app routes (Recipes, Pantry, Planner, etc.) are out of scope — those keep their existing per-page metadata.

**Note on the apostrophe in "you're":** if the description is stored as a JavaScript string, escape the apostrophe (`you\'re`) or use double quotes for the string literal (`"...whether you're cooking..."`). Either is fine.

### Step 2 — Update `app/opengraph-image.tsx`

The file generates the dynamic OG card image (1200×630). Find and update the text values:

- **Eyebrow text** → `'§ A cooking tool for households'` (replace whatever string is currently rendered as the eyebrow)
- **Headline text** → `'Cook by the gram.'` and `'Plan by the week.'` rendered on two lines (replace whatever string is currently rendered as the main headline)

The headline likely renders as JSX inside the OG image generator. Two sentences, two lines — implementation pattern depends on what's already there. If the existing code renders a single string, split into two `<div>` or `<span>` elements stacked vertically. If the existing code already supports multi-line, use whatever pattern is in place.

**Do not change** the wordmark, the dot, the typography (DM Sans 700 56px headline per brand-mark-spec.md §5), the layout, or the colors. Only the text strings.

Add the TODO comment near the wordmark code as noted above.

### Step 3 — Verify Twitter card

Twitter cards use Open Graph metadata by default in Next.js. Confirm that `lib/seo.ts` doesn't have separate Twitter-specific overrides that point to old copy. If it does, update them to match the new title and description.

If Twitter uses a separate image (Twitter card image vs. OG image), check whether they're different files. If they're separate, update both to match the new text values. If Twitter inherits the OG image, no extra work needed.

### Step 4 — Local test

Build and run the app locally:

```bash
npm run build
npm run start
```

Then verify:

1. **Browser tab title** — open the landing page locally; the browser tab should show `Good Measure — Cook by the gram. Plan by the week.`
2. **View page source** — confirm the `<title>` tag and `<meta name="description" content="...">` tag match the locked text exactly.
3. **OG metadata** — view source and confirm `<meta property="og:title">` and `<meta property="og:description">` match.
4. **OG image URL** — find the `<meta property="og:image">` tag and visit the URL directly in the browser. The OG image should render with the new eyebrow and headline text. The wordmark should still be the placeholder (this is expected; Step 9 handles the wordmark).

### Step 5 — Production verify (after deploy)

Once deployed:

1. **Run the live URL through a link preview tester.** Use https://www.opengraph.xyz/ or similar. The preview should show:
   - Title: `Good Measure — Cook by the gram. Plan by the week.`
   - Description: the new meta description
   - OG image: the regenerated card with the new eyebrow and headline (placeholder wordmark still acceptable)

2. **Check browser tab and bookmark behavior.** When the page is bookmarked, the new title should be what gets saved.

3. **Note on search engine propagation:** Google and other search engines do not recrawl immediately. The new title and description may take days or weeks to appear in search results. This is expected; nothing else needs to be done.

---

## Verification checklist

Before declaring done:

1. **`lib/seo.ts` updated** — page title, meta description, OG title, OG description all match the locked text exactly.
2. **`app/opengraph-image.tsx` updated** — eyebrow text and headline text match the locked text exactly.
3. **TODO comment added** to `app/opengraph-image.tsx` flagging that the wordmark needs updating in Step 9.
4. **Twitter card verified** — either inherits OG values correctly, or has its own values updated to match.
5. **Local build passes** — no TypeScript errors, no runtime errors.
6. **View source check** — `<title>`, `<meta name="description">`, `<meta property="og:title">`, `<meta property="og:description">` all match locked text in the rendered HTML.
7. **OG image renders** — visiting the OG image URL directly shows an image with the new eyebrow and headline text. Wordmark is still placeholder; this is expected.

---

## What this brief does NOT do

- Does not regenerate the OG card image with the locked wordmark (deferred to Step 9).
- Does not update favicon (Step 9 / brand mark spec already covers this).
- Does not touch per-page metadata for in-app routes (Recipes, Pantry, Planner, Settings, etc.) — only the landing page default.
- Does not modify the `<BrandName />` component or any wordmark code (Step 9).
- Does not change the OG image dimensions, layout, typography, or colors — only the text strings.

---

## After this brief lands

- Search results and link previews update over time as crawlers recrawl.
- The OG card image still uses the placeholder wordmark; Step 9 will regenerate it.
- APP-INVENTORY can be updated to note that SEO/meta has been refreshed and that OG image regeneration is gated on Step 9 wordmark integration.

The next planned step in the master plan is Step 9 (Wordmark integration pass), which will:
1. Apply the locked wordmark across landing nav, auth topbar, onboarding topbar, app nav.
2. Regenerate the OG card image with the new wordmark.
3. Regenerate the favicon at all sizes per brand-mark-spec.md.
