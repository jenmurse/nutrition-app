"use client";

import { useEffect, useRef, useState, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { clientCache } from "@/lib/clientCache";
import { toast } from "@/lib/toast";
import EmptyState from "@/app/components/EmptyState";
import ContextualTip from "@/app/components/ContextualTip";
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
  isFavorited?: boolean;
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
  const [showFavorites, setShowFavorites] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  useEffect(() => {
    if (!filterSheetOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFilterSheetOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filterSheetOpen]);

  // View mode
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  /* Force list view on mobile — the pantry grid is desktop-only because items
     have no photos, so the grid is just a denser list. Toggle is already
     hidden in .desk-tb; this keeps state honest. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => { if (mq.matches) setViewMode("list"); };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Prevent browser navigation from leaving focus on first list item
  useEffect(() => {
    const id = requestAnimationFrame(() => { (document.activeElement as HTMLElement)?.blur(); });
    return () => cancelAnimationFrame(id);
  }, []);

  // Filter sheet (mobile bottom sheet)
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);

  const updateSearchParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => { router.replace(`/pantry?${params.toString()}`); });
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
    const find = (keys: string[], exact?: boolean) => {
      const n = ingredient.nutrientValues.find(nv => {
        const name = nv.nutrient.displayName.toLowerCase();
        return exact ? keys.some(k => name === k) : keys.some(k => name.includes(k));
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
      sugar: find(["sugar"], true),
      fiber: find(["fiber"]),
    };
  };

  // Extract full nutrition for grid cards
  const getFullNutrition = (ingredient: Ingredient) => {
    if (!ingredient.nutrientValues || ingredient.nutrientValues.length === 0) return null;
    const find = (keys: string[], exact?: boolean) => {
      const n = ingredient.nutrientValues.find(nv => {
        const name = (nv.nutrient.displayName || nv.nutrient.name).toLowerCase();
        return exact ? keys.some(k => name === k) : keys.some(k => name.includes(k));
      });
      return n ? { value: n.value, unit: n.nutrient.unit } : null;
    };
    // Distinguish "unknown" (no IngredientNutrient row) from "explicit 0".
    // For addedSugar specifically: returning null means render `—`.
    return {
      calories: find(["energy", "calorie"]),
      fat: find(["total fat", "fat"]),
      saturatedFat: find(["saturated"]),
      sodium: find(["sodium"]),
      carbs: find(["carbohydrate", "carb"]),
      sugar: find(["sugar"], true),
      addedSugar: find(["added sugar"], true),
      protein: find(["protein"]),
      fiber: find(["fiber"]),
    };
  };

  // Categories present in the pantry, with item counts, sorted by count desc.
  // Pantry has up to 12 fixed seeded categories — too many for an inline chip
  // row (recipes uses 7), so they live in a dropdown.
  const categoryCounts = (() => {
    const m = new Map<string, number>();
    for (const ing of ingredients) {
      const cat = ing.category?.trim() || "Uncategorized";
      m.set(cat, (m.get(cat) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  })();

  const filteredIngredients = ingredients.filter((ing) => {
    if (searchQuery && !ing.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (showFavorites && !ing.isFavorited) return false;
    if (selectedCategory && (ing.category?.trim() || "Uncategorized") !== selectedCategory) return false;
    return true;
  });

  const sortedIngredients = [...filteredIngredients].sort((a, b) => a.name.localeCompare(b.name));

  async function toggleFavorite(ingredient: Ingredient) {
    const next = !ingredient.isFavorited;
    // optimistic
    setIngredients((prev) => prev.map((i) => i.id === ingredient.id ? { ...i, isFavorited: next } : i));
    const optimistic = ingredients.map((i) => i.id === ingredient.id ? { ...i, isFavorited: next } : i);
    clientCache.set("/api/ingredients", optimistic);
    try {
      const res = await fetch(`/api/ingredients/${ingredient.id}/favorite`, { method: next ? "POST" : "DELETE" });
      if (!res.ok) throw new Error("Failed");
    } catch {
      // revert
      setIngredients((prev) => prev.map((i) => i.id === ingredient.id ? { ...i, isFavorited: !next } : i));
      const reverted = ingredients.map((i) => i.id === ingredient.id ? { ...i, isFavorited: !next } : i);
      clientCache.set("/api/ingredients", reverted);
      toast.error("Could not update favorite");
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    const ok = await dialog.confirm({
      title: `Delete ${selectedIds.size} ingredient${selectedIds.size === 1 ? "" : "s"}?`,
      body: "This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch("/api/ingredients/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Failed");
      const { deleted } = await res.json();
      const idSet = new Set(ids);
      setIngredients((prev) => prev.filter((i) => !idSet.has(i.id)));
      clientCache.set("/api/ingredients", ingredients.filter((i) => !idSet.has(i.id)));
      for (const id of ids) clientCache.delete(`/api/ingredients/${id}`);
      toast.success(`Deleted ${deleted} item${deleted === 1 ? "" : "s"}`);
      exitSelectMode();
    } catch (err) {
      toast.error(`Bulk delete failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

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
      {/* ── Starter pantry tip (dismissed after first review) ──
           No wrapper div around the tip — when ContextualTip returns null
           on dismissal, any wrapper padding would still render as empty
           space above the toolbar. */}
      <ContextualTip tipId="starter-pantry" label="Your starter pantry">
        We've added common ingredients to get you started. Remove anything that
        doesn't fit, add what's missing, and your recipes will match against
        what you actually have.
      </ContextualTip>

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
          {/* Filter (favorites + category) */}
          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
            className={`mob-filter-text${(showFavorites || selectedCategory) ? " active" : ""}`}
            aria-label="Filter ingredients"
          >
            Filter
            {(showFavorites || selectedCategory) && (
              <span className="mob-filter-badge" aria-hidden="true">
                {(showFavorites ? 1 : 0) + (selectedCategory ? 1 : 0)}
              </span>
            )}
          </button>
          {/* + ADD */}
          <button
            onClick={() => router.push("/pantry/create")}
            className="ed-btn-primary"
            aria-label="Add new ingredient"
          >+ Add</button>
        </div>

        {/* ── Desktop toolbar — CSS shows on desktop only ── */}
        <div className="desk-tb">
          {/* Right side controls (Favorites moved here — was alone on the left
              after the All/Items/Ingredients pills were removed, which left
              an awkward empty span) */}
          {selectMode ? (
            <div className="list-controls flex gap-[18px] items-center">
              <span className="ed-count">
                <strong>{selectedIds.size}</strong> selected
              </span>
              <div className="ed-toolbar-sep" aria-hidden="true" />
              <button
                type="button"
                onClick={() => {
                  const allVisible = filteredIngredients.map((i) => i.id);
                  if (allVisible.every((id) => selectedIds.has(id))) setSelectedIds(new Set());
                  else setSelectedIds(new Set(allVisible));
                }}
                className="ed-btn-text"
                aria-label="Toggle select all"
              >
                {filteredIngredients.length > 0 && filteredIngredients.every((i) => selectedIds.has(i.id))
                  ? "DESELECT ALL"
                  : "SELECT ALL"}
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0}
                className="ed-btn-text"
                style={{ color: selectedIds.size === 0 ? "var(--muted)" : "var(--err)" }}
                aria-label="Delete selected"
              >DELETE</button>
              <button
                type="button"
                onClick={exitSelectMode}
                className="ed-btn"
                aria-label="Exit select mode"
              >DONE</button>
            </div>
          ) : (
          <>
          {/* ── Left cluster — secondary controls (matches recipes' chip row
              position) ── */}
          <div className="list-tags flex gap-[18px] items-center">
            {/* Favorites toggle */}
            <button
              onClick={() => setShowFavorites(prev => !prev)}
              className={`ed-chip flex items-center gap-[5px]${showFavorites ? " is-active" : ""}`}
              aria-label="Show only favorites"
              aria-pressed={showFavorites}
            >
              <span aria-hidden="true">★</span>
              Favorites
            </button>

            <div className="ed-toolbar-sep" aria-hidden="true" />

            {/* Category filter dropdown (12 fixed categories don't fit as chips) */}
            <div className="pantry-cat" style={{ position: "relative" }}>
              <button
                type="button"
                className={`ed-cat-trigger${selectedCategory ? " is-active" : ""}`}
                onClick={() => setCategoryOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={categoryOpen}
              >
                {selectedCategory ?? "Category"} <span className="ed-cat-caret" aria-hidden="true">▾</span>
              </button>
              {categoryOpen && (
                <>
                  <div className="ed-cat-backdrop" onClick={() => setCategoryOpen(false)} aria-hidden="true" />
                  <div className="ed-cat-panel" role="listbox">
                    <button
                      type="button"
                      className={`ed-cat-item${!selectedCategory ? " is-active" : ""}`}
                      onClick={() => { setSelectedCategory(null); setCategoryOpen(false); }}
                    >All categories</button>
                    {categoryCounts.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        className={`ed-cat-item${selectedCategory === c.name ? " is-active" : ""}`}
                        onClick={() => { setSelectedCategory(c.name); setCategoryOpen(false); }}
                      >
                        <span>{c.name}</span>
                        <span className="ed-cat-ct">{c.count}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="ed-toolbar-sep" aria-hidden="true" />

            {/* Count */}
            <span className="ed-count">
              <strong>{filteredIngredients.length}</strong> item{filteredIngredients.length !== 1 ? "s" : ""}
            </span>

            {/* Edit mode toggle (bulk-action on multiple items) */}
            <button
              type="button"
              onClick={() => setSelectMode(true)}
              className="ed-btn-text"
              aria-label="Enter edit mode"
            >EDIT</button>
          </div>

          {/* ── Right cluster — toggle + Search + primary action (matches recipes) ── */}
          <div className="list-controls flex gap-[18px] items-center ml-auto">
            {/* Grid/List toggle — on the right to match the recipes toolbar */}
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
              onClick={() => router.push("/pantry/create")}
              className="ed-btn-primary"
              aria-label="Add new ingredient"
            >+ Add</button>
          </div>
          </>
          )}
        </div>
      </div>

      {/* ── Mobile filter sheet (favorites + category) ── */}
      {filterSheetOpen && (
        <>
          <div className="mob-sheet-backdrop" onClick={() => setFilterSheetOpen(false)} aria-hidden="true" />
          <div className="mob-sheet" role="dialog" aria-modal="true" aria-label="Filter ingredients">
            <div className="mob-sheet-handle" aria-hidden="true" />
            <div className="mob-sheet-header">
              <span className="mob-sheet-title">Filter</span>
              {(showFavorites || selectedCategory) && (
                <button
                  className="mob-sheet-clear"
                  onClick={() => { setShowFavorites(false); setSelectedCategory(null); }}
                  aria-label="Clear all filters"
                >CLEAR ALL</button>
              )}
            </div>

            <div className="mob-sheet-section">
              <div className="mob-sheet-section-label">Category</div>
              <div className="mob-sheet-chips">
                <button
                  className={`mob-sheet-chip${!selectedCategory ? " on" : ""}`}
                  onClick={() => setSelectedCategory(null)}
                  aria-pressed={!selectedCategory}
                >All</button>
                {categoryCounts.map((c) => (
                  <button
                    key={c.name}
                    className={`mob-sheet-chip${selectedCategory === c.name ? " on" : ""}`}
                    onClick={() => setSelectedCategory((prev) => prev === c.name ? null : c.name)}
                    aria-pressed={selectedCategory === c.name}
                  >{c.name} <span style={{ opacity: 0.5 }}>{c.count}</span></button>
                ))}
              </div>
            </div>

            <div className="mob-sheet-section">
              <div className="mob-sheet-section-label">Show</div>
              <div className="mob-sheet-chips">
                <button
                  className={`mob-sheet-chip flex items-center gap-1${showFavorites ? " on" : ""}`}
                  onClick={() => setShowFavorites(prev => !prev)}
                  aria-pressed={showFavorites}
                >
                  <span aria-hidden="true">★</span>
                  Favorites
                </button>
              </div>
            </div>

            <button className="mob-sheet-done" onClick={() => setFilterSheetOpen(false)}>DONE</button>
          </div>
        </>
      )}

      {/* ── Content ── */}
      <div className="list-scroll flex-1 overflow-y-auto relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="font-mono text-[13px] font-normal text-[var(--muted)] animate-loading">Loading ingredients...</div>
          </div>
        )}
        <div className="animate-page-enter" style={{ minHeight: "100%" }}>
        {loading ? null : sortedIngredients.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            {ingredients.length === 0 ? (
              <EmptyState
                eyebrow="§ NO INGREDIENTS YET"
                headline="An empty pantry."
                lede={<>Add what you cook with often,<br />or look it up as you go.</>}
                ctaLabel="+ ADD INGREDIENT →"
                onCta={() => router.push("/pantry/create")}
              />
            ) : (
              <EmptyState
                eyebrow="§ NO MATCHES"
                headline="Nothing matches that."
                lede={<>Try a different search, or clear the filters<br />to see everything.</>}
                ctaLabel="CLEAR FILTERS →"
                onCta={() => { updateSearchParam('search', ''); setShowFavorites(false); setSelectedCategory(null); }}
              />
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* ── Ruled Grid (BRIEF-07) ── */
          <div key={`grid-${viewMode}`} className="pantry-grid">
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
                { label: "Added Sug", val: n?.addedSugar ? formatNutrient(n.addedSugar.value) : "—", unit: n?.addedSugar ? (n.addedSugar.unit || "g") : "" },
                { label: "Protein",  val: n?.protein ? formatNutrient(n.protein.value) : "0",   unit: n?.protein?.unit || "g" },
                { label: "Fiber",    val: n?.fiber ? formatNutrient(n.fiber.value) : "0",       unit: n?.fiber?.unit || "g" },
              ];
              return (
                <article
                  key={ingredient.id}
                  className={`pantry-item group${selectMode && selectedIds.has(ingredient.id) ? " is-selected" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (selectMode) toggleSelect(ingredient.id);
                    else router.push(`/pantry/${ingredient.id}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (selectMode) toggleSelect(ingredient.id);
                      else router.push(`/pantry/${ingredient.id}`);
                    }
                  }}
                  aria-label={ingredient.name}
                  aria-pressed={selectMode ? selectedIds.has(ingredient.id) : undefined}
                  style={{ animation: `cardIn 350ms var(--ease-out) ${Math.min(idx, 8) * 30}ms both` }}
                >
                  {/* Action buttons */}
                  <div className={`ing-card-actions absolute top-[10px] right-[10px] flex gap-[4px] ${selectMode ? "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100"} transition-opacity duration-150 z-10`}>
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/pantry/${ingredient.id}`); }}
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

                  <div className="pantry-item__cat-row">
                    {selectMode && (
                      <div
                        className="w-[14px] h-[14px] flex items-center justify-center font-mono text-[9px] leading-none shrink-0"
                        style={{
                          background: selectedIds.has(ingredient.id) ? "var(--fg)" : "transparent",
                          color: selectedIds.has(ingredient.id) ? "var(--bg)" : "transparent",
                          border: `1px solid ${selectedIds.has(ingredient.id) ? "var(--fg)" : "var(--rule)"}`,
                          marginRight: 4,
                        }}
                        aria-hidden="true"
                      >
                        ✓
                      </div>
                    )}
                    <div className="pantry-item__cat">{category}</div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(ingredient); }}
                      className="fav-glyph"
                      aria-label={ingredient.isFavorited ? "Remove from favorites" : "Add to favorites"}
                      aria-pressed={!!ingredient.isFavorited}
                    >{ingredient.isFavorited ? "★" : "☆"}</button>
                  </div>
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
          <div key={`list-${viewMode}`}>
            {sortedIngredients.map((ingredient, idx) => {
              const macros = getCardMacros(ingredient);
              const category = ingredient.category || (ingredient.isMealItem ? "ITEM" : "INGREDIENT");
              return (
                <div
                  key={ingredient.id}
                  data-cursor="card"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (selectMode) toggleSelect(ingredient.id);
                    else router.push(`/pantry/${ingredient.id}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (selectMode) toggleSelect(ingredient.id);
                      else router.push(`/pantry/${ingredient.id}`);
                    }
                  }}
                  aria-label={ingredient.name}
                  aria-pressed={selectMode ? selectedIds.has(ingredient.id) : undefined}
                  className={`ing-list-row flex items-center gap-[16px] border-b border-[var(--rule)] cursor-pointer group relative${selectMode && selectedIds.has(ingredient.id) ? " is-selected" : ""}`}
                  style={{
                    animation: `cardIn 350ms var(--ease-out) ${Math.min(idx, 12) * 25}ms both`,
                    background: selectMode && selectedIds.has(ingredient.id) ? "var(--bg-2)" : undefined,
                  }}
                >
                  {/* Select checkbox (only in select mode) */}
                  {selectMode && (
                    <div
                      className="w-[18px] h-[18px] flex items-center justify-center font-mono text-[10px] leading-none shrink-0"
                      style={{
                        background: selectedIds.has(ingredient.id) ? "var(--fg)" : "var(--bg)",
                        color: selectedIds.has(ingredient.id) ? "var(--bg)" : "transparent",
                        border: `1px solid ${selectedIds.has(ingredient.id) ? "var(--fg)" : "var(--rule)"}`,
                      }}
                      aria-hidden="true"
                    >
                      ✓
                    </div>
                  )}
                  {/* Name + category inline */}
                  <div className="flex-1 min-w-0 flex items-baseline gap-[12px]">
                    <span className="ing-list-name">{ingredient.name}</span>
                    <span className="ing-list-category font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)] shrink-0">{category}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(ingredient); }}
                      className="fav-glyph shrink-0"
                      aria-label={ingredient.isFavorited ? "Remove from favorites" : "Add to favorites"}
                      aria-pressed={!!ingredient.isFavorited}
                    >{ingredient.isFavorited ? "★" : "☆"}</button>
                  </div>
                  {/* Macros — all nutrients, right-aligned */}
                  {macros && (
                    <div className="ing-list-macros flex gap-[16px] items-baseline shrink-0 ml-auto">
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.kcal}</strong> <span className="text-[var(--muted)] uppercase tracking-[0.14em]">cal</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.fat}g</strong> <span className="text-[var(--muted)] uppercase tracking-[0.14em]">fat</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.satFat}g</strong> <span className="text-[var(--muted)] uppercase tracking-[0.14em]">sat</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.sodium}mg</strong> <span className="text-[var(--muted)] uppercase tracking-[0.14em]">sod</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.carbs}g</strong> <span className="text-[var(--muted)] uppercase tracking-[0.14em]">carbs</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.sugar}g</strong> <span className="text-[var(--muted)] uppercase tracking-[0.14em]">sugar</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.protein}g</strong> <span className="text-[var(--muted)] uppercase tracking-[0.14em]">prot</span></span>
                      <span className="font-mono text-[9px] tabular-nums whitespace-nowrap"><strong className="text-[var(--fg)] font-normal">{macros.fiber}g</strong> <span className="text-[var(--muted)] uppercase tracking-[0.14em]">fiber</span></span>
                    </div>
                  )}
                  {/* Action buttons — always visible, subtle until hover */}
                  <div className="ing-list-actions flex gap-[4px] shrink-0 opacity-[0.4] group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/pantry/${ingredient.id}`); }}
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
    </div>
  );
}
