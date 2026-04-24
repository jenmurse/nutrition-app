# BRIEF-04 · Mobile bottom nav active state

## Note

This change is *included in BRIEF-03 step 5* but is called out separately here because it's the single most-seen UI element in the entire mobile app — visible on every mobile page — and warrants explicit visual verification after the coral reduction ships.

This brief is effectively a **verification checklist** for the mobile bottom nav specifically. If BRIEF-03 has been applied correctly, this brief is already complete; just confirm.

## Why it matters

The mobile bottom nav's active tab shows a coral icon + coral label. It appears on the Home, Planner, Recipes, Pantry, and Settings screens — every single mobile screen. Getting this one change right is arguably the highest-leverage single improvement in the mobile experience.

## Expected state after BRIEF-03

### Before
```
Home       Planner      Recipes    Pantry    Settings
 🏠(coral)   📅(grey)    📖(grey)   🍴(grey)  ⚙(grey)
 Home(coral) Planner(grey) ...
```

### After
```
Home       Planner      Recipes    Pantry    Settings
 🏠(black)   📅(grey)    📖(grey)   🍴(grey)  ⚙(grey)
 Home(black) Planner(grey) ...
```

## Verification checklist

- [ ] On mobile dashboard: `Home` tab icon + label are black (`var(--fg)`). Other tabs are muted grey (`var(--muted)`).
- [ ] On mobile planner: `Planner` tab icon + label are black. Others grey.
- [ ] On mobile recipes: `Recipes` tab icon + label are black. Others grey.
- [ ] On mobile pantry: `Pantry` tab icon + label are black. Others grey.
- [ ] On mobile settings: `Settings` tab icon + label are black. Others grey.
- [ ] No coral appears in the bottom nav anywhere, in any state.
- [ ] Tapping a tab correctly transitions the active state to the new tab.
- [ ] Reduce-motion: tab transitions respect `prefers-reduced-motion: reduce` if applicable.

## If the change didn't land correctly

The bottom nav component is likely at `components/BottomNav.tsx` or similar. Look for:

```tsx
// If you see something like this, it needs updating
const activeColor = '#E15B3F';   // hardcoded coral
// or
className={isActive ? 'text-accent' : 'text-muted'}   // if accent is still coral
```

Change to:
```tsx
// Use the design token
className={isActive ? 'text-fg' : 'text-muted'}
// or inline style
color: isActive ? 'var(--fg)' : 'var(--muted)'
```

## Commit message (if a separate commit is needed)

```
design: mobile bottom nav active state coral → black

Active tab icon and label now use var(--fg) instead of coral.
Appears on every mobile screen. Part of SYS-01 coral reduction.
```
