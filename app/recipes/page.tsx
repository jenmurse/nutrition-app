"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { clientCache } from "@/lib/clientCache";
import { RecipeEmptyIcon, NoMatchesIcon } from "@/app/components/EmptyStateIcons";

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
  isFavorited?: boolean;
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
  const [recipes, setRecipes] = useState<RecipeSummary[]>(() => clientCache.get<RecipeSummary[]>('/api/recipes') ?? clientCache.get<RecipeSummary[]>('/api/recipes?slim=true') ?? []);
  const [loading, setLoading] = useState(() => !clientCache.get('/api/recipes') && !clientCache.get('/api/recipes?slim=true'));

  // ── Local filter state — always starts fresh on mount (clears when navigating away and back) ──
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);

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
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  // Sync filter state → URL (no router navigation, no Suspense trigger)
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
    if (showFavorites) params.set("favorites", "1");
    if (sortBy !== "name") params.set("sort", sortBy);
    if (sortDir !== "asc") params.set("dir", sortDir);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/recipes?${qs}` : "/recipes");
  }, [searchQuery, selectedTags, showFavorites, sortBy, sortDir]);

  // Dashboard stat preferences — used to show matching stats on mobile cards
  const [enabledStats, setEnabledStats] = useState<string[]>([]);
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

  // ── Compare mode ──
  const [compareMode, setCompareMode]   = useState(false);
  const [compareIds,  setCompareIds]    = useState<number[]>([]);
  const [compareOpen, setCompareOpen]   = useState(false);

  const COMPARE_NUTRIENTS = [
    { label: 'Calories',      unit: 'kcal', keys: ['energy', 'calorie'],     lowerIsBetter: true  },
    { label: 'Fat',           unit: 'g',    keys: ['total fat', 'fat'],       lowerIsBetter: true  },
    { label: 'Saturated Fat', unit: 'g',    keys: ['saturated'],              lowerIsBetter: true  },
    { label: 'Sodium',        unit: 'mg',   keys: ['sodium'],                 lowerIsBetter: true  },
    { label: 'Carbs',         unit: 'g',    keys: ['carbohydrate', 'carb'],   lowerIsBetter: true  },
    { label: 'Sugar',         unit: 'g',    keys: ['sugar'],                  lowerIsBetter: true  },
    { label: 'Protein',       unit: 'g',    keys: ['protein'],                lowerIsBetter: false },
    { label: 'Fiber',         unit: 'g',    keys: ['fiber'],                  lowerIsBetter: false },
  ] as const;

  const toggleCompareRecipe = (id: number) => {
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const getCompareValue = (recipe: RecipeSummary, keys: readonly string[]): number => {
    if (!recipe.totals) return 0;
    const match = recipe.totals.find(t => {
      const name = t.displayName.toLowerCase();
      return keys.some(k => name.includes(k));
    });
    return match ? Math.round(match.value) : 0;
  };

  // Load full recipe data when compare mode is activated (slim data may not have totals)
  useEffect(() => {
    if (!compareMode) return;
    const fullCached = clientCache.get<RecipeSummary[]>('/api/recipes');
    if (fullCached) { setRecipes(fullCached); return; }
    fetch("/api/recipes").then(r => r.json()).then((data) => {
      const list: RecipeSummary[] = Array.isArray(data) ? data : [];
      clientCache.set('/api/recipes', list);
      setRecipes(list);
    }).catch(console.error);
  }, [compareMode]);

  // Escape closes compare overlay
  useEffect(() => {
    if (!compareOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCompareOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [compareOpen]);

  const exitCompareMode = () => {
    setCompareMode(false);
    setCompareIds([]);
    setCompareOpen(false);
  };

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
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // updateSearchParam kept for mobile sheet (sort/dir) for convenience
  const updateSort = (key: string) => setSortBy((key || "name") as SortKey);
  const updateDir = (dir: string) => setSortDir((dir || "asc") as "asc" | "desc");

  const isNutrientSort = (key: string) => key !== "name";

  const loadRecipes = async () => {
    // If we already have full data cached, use it
    const fullCached = clientCache.get<RecipeSummary[]>('/api/recipes');
    if (fullCached && fullCached.length > 0) {
      setRecipes(fullCached);
      setLoading(false);
      return;
    }
    // Otherwise load slim first (fast)
    const slimCached = clientCache.get<RecipeSummary[]>('/api/recipes?slim=true');
    if (slimCached && slimCached.length > 0) {
      setRecipes(slimCached);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/recipes?slim=true");
      const data = await r.json();
      const list: RecipeSummary[] = Array.isArray(data) ? data : [];
      clientCache.set('/api/recipes?slim=true', list);
      setRecipes(list);
    } catch (e) {
      console.error(e);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  // Load full data when list view is active (to show per-row nutrition values)
  useEffect(() => {
    if (viewMode !== 'list') return;
    const fullCached = clientCache.get<RecipeSummary[]>('/api/recipes');
    if (fullCached) { setRecipes(fullCached); return; }
    fetch("/api/recipes").then(r => r.json()).then((data) => {
      const list: RecipeSummary[] = Array.isArray(data) ? data : [];
      clientCache.set('/api/recipes', list);
      setRecipes(list);
    }).catch(console.error);
  }, [viewMode]);

  // When a nutrient sort is active and we only have slim data, upgrade to full
  useEffect(() => {
    if (!isNutrientSort(sortBy)) return;
    const fullCached = clientCache.get<RecipeSummary[]>('/api/recipes');
    if (fullCached) { setRecipes(fullCached); return; }
    fetch("/api/recipes").then(r => r.json()).then((data) => {
      const list: RecipeSummary[] = Array.isArray(data) ? data : [];
      clientCache.set('/api/recipes', list);
      setRecipes(list);
    }).catch(console.error);
  }, [sortBy]);

  useEffect(() => { loadRecipes(); }, []);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    if (sortOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sortOpen]);

  // Close category dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setCategoryOpen(false);
    };
    if (categoryOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [categoryOpen]);

  // Category dropdown label
  const categoryLabel =
    selectedTags.length === 0 && !showFavorites ? "All"
    : selectedTags.length === 1 && !showFavorites ? selectedTags[0]
    : selectedTags.length === 0 && showFavorites ? "Favorites"
    : `${selectedTags.length + (showFavorites ? 1 : 0)} filters`;

  const getNutrientValue = (recipe: RecipeSummary, nutrient: string): number => {
    if (!recipe.totals) return 0;
    const match = recipe.totals.find(t => t.displayName === nutrient);
    return match?.value ?? 0;
  };

  const filteredRecipes = recipes.filter((recipe) => {
    if (showFavorites && !recipe.isFavorited) return false;
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
      <div className="ed-toolbar list-toolbar">
        {/* ── Mobile toolbar — CSS shows on mobile only ── */}
        <div className="mob-tb">
          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-[10px] top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted)]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={mobileSearchRef}
              type="search"
              placeholder="Search recipes…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search recipes"
              className="mob-search-input mob-search-input--icon"
            />
          </div>
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
            {activeFilterCount > 0 && <span className="mob-filter-dot" aria-hidden="true" />}
          </button>
        </div>

        {/* ── Desktop toolbar — CSS shows on desktop only ── */}
        <div className="desk-tb">

          {/* ── Wide desktop: full chip row ── */}
          <div className="desk-chips">
            {/* All */}
            <button
              className={`ed-chip${selectedTags.length === 0 && !showFavorites ? " is-active" : ""}`}
              onClick={() => { setSelectedTags([]); setShowFavorites(false); }}
              aria-pressed={selectedTags.length === 0 && !showFavorites}
            >All</button>
            {availableTags.map(tag => (
              <button
                key={tag}
                className={`ed-chip${selectedTags.includes(tag) ? " is-active" : ""}`}
                onClick={() => toggleTag(tag)}
                aria-pressed={selectedTags.includes(tag)}
              >{tag}</button>
            ))}
            {/* Favorites */}
            <button
              className={`ed-chip flex items-center gap-[5px]${showFavorites ? " is-active" : ""}`}
              onClick={() => setShowFavorites(prev => !prev)}
              aria-pressed={showFavorites}
            >
              <span aria-hidden="true" className="fav-dot-filter">{showFavorites ? "●" : "○"}</span>
              Favorites
            </button>
          </div>

          {/* ── Narrow desktop: compact category dropdown ── */}
          <div ref={categoryRef} className="desk-dropdown border border-[var(--rule)] relative transition-colors hover:border-[var(--fg)] shrink-0">
            <button
              onClick={() => setCategoryOpen(!categoryOpen)}
              aria-label="Filter by category"
              aria-expanded={categoryOpen}
              aria-haspopup="listbox"
              className="font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--fg)] bg-transparent border-0 py-[3px] pl-[9px] pr-[22px] cursor-pointer whitespace-nowrap relative"
              style={{ minWidth: 72 }}
            >
              {categoryLabel}
              <span className="absolute right-[7px] top-1/2 -translate-y-1/2 border-[3px] border-transparent border-t-[4px] border-t-[var(--muted)] mt-[2px]" />
            </button>
            {categoryOpen && (
              <div
                role="listbox"
                aria-label="Category options"
                aria-multiselectable="true"
                className="absolute left-[-1px] top-[calc(100%+2px)] min-w-[120px] bg-[var(--bg)] border border-[var(--rule)] z-[200] py-[3px] dropdown-enter"
                style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              >
                <button
                  role="option"
                  aria-selected={selectedTags.length === 0 && !showFavorites}
                  className={`block w-full text-left font-mono text-[9px] tracking-[0.08em] uppercase py-[6px] px-[12px] border-0 cursor-pointer transition-colors ${
                    selectedTags.length === 0 && !showFavorites
                      ? "text-[var(--fg)] bg-transparent"
                      : "text-[var(--muted)] bg-transparent hover:text-[var(--fg)] hover:bg-[var(--bg-2)]"
                  }`}
                  onClick={() => {
                    setSelectedTags([]);
                    setShowFavorites(false);
                    setCategoryOpen(false);
                  }}

                >All</button>
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    role="option"
                    aria-selected={selectedTags.includes(tag)}
                    className={`flex items-center justify-between w-full text-left font-mono text-[9px] tracking-[0.08em] uppercase py-[6px] px-[12px] border-0 cursor-pointer transition-colors ${
                      selectedTags.includes(tag)
                        ? "text-[var(--fg)] bg-transparent"
                        : "text-[var(--muted)] bg-transparent hover:text-[var(--fg)] hover:bg-[var(--bg-2)]"
                    }`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    {selectedTags.includes(tag) && <span className="text-[var(--cta)]">✓</span>}
                  </button>
                ))}
                <div className="border-t border-[var(--rule)] my-[3px]" aria-hidden="true" />
                <button
                  role="option"
                  aria-selected={showFavorites}
                  className={`flex items-center gap-[5px] w-full text-left font-mono text-[9px] tracking-[0.08em] uppercase py-[6px] px-[12px] border-0 cursor-pointer transition-colors ${
                    showFavorites
                      ? "text-[var(--err)] bg-transparent"
                      : "text-[var(--muted)] bg-transparent hover:text-[var(--fg)] hover:bg-[var(--bg-2)]"
                  }`}
                  onClick={() => setShowFavorites(prev => !prev)}
                >
                  <span aria-hidden="true" className="fav-dot-filter">{showFavorites ? "●" : "○"}</span>
                  <span className="flex-1">Favorites</span>
                  {showFavorites && <span className="text-[var(--fg)]">✓</span>}
                </button>
              </div>
            )}
          </div>

          {/* Right side controls */}
          <div className="list-controls flex gap-[18px] items-center ml-auto">
            {/* Recipe count */}
            <span className="ed-count">
              <strong>{filteredRecipes.length}</strong> recipe{filteredRecipes.length !== 1 ? "s" : ""}
            </span>

            <div className="ed-toolbar-sep" aria-hidden="true" />

            {/* Compare toggle — desktop/iPad only */}
            <button
              onClick={() => {
                if (!compareMode) { setCompareMode(true); return; }
                if (compareIds.length >= 2) { setCompareOpen(true); return; }
                exitCompareMode();
              }}
              className={`cmp-mode-btn ed-btn-text${compareMode ? " is-active" : ""}`}
              aria-pressed={compareMode}
              aria-label={compareMode ? (compareIds.length >= 2 ? "Open nutrition comparison" : "Exit compare mode") : "Enter compare mode"}
            >
              {compareMode && compareIds.length > 0 ? `Compare (${compareIds.length})` : 'Compare'}
            </button>

            {/* Sort group */}
            <div ref={sortRef} className="sort-control">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                aria-label="Sort recipes by"
                aria-expanded={sortOpen}
                aria-haspopup="listbox"
                className="sort-field"
              >
                {sortOptions.find(o => o.key === sortBy)?.label ?? "Name"}
                <span className="sort-caret" aria-hidden="true" />
              </button>
              {sortOpen && (
                <div
                  role="listbox"
                  aria-label="Sort options"
                  className="sort-dropdown min-w-[120px] bg-[var(--bg)] border border-[var(--rule)] py-[3px] dropdown-enter"
                  style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                >
                  {sortOptions.map(opt => (
                    <button
                      key={opt.key}
                      role="option"
                      aria-selected={sortBy === opt.key}
                      onClick={() => { setSortBy(opt.key); setSortOpen(false); }}
                      className={`block w-full text-left font-mono text-[9px] tracking-[0.08em] uppercase py-[6px] px-[12px] border-0 cursor-pointer transition-colors ${
                        sortBy === opt.key
                          ? "text-[var(--fg)] bg-transparent"
                          : "text-[var(--muted)] bg-transparent hover:text-[var(--fg)] hover:bg-[var(--bg-2)]"
                      }`}
                    >{opt.label}</button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setSortDir(prev => prev === "asc" ? "desc" : "asc")}
                aria-label={`Sort ${sortDir === "asc" ? "ascending" : "descending"}`}
                className="sort-dir"
              >{sortDir === "asc" ? "↑" : "↓"}</button>
            </div>

            {/* Grid/List toggle */}
            <div className="ed-toggle" role="group" aria-label="View mode">
              <button
                onClick={() => setViewMode("grid")}
                className={viewMode === "grid" ? "is-active" : ""}
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
              >Grid</button>
              <button
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "is-active" : ""}
                aria-label="List view"
                aria-pressed={viewMode === "list"}
              >List</button>
            </div>

            {/* Search */}
            <div className="ed-search">
              <input
                ref={searchRef}
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search recipes"
              />
            </div>

            {/* + New */}
            <button
              onClick={() => router.push("/recipes/create")}
              className="ed-btn-outline"
              aria-label="Create new recipe"
            >+ New</button>
          </div>
        </div>
      </div>

      {/* ── Compare mode subrow ── */}
      {compareMode && (
        <div className="compare-strip" role="region" aria-label="Compare selection">
          <div className="compare-strip-label">
            {compareIds.length === 0
              ? <>Select up to <strong>4 recipes</strong> to compare nutrition</>
              : <><strong>{compareIds.length}</strong> of 4 selected</>
            }
          </div>
          <div className="compare-strip-slots" aria-hidden="true">
            {[1,2,3,4].map(n => (
              <div key={n} className={`slot${n <= compareIds.length ? ' filled' : ''}`}>{n}</div>
            ))}
          </div>
          <div className="compare-strip-sep" aria-hidden="true" />
          {compareIds.length > 0 && (
            <button className="ed-btn-text" onClick={() => setCompareIds([])} aria-label="Clear compare selection">Clear</button>
          )}
          <button className="ed-btn-text" onClick={exitCompareMode} aria-label="Exit compare mode">Exit</button>
          <button
            className="compare-strip-cta"
            disabled={compareIds.length < 2}
            onClick={() => setCompareOpen(true)}
            aria-label="Open nutrition comparison"
          >
            Compare →
          </button>
        </div>
      )}

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
                  onClick={() => { setSelectedTags([]); setShowFavorites(false); setSortBy("name"); setSortDir("asc"); }}
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
                    onClick={() => setSortBy(opt.key)}
                    aria-pressed={sortBy === opt.key}
                  >{opt.label}</button>
                ))}
              </div>
              <div className="mob-sheet-dir-row">
                <button
                  className={`mob-sheet-dir-btn${sortDir === "asc" ? " on" : ""}`}
                  onClick={() => setSortDir("asc")}
                  aria-pressed={sortDir === "asc"}
                >↑ Ascending</button>
                <button
                  className={`mob-sheet-dir-btn${sortDir === "desc" ? " on" : ""}`}
                  onClick={() => setSortDir("desc")}
                  aria-pressed={sortDir === "desc"}
                >↓ Descending</button>
              </div>
            </div>

            {/* Tags */}
            <div className="mob-sheet-section">
              <div className="mob-sheet-section-label">Category</div>
              <div className="mob-sheet-chips">
                <button
                  className={`mob-sheet-chip${selectedTags.length === 0 && !showFavorites ? " on" : ""}`}
                  onClick={() => { setSelectedTags([]); setShowFavorites(false); }}
                  aria-pressed={selectedTags.length === 0 && !showFavorites}
                >All</button>
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    className={`mob-sheet-chip${selectedTags.includes(tag) ? " on" : ""}`}
                    onClick={() => toggleTag(tag)}
                    aria-pressed={selectedTags.includes(tag)}
                  >{tag}</button>
                ))}
                <button
                  className={`mob-sheet-chip flex items-center gap-1${showFavorites ? " on" : ""}`}
                  onClick={() => setShowFavorites(prev => !prev)}
                  aria-pressed={showFavorites}
                >
                  <span aria-hidden="true" className="fav-dot-filter">{showFavorites ? "●" : "○"}</span>
                  Favorites
                </button>
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
            <div className="font-mono text-[13px] font-light text-[var(--muted)] animate-loading">Loading recipes…</div>
          </div>
        ) : sortedRecipes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="empty-state empty-state-pane">
              <div className="empty-state-glyph" aria-hidden="true">
                {recipes.length === 0 ? <RecipeEmptyIcon /> : <NoMatchesIcon />}
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
          /* ── Ruled Grid (BRIEF-09) ── */
          <div key={`grid-${viewMode}-${selectedTags.join(',')}-${sortBy}-${sortDir}`} className="recipe-grid">
            {sortedRecipes.map((recipe, idx) => {
              const category = recipe.tags?.split(",")[0]?.trim();
              return (
                <article
                  key={recipe.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => compareMode ? toggleCompareRecipe(recipe.id) : router.push(`/recipes/${recipe.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); compareMode ? toggleCompareRecipe(recipe.id) : router.push(`/recipes/${recipe.id}`); } }}
                  aria-label={compareMode ? `${compareIds.includes(recipe.id) ? "Remove" : "Add"} ${recipe.name} from comparison` : recipe.name}
                  aria-pressed={compareMode ? compareIds.includes(recipe.id) : undefined}
                  className={`recipe-grid-item group${compareMode && compareIds.includes(recipe.id) ? " is-selected" : ""}${compareMode && !compareIds.includes(recipe.id) ? " is-selectable" : ""}${compareMode && !compareIds.includes(recipe.id) && compareIds.length >= 4 ? " opacity-40" : ""}`}
                  style={{ animation: `cardIn 350ms var(--ease-out) ${Math.min(idx, 8) * 30}ms both` }}
                >
                  {/* Photo */}
                  <div
                    className={`recipe-grid-item__photo${recipe.image ? "" : " is-ghost"}`}
                    style={recipe.image ? { backgroundImage: `url(${recipe.image})` } : undefined}
                  >
                    {compareMode && (
                      <div className="check-mark" aria-hidden="true">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    )}
                    {!recipe.image && (
                      <span className="ghost-title">
                        {recipe.name.length > 30 ? recipe.name.slice(0, recipe.name.lastIndexOf(' ', 30) || 30) : recipe.name}
                      </span>
                    )}
                  </div>
                  {/* Category + name */}
                  {category && <div className="recipe-grid-item__cat">{category}</div>}
                  <h3 className="recipe-grid-item__name">
                    {recipe.name}
                                      </h3>
                  {recipe.isComplete === false && (
                    <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--warn)] mt-[6px]">incomplete</div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          /* ── List View (BRIEF-08) ── */
          <div key={`list-${viewMode}-${selectedTags.join(',')}-${sortBy}-${sortDir}`}>
            {sortedRecipes.map((recipe, idx) => {
              const macros = getCardMacros(recipe);
              const category = recipe.tags?.split(",")[0]?.trim();
              const kcal  = macros ? Math.round(macros.kcal)    : null;
              const fat   = macros ? Math.round(macros.fat)     : null;
              const carbs = macros ? Math.round(macros.carbs)   : null;
              const prot  = macros ? Math.round(macros.protein) : null;
              return (
                <div
                  key={recipe.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => compareMode ? toggleCompareRecipe(recipe.id) : router.push(`/recipes/${recipe.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); compareMode ? toggleCompareRecipe(recipe.id) : router.push(`/recipes/${recipe.id}`); } }}
                  aria-label={compareMode ? `${compareIds.includes(recipe.id) ? "Remove" : "Add"} ${recipe.name} from comparison` : recipe.name}
                  aria-pressed={compareMode ? compareIds.includes(recipe.id) : undefined}
                  className="recipe-list-row"
                  style={{ animation: `cardIn 350ms var(--ease-out) ${Math.min(idx, 12) * 25}ms both`, ...(compareMode && compareIds.includes(recipe.id) ? { background: 'var(--accent-l)' } : {}) }}
                >
                  {/* Thumbnail */}
                  <div className="recipe-list-row__thumb">
                    {recipe.image && <img src={recipe.image} alt="" className="w-full h-full object-cover block" />}
                  </div>
                  {/* Name + category */}
                  <div className="recipe-list-row__main">
                    <span className="recipe-list-row__name">
                      {recipe.name}
                                          </span>
                    {category && <span className="recipe-list-row__cat">{category}</span>}
                    {recipe.isComplete === false && (
                      <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--warn)] flex-shrink-0">incomplete</span>
                    )}
                  </div>
                  {/* Nutrition values */}
                  <div className="recipe-list-row__vals">
                    <span>{kcal ?? "—"}<span className="u">kcal</span></span>
                    <span>{fat ?? "—"}<span className="u">g fat</span></span>
                    <span>{carbs ?? "—"}<span className="u">g carbs</span></span>
                    <span>{prot ?? "—"}<span className="u">g prot</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Full-screen compare overlay ── */}
      <div className={`cmp-overlay${compareOpen ? " open" : ""}`} role="dialog" aria-modal="true" aria-label="Nutrition comparison">
        {/* Header */}
        <div className="cmp-nav">
          <button
            type="button"
            onClick={() => setCompareOpen(false)}
            className="cmp-nav-back"
            aria-label="Back to recipes"
          >
            ‹ Back to Recipes
          </button>
          <div className="cmp-nav-sep" aria-hidden="true" />
          <span className="cmp-nav-title">Nutrition Comparison</span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '40px 64px 64px' }}>
          {(() => {
            const compareRecipes = compareIds.map(id => recipes.find(r => r.id === id)).filter(Boolean) as RecipeSummary[];
            if (compareRecipes.length < 2) return null;
            const cols = compareRecipes.length;
            const gridCols = `180px repeat(${cols}, 1fr)`;

            return (
              <div style={{ display: 'grid', gridTemplateColumns: gridCols, maxWidth: 960 }}>
                {/* Recipe headers */}
                <div />
                {compareRecipes.map((r, i) => {
                  const category = r.tags?.split(",")[0]?.trim();
                  return (
                    <div key={r.id} style={{ borderBottom: '1px solid var(--rule)', paddingBottom: 20, paddingRight: 24 }}>
                      <div className="overflow-hidden mb-[12px] relative" style={{ width: 80, aspectRatio: '4/3' }}>
                        {r.image
                          ? <img src={r.image} alt="" className="w-full h-full object-cover block" />
                          : <div className="w-full h-full flex items-end overflow-hidden" style={{ background: 'var(--bg-3)', padding: '4px 6px 8px' }}>
                              <span className="font-sans font-bold leading-[1.05] tracking-[-0.02em] text-[var(--fg)] opacity-[0.18] block" style={{ fontSize: 11 }}>
                                {r.name.length > 22 ? r.name.slice(0, r.name.lastIndexOf(' ', 22) || 22) : r.name}
                              </span>
                            </div>
                        }
                      </div>
                      {category && <div className="font-mono text-[8px] tracking-[0.12em] uppercase text-[var(--muted)] mb-[4px]">{category}</div>}
                      <div className="font-serif text-[16px] font-semibold leading-[1.2] text-[var(--fg)]">{r.name}</div>
                    </div>
                  );
                })}

                {/* Nutrient rows */}
                {COMPARE_NUTRIENTS.map(n => {
                  const vals = compareRecipes.map(r => getCompareValue(r, n.keys));
                  const winner = n.lowerIsBetter ? Math.min(...vals) : Math.max(...vals);
                  return (
                    <React.Fragment key={`row-${n.label}`}>
                      {/* Label */}
                      <div className="font-mono text-[9px] tracking-[0.06em] uppercase text-[var(--muted)] flex items-center" style={{ borderBottom: '1px solid var(--rule)', padding: '11px 0' }}>
                        {n.label}
                      </div>
                      {/* Values */}
                      {vals.map((v, i) => {
                        const isWinner = v === winner && vals.some((x, j) => j !== i) /* avoid marking when only one */;
                        return (
                          <div key={`val-${n.label}-${i}`} className={`cmp-value${isWinner ? ' lo' : ''}`} style={{ borderBottom: '1px solid var(--rule)', padding: '11px 24px 11px 0' }}>
                            <span className="cmp-num tabular-nums">{v}</span>
                            <span className="cmp-unit">{n.unit}</span>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
