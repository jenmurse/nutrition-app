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
  const availableTags = ["breakfast", "lunch", "dinner", "snack", "side", "dessert", "beverage"];

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

  // View mode
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Search expand
  const [searchOpen, setSearchOpen] = useState(!!searchQuery);
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
    };
  };

  return (
    <div className="h-full flex flex-col">
      {/* ── Filter Bar ── */}
      <div
        className="flex items-center gap-[4px] px-[var(--pad)] shrink-0 border-b border-[var(--rule)] bg-[var(--bg)] sticky top-0 z-10"
        style={{ height: "var(--filter-h)" }}
      >
        {/* Tag chips */}
        <button
          onClick={() => updateSearchParam("tags", "")}
          className={`font-mono text-[8px] tracking-[0.1em] uppercase py-[3px] px-[9px] border cursor-pointer transition-colors whitespace-nowrap active:scale-[0.97] ${
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
            className={`font-mono text-[8px] tracking-[0.1em] uppercase py-[3px] px-[9px] border cursor-pointer transition-colors whitespace-nowrap active:scale-[0.97] ${
              selectedTags.includes(tag)
                ? "text-[var(--fg)] border-[var(--rule)]"
                : "text-[var(--muted)] border-transparent hover:text-[var(--fg)]"
            }`}
            aria-label={`Filter by ${tag}`}
            aria-pressed={selectedTags.includes(tag)}
          >{tag}</button>
        ))}

        {/* Right side controls */}
        <div className="flex gap-[5px] items-center ml-auto">
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
              className="font-mono text-[11px] text-[var(--muted)] bg-transparent border-0 py-[3px] px-[9px] cursor-pointer transition-colors flex items-center leading-none shrink-0 hover:bg-[var(--bg-3)] hover:text-[var(--fg)] active:scale-[0.97]"
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
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => updateSearchParam("search", e.target.value)}
            aria-label="Search recipes"
            className="font-mono text-[9px] tracking-[0.04em] text-[var(--fg)] bg-[var(--bg-2)] border border-[var(--rule)] py-[3px] px-[9px] outline-none transition-all focus:border-[var(--accent)]"
            style={{ width: searchOpen ? 180 : 0, opacity: searchOpen ? 1 : 0, pointerEvents: searchOpen ? "auto" : "none" }}
          />
          {!searchOpen && (
            <button
              onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }}
              className="font-mono text-[9px] tracking-[0.06em] bg-transparent border border-[var(--rule)] text-[var(--muted)] py-[3px] px-[9px] cursor-pointer transition-colors whitespace-nowrap hover:text-[var(--fg)] hover:border-[var(--accent)] active:scale-[0.97]"
              aria-label="Open search"
            >Search</button>
          )}

          {/* + New */}
          <button
            onClick={() => router.push("/recipes/create")}
            className="font-mono text-[8px] tracking-[0.1em] uppercase bg-[var(--accent)] text-[var(--accent-fg)] border-0 py-[3px] px-[9px] cursor-pointer transition-opacity whitespace-nowrap hover:opacity-[0.88] active:scale-[0.97]"
            aria-label="Create new recipe"
          >+ New</button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="font-mono text-[12px] font-light text-[var(--muted)] animate-loading">Loading recipes…</div>
          </div>
        ) : sortedRecipes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-[280px]">
              <div className="font-serif text-[20px] text-[var(--fg)]">
                {recipes.length === 0 ? "No recipes yet" : "No matches"}
              </div>
              <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                {recipes.length === 0 ? "Create a recipe from scratch or import one." : "Try adjusting your filters."}
              </p>
              {recipes.length === 0 && (
                <button
                  onClick={() => router.push("/recipes/create")}
                  className="bg-[var(--accent)] text-[var(--accent-fg)] px-5 py-[8px] text-[9px] font-mono uppercase tracking-[0.1em] hover:opacity-[0.88] transition-opacity border-0 cursor-pointer active:scale-[0.97]"
                  aria-label="Create first recipe"
                >+ New Recipe</button>
              )}
            </div>
          </div>
        ) : viewMode === "grid" ? (
          /* ── Card Grid ── */
          <div className="max-w-[1100px] mx-auto" style={{ padding: "32px 64px 48px" }}>
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
                    style={{ "--card-i": idx } as React.CSSProperties}
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
                        <div className="w-full h-full bg-[var(--bg-3)] flex items-end p-4">
                          <span className="font-serif text-[clamp(22px,2.5vw,32px)] font-bold tracking-[-0.03em] leading-[0.92] text-[var(--fg)] opacity-[0.18]">
                            {recipe.name}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ padding: "16px 18px 20px" }}>
                      {category && (
                        <div className="font-mono text-[7.5px] tracking-[0.14em] uppercase text-[var(--muted)] mb-[7px]">{category}</div>
                      )}
                      <div className="font-serif text-[clamp(15px,1.4vw,18px)] font-semibold tracking-[-0.01em] leading-[1.2] mb-[10px]" style={{ textWrap: "balance" }}>
                        {recipe.name}
                      </div>
                      {macros && (
                        <div className="flex gap-2 items-baseline flex-wrap">
                          <span className="font-mono text-[10px] text-[var(--fg)] tabular-nums">{macros.kcal} kcal</span>
                          <span className="flex gap-2">
                            <span className="font-mono text-[8.5px] text-[var(--muted)] tabular-nums">P {macros.protein}g</span>
                            <span className="font-mono text-[8.5px] text-[var(--muted)] tabular-nums">C {macros.carbs}g</span>
                            <span className="font-mono text-[8.5px] text-[var(--muted)] tabular-nums">F {macros.fat}g</span>
                          </span>
                        </div>
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
          <div className="max-w-[1100px] mx-auto" style={{ padding: "0 64px" }}>
            {sortedRecipes.map((recipe) => {
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
                  className="flex items-center gap-5 py-4 border-b border-[var(--rule)] cursor-pointer group transition-colors hover:bg-[var(--bg-2)]"
                  style={{ padding: "16px 12px" }}
                >
                  {/* Thumbnail */}
                  <div className="w-[80px] h-[60px] overflow-hidden shrink-0 bg-[var(--bg-3)]">
                    {recipe.image ? (
                      <img src={recipe.image} alt="" className="w-full h-full object-cover block" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-serif text-[11px] font-bold text-[var(--fg)] opacity-[0.15] text-center leading-tight px-1">{recipe.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {category && (
                      <div className="font-mono text-[7.5px] tracking-[0.14em] uppercase text-[var(--muted)] mb-1">{category}</div>
                    )}
                    <div className="font-serif text-[15px] font-semibold tracking-[-0.01em] leading-[1.2] truncate">{recipe.name}</div>
                  </div>
                  {macros && (
                    <div className="flex gap-3 items-baseline shrink-0">
                      <span className="font-mono text-[10px] text-[var(--fg)] tabular-nums">{macros.kcal} kcal</span>
                      <span className="font-mono text-[8.5px] text-[var(--muted)] tabular-nums">P {macros.protein}g</span>
                      <span className="font-mono text-[8.5px] text-[var(--muted)] tabular-nums">C {macros.carbs}g</span>
                      <span className="font-mono text-[8.5px] text-[var(--muted)] tabular-nums">F {macros.fat}g</span>
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
