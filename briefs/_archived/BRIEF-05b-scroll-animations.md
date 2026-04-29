# Landing v5 — Scroll Animation Notes

*Companion to BRIEF-05. Phase-2 motion layer — implement after the basic landing ports and works with simple IntersectionObserver reveals.*

These animations should be **layered in after** the initial landing page is working with the mock's basic `.r` fade-up reveals. Don't try to land all of this in the first PR — get the page working first, then enrich motion in a follow-up pass.

## Library choice

Use **GSAP ScrollTrigger** or **Motion One**, whichever the Next.js app is already using — check `package.json` before adding a dependency. If nothing is installed, **Motion One** is the better default: smaller bundle (~6kb gzipped vs GSAP's ~40kb), uses the Web Animations API natively, and its API is well-suited to the kind of restrained editorial motion described here.

If animations get more complex than what Motion One handles comfortably (chained timelines, scroll-driven scrubbing across multiple elements), switch to GSAP.

## Principles

- **Restraint is the point.** These animations should feel editorial, not showy. If it reminds the viewer of an Awwwards site, it's wrong. If it reminds them of a well-made book or a gallery catalog, it's right.
- **Every motion must be skippable** via `prefers-reduced-motion: reduce`. Check this before registering any ScrollTrigger or animation. The existing CSS scaffolding in the mock already handles reveal reduced-motion; port that pattern.
- **Nothing should block content.** All motion begins from a "good enough" static state so if JS fails or is disabled, the page still reads correctly. The page must be fully functional with JS disabled.
- **Performance budget:** total motion layer should stay under 30kb gzipped and avoid triggering layout thrash. Prefer `transform` and `opacity` only; no animating `width`, `height`, `top`, `left`.

## Proposed animations, by section

### 1. Hero type — word-by-word reveal

Currently the hero type fades up as one block. Instead, stagger each **word** with a short delay (40–60ms apart), each with a subtle `y: 24px → 0` and `opacity: 0 → 1`. Duration ~600ms per word, cubic-bezier(0.23, 1, 0.32, 1). The word "actually" (the one accent moment, styled with `<em>` in sage) should reveal *last* with a slightly longer delay, so the sage-colored word lands as a beat.

### 2. Ticker — already infinite, leave it

No scroll animation needed. Existing CSS animation is correct. Reduced-motion already kills it.

### 3. Manifesto — line-by-line reveal

The four lines of the manifesto should reveal sequentially as the section enters the viewport. Stagger ~120ms per line. The payoff lines (lines 3–4, the ones that complete the thought) should land with a slightly stronger emphasis — small y-shift on the first two lines, bigger y-shift + a touch more delay on the payoff, so it feels like the sentence completes with weight.

### 4. Chapter figures — parallax sticky column

The sticky figure column (`.ch-vis-sticky`) currently just sticks. Layer in **a very subtle parallax differential** — the figures move at ~0.95× the scroll speed of the text column. Not more. The effect should be barely perceptible; it's about depth, not drama. Test with real users — if anyone notices it consciously, dial it back.

### 5. Figure captions — reveal under the figure

Each `.ch-caption` should fade in with a slight y-shift *after* its figure has entered the viewport, with a ~200ms delay. Feels like the caption is written after the image is placed.

### 6. Optimization table numbers — count up

The numbers in `.opt-trow` (calorie deltas, sugar deltas) should count up from 0 to their final values when the table enters the viewport. Use an easing curve (cubic-out) over ~1.2s. The `↓ 68 kcal` and `↓ 3.2g ✓` deltas should animate slightly slower than the others (they're the payoff).

### 7. Pull-quote — scale + reveal

The pull-quote (`Cook by the gram. / Plan by the week.`) enters with both lines starting at `scale(0.98)` and `opacity: 0`, landing at `scale(1)` and full opacity. Stagger the two lines ~200ms apart. The word "gram" (accent color) can have an extra 100ms delay so it pops last. Duration ~800ms per line.

### 8. Close — quiet fade

The close section should have the least motion. Headline fades up, body text fades up after a short delay, signature fades in last. No parallax, no counting, no scale. This is the invitation — it should arrive calmly.

## Things to explicitly NOT do

- ❌ Full-page horizontal scroll sections
- ❌ Scrolljacking (hijacking the browser's natural scroll speed)
- ❌ Elements that rotate as you scroll
- ❌ Pinned sections that hold the viewport while content plays
- ❌ Cursor-following effects
- ❌ Animated borders, underlines-on-hover with fancy easing, or anything on buttons beyond the existing arrow translate
- ❌ Any motion that makes the reader feel the page is "happening to them" rather than responding to their reading

## Implementation order (when the time comes)

Do these in this order, landing each one independently and testing before moving on:

1. **Hero word-by-word reveal** — highest impact, lowest risk; validates the motion library choice
2. **Manifesto line-by-line reveal** — extends the same technique
3. **Pull-quote scale + reveal** — one contained section, easy to get right
4. **Figure parallax differential** — the most subtle, needs careful tuning
5. **Optimization numbers count-up** — more complex (scroll-triggered count animation)
6. **Figure caption after-reveal** — coordinates with figure entrance
7. **Close fade** — the quietest, but deserves care

After any one of these lands, **visually check the entire page** — not just the section that changed — to make sure the overall motion register still feels restrained. If the cumulative effect starts feeling busy, dial back the recent addition.

## Deferred from earlier drafts

An earlier version of this doc proposed animating tick marks on a ruler element in the left margin. The ruler itself was subsequently killed from the v5 mock (user flagged it as "you don't measure food with rulers"). Don't reintroduce ruler motion; there is no ruler.
