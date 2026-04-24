# Briefs — README addendum for Session 3 (index pages)

Add these rows to the existing brief table in `briefs/README.md`:

| # | Brief | Status | Est. time | Depends on |
|---|-------|--------|-----------|-----------|
| 06 | Toolbar primitives — sharp buttons, hairline selectors | Ready | 2–3 hrs | — |
| 07 | Pantry grid — kill the cards | Ready | 1–2 hrs | 06 |
| 08 | Recipes list — add nutrition values, unify with pantry | Ready | 1 hr | 06 |
| 09 | Recipes grid — ruled cells, ghost tile alignment | Ready | 1–2 hrs | 06 |

Add this session block to the execution order section:

### Session 3 — Index pages (desktop)

Can all be done in a single session, but 06 is the foundation and must merge before the others can even be meaningfully reviewed.

1. **BRIEF-06** — Toolbar primitives. Sharpens buttons and flattens selectors across the app's shared chrome. Foundation for 07, 08, 09. Verifiable on its own without page-specific work.
2. **BRIEF-07** — Pantry grid card kill. Converts the current card-tile layout to a ruled 4-column grid. Landing's Fig. 01 is the visual target.
3. **BRIEF-08** — Recipes list nutrition. Adds the missing 4-value scan row and moves category after the name.
4. **BRIEF-09** — Recipes grid sharpening. Same ruled-grid treatment as pantry, but photos stay dominant.

After session 3: the four primary index pages (Recipes grid, Recipes list, Pantry grid, Pantry list) all share the same toolbar primitives and the same typographic pattern. The app's index surfaces are brought into alignment with landing Figs. 01–03.

### Still deferred after session 3

- Planner toolbar — its own brief (JEN/GARTH/EVERYONE person switcher is the one place pills survive by design)
- Planner meal entries (desktop) — convert padded tiles to ruled rows matching mobile
- MCP prompt cards on recipe detail — convert tinted-cream boxes to ruled/margin-note styling
- Over-limit warning blocks in planner nutrition drawer — red-tinted backgrounds to left-border margin-note styling
- Auth page redesign — split editorial layout, P0 before public launch
- Onboarding typography + copy pass
- Empty states — typographic treatments replacing illustrated icons
- Compare selection overlay — the dark-pill selection mode is the weakest surface in the app
- Mobile pass — currently behind desktop on register; separate effort once desktop is locked

## Mock reference

`design-mocks/app-index-pages-v1.html` — approved mockup for all four briefs (06–09) plus a canonical button-system inventory (Fig. 05). Drop this file into the repo at `design-mocks/` (or wherever design mocks live; if no such folder exists, create it) so future design questions can reference a stable visual source of truth.
