---
name: App rename and URL change guide
description: Every file that needs updating if the app is renamed or moved to a custom domain
type: project
---

If the app is renamed from "Good Measure" or deployed to a custom domain, here is every location that needs updating.

**Why:** User is planning to launch publicly and will likely want a custom name and domain before that happens.

**How to apply:** Use this as a checklist when doing the rename. Do the npm package last since it requires a new publish + user config updates.

---

## Rename "Good Measure" (22+ locations)

### Frontend UI (4 files)
- `app/layout.tsx` — metadata title: `title: "Good Measure"`
- `app/login/page.tsx` — brand heading: `<h1>Good Measure</h1>`
- `app/components/TopNav.tsx` — nav brand link text: `Good Measure`
- `app/preview/page.tsx` — preview nav: `<span>Good Measure</span>`

### AI prompt templates (1 file, 2 occurrences)
- `app/recipes/page.tsx` — optimization and meal prep prompt templates reference "Good Measure" when telling the AI to list/get recipes

### Settings page (1 file, 2 occurrences)
- `app/settings/page.tsx` — backup validation message + MCP config example block

### MCP server (multiple occurrences in 2 files)
- `mcp/src/index.ts` — MCP server name (`name: 'good-measure'`), comments, user-facing messages (11 refs)
- `mcp/package.json` — description field
- `mcp/dist/index.d.ts` — compiled output (auto-generated from build, no manual edit needed)

### Documentation (4 files)
- `README.md`
- `DESIGN.md`
- `PLAN.md`
- `.claude/DEPLOYMENT_PLAN.md`

### Public mockup files (can delete or ignore)
- `public/mockup-filter-notes.html` — title tag only

---

## Change npm package name ("good-measure-mcp")

Requires a new npm package under the new name — old package stays published but goes unmaintained.

- `mcp/package.json` — `name` field + `bin` entry
- `app/settings/page.tsx` — npx install command shown to users: `"args": ["-y", "good-measure-mcp"]`
- MCP server config key in settings example: `"good-measure": { ... }`

**Note:** Users who installed the old package name will need to update their claude_desktop_config.json.

---

## Change environment variable names (GOOD_MEASURE_*)

- `mcp/src/index.ts` — reads `GOOD_MEASURE_API_URL` and `GOOD_MEASURE_API_TOKEN`
- All user MCP config files will need updating
- Vercel env vars will need to be renamed

---

## Change hardcoded Vercel URL (v0-nutrition-app-nu.vercel.app)

Direct hardcoded references (4 locations):
- `README.md` — live deployment URL
- `.claude/DEPLOYMENT_PLAN.md` — deployment docs
- `.claude/settings.local.json` — dev curl commands (3 refs, dev-only)
- `mcp/src/index.ts` — example placeholder comment only (`https://your-app.vercel.app`)

**No changes needed** (already dynamic):
- `app/login/page.tsx` — uses `window.location.origin` for auth redirects ✓
- `app/settings/page.tsx` — uses `window.location.origin` for MCP config template ✓
