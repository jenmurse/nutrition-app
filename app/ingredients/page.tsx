"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { clientCache } from "@/lib/clientCache";

type NutrientValue = {
  id: number;
  value: number;
  nutrient: { id: number; name: string; displayName: string; unit: string };
};

type Ingredient = {
  id: number;
  name: string;
  fdcId?: string | null;
  defaultUnit: string;
  customUnitName?: string | null;
  customUnitAmount?: number | null;
  customUnitGrams?: number | null;
  isMealItem?: boolean;
  nutrientValues: NutrientValue[];
};

type Nutrient = {
  id: number;
  name: string;
  displayName: string;
  unit: string;
};

const VOLUME_TO_ML: Record<string, number> = {
  tsp: 5,
  tbsp: 15,
  cup: 240,
};

function getAmountInGrams(
  amount: string,
  unit: string,
  customUnitName: string,
  customUnitAmount: string,
  customUnitGrams: string
): number {
  const parsed = Number(amount);
  if (!parsed || parsed <= 0) return 100;

  if (unit === "g") return parsed;
  if (unit === "ml") return parsed;

  if (customUnitName && customUnitGrams && unit === customUnitName) {
    const customAmount = Number(customUnitAmount) || 1;
    return (parsed / customAmount) * Number(customUnitGrams);
  }

  const mlPerUnit = VOLUME_TO_ML[unit];
  return mlPerUnit ? parsed * mlPerUnit : parsed;
}

function getVolumeUnitNote(unit: string, hasCustomGrams: boolean): string {
  if (hasCustomGrams) return "";
  if (unit === "tsp") return "1 tsp = 5 ml";
  if (unit === "tbsp") return "1 tbsp = 15 ml";
  if (unit === "cup") return "1 cup = 240 ml";
  if (unit === "ml") return "1 ml = 1 g";
  return "";
}

function formatNutrient(num: number): string {
  if (num === 0) return "0";

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const intPart = Math.floor(absNum);
  const fracPart = absNum - intPart;

  if (fracPart === 0) return String(num);

  const fracStr = fracPart.toString().split(".")[1] || "";
  let firstNonZeroIdx = fracStr.length;
  for (let i = 0; i < fracStr.length; i++) {
    if (fracStr[i] !== "0") {
      firstNonZeroIdx = i;
      break;
    }
  }

  const decimalPlaces = firstNonZeroIdx + 2;
  const factor = Math.pow(10, decimalPlaces);
  const truncated = Math.floor(absNum * factor) / factor;

  const result = isNegative ? -truncated : truncated;
  return result.toString();
}

export default function IngredientsPageWrapper() {
  return (
    <Suspense>
      <IngredientsPage />
    </Suspense>
  );
}

function IngredientsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => clientCache.get<Ingredient[]>('/api/ingredients?slim=true') ?? []);
  const [loading, setLoading] = useState(() => !clientCache.get('/api/ingredients?slim=true'));

  // Filters
  const searchQuery = searchParams?.get("search") || "";
  const [foodFilter, setFoodFilter] = useState<'all' | 'foods' | 'ingredients'>('all');

  // View mode
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Search expand
  const [searchOpen, setSearchOpen] = useState(!!searchQuery);
  const searchRef = useRef<HTMLInputElement>(null);

  const updateSearchParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/ingredients?${params.toString()}`);
  };

  const loadIngredients = async () => {
    const cached = clientCache.get<Ingredient[]>('/api/ingredients?slim=true');
    if (cached && cached.length > 0) {
      setIngredients(cached);
      setLoading(false);
      // Background revalidate
      fetch("/api/ingredients?slim=true").then(r => r.json()).then((data) => {
        const fresh: Ingredient[] = Array.isArray(data) ? data : [];
        clientCache.set('/api/ingredients?slim=true', fresh);
        setIngredients(fresh);
      }).catch(console.error);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/ingredients?slim=true");
      const data = await r.json();
      const list: Ingredient[] = Array.isArray(data) ? data : [];
      clientCache.set('/api/ingredients?slim=true', list);
      setIngredients(list);
    } catch (e) {
      console.error(e);
      setIngredients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadIngredients(); }, []);

  // Extract macros for card display
  const getCardMacros = (ingredient: Ingredient) => {
    if (!ingredient.nutrientValues || ingredient.nutrientValues.length === 0) return null;
    const find = (keys: string[]) => {
      const n = ingredient.nutrientValues.find(nv => {
        const name = nv.nutrient.displayName.toLowerCase();
        return keys.some(k => name.includes(k));
      });
      return n ? Math.round(n.value) : 0;
    };
    return {
      kcal: find(["energy", "calorie"]),
      protein: find(["protein"]),
      carbs: find(["carbohydrate", "carb"]),
      fat: find(["fat"]),
    };
  };

  const filteredIngredients = ingredients.filter((ing) => {
    if (searchQuery && !ing.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (foodFilter === 'foods' && !ing.isMealItem) return false;
    if (foodFilter === 'ingredients' && ing.isMealItem) return false;
    return true;
  });

  const sortedIngredients = [...filteredIngredients].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* ── Filter Bar ── */}
      <div
        className="flex items-center gap-[4px] px-[var(--pad)] shrink-0 border-b border-[var(--rule)] bg-[var(--bg)] sticky top-0 z-10"
        style={{ height: "var(--filter-h)" }}
      >
        {/* Filter chips */}
        <button
          onClick={() => setFoodFilter('all')}
          className={`font-mono text-[8px] tracking-[0.1em] uppercase py-[3px] px-[9px] border cursor-pointer transition-colors whitespace-nowrap active:scale-[0.97] ${
            foodFilter === 'all'
              ? "text-[var(--fg)] border-[var(--rule)]"
              : "text-[var(--muted)] border-transparent hover:text-[var(--fg)]"
          }`}
          aria-label="Show all ingredients"
          aria-pressed={foodFilter === 'all'}
        >All</button>
        <button
          onClick={() => setFoodFilter('foods')}
          className={`font-mono text-[8px] tracking-[0.1em] uppercase py-[3px] px-[9px] border cursor-pointer transition-colors whitespace-nowrap active:scale-[0.97] ${
            foodFilter === 'foods'
              ? "text-[var(--fg)] border-[var(--rule)]"
              : "text-[var(--muted)] border-transparent hover:text-[var(--fg)]"
          }`}
          aria-label="Show only foods"
          aria-pressed={foodFilter === 'foods'}
        >Foods</button>
        <button
          onClick={() => setFoodFilter('ingredients')}
          className={`font-mono text-[8px] tracking-[0.1em] uppercase py-[3px] px-[9px] border cursor-pointer transition-colors whitespace-nowrap active:scale-[0.97] ${
            foodFilter === 'ingredients'
              ? "text-[var(--fg)] border-[var(--rule)]"
              : "text-[var(--muted)] border-transparent hover:text-[var(--fg)]"
          }`}
          aria-label="Show only ingredients"
          aria-pressed={foodFilter === 'ingredients'}
        >Ingredients</button>

        {/* Right side controls */}
        <div className="flex gap-[5px] items-center ml-auto">
          {/* Count */}
          <span className="font-mono text-[8px] text-[var(--muted)] tracking-[0.04em] whitespace-nowrap mr-[6px] tabular-nums">
            {filteredIngredients.length} item{filteredIngredients.length !== 1 ? "s" : ""}
          </span>

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
            aria-label="Search ingredients"
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

          {/* + Add */}
          <button
            onClick={() => router.push("/ingredients/create")}
            className="font-mono text-[8px] tracking-[0.1em] uppercase bg-[var(--accent)] text-[var(--accent-fg)] border-0 py-[3px] px-[9px] cursor-pointer transition-opacity whitespace-nowrap hover:opacity-[0.88] active:scale-[0.97]"
            aria-label="Add new ingredient"
          >+ Add</button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="font-mono text-[12px] font-light text-[var(--muted)] animate-loading">Loading ingredients...</div>
          </div>
        ) : sortedIngredients.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-[280px]">
              <div className="font-serif text-[20px] text-[var(--fg)]">
                {ingredients.length === 0 ? "No ingredients yet" : "No matches"}
              </div>
              <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                {ingredients.length === 0 ? "Add an ingredient or food to get started." : "Try adjusting your filters."}
              </p>
              {ingredients.length === 0 && (
                <button
                  onClick={() => router.push("/ingredients/create")}
                  className="bg-[var(--accent)] text-[var(--accent-fg)] px-5 py-[8px] text-[9px] font-mono uppercase tracking-[0.1em] hover:opacity-[0.88] transition-opacity border-0 cursor-pointer active:scale-[0.97]"
                  aria-label="Add first ingredient"
                >+ Add Ingredient</button>
              )}
            </div>
          </div>
        ) : viewMode === "grid" ? (
          /* ── Card Grid ── */
          <div className="max-w-[1100px] mx-auto" style={{ padding: "32px 64px 48px" }}>
            <div className="grid gap-6 grid-cols-2 lg:grid-cols-4" style={{ gridAutoRows: "auto" }}>
              {sortedIngredients.map((ingredient, idx) => {
                const macros = getCardMacros(ingredient);
                const category = ingredient.isMealItem ? "FOOD" : "INGREDIENT";
                const unitDisplay = ingredient.customUnitName || ingredient.defaultUnit;
                return (
                  <div
                    key={ingredient.id}
                    data-cursor="card"
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/ingredients/${ingredient.id}`)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/ingredients/${ingredient.id}`); } }}
                    aria-label={ingredient.name}
                    className="bg-[var(--bg)] cursor-pointer overflow-hidden relative group transition-transform duration-200"
                    style={{ "--card-i": idx } as React.CSSProperties}
                  >
                    {/* Info */}
                    <div style={{ padding: "16px 18px 20px" }}>
                      <div className="font-mono text-[7.5px] tracking-[0.14em] uppercase text-[var(--muted)] mb-[7px]">{category}</div>
                      <div className="font-serif text-[clamp(15px,1.4vw,18px)] font-semibold tracking-[-0.01em] leading-[1.2] mb-[10px]" style={{ textWrap: "balance" }}>
                        {ingredient.name}
                      </div>
                      <div className="font-mono text-[8.5px] text-[var(--muted)] tracking-[0.04em] mb-[10px]">
                        {unitDisplay}
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
            {sortedIngredients.map((ingredient) => {
              const macros = getCardMacros(ingredient);
              const category = ingredient.isMealItem ? "FOOD" : "INGREDIENT";
              const unitDisplay = ingredient.customUnitName || ingredient.defaultUnit;
              return (
                <div
                  key={ingredient.id}
                  data-cursor="card"
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/ingredients/${ingredient.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/ingredients/${ingredient.id}`); } }}
                  aria-label={ingredient.name}
                  className="flex items-center gap-5 py-4 border-b border-[var(--rule)] cursor-pointer group transition-colors hover:bg-[var(--bg-2)]"
                  style={{ padding: "16px 12px" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[7.5px] tracking-[0.14em] uppercase text-[var(--muted)] mb-1">{category}</div>
                    <div className="font-serif text-[15px] font-semibold tracking-[-0.01em] leading-[1.2] truncate">{ingredient.name}</div>
                  </div>
                  <span className="font-mono text-[8.5px] text-[var(--muted)] tracking-[0.04em] shrink-0">{unitDisplay}</span>
                  {macros && (
                    <div className="flex gap-3 items-baseline shrink-0">
                      <span className="font-mono text-[10px] text-[var(--fg)] tabular-nums">{macros.kcal} kcal</span>
                      <span className="font-mono text-[8.5px] text-[var(--muted)] tabular-nums">P {macros.protein}g</span>
                      <span className="font-mono text-[8.5px] text-[var(--muted)] tabular-nums">C {macros.carbs}g</span>
                      <span className="font-mono text-[8.5px] text-[var(--muted)] tabular-nums">F {macros.fat}g</span>
                    </div>
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
