"use client";

import { useEffect, useRef, useState, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { clientCache } from "@/lib/clientCache";
import { toast } from "@/lib/toast";
import EmptyState from "@/app/components/EmptyState";
import { dialog } from "@/lib/dialog";
import type { Nutrient } from "@/types";

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
  category?: string;
  nutrientValues: NutrientValue[];
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
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => clientCache.get<Ingredient[]>('/api/ingredients') ?? []);
  const [loading, setLoading] = useState(() => !clientCache.get('/api/ingredients'));

  // Filters
  const searchQuery = searchParams?.get("search") || "";
  const [foodFilter, setFoodFilter] = useState<'all' | 'foods' | 'ingredients'>('all');

  // View mode
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  // Prevent browser navigation from leaving focus on first list item
  useEffect(() => {
    const id = requestAnimationFrame(() => { (document.activeElement as HTMLElement)?.blur(); });
    return () => cancelAnimationFrame(id);
  }, []);

  // Filter sheet (mobile bottom sheet)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  useEffect(() => {
    if (!filterSheetOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFilterSheetOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [filterSheetOpen]);
  const activeFilterCount = foodFilter !== 'all' ? 1 : 0;

  const [, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);

  const updateSearchParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => { router.replace(`/ingredients?${params.toString()}`); });
  };

  const loadIngredients = async () => {
    const cached = clientCache.get<Ingredient[]>('/api/ingredients');
    if (cached && cached.length > 0) {
      setIngredients(cached);
      setLoading(false);
      // Background revalidate
      fetch("/api/ingredients").then(r => r.json()).then((data) => {
        const fresh: Ingredient[] = Array.isArray(data) ? data : [];
        clientCache.set('/api/ingredients', fresh);
        setIngredients(fresh);
      }).catch(console.error);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/ingredients");
      const data = await r.json();
      const list: Ingredient[] = Array.isArray(data) ? data : [];
      clientCache.set('/api/ingredients', list);
      setIngredients(list);
    } catch (e) {
      console.error(e);
      setIngredients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadIngredients(); }, []);

  // Extract macros for list view — all nutrients
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
      fat: find(["total fat", "fat"]),
      satFat: find(["saturated"]),
      sodium: find(["sodium"]),
      sugar: find(["sugar"]),
      fiber: find(["fiber"]),
    };
  };

  // Extract full nutrition for grid cards
  const getFullNutrition = (ingredient: Ingredient) => {
    if (!ingredient.nutrientValues || ingredient.nutrientValues.length === 0) return null;
    const find = (keys: string[]) => {
      const n = ingredient.nutrientValues.find(nv => {
        const name = (nv.nutrient.displayName || nv.nutrient.name).toLowerCase();
        return keys.some(k => name.includes(k));
      });
      return n ? { value: n.value, unit: n.nutrient.unit } : null;
    };
    return {
      calories: find(["energy", "calorie"]),
      fat: find(["total fat", "fat"]),
      saturatedFat: find(["saturated"]),
      sodium: find(["sodium"]),
      carbs: find(["carbohydrate", "carb"]),
      sugar: find(["sugar"]),
      protein: find(["protein"]),
      fiber: find(["fiber"]),
    };
  };

  const filteredIngredients = ingredients.filter((ing) => {
    if (searchQuery && !ing.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (foodFilter === 'foods' && !ing.isMealItem) return false;
    if (foodFilter === 'ingredients' && ing.isMealItem) return false;
    return true;
  });

  const sortedIngredients = [...filteredIngredients].sort((a, b) => a.name.localeCompare(b.name));

  async function handleDelete(ingredient: Ingredient) {
    if (!await dialog.confirm({ title: `Delete "${ingredient.name}"?`, body: "This can't be undone.", confirmLabel: "Delete", danger: true })) return;
    try {
      const res = await fetch(`/api/ingredients/${ingredient.id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Delete failed"); }
      clientCache.delete(`/api/ingredients/${ingredient.id}`);
      setIngredients((prev) => prev.filter((i) => i.id !== ingredient.id));
      clientCache.set("/api/ingredients", ingredients.filter((i) => i.id !== ingredient.id));
      toast.success(`${ingredient.name} deleted`);
    } catch (err) {
      toast.error(`Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── Filter Bar ── */}
      <div className="ed-toolbar list-toolbar">
        {/* ── Mobile toolbar — CSS shows on mobile only ── */}
        <div className="mob-tb">
          {/* Search */}
          <div className="ed-search">
            <input
              ref={searchRef}
              type="search"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => updateSearchParam("search", e.target.value)}
              aria-label="Search ingredients"
            />
          </div>
          {/* Filter */}
          <button
            onClick={() => setFilterSheetOpen(true)}
            className={`mob-filter-text${activeFilterCount > 0 ? " active" : ""}`}
            aria-label={`Filter${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""}`}
            aria-haspopup="dialog"
          >Filter{activeFilterCount > 0 && <span className="mob-filter-badge" aria-hidden="true">{activeFilterCount}</span>}</button>
          {/* + ADD */}
          <button
            onClick={() => router.push("/ingredients/create")}
            className="ed-btn-outline"
            aria-label="Add new ingredient"
          >+ Add</button>
        </div>

        {/* ── Desktop toolbar — CSS shows on desktop only ── */}
        <div className="desk-tb">
          {/* Filter chips */}
          <div className="list-tags">
          <button
            onClick={() => setFoodFilter('all')}
            className={`ed-chip${foodFilter === 'all' ? " is-active" : ""}`}
            aria-label="Show all ingredients"
            aria-pressed={foodFilter === 'all'}
          >All</button>
          <button
            onClick={() => setFoodFilter('foods')}
            className={`ed-chip${foodFilter === 'foods' ? " is-active" : ""}`}
            aria-label="Show only items"
            aria-pressed={foodFilter === 'foods'}
          >Items</button>
          <button
            onClick={() => setFoodFilter('ingredients')}
            className={`ed-chip${foodFilter === 'ingredients' ? " is-active" : ""}`}
            aria-label="Show only ingredients"
            aria-pressed={foodFilter === 'ingredients'}
          >Ingredients</button>
          </div>

          {/* Right side controls */}
          <div className="list-controls flex gap-[18px] items-center ml-auto">
            {/* Count */}
            <span className="ed-count">
              <strong>{filteredIngredients.length}</strong> item{filteredIngredients.length !== 1 ? "s" : ""}
            </span>

            <div className="ed-toolbar-sep" aria-hidden="true" />

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
                onChange={(e) => updateSearchParam("search", e.target.value)}
                aria-label="Search ingredients"
              />
            </div>

            {/* + Add */}
            <button
              onClick={() => router.push("/ingredients/create")}
              className="ed-btn-outline"
              aria-label="Add new ingredient"
            >+ Add</button>
          </div>
        </div>
      </div>

      {/* ── Mobile Filter Sheet ── */}
      {filterSheetOpen && (
        <>
          <div className="mob-sheet-backdrop" onClick={() => setFilterSheetOpen(false)} aria-hidden="true" />
          <div className="mob-sheet" role="dialog" aria-modal="true" aria-label="Filter ingredients">
            <div className="mob-sheet-handle" aria-hidden="true" />
            <div className="mob-sheet-header">
              <span className="mob-sheet-title">Filter</span>
              {activeFilterCount > 0 && (
                <button
                  className="mob-sheet-clear"
                  onClick={() => setFoodFilter('all')}
                  aria-label="Clear filter"
                >Clear</button>
              )}
            </div>

            {/* Type */}
            <div className="mob-sheet-section">
              <div className="mob-sheet-section-label">Type</div>
              <div className="mob-sheet-chips">
                <button className={`mob-sheet-chip${foodFilter === 'all' ? " on" : ""}`} onClick={() => setFoodFilter('all')} aria-pressed={foodFilter === 'all'}>All</button>
                <button className={`mob-sheet-chip${foodFilter === 'foods' ? " on" : ""}`} onClick={() => setFoodFilter('foods')} aria-pressed={foodFilter === 'foods'}>Items</button>
                <button className={`mob-sheet-chip${foodFilter === 'ingredients' ? " on" : ""}`} onClick={() => setFoodFilter('ingredients')} aria-pressed={foodFilter === 'ingredients'}>Ingredients</button>
              </div>
            </div>

            <button className="mob-sheet-done" onClick={() => setFilterSheetOpen(false)}>Done</button>
          </div>
        </>
      )}

      {/* ── Content ── */}
      <div className="list-scroll flex-1 overflow-y-auto animate-page-enter">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="font-mono text-[13px] font-light text-[var(--muted)] animate-loading">Loading ingredients...</div>
          </div>
        ) : sortedIngredients.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            {ingredients.length === 0 ? (
              <EmptyState
                eyebrow="§ NO INGREDIENTS YET"
                headline="An empty pantry."
                lede={<>Add what you cook with often,<br />or look it up as you go.</>}
                ctaLabel="+ ADD INGREDIENT →"
                onCta={() => router.push("/ingredients/create")}
              />
            ) : (
              <EmptyState
                eyebrow="§ NO MATCHES"
                headline="Nothing matches that."
                lede={<>Try a different search, or clear the filters<br />to see everything.</>}
              />
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* ── Ruled Grid (BRIEF-07) ── */
          <div key={`grid-${viewMode}-${foodFilter}`} className="pantry-grid">
            {sortedIngredients.map((ingredient, idx) => {
              const n = getFullNutrition(ingredient);
              const category = ingredient.category || (ingredient.isMealItem ? "Item" : "Ingredient");
              const unitContext = ingredient.customUnitName
                ? `${ingredient.customUnitAmount || 1} ${ingredient.customUnitName}${ingredient.customUnitGrams ? ` (${ingredient.customUnitGrams}g)` : ""}`
                : "per 100g";
              const nutRows = [
                { label: "Calories", val: n?.calories ? formatNutrient(n.calories.value) : "0", unit: "" },
                { label: "Fat",      val: n?.fat ? formatNutrient(n.fat.value) : "0",           unit: n?.fat?.unit || "g" },
                { label: "Sat Fat",  val: n?.saturatedFat ? formatNutrient(n.saturatedFat.value) : "0", unit: n?.saturatedFat?.unit || "g" },
                { label: "Sodium",   val: n?.sodium ? formatNutrient(n.sodium.value) : "0",     unit: n?.sodium?.unit || "mg" },
                { label: "Carbs",    val: n?.carbs ? formatNutrient(n.carbs.value) : "0",       unit: n?.carbs?.unit || "g" },
                { label: "Sugar",    val: n?.sugar ? formatNutrient(n.sugar.value) : "0",       unit: n?.sugar?.unit || "g" },
                { label: "Protein",  val: n?.protein ? formatNutrient(n.protein.value) : "0",   unit: n?.protein?.unit || "g" },
                { label: "Fiber",    val: n?.fiber ? formatNutrient(n.fiber.value) : "0",       unit: n?.fiber?.unit || "g" },
              ];
              return (
                <article
                  key={ingredient.id}
                  className="pantry-item group"
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/ingredients/${ingredient.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/ingredients/${ingredient.id}`); } }}
                  aria-label={ingredient.name}
                  style={{ animation: `cardIn 350ms var(--ease-out) ${Math.min(idx, 8) * 30}ms both` }}
                >
                  {/* Action buttons */}
                  <div className="ing-card-actions absolute top-[10px] right-[10px] flex gap-[4px] opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/ingredients/${ingredient.id}`); }}
                      className="w-[22px] h-[22px] flex items-center justify-center bg-[var(--bg)] border border-[var(--rule)] text-[var(--muted)] cursor-pointer hover:text-[var(--fg)] hover:border-[var(--fg)] transition-colors"
                      aria-label={`Edit ${ingredient.name}`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(ingredient); }}
                      className="w-[22px] h-[22px] flex items-center justify-center bg-[var(--bg)] border border-[var(--rule)] text-[var(--muted)] cursor-pointer hover:text-[var(--err)] hover:border-[var(--err)] transition-colors"
                      aria-label={`Delete ${ingredient.name}`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>

                  <div className="pantry-item__cat">{category}</div>
                  <h3 className="pantry-item__name">{ingredient.name}</h3>
                  <div className="pantry-item__unit">{unitContext}</div>
                  <dl className="pantry-item__nut">
                    {nutRows.map(row => (
                      <>
                        <dt key={`dt-${row.label}`}>{row.label}</dt>
                        <dd key={`dd-${row.label}`}>{row.val}{row.unit && <span className="u">{row.unit}</span>}</dd>
                      </>
                    ))}
                  </dl>
                </article>
              );
            })}
          </div>
        ) : (
          /* ── List View — staggered animation, mockup styling ── */
          <div key={`list-${viewMode}-${foodFilter}`}>
            {sortedIngredients.map((ingredient, idx) => {
              const macros = getCardMacros(ingredient);
              const category = ingredient.category || (ingredient.isMealItem ? "ITEM" : "INGREDIENT");
              return (
                <div
                  key={ingredient.id}
                  data-cursor="card"
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/ingredients/${ingredient.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/ingredients/${ingredient.id}`); } }}
                  aria-label={ingredient.name}
                  className="ing-list-row flex items-center gap-[16px] border-b border-[var(--rule)] cursor-pointer group relative"
                  style={{
                    animation: `cardIn 350ms var(--ease-out) ${Math.min(idx, 12) * 25}ms both`,
                  }}
                >
                  {/* Name + category inline */}
                  <div className="flex-1 min-w-0 flex items-baseline gap-[12px]">
                    <span className="font-serif text-[16px] font-semibold tracking-[-0.01em] text-[var(--fg)] truncate">{ingredient.name}</span>
                    <span className="ing-list-category font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--muted)] shrink-0">{category}</span>
                  </div>
                  {/* Macros — all nutrients, right-aligned */}
                  {macros && (
                    <div className="ing-list-macros flex gap-[16px] items-baseline shrink-0 ml-auto">
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.kcal}</strong> <span className="text-[var(--muted)]">kcal</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.fat}g</strong> <span className="text-[var(--muted)]">fat</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.satFat}g</strong> <span className="text-[var(--muted)]">sat</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.sodium}mg</strong> <span className="text-[var(--muted)]">sod</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.carbs}g</strong> <span className="text-[var(--muted)]">carbs</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.sugar}g</strong> <span className="text-[var(--muted)]">sugar</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.protein}g</strong> <span className="text-[var(--muted)]">prot</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.fiber}g</strong> <span className="text-[var(--muted)]">fiber</span></span>
                    </div>
                  )}
                  {/* Action buttons — always visible, subtle until hover */}
                  <div className="ing-list-actions flex gap-[4px] shrink-0 opacity-[0.4] group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/ingredients/${ingredient.id}`); }}
                      className="w-[22px] h-[22px] flex items-center justify-center bg-transparent border border-[var(--rule)] text-[var(--muted)] cursor-pointer hover:text-[var(--fg)] hover:border-[var(--fg)] transition-colors"
                      aria-label={`Edit ${ingredient.name}`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(ingredient); }}
                      className="w-[22px] h-[22px] flex items-center justify-center bg-transparent border border-[var(--rule)] text-[var(--muted)] cursor-pointer hover:text-[var(--fg)] hover:border-[var(--fg)] transition-colors"
                      aria-label={`Delete ${ingredient.name}`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  {/* Accent bar on hover */}
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--fg)] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
