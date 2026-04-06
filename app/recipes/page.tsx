"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { clientCache } from "@/lib/clientCache";

type RecipeSummary = {
  id: number;
  name: string;
  isComplete?: boolean;
  servingSize: number;
  servingUnit: string;
  instructions: string;
  sourceApp?: string | null;
  tags?: string;
  prepTime?: number | null;
  cookTime?: number | null;
  image?: string | null;
  totals?: Array<{ nutrientId: number; displayName: string; value: number; unit: string }>;
  ingredients: Array<{
    id: number;
    ingredientId?: number | null;
    quantity: number;
    unit: string;
    notes?: string | null;
    originalText?: string | null;
    ingredient?: { id: number; name: string } | null;
  }>;
};

export default function RecipesPageWrapper() {
  return (
    <Suspense>
      <RecipesPage />
    </Suspense>
  );
}

function RecipesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [recipes, setRecipes] = useState<RecipeSummary[]>(() => clientCache.get<RecipeSummary[]>('/api/recipes') ?? []);
  const [loading, setLoading] = useState(() => !clientCache.get('/api/recipes'));

  // Filters
  const searchQuery = searchParams?.get("search") || "";
  const selectedTags = searchParams?.get("tags")?.split(",").filter(Boolean) || [];
  const availableTags = ["breakfast", "lunch", "dinner", "side", "snack", "dessert", "beverage"];

  // Sort
  const sortOptions = [
    { key: "name",          label: "Name" },
    { key: "Calories",      label: "Calories" },
    { key: "Fat",           label: "Fat" },
    { key: "Saturated Fat", label: "Sat Fat" },
    { key: "Sodium",        label: "Sodium" },
    { key: "Carbs",         label: "Carbs" },
    { key: "Sugar",         label: "Sugar" },
    { key: "Protein",       label: "Protein" },
    { key: "Fiber",         label: "Fiber" },
  ] as const;
  type SortKey = typeof sortOptions[number]["key"];
  const sortBy = (searchParams?.get("sort") || "name") as SortKey;
  const sortDir = (searchParams?.get("dir") || "asc") as "asc" | "desc";
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Dashboard stat preferences — used to show matching stats on mobile cards
  const [enabledStats, setEnabledStats] = useState<string[]>(['calories', 'protein', 'carbs']);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dashboard-stats');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.enabledStats)) setEnabledStats(parsed.enabledStats);
      }
    } catch {}
  }, []);

  // View mode
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filter sheet (mobile bottom sheet)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  useEffect(() => {
    if (!filterSheetOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFilterSheetOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [filterSheetOpen]);
  const activeFilterCount = selectedTags.length + (sortBy !== "name" ? 1 : 0);

  const searchRef = useRef<HTMLInputElement>(null);

  const updateSearchParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/recipes?${params.toString()}`);
  };

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    updateSearchParam("tags", newTags.join(","));
  };

  const loadRecipes = async () => {
    const cached = clientCache.get<RecipeSummary[]>('/api/recipes');
    if (cached && cached.length > 0) {
      setRecipes(cached);
      setLoading(false);
      // Background revalidate
      fetch("/api/recipes").then(r => r.json()).then((data) => {
        const fresh: RecipeSummary[] = Array.isArray(data) ? data : [];
        clientCache.set('/api/recipes', fresh);
        setRecipes(fresh);
      }).catch(console.error);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/recipes");
      const data = await r.json();
      const list: RecipeSummary[] = Array.isArray(data) ? data : [];
      clientCache.set('/api/recipes', list);
      setRecipes(list);
    } catch (e) {
      console.error(e);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRecipes(); }, []);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    if (sortOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sortOpen]);

  const getNutrientValue = (recipe: RecipeSummary, nutrient: string): number => {
    if (!recipe.totals) return 0;
    const match = recipe.totals.find(t => t.displayName === nutrient);
    return match?.value ?? 0;
  };

  const filteredRecipes = recipes.filter((recipe) => {
    if (searchQuery && !recipe.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedTags.length > 0) {
      const recipeTags = recipe.tags ? recipe.tags.split(",").map(t => t.trim()) : [];
      if (!selectedTags.some(tag => recipeTags.includes(tag))) return false;
    }
    return true;
  });

  const sortedRecipes = [...filteredRecipes].sort((a, b) => {
    let cmp: number;
    if (sortBy === "name") {
      cmp = a.name.localeCompare(b.name);
    } else {
      cmp = getNutrientValue(a, sortBy) - getNutrientValue(b, sortBy);
    }
    return sortDir === "desc" ? -cmp : cmp;
  });

  // Extract macros for card display
  const getCardMacros = (recipe: RecipeSummary) => {
    if (!recipe.totals) return null;
    const find = (keys: string[], exact?: boolean) => {
      const n = recipe.totals!.find(t => {
        const name = t.displayName.toLowerCase();
        return exact ? keys.some(k => name === k) : keys.some(k => name.includes(k));
      });
      return n ? Math.round(n.value) : 0;
    };
    return {
      kcal: find(["energy", "calorie"]),
      protein: find(["protein"]),
      carbs: find(["carbohydrate", "carb"]),
      fat: find(["fat"], true),
      saturatedFat: find(["saturated"]),
      sodium: find(["sodium"]),
      sugar: find(["sugar"]),
      fiber: find(["fiber"]),
    };
  };

  // Canonical nutrient name map matching dashboard
  const STAT_CANONICAL_ORDER = ['calories', 'fat', 'sat-fat', 'sodium', 'carbs', 'sugar', 'protein', 'fiber'];
  const STAT_KEY_MAP: Record<string, { keys: string[]; label: string; unit: string }> = {
    calories: { keys: ['energy', 'calorie'], label: 'cal', unit: '' },
    fat:      { keys: ['total fat', 'fat'],  label: 'fat', unit: 'g' },
    'sat-fat':{ keys: ['saturated'],         label: 'sat', unit: 'g' },
    sodium:   { keys: ['sodium'],            label: 'na',  unit: 'mg' },
    carbs:    { keys: ['carbohydrate','carb'],label: 'carbs',unit: 'g' },
    sugar:    { keys: ['sugar'],             label: 'sugar',unit: 'g' },
    protein:  { keys: ['protein'],           label: 'prot', unit: 'g' },
    fiber:    { keys: ['fiber'],             label: 'fiber',unit: 'g' },
  };

  const getMobileCardStats = (recipe: RecipeSummary) => {
    if (!recipe.totals) return [];
    const orderedKeys = STAT_CANONICAL_ORDER.filter(k => enabledStats.includes(k)).slice(0, 3);
    return orderedKeys.map(key => {
      const cfg = STAT_KEY_MAP[key];
      if (!cfg) return null;
      const match = recipe.totals!.find(t => {
        const name = t.displayName.toLowerCase();
        return cfg.keys.some(k => name.includes(k));
      });
      return match ? { label: cfg.label, value: Math.round(match.value), unit: cfg.unit } : null;
    }).filter(Boolean) as { label: string; value: number; unit: string }[];
  };

  return (
    <div className="h-full flex flex-col">
      {/* ── Filter Bar ── */}
      <div
        className="list-toolbar flex items-center gap-[4px] px-[var(--pad)] shrink-0 border-b border-[var(--rule)] bg-[var(--bg)] sticky top-0 z-10"
        style={{ height: "var(--filter-h)" }}
      >
        {/* ── Mobile toolbar — CSS shows on mobile only ── */}
        <div className="mob-tb">
          <input
            ref={searchRef}
            type="search"
            placeholder="Search recipes…"
            value={searchQuery}
            onChange={(e) => updateSearchParam("search", e.target.value)}
            aria-label="Search recipes"
            className="mob-search-input"
          />
          {/* View toggle */}
          <div className="mob-view-group" role="group" aria-label="View mode">
            <button
              onClick={() => setViewMode("grid")}
              className={`mob-tb-icon${viewMode === "grid" ? " on" : ""}`}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/>
                <rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`mob-tb-icon${viewMode === "list" ? " on" : ""}`}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
          {/* Filter + sort */}
          <button
            onClick={() => setFilterSheetOpen(true)}
            className={`mob-filter-btn${activeFilterCount > 0 ? " active" : ""}`}
            aria-label={`Filter and sort${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""}`}
            aria-haspopup="dialog"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="4" y1="6" x2="20" y2="6"/><circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/>
              <line x1="4" y1="12" x2="20" y2="12"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/>
              <line x1="4" y1="18" x2="20" y2="18"/><circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/>
            </svg>
            {activeFilterCount > 0 && <span className="mob-filter-badge" aria-hidden="true" style={{ position: 'absolute', top: 4, right: 4 }}>{activeFilterCount}</span>}
          </button>
        </div>

        {/* ── Desktop toolbar — CSS shows on desktop only ── */}
        <div className="desk-tb">
          {/* Tag chips */}
          <div className="list-tags contents">
          <button
            onClick={() => updateSearchParam("tags", "")}
            className={`filter-chip font-mono text-[8px] tracking-[0.1em] uppercase py-[3px] px-[9px] border cursor-pointer transition-colors whitespace-nowrap active:scale-[0.97] ${
              selectedTags.length === 0
                ? "text-[var(--fg)] border-[var(--rule)]"
                : "text-[var(--muted)] border-transparent hover:text-[var(--fg)]"
            }`}
            aria-label="Show all recipes"
            aria-pressed={selectedTags.length === 0}
          >All</button>
          {availableTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`filter-chip font-mono text-[8px] tracking-[0.1em] uppercase py-[3px] px-[9px] border cursor-pointer transition-colors whitespace-nowrap active:scale-[0.97] ${
                selectedTags.includes(tag)
                  ? "text-[var(--fg)] border-[var(--rule)]"
                  : "text-[var(--muted)] border-transparent hover:text-[var(--fg)]"
              }`}
              aria-label={`Filter by ${tag}`}
              aria-pressed={selectedTags.includes(tag)}
            >{tag}</button>
          ))}
          </div>

          {/* Right side controls */}
          <div className="list-controls flex gap-[5px] items-center ml-auto">
            {/* Recipe count */}
            <span className="font-mono text-[8px] text-[var(--muted)] tracking-[0.04em] whitespace-nowrap mr-[6px] tabular-nums">
              {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? "s" : ""}
            </span>

            {/* Sort group */}
            <div ref={sortRef} className="flex border border-[var(--rule)] relative transition-colors hover:border-[var(--fg)]">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                aria-label="Sort recipes by"
                aria-expanded={sortOpen}
                aria-haspopup="listbox"
                className="font-mono text-[8px] tracking-[0.08em] uppercase text-[var(--fg)] bg-transparent border-0 border-r border-[var(--rule)] py-[3px] pl-[9px] pr-[22px] cursor-pointer whitespace-nowrap relative"
              >
                {sortOptions.find(o => o.key === sortBy)?.label ?? "Name"}
                <span className="absolute right-[7px] top-1/2 -translate-y-1/2 border-[3px] border-transparent border-t-[4px] border-t-[var(--muted)] mt-[2px]" />
              </button>
              {sortOpen && (
                <div
                  role="listbox"
                  aria-label="Sort options"
                  className="absolute left-[-1px] top-[calc(100%+2px)] min-w-[120px] bg-[var(--bg)] border border-[var(--rule)] z-[200] py-[3px] dropdown-enter"
                  style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                >
                  {sortOptions.map(opt => (
                    <button
                      key={opt.key}
                      role="option"
                      aria-selected={sortBy === opt.key}
                      onClick={() => { updateSearchParam("sort", opt.key === "name" ? "" : opt.key); setSortOpen(false); }}
                      className={`block w-full text-left font-mono text-[8px] tracking-[0.08em] uppercase py-[6px] px-[12px] border-0 cursor-pointer transition-colors ${
                        sortBy === opt.key
                          ? "text-[var(--fg)] bg-transparent"
                          : "text-[var(--muted)] bg-transparent hover:text-[var(--fg)] hover:bg-[var(--bg-2)]"
                      }`}
                    >{opt.label}</button>
                  ))}
                </div>
              )}
              <button
                onClick={() => updateSearchParam("dir", sortDir === "asc" ? "desc" : "asc")}
                aria-label={`Sort ${sortDir === "asc" ? "ascending" : "descending"}`}
                className="font-mono text-[10px] text-[var(--muted)] bg-transparent border-0 py-[3px] px-[7px] cursor-pointer transition-colors flex items-center leading-none shrink-0 hover:bg-[var(--bg-3)] hover:text-[var(--fg)] active:scale-[0.97]"
              >{sortDir === "asc" ? "↑" : "↓"}</button>
            </div>

            {/* Grid/List toggle */}
            <div className="flex border border-[var(--rule)] overflow-hidden transition-colors hover:border-[var(--fg)]">
              <button
                onClick={() => setViewMode("grid")}
                className={`font-mono text-[8px] tracking-[0.1em] uppercase py-[3px] px-[9px] border-0 border-r border-[var(--rule)] cursor-pointer transition-colors ${
                  viewMode === "grid" ? "bg-[var(--bg-3)] text-[var(--fg)]" : "bg-transparent text-[var(--muted)] hover:bg-[var(--bg-3)] hover:text-[var(--fg)]"
                }`}
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
              >Grid</button>
              <button
                onClick={() => setViewMode("list")}
                className={`font-mono text-[8px] tracking-[0.1em] uppercase py-[3px] px-[9px] border-0 cursor-pointer transition-colors ${
                  viewMode === "list" ? "bg-[var(--bg-3)] text-[var(--fg)]" : "bg-transparent text-[var(--muted)] hover:bg-[var(--bg-3)] hover:text-[var(--fg)]"
                }`}
                aria-label="List view"
                aria-pressed={viewMode === "list"}
              >List</button>
            </div>

            {/* Search */}
            <input
              ref={searchRef}
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => updateSearchParam("search", e.target.value)}
              aria-label="Search recipes"
              className="font-mono text-[9px] tracking-[0.04em] text-[var(--fg)] bg-[var(--bg-2)] border border-[var(--rule)] py-[3px] px-[9px] outline-none transition-[border-color] focus:border-[var(--accent)]"
              style={{ width: 180 }}
            />

            {/* + New */}
            <button
              onClick={() => router.push("/recipes/create")}
              className="font-mono text-[8px] tracking-[0.1em] uppercase bg-[var(--accent)] text-[var(--accent-fg)] border-0 py-[3px] px-[9px] cursor-pointer transition-opacity whitespace-nowrap hover:opacity-[0.88] active:scale-[0.97]"
              aria-label="Create new recipe"
            >+ New</button>
          </div>
        </div>
      </div>

      {/* ── Mobile Filter Sheet ── */}
      {filterSheetOpen && (
        <>
          <div className="mob-sheet-backdrop" onClick={() => setFilterSheetOpen(false)} aria-hidden="true" />
          <div className="mob-sheet" role="dialog" aria-modal="true" aria-label="Filter and sort recipes">
            <div className="mob-sheet-handle" aria-hidden="true" />
            <div className="mob-sheet-header">
              <span className="mob-sheet-title">Filter &amp; Sort</span>
              {activeFilterCount > 0 && (
                <button
                  className="mob-sheet-clear"
                  onClick={() => { updateSearchParam("tags", ""); updateSearchParam("sort", ""); updateSearchParam("dir", ""); }}
                  aria-label="Clear all filters"
                >Clear all</button>
              )}
            </div>

            {/* Sort */}
            <div className="mob-sheet-section">
              <div className="mob-sheet-section-label">Sort by</div>
              <div className="mob-sheet-sort-grid">
                {sortOptions.map(opt => (
                  <button
                    key={opt.key}
                    className={`mob-sheet-sort-btn${sortBy === opt.key ? " on" : ""}`}
                    onClick={() => updateSearchParam("sort", opt.key === "name" ? "" : opt.key)}
                    aria-pressed={sortBy === opt.key}
                  >{opt.label}</button>
                ))}
              </div>
              <div className="mob-sheet-dir-row">
                <button
                  className={`mob-sheet-dir-btn${sortDir === "asc" ? " on" : ""}`}
                  onClick={() => updateSearchParam("dir", "asc")}
                  aria-pressed={sortDir === "asc"}
                >↑ Ascending</button>
                <button
                  className={`mob-sheet-dir-btn${sortDir === "desc" ? " on" : ""}`}
                  onClick={() => updateSearchParam("dir", "desc")}
                  aria-pressed={sortDir === "desc"}
                >↓ Descending</button>
              </div>
            </div>

            {/* Tags */}
            <div className="mob-sheet-section">
              <div className="mob-sheet-section-label">Category</div>
              <div className="mob-sheet-chips">
                <button
                  className={`mob-sheet-chip${selectedTags.length === 0 ? " on" : ""}`}
                  onClick={() => updateSearchParam("tags", "")}
                  aria-pressed={selectedTags.length === 0}
                >All</button>
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    className={`mob-sheet-chip${selectedTags.includes(tag) ? " on" : ""}`}
                    onClick={() => toggleTag(tag)}
                    aria-pressed={selectedTags.includes(tag)}
                  >{tag}</button>
                ))}
              </div>
            </div>

            <button className="mob-sheet-done" onClick={() => setFilterSheetOpen(false)}>Done</button>
          </div>
        </>
      )}

      {/* ── FAB (mobile only) ── */}
      <button
        className="mob-fab"
        onClick={() => router.push("/recipes/create")}
        aria-label="Create new recipe"
      >+</button>

      {/* ── Content ── */}
      <div className="list-scroll flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="font-mono text-[12px] font-light text-[var(--muted)] animate-loading">Loading recipes…</div>
          </div>
        ) : sortedRecipes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="empty-state empty-state-pane">
              <div className="empty-state-glyph" aria-hidden="true">
                {recipes.length === 0 ? "∅" : "—"}
              </div>
              <div className="empty-state-label">
                {recipes.length === 0 ? "No recipes yet" : "No matches"}
              </div>
              <div className="empty-state-context">
                {recipes.length === 0 ? "Create a recipe from scratch or import one." : "Try adjusting your filters."}
              </div>
              {recipes.length === 0 && (
                <button
                  onClick={() => router.push("/recipes/create")}
                  className="empty-state-action"
                  aria-label="Create first recipe"
                >+ New recipe →</button>
              )}
            </div>
          </div>
        ) : viewMode === "grid" ? (
          /* ── Card Grid ── */
          <div key={`grid-${viewMode}-${selectedTags.join(',')}-${sortBy}-${sortDir}`} className="rcp-grid max-w-[1100px] mx-auto" style={{ padding: "32px 64px 48px" }}>
            <div className="grid gap-6 grid-cols-2 lg:grid-cols-4" style={{ gridAutoRows: "auto" }}>
              {sortedRecipes.map((recipe, idx) => {
                const macros = getCardMacros(recipe);
                const category = recipe.tags?.split(",")[0]?.trim();
                return (
                  <div
                    key={recipe.id}
                    data-cursor="card"
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/recipes/${recipe.id}`)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/recipes/${recipe.id}`); } }}
                    aria-label={recipe.name}
                    className="bg-[var(--bg)] cursor-pointer overflow-hidden relative group transition-transform duration-200"
                    style={{ animation: `cardIn 350ms var(--ease-out) ${Math.min(idx, 8) * 30}ms both` }}
                  >
                    {/* Image */}
                    <div className="overflow-hidden" style={{ aspectRatio: "4/3" }}>
                      {recipe.image ? (
                        <img
                          src={recipe.image}
                          alt={recipe.name}
                          className="w-full h-full object-cover block transition-transform duration-[600ms]"
                          style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-full h-full bg-[var(--bg-3)] flex items-end overflow-hidden" style={{ padding: '14px 16px 16px' }}>
                          <span className="font-serif text-[clamp(22px,2.5vw,32px)] font-bold tracking-[-0.03em] leading-[0.92] text-[var(--fg)] opacity-[0.18] block overflow-hidden">
                            {recipe.name.length > 30 ? recipe.name.slice(0, recipe.name.lastIndexOf(' ', 30) || 30) : recipe.name}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ padding: "16px 18px 20px" }}>
                      {category && (
                        <div className="font-mono text-[7.5px] tracking-[0.14em] uppercase text-[var(--muted)] mb-[7px]">{category}</div>
                      )}
                      <div className="rcp-card-name font-serif text-[clamp(15px,1.4vw,18px)] font-semibold tracking-[-0.01em] leading-[1.2] mb-[10px]" style={{ textWrap: "balance" }}>
                        {recipe.name}
                      </div>
                      {macros && (
                        <>
                          {/* Desktop: fixed 4 stats */}
                          <div className="rcp-card-stats flex gap-2 items-baseline flex-wrap">
                            <span className="font-mono text-[10px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.kcal}</strong> <span className="text-[var(--muted)]">kcal</span></span>
                            <span className="font-mono text-[8.5px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.protein}g</strong> <span className="text-[var(--muted)]">prot</span></span>
                            <span className="font-mono text-[8.5px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.carbs}g</strong> <span className="text-[var(--muted)]">carbs</span></span>
                            <span className="font-mono text-[8.5px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.fat}g</strong> <span className="text-[var(--muted)]">fat</span></span>
                          </div>
                          {/* Mobile: user's dashboard stats */}
                          <div className="rcp-card-stats-mob gap-2 items-baseline flex-wrap">
                            {getMobileCardStats(recipe).map(s => (
                              <span key={s.label} className="font-mono text-[10px] tabular-nums whitespace-nowrap">
                                <strong className="text-[var(--fg)] font-normal">{s.value}{s.unit}</strong>{' '}
                                <span className="text-[var(--muted)]">{s.label}</span>
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                      {recipe.isComplete === false && (
                        <div className="font-mono text-[8px] tracking-[0.1em] uppercase text-[var(--warn)] mt-[6px]">incomplete</div>
                      )}
                    </div>
                    {/* Accent bar on hover */}
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }} />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── List View ── */
          <div key={`list-${viewMode}-${selectedTags.join(',')}-${sortBy}-${sortDir}`} className="rcp-grid max-w-[1100px] mx-auto" style={{ padding: "0 64px" }}>
            {sortedRecipes.map((recipe, idx) => {
              const macros = getCardMacros(recipe);
              const category = recipe.tags?.split(",")[0]?.trim();
              return (
                <div
                  key={recipe.id}
                  data-cursor="card"
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/recipes/${recipe.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/recipes/${recipe.id}`); } }}
                  aria-label={recipe.name}
                  className="rcp-list-row flex items-center gap-[14px] border-b border-[var(--rule)] cursor-pointer group relative"
                  style={{ padding: "10px 0", animation: `cardIn 350ms var(--ease-out) ${Math.min(idx, 12) * 25}ms both` }}
                >
                  {/* Thumbnail — 4:3 */}
                  <div className="overflow-hidden shrink-0 bg-[var(--bg-3)]" style={{ width: 64, aspectRatio: '4/3' }}>
                    {recipe.image ? (
                      <img src={recipe.image} alt="" className="w-full h-full object-cover block" />
                    ) : null}
                  </div>
                  {/* Name + category */}
                  <div className="rcp-list-info flex-1 min-w-0 flex items-baseline gap-[12px]">
                    {category && (
                      <span className="rcp-list-eyebrow font-mono text-[8px] tracking-[0.1em] uppercase text-[var(--muted)] shrink-0">{category}</span>
                    )}
                    <span className="font-serif text-[14px] font-semibold tracking-[-0.01em] text-[var(--fg)] truncate">{recipe.name}</span>
                  </div>
                  {/* Accent bar on hover */}
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }} />
                  {macros && (
                    <div className="rcp-list-macros flex gap-[16px] items-baseline shrink-0 ml-auto">
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.kcal}</strong> <span className="text-[var(--muted)]">kcal</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.fat}g</strong> <span className="text-[var(--muted)]">fat</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.saturatedFat}g</strong> <span className="text-[var(--muted)]">sat</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.sodium}mg</strong> <span className="text-[var(--muted)]">sod</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.carbs}g</strong> <span className="text-[var(--muted)]">carbs</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.sugar}g</strong> <span className="text-[var(--muted)]">sugar</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.protein}g</strong> <span className="text-[var(--muted)]">prot</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.fiber}g</strong> <span className="text-[var(--muted)]">fiber</span></span>
                    </div>
                  )}
                  {recipe.isComplete === false && (
                    <span className="font-mono text-[8px] tracking-[0.1em] uppercase text-[var(--warn)] shrink-0">incomplete</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
