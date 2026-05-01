# BRIEF X2-2 — Dead code sweep: codebase + briefs archive

**Status:** Backlog. Originally filed during 3B verification; revised April 30, 2026 after Step 3 progress.
**Part of:** Code hygiene, post-Step 3.
**Scope:** Single PR. Codebase-wide sweep for dead code: unused CSS modules, unimported components, orphaned utilities, superseded brief drafts.
**Depends on:** Step 3 fully merged (3A, 3B, 3D-2, 3D-3, 3E-2, 3F-2, 3G-2). The Step 3 work both creates and resolves dead code; running this sweep after Step 3 lands captures both.
**Blocks:** Nothing.
**Supersedes:** brief-X2-dead-code-sweep.md (original draft).

---

## Why this brief

During 3B's hardcoded-color audit, the implementer surfaced `meal-plans.module.css` containing 39 hardcoded color values from a Material Design palette — and the file is not imported anywhere in the active codebase. Dead code, sitting in the repo from a feature that got rewritten.

This is a tell. When one file with 39 hits is dead, there are likely other dead files. Codebases accumulate this stuff: a feature that got rewritten, a component that got replaced, a CSS module that got renamed. The original files don't always get deleted because no one's sure if something still references them.

Step 3 added more candidates. The Step One/Step Two collapse in 3D-2 likely orphaned route components. The auth rebuild in 3E-2 may have left old layout components. The onboarding topbar simplification in 3F-2 dropped `§ ONBOARDING` and any class scoped to render it. None of these were guaranteed-cleaned during their respective PRs because the focus was on getting the new pattern shipped, not on hunting down everything the new pattern replaced.

This brief is the periodic sweep. Find the dead code, confirm it's actually dead, delete it. Reduces surface area for future audits and removes the question "is this used somewhere I'm not looking?" from every future change.

## Known dead-code candidates (Step 3 fallout)

**High-confidence:**

- `meal-plans.module.css` — surfaced by 3B, 39 hardcoded colors, not imported. Confirmed dead before Step 3 even started.
- **Add Meal Step One components from 3D-2's collapse.** The Step One/Step Two two-route flow was replaced by a single Add Meal route with a left rail. Whatever component(s) rendered "Pick a meal type." (Step One) on desktop are likely now orphaned. Search for the route handler, the page component, and any associated CSS.
- **The `--motion-step` Step One → Step Two transition keyframes** if they had their own dedicated keyframe definitions. **NOTE:** the `--motion-step` token itself stays — brief 3D-3 reintroduces it for the mobile Screen 1 ↔ Screen 2 transition. Only delete keyframes specific to the desktop Step transition that no longer fires.
- **Onboarding `§ ONBOARDING` topbar element** dropped in 3F-2. Any CSS class scoped to render it (`.ob-flow-label`, `.ob-section-label`, etc.) and any string constant feeding it.
- **Auth's previous white right panel** assets, if any. The 3A follow-up swept the hardcoded white. Confirm no stale CSS class lingers.

**Medium-confidence:**

- Other `*.module.css` files that may have been replaced by `globals.css` rules during the design-system consolidation
- Component files (`*.tsx`, `*.ts`) with names that suggest replaced functionality (e.g. `OldRecipeCard.tsx`, `RecipeCard.legacy.tsx`, `*.deprecated.*`)
- Utility files that reference deleted features
- Asset files (SVGs, PNGs) in `/public` or component directories that aren't referenced
- Route definitions for paths that no longer exist (audit the router for routes that point to deleted components)

**Lower-confidence but worth checking:**

- Imports from packages that aren't actually used (dependencies that linger after refactors)
- TypeScript types that aren't referenced anywhere
- CSS classes defined in `globals.css` that aren't used in any component
- The `cart-icon-btn` (or equivalent) class from 3G-2's empty-planner cart removal — if the icon is still used on populated planner, the class stays; if it's scoped only to empty, it goes

## Briefs archive (separate but related)

After Step 3 ships, the project knowledge will contain both the original drafts and the -2 revisions for several briefs:

- brief-3D-1 → superseded by brief-3D-2 → followed up by brief-3D-3
- brief-3E-1 → superseded by brief-3E-2
- brief-3F-1 → superseded by brief-3F-2
- brief-3G-1 → superseded by brief-3G-2
- brief-X1 → superseded by brief-X1-2
- brief-X2 → superseded by brief-X2-2 (this brief)

The -1 versions are now historical reference. They contain stale specs that will surface in future searches and confuse anyone reading them as current.

**Recommendation:** Move the superseded -1 versions into an `/archive/` subdirectory (or add a clear `**SUPERSEDED — see brief-XX-2.md**` header at the top of each). Don't delete them outright — the history is useful for understanding decisions. Just isolate them so future searches surface the current versions first.

This is a doc-hygiene pass, separate from code-deletion. Could be its own commit within the same PR, or a separate small PR after the code sweep lands.

## Spec

### Method

Run a series of tools and audits to identify dead code. For each finding, manually verify it's actually unused before deleting.

**1. Unused exports / files.**

Use `ts-prune` or equivalent:

```bash
npx ts-prune
```

This finds exports that aren't imported anywhere. Most matches will be false positives (entry-point exports, types used only as type hints, etc.) — review each one manually.

**2. Unused CSS files.**

For each `*.css`, `*.module.css`, `*.scss` file in the codebase, grep for its filename in import statements:

```bash
# For each CSS file:
grep -r "meal-plans.module.css" --include="*.tsx" --include="*.ts"
```

If a CSS file isn't imported anywhere, it's a strong candidate for deletion.

**3. Unused component files.**

For each component file, grep for its export name in import statements:

```bash
grep -r "import.*OldRecipeCard" --include="*.tsx" --include="*.ts"
```

Files where nothing imports the export are candidates.

**4. Unused dependencies.**

Use `depcheck`:

```bash
npx depcheck
```

This finds packages declared in `package.json` that aren't imported anywhere. False positives are common (build tools, type packages, transitive deps) — review carefully.

**5. Unused CSS classes in globals.css.**

For each class defined in `globals.css`, grep the codebase for its name:

```bash
# Roughly:
grep -oE "\.[a-z][a-z0-9-]*\s*\{" globals.css | sort -u | while read cls; do
  classname=$(echo "$cls" | sed 's/[{ ]//g; s/^\.//')
  count=$(grep -r "\\b$classname\\b" --include="*.tsx" --include="*.ts" --include="*.css" | wc -l)
  echo "$count $classname"
done | sort -n
```

Classes with zero matches outside `globals.css` itself are candidates for removal. (Note: dynamic class names — e.g. `className={`btn-${variant}`}` — won't be caught by this grep. Review with care.)

**6. Unused assets.**

For each asset in `/public`, grep for the filename:

```bash
# For each asset:
grep -r "asset-name.svg" --include="*.tsx" --include="*.ts" --include="*.css"
```

Assets not referenced anywhere are candidates.

**7. Step 3 fallout — targeted check.**

For the Step 3 work specifically, audit:

- **Add Meal Step One:** find any component named `MealTypePicker`, `AddMealStep1`, `PickMealType`, etc. that's no longer in the active route tree. Find the route handler that previously served `?step=1` (or wherever Step One lived). Find any associated CSS.
- **`--motion-step` keyframes:** check `globals.css` for keyframes named `stepOut`, `stepIn`, or similar. If they're only used by the desktop Step One/Step Two transition (which no longer exists), delete them. The `--motion-step` token itself is still used by mobile Add Meal per 3D-3 — preserve it.
- **Onboarding `§ ONBOARDING` label:** grep for the literal string `§ ONBOARDING` and for any class name like `.ob-flow-label`. Both should return zero hits after 3F-2 lands.
- **Auth white panel:** grep for `.auth-white-panel`, `.auth-form-panel-white`, or similar. Should be gone after the 3A follow-up sweep.

### Verification before deletion

For each file or class flagged as dead:

1. **Search the codebase** for any reference to the filename, export name, class name, or asset name. Include CSS-in-JS, template strings, dynamic imports, etc.
2. **Check git history.** When was the file last modified? Files untouched for many months *and* not imported are higher confidence dead.
3. **Check related areas.** If `meal-plans.module.css` is dead, are there related files (`meal-plans.tsx`, `MealPlanCard.tsx`, etc.) that reference each other but aren't connected to the active app? A whole subtree may be dead together.
4. **Run the build.** After deletion, the build should pass with no errors. If TypeScript or the bundler complains, the deletion was wrong — restore and investigate.
5. **Run the test suite.** Same logic — if anything breaks, restore.

If a file *might* be dead but isn't certain, leave it. False-positive deletions are worse than leaving cruft. The goal is high-confidence cleanup, not aggressive pruning.

### Deletion strategy

**Phase 1: confirmed dead.** `meal-plans.module.css`, the Step 3 fallout candidates above, and any other files with zero references after thorough search. Delete in one commit per logical group.

**Phase 2: probably dead.** Files with one or two references, where the references look like leftovers themselves. Investigate each; delete if confirmed.

**Phase 3: ambiguous.** Files that seem unused but the implementer isn't sure. Skip in this PR. File a follow-up note for the next sweep.

### Commit hygiene

Group deletions by category:

- One commit for unused CSS files (including `meal-plans.module.css`)
- One commit for unused component files (including Step One components)
- One commit for unused utility files
- One commit for unused dependencies (`package.json` change)
- One commit for unused assets
- One commit for unused CSS classes in `globals.css` (including dropped `§ ONBOARDING` class, dead Step transition keyframes, etc.)
- One commit for the briefs archive (move -1 versions to `/archive/`)

This makes the PR reviewable. A reviewer can scan each commit, confirm "yes this category was actually unused," and approve in chunks.

## Files most likely affected

Unknown until the sweep runs. Likely candidates based on what was surfaced:

- `meal-plans.module.css` (confirmed)
- Other `*.module.css` files in the repo
- Add Meal Step One component(s) (from 3D-2's collapse)
- Onboarding `§ ONBOARDING` class (from 3F-2)
- Auth previous-white-panel CSS class (from 3A follow-up)
- `package.json` and `package-lock.json` if dependencies are removed
- The project knowledge briefs directory (-1 versions move to archive)

## Verify before declaring done

- Build passes (`npm run build` or equivalent) with no errors.
- Test suite passes.
- Type check passes (`tsc --noEmit` or equivalent).
- Lint passes.
- The app runs locally and every surface renders identically to before the sweep. (Visual regression: take screenshots before the sweep and compare after — should be pixel-identical.)
- `npx ts-prune` returns substantially fewer findings than before (some will remain — that's fine, false positives are part of the noise).
- The PR description lists every category of deletion with counts (e.g. "Removed 6 unused CSS module files, 12 unused utility exports, 3 unused dependencies, 4 superseded brief drafts archived").
- Add Meal mobile Screen 1 ↔ Screen 2 transition still works (verifies `--motion-step` token wasn't accidentally deleted).

## Out of scope

- Refactoring active code. This is deletion only — no rewrites, no consolidations of duplicate logic, no improvements. If something's ugly but used, leave it.
- Deleting files that are *almost* unused. Confidence threshold is high; if there's any doubt, don't delete.
- Performance optimization. Some dead code may have performance implications when removed (smaller bundle), but performance work is separate.
- Test coverage gaps. If a component has no tests, that's a finding but not for this brief.
- Other documentation cleanup beyond the briefs archive. If `*.md` files like `master-plan.md` or `design-system.md` have stale entries, that's a separate housekeeping pass.

## Notes for the implementer

- **The dead code from `meal-plans.module.css` is not a 3A or 3B bug** — those briefs were correct that no rendered surface uses it. The file has just been sitting in the repo since whatever feature it served got replaced.
- **Step 3 created its own dead code** by replacing patterns. The Step One/Step Two collapse, the auth white-panel removal, and the `§ ONBOARDING` drop all leave traces that should be cleaned up here.
- **Don't try to be heroic.** A 30% reduction in dead code is a great PR. A 90% reduction is a multi-week obsession. Stop when the obvious wins are taken.
- **If you find dead code that's recent** (last few weeks), check git blame and ask the author before deleting. They may be in mid-refactor and the file is "dead today, alive tomorrow."
- **Carefully preserve `--motion-step`.** The token's original use case (desktop Step One ↔ Step Two transition) is gone, but 3D-3 reintroduces it for mobile Add Meal Screen 1 ↔ Screen 2. Easy to delete a "now unused" token without realizing it's been re-purposed. Verify the token is referenced in the mobile Add Meal code before deleting anything related to it.
- **If the sweep surfaces something interesting** — like a whole subdirectory of files that's unused, or a major dependency that nobody noticed wasn't being used — flag it in the PR description as a finding. May indicate a larger architectural cleanup is worth scheduling.
- After this PR lands, schedule a recurring dead-code sweep. Maybe every 6 months, maybe yearly. Codebases re-accumulate this stuff continuously.
