"use client";

import { useEffect, useRef, useState, Suspense } from "react";
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

  const toggleFavorite = async (recipeId: number, currentlyFavorited: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Optimistic update
    setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, isFavorited: !currentlyFavorited } : r));
    try {
      const res = await fetch(`/api/recipes/${recipeId}/favorite`, { method: currentlyFavorited ? "DELETE" : "POST" });
      if (!res.ok) {
        setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, isFavorited: currentlyFavorited } : r));
      } else {
        clientCache.delete("/api/recipes");
        clientCache.delete("/api/recipes?slim=true");
      }
    } catch {
      setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, isFavorited: currentlyFavorited } : r));
    }
  };

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
      <div
        className="list-toolbar flex items-center gap-[4px] px-[var(--pad)] shrink-0 border-b border-[var(--rule)] bg-[var(--bg)] sticky top-0 z-10"
        style={{ height: "var(--filter-h)" }}
      >
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
              className={`filter-chip font-mono text-[9px] tracking-[0.1em] uppercase py-[3px] px-[9px] border cursor-pointer transition-colors whitespace-nowrap shrink-0 active:scale-[0.97] ${
                selectedTags.length === 0 && !showFavorites
                  ? "text-[var(--fg)] border-[var(--rule)]"
                  : "text-[var(--muted)] border-transparent hover:text-[var(--fg)]"
              }`}
              onClick={() => { setSelectedTags([]); setShowFavorites(false); }}
              aria-pressed={selectedTags.length === 0 && !showFavorites}
            >All</button>
            {availableTags.map(tag => (
              <button
                key={tag}
                className={`filter-chip font-mono text-[9px] tracking-[0.1em] uppercase py-[3px] px-[9px] border cursor-pointer transition-colors whitespace-nowrap shrink-0 active:scale-[0.97] ${
                  selectedTags.includes(tag)
                    ? "text-[var(--fg)] border-[var(--rule)]"
                    : "text-[var(--muted)] border-transparent hover:text-[var(--fg)]"
                }`}
                onClick={() => toggleTag(tag)}
                aria-pressed={selectedTags.includes(tag)}
              >{tag}</button>
            ))}
            {/* Favorites */}
            <button
              className={`filter-chip flex items-center gap-[5px] font-mono text-[9px] tracking-[0.1em] uppercase py-[3px] px-[9px] border cursor-pointer transition-colors whitespace-nowrap shrink-0 active:scale-[0.97] ${
                showFavorites
                  ? "text-[var(--fg)] border-[var(--rule)]"
                  : "text-[var(--muted)] border-transparent hover:text-[var(--fg)]"
              }`}
              onClick={() => setShowFavorites(prev => !prev)}
              aria-pressed={showFavorites}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill={showFavorites ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
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
                    {selectedTags.includes(tag) && <span className="text-[var(--accent-btn)]">✓</span>}
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
                  <svg width="9" height="9" viewBox="0 0 24 24" fill={showFavorites ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <span className="flex-1">Favorites</span>
                  {showFavorites && <span className="text-[var(--err)]">✓</span>}
                </button>
              </div>
            )}
          </div>

          {/* Right side controls */}
          <div className="list-controls flex gap-[5px] items-center ml-auto">
            {/* Recipe count */}
            <span className="font-mono text-[9px] text-[var(--muted)] tracking-[0.04em] whitespace-nowrap mr-[6px] tabular-nums">
              {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? "s" : ""}
            </span>

            {/* Compare toggle — desktop/iPad only */}
            <button
              onClick={() => compareMode ? exitCompareMode() : setCompareMode(true)}
              className={`cmp-mode-btn font-mono text-[9px] tracking-[0.08em] uppercase py-[3px] px-[10px] border cursor-pointer transition-colors flex items-center gap-[5px] ${
                compareMode
                  ? "bg-[var(--bg-3)] border-[var(--fg)] text-[var(--fg)]"
                  : "border-[var(--rule)] text-[var(--muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]"
              }`}
              aria-pressed={compareMode}
              aria-label={compareMode ? "Exit compare mode" : "Enter compare mode"}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="3" width="8" height="18" rx="1"/><rect x="14" y="3" width="8" height="18" rx="1"/>
              </svg>
              Compare
            </button>

            {/* Sort group */}
            <div ref={sortRef} className="flex border border-[var(--rule)] relative transition-colors hover:border-[var(--fg)]">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                aria-label="Sort recipes by"
                aria-expanded={sortOpen}
                aria-haspopup="listbox"
                className="font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--fg)] bg-transparent border-0 border-r border-[var(--rule)] py-[3px] pl-[9px] pr-[22px] cursor-pointer whitespace-nowrap relative"
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
                className="font-mono text-[11px] text-[var(--muted)] bg-transparent border-0 py-[3px] px-[7px] cursor-pointer transition-colors flex items-center leading-none shrink-0 hover:bg-[var(--bg-3)] hover:text-[var(--fg)] active:scale-[0.97]"
              >{sortDir === "asc" ? "↑" : "↓"}</button>
            </div>

            {/* Grid/List toggle */}
            <div className="flex border border-[var(--rule)] overflow-hidden rounded-pill transition-colors hover:border-[var(--fg)]">
              <button
                onClick={() => setViewMode("grid")}
                className={`font-mono text-[9px] tracking-[0.1em] uppercase py-[3px] px-[9px] border-0 border-r border-[var(--rule)] cursor-pointer transition-colors ${
                  viewMode === "grid" ? "bg-[var(--bg-3)] text-[var(--fg)]" : "bg-transparent text-[var(--muted)] hover:bg-[var(--bg-3)] hover:text-[var(--fg)]"
                }`}
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
              >Grid</button>
              <button
                onClick={() => setViewMode("list")}
                className={`font-mono text-[9px] tracking-[0.1em] uppercase py-[3px] px-[9px] border-0 cursor-pointer transition-colors ${
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
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search recipes"
              className="font-mono text-[9px] tracking-[0.04em] text-[var(--fg)] bg-[var(--bg-2)] border border-[var(--rule)] py-[3px] px-[9px] outline-none transition-[border-color] focus:border-[var(--accent)]"
              style={{ width: 180 }}
            />

            {/* + New */}
            <button
              onClick={() => router.push("/recipes/create")}
              className="pl-new-btn"
              aria-label="Create new recipe"
            >+ New</button>
          </div>
        </div>
      </div>

      {/* ── Compare mode banner ── */}
      <div className={`cmp-banner${compareMode ? " open" : ""}`} aria-hidden={!compareMode}>
        <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-white/60">
          Select up to <strong className="text-white font-medium">4 recipes</strong> to compare nutrition
        </span>
        <button
          onClick={exitCompareMode}
          className="font-mono text-[9px] tracking-[0.08em] uppercase text-white/50 border border-white/20 py-[2px] px-[8px] bg-transparent cursor-pointer transition-colors hover:text-white hover:border-white/50"
          aria-label="Exit compare mode"
        >✕ Exit</button>
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
                  <svg width="9" height="9" viewBox="0 0 24 24" fill={showFavorites ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
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
          /* ── Card Grid ── */
          <div key={`grid-${viewMode}-${selectedTags.join(',')}-${sortBy}-${sortDir}`} className="rcp-grid max-w-[1100px] mx-auto" style={{ padding: "32px 64px 48px" }}>
            <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4" style={{ gridAutoRows: "auto" }}>
              {sortedRecipes.map((recipe, idx) => {
                const macros = getCardMacros(recipe);
                const category = recipe.tags?.split(",")[0]?.trim();
                return (
                  <div
                    key={recipe.id}
                    data-cursor="card"
                    role="button"
                    tabIndex={0}
                    onClick={() => compareMode ? toggleCompareRecipe(recipe.id) : router.push(`/recipes/${recipe.id}`)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); compareMode ? toggleCompareRecipe(recipe.id) : router.push(`/recipes/${recipe.id}`); } }}
                    aria-label={compareMode ? `${compareIds.includes(recipe.id) ? "Remove" : "Add"} ${recipe.name} from comparison` : recipe.name}
                    aria-pressed={compareMode ? compareIds.includes(recipe.id) : undefined}
                    className={`bg-[var(--bg)] cursor-pointer relative group transition-transform duration-200 ${compareMode && !compareIds.includes(recipe.id) && compareIds.length >= 4 ? "opacity-40" : ""}`}
                    style={{ animation: `cardIn 350ms var(--ease-out) ${Math.min(idx, 8) * 30}ms both` }}
                  >
                    {/* Compare selected overlay */}
                    {compareMode && compareIds.includes(recipe.id) && (
                      <>
                        <div className="absolute inset-0 pointer-events-none z-10" style={{ background: 'var(--accent-l)', outline: '2px solid var(--accent-btn)', outlineOffset: '-2px' }} />
                        <div className="absolute top-2 left-2 w-[22px] h-[22px] rounded-full flex items-center justify-center z-20" style={{ background: 'var(--accent-btn)' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      </>
                    )}
                    {/* Compare hover hint */}
                    {compareMode && !compareIds.includes(recipe.id) && compareIds.length < 4 && (
                      <div className="absolute top-2 right-2 font-mono text-[8px] tracking-[0.08em] uppercase bg-black/60 text-white/80 px-[7px] py-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" style={{ backdropFilter: 'blur(4px)' }}>
                        + Add
                      </div>
                    )}
                    {/* Image */}
                    <div className="overflow-hidden relative" style={{ aspectRatio: "4/3" }}>
                      {recipe.image ? (
                        <img
                          src={recipe.image}
                          alt={recipe.name}
                          className="w-full h-full object-cover block transition-transform duration-[600ms]"
                          style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-[var(--bg-3)] flex items-end overflow-hidden" style={{ padding: '14px 16px 22px' }}>
                          <span className="font-serif text-[clamp(22px,2.5vw,32px)] font-bold tracking-[-0.03em] leading-[1.05] text-[var(--fg)] opacity-[0.18] block">
                            {recipe.name.length > 30 ? recipe.name.slice(0, recipe.name.lastIndexOf(' ', 30) || 30) : recipe.name}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ padding: "16px 18px 24px" }}>
                      {category && (
                        <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)] mb-[7px]">{category}</div>
                      )}
                      <div className="rcp-card-name font-serif text-[clamp(13px,1.4vw,16px)] font-semibold tracking-[-0.01em] leading-[1.2] mb-[10px]" style={{ textWrap: "balance" }}>
                        {recipe.name}
                      </div>
                      {recipe.isComplete === false && (
                        <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--warn)] mt-[6px]">incomplete</div>
                      )}
                    </div>
                    {/* Accent bar on hover */}
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }} />
                    {/* Favorite heart */}
                    <button
                      onClick={(e) => toggleFavorite(recipe.id, !!recipe.isFavorited, e)}
                      className={`rcp-fav-btn absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-[color,opacity,background] duration-150 ${
                        recipe.isFavorited
                          ? "text-[var(--err)] bg-black/20 opacity-100"
                          : "text-white bg-black/20 opacity-0 group-hover:opacity-100"
                      }`}
                      style={{ backdropFilter: "blur(4px)" }}
                      aria-label={recipe.isFavorited ? "Remove from favorites" : "Add to favorites"}
                      aria-pressed={!!recipe.isFavorited}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill={recipe.isFavorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={recipe.isFavorited ? "rcp-heart-on" : ""}>
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </button>
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
                  onClick={() => compareMode ? toggleCompareRecipe(recipe.id) : router.push(`/recipes/${recipe.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); compareMode ? toggleCompareRecipe(recipe.id) : router.push(`/recipes/${recipe.id}`); } }}
                  aria-label={compareMode ? `${compareIds.includes(recipe.id) ? "Remove" : "Add"} ${recipe.name} from comparison` : recipe.name}
                  aria-pressed={compareMode ? compareIds.includes(recipe.id) : undefined}
                  className="rcp-list-row flex items-center gap-[14px] border-b border-[var(--rule)] cursor-pointer group relative"
                  style={{ padding: "10px 0", animation: `cardIn 350ms var(--ease-out) ${Math.min(idx, 12) * 25}ms both`, ...(compareMode && compareIds.includes(recipe.id) ? { background: 'var(--accent-l)' } : {}) }}
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
                      <span className="rcp-list-eyebrow font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--muted)] shrink-0">{category}</span>
                    )}
                    <span className="font-serif text-[16px] font-semibold tracking-[-0.01em] text-[var(--fg)] truncate">{recipe.name}</span>
                  </div>
                  {/* Accent bar on hover */}
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }} />
                  {recipe.isComplete === false && (
                    <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--warn)] shrink-0">incomplete</span>
                  )}
                  {/* Favorite heart */}
                  <button
                    onClick={(e) => toggleFavorite(recipe.id, !!recipe.isFavorited, e)}
                    className={`rcp-fav-btn shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-[color,opacity] duration-150 ${
                      recipe.isFavorited
                        ? "text-[var(--err)] opacity-100"
                        : "text-[var(--muted)] opacity-0 group-hover:opacity-100"
                    }`}
                    aria-label={recipe.isFavorited ? "Remove from favorites" : "Add to favorites"}
                    aria-pressed={!!recipe.isFavorited}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill={recipe.isFavorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={recipe.isFavorited ? "rcp-heart-on" : ""}>
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Floating compare bar ── */}
      <div className={`cmp-bar${compareMode && compareIds.length > 0 ? " open" : ""}`} role="region" aria-label="Compare selection">
        {/* Clear */}
        <button
          onClick={() => setCompareIds([])}
          className="font-mono text-[9px] tracking-[0.08em] uppercase text-white/40 bg-transparent border-0 border-r border-white/10 px-[14px] h-[48px] cursor-pointer transition-colors hover:text-white/80"
          aria-label="Clear compare selection"
        >Clear</button>
        {/* Slots */}
        <div className="flex items-center gap-[6px] px-[14px] border-r border-white/10">
          {[0, 1, 2, 3].map(i => {
            const rid = compareIds[i];
            const recipe = rid ? recipes.find(r => r.id === rid) : null;
            return (
              <div
                key={i}
                className="w-[28px] h-[21px] rounded-[2px] flex items-center justify-center overflow-hidden relative"
                style={{ border: recipe ? '1.5px solid rgba(255,255,255,0.5)' : '1.5px dashed rgba(255,255,255,0.2)' }}
              >
                {recipe && (
                  <>
                    <span className="font-mono text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.7)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {i + 1}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleCompareRecipe(rid); }}
                      className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer border-0"
                      aria-label={`Remove ${recipe.name} from comparison`}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
        {/* Count */}
        <div className="font-mono text-[9px] tracking-[0.08em] uppercase text-white/40 px-[14px]">
          <strong className="text-white/90">{compareIds.length}</strong> / 4 selected
        </div>
        {/* Compare button */}
        <button
          onClick={() => compareIds.length >= 2 && setCompareOpen(true)}
          disabled={compareIds.length < 2}
          className="font-mono text-[9px] tracking-[0.1em] uppercase h-[48px] px-[20px] border-0 bg-[var(--accent-btn)] text-[var(--accent-fg)] cursor-pointer transition-[opacity] hover:opacity-80 disabled:opacity-35 disabled:cursor-default"
          aria-label="Open nutrition comparison"
        >Compare →</button>
      </div>

      {/* ── Full-screen compare overlay ── */}
      <div className={`cmp-overlay${compareOpen ? " open" : ""}`} role="dialog" aria-modal="true" aria-label="Nutrition comparison">
        {/* Header */}
        <div className="flex items-center justify-between px-[40px] border-b border-[var(--rule)] shrink-0" style={{ height: 'var(--nav-h)' }}>
          <div className="flex items-center gap-[16px]">
            <button
              onClick={() => setCompareOpen(false)}
              className="font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--muted)] bg-transparent border-0 cursor-pointer transition-colors hover:text-[var(--fg)] flex items-center gap-[5px] p-0"
              aria-label="Back to recipes"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
              Back to recipes
            </button>
            <div className="w-[1px] h-[14px] bg-[var(--rule)]" aria-hidden="true" />
            <span className="font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--muted)]">Nutrition Comparison</span>
          </div>
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
                      <div className="overflow-hidden mb-[12px] relative" style={{ width: 80, aspectRatio: '4/3', borderTop: '3px solid var(--accent-btn)' }}>
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
                  const maxVal = Math.max(...vals);
                  return (
                    <>
                      {/* Label */}
                      <div key={`lbl-${n.label}`} className="font-mono text-[9px] tracking-[0.06em] uppercase text-[var(--muted)] flex items-center" style={{ borderBottom: '1px solid var(--rule)', padding: '11px 0' }}>
                        {n.label}
                      </div>
                      {/* Values */}
                      {vals.map((v, i) => {
                        const pct = maxVal > 0 ? (v / maxVal) * 100 : 0;
                        return (
                          <div key={`val-${n.label}-${i}`} className="flex items-baseline gap-[3px]" style={{ borderBottom: '1px solid var(--rule)', padding: '11px 24px 11px 0' }}>
                            <span className="font-sans text-[20px] font-bold tabular-nums text-[var(--fg)]" style={{ letterSpacing: '-0.02em' }}>{v}</span>
                            <span className="font-mono text-[8px] tracking-[0.06em] text-[var(--muted)]">{n.unit}</span>
                          </div>
                        );
                      })}
                    </>
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
