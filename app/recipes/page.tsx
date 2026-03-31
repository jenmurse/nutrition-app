"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import RecipeBuilder, { type RecipeBuilderHandle } from "../components/RecipeBuilder";
import RecipeContextPanel from "../components/RecipeContextPanel";
import { usePersonContext } from "../components/PersonContext";
import { toast } from "@/lib/toast";
import { dialog } from "@/lib/dialog";
import { clientCache } from "@/lib/clientCache";
import { marked } from "marked";

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
  optimizeAnalysis?: string | null;
  mealPrepAnalysis?: string | null;
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

type RecipeDetail = RecipeSummary & {
  totals?: Array<{ nutrientId: number; displayName: string; value: number; unit: string }>;
};

type RecipeDraft = {
  id?: number;
  name: string;
  servingSize: number;
  servingUnit: string;
  instructions: string;
  tags?: string;
  sourceApp?: string | null;
  isComplete?: boolean;
  prepTime?: number | null;
  cookTime?: number | null;
  image?: string | null;
  ingredients: Array<{
    id: string;
    ingredientId?: number | null;
    quantity?: number;
    unit?: string;
    originalText?: string;
    nameGuess?: string;
    section?: string | null;
    notes?: string;
  }>;
};

function buildDraft(data: any, source: string): RecipeDraft {
  return {
    name: data.name || "Imported Recipe",
    servingSize: data.servingSize || 1,
    servingUnit: data.servingUnit || "servings",
    instructions: data.instructions || "",
    sourceApp: source,
    isComplete: data.isComplete,
    tags: data.tags || undefined,
    prepTime: data.prepTime ?? null,
    cookTime: data.cookTime ?? null,
    image: data.image ?? null,
    ingredients: (data.ingredients || []).map((item: any) => ({
      id: `imp-${Math.random().toString(36).slice(2)}`,
      ingredientId: item.ingredientId ?? null,
      quantity: item.quantity ?? 0,
      unit: item.unit || "",
      originalText: item.originalText || "",
      nameGuess: item.nameGuess || "",
      section: item.section || null,
    })),
  };
}

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
  const { selectedPerson } = usePersonContext();
  const [recipes, setRecipes] = useState<RecipeSummary[]>(() => clientCache.get<RecipeSummary[]>('/api/recipes') ?? []);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const createBuilderRef = useRef<RecipeBuilderHandle>(null);
  const editBuilderRef = useRef<RecipeBuilderHandle>(null);
  const [editRecipe, setEditRecipe] = useState<RecipeDraft | null>(null);
  const [loading, setLoading] = useState(() => !clientCache.get('/api/recipes'));
  const [editLoading, setEditLoading] = useState(false);
  const [selectedRecipeLoading, setSelectedRecipeLoading] = useState(false);

  // Import state for inline create
  const [createImportUrl, setCreateImportUrl] = useState("");
  const [createImporting, setCreateImporting] = useState(false);
  const [createImportError, setCreateImportError] = useState("");
  const [createImportedRecipe, setCreateImportedRecipe] = useState<RecipeDraft | null>(null);
  const createFileRef = useRef<HTMLInputElement>(null);

  // Detail view tabs
  const [detailTab, setDetailTab] = useState<'recipe' | 'optimization' | 'mealPrep'>('recipe');
  const [editingNotes, setEditingNotes] = useState<'optimization' | 'mealPrep' | null>(null);
  const [notesText, setNotesText] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState<'optimization' | 'mealPrep' | null>(null);
  const [scale, setScale] = useState(1);

  // Filters
  const searchQuery = searchParams?.get("search") || "";
  const selectedTags = searchParams?.get("tags")?.split(",").filter(Boolean) || [];
  const availableTags = ["breakfast", "lunch", "dinner", "snack", "side", "dessert", "beverage"];

  // Render notes: handles both markdown strings and legacy JSON format
  function renderNotesHtml(text: string): string {
    try {
      const parsed = JSON.parse(text);
      // Optimization JSON: { sections: [{ label, suggestions: [] }] }
      if (Array.isArray(parsed?.sections) && parsed.sections[0]?.suggestions) {
        return parsed.sections.map((s: { label: string; suggestions: string[] }) =>
          `<h3>${s.label}</h3><ul>${s.suggestions.map((t: string) => `<li>${t}</li>`).join('')}</ul>`
        ).join('');
      }
      // Meal prep JSON: { score, scoreLabel, sections: [{ label, notes: [] }] }
      if (Array.isArray(parsed?.sections) && parsed.sections[0]?.notes) {
        const header = parsed.scoreLabel ? `<p><strong>${parsed.scoreLabel}</strong> (score: ${parsed.score}/5)</p>` : '';
        return header + parsed.sections.map((s: { label: string; notes: string[] }) =>
          `<h3>${s.label}</h3><ul>${s.notes.map((t: string) => `<li>${t}</li>`).join('')}</ul>`
        ).join('');
      }
    } catch {
      // Not JSON — fall through to markdown
    }
    return marked.parse(text) as string;
  }

  // Sort
  const sortOptions = [
    { key: "name", label: "Name" },
    { key: "Calories", label: "Calories" },
    { key: "Protein", label: "Protein" },
    { key: "Fat", label: "Fat" },
    { key: "Carbs", label: "Carbs" },
    { key: "Sugar", label: "Sugar" },
    { key: "Fiber", label: "Fiber" },
  ] as const;
  type SortKey = typeof sortOptions[number]["key"];
  const sortBy = (searchParams?.get("sort") || "name") as SortKey;
  const sortDir = (searchParams?.get("dir") || "asc") as "asc" | "desc";
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

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

  const loadRecipes = async (skipAutoSelect = false) => {
    const cached = clientCache.get<RecipeSummary[]>('/api/recipes');

    if (cached && cached.length > 0) {
      // Instant render from cache — no spinner
      setRecipes(cached);
      if (!skipAutoSelect && !editMode && !createMode) {
        const cachedDetail = clientCache.get<RecipeDetail>(`/api/recipes/${cached[0].id}`);
        if (cachedDetail) {
          setSelectedRecipe(cachedDetail);
        } else {
          // Detail not cached — fetch it so we don't land on empty state
          setSelectedRecipeLoading(true);
          fetch(`/api/recipes/${cached[0].id}`).then(r => r.json()).then(detail => {
            if (detail?.recipe) {
              const full = { ...cached[0], ...detail.recipe, totals: detail.totals };
              clientCache.set(`/api/recipes/${cached[0].id}`, full);
              setSelectedRecipe(full);
            }
          }).catch(console.error).finally(() => setSelectedRecipeLoading(false));
        }
      }
      setLoading(false);
      // Background revalidate
      fetch("/api/recipes").then(r => r.json()).then((data) => {
        const fresh: RecipeSummary[] = Array.isArray(data) ? data : [];
        clientCache.set('/api/recipes', fresh);
        setRecipes(fresh);
      }).catch(console.error);
      return;
    }

    // Cache miss — normal loading flow
    setLoading(true);
    try {
      const r = await fetch("/api/recipes");
      const data = await r.json();
      const list: RecipeSummary[] = Array.isArray(data) ? data : [];
      clientCache.set('/api/recipes', list);
      setRecipes(list);
      if (!skipAutoSelect && list.length > 0 && !editMode && !createMode) {
        setSelectedRecipeLoading(true);
        try {
          const res = await fetch(`/api/recipes/${list[0].id}`);
          const detail = await res.json();
          if (res.ok) {
            const full = { ...list[0], ...detail.recipe, totals: detail.totals };
            clientCache.set(`/api/recipes/${list[0].id}`, full);
            setSelectedRecipe(full);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setSelectedRecipeLoading(false);
        }
      }
    } catch (e) {
      console.error(e);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecipe = async (recipe: RecipeSummary) => {
    if (selectedRecipe?.id === recipe.id) { setSelectedRecipe(null); return; }
    setDetailTab('recipe'); setEditingNotes(null); setScale(1);
    // Instant render from cache if available
    const cached = clientCache.get<RecipeDetail>(`/api/recipes/${recipe.id}`);
    if (cached) { setSelectedRecipe(cached); return; }
    setSelectedRecipeLoading(true);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fetch failed");
      const full = { ...recipe, ...data.recipe, totals: data.totals };
      clientCache.set(`/api/recipes/${recipe.id}`, full);
      setSelectedRecipe(full);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load recipe details");
    } finally {
      setSelectedRecipeLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!await dialog.confirm(`Delete recipe "${name}"?`, { confirmLabel: "Delete", danger: true })) return;
    try {
      const r = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
      if (r.ok) {
        const updated = recipes.filter(r => r.id !== id);
        clientCache.set('/api/recipes', updated);
        clientCache.delete(`/api/recipes/${id}`);
        setRecipes(updated);
        if (selectedRecipe?.id === id) setSelectedRecipe(null);
      } else toast.error("Failed to delete recipe");
    } catch {
      toast.error("Failed to delete recipe");
    }
  };

  const loadDraftFromId = async (recipeId: number): Promise<RecipeDraft | null> => {
    const res = await fetch(`/api/recipes/${recipeId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Fetch failed");
    const rd = data.recipe;
    return {
      id: rd.id,
      name: rd.name,
      servingSize: rd.servingSize,
      servingUnit: rd.servingUnit,
      instructions: rd.instructions || "",
      tags: rd.tags || "",
      sourceApp: rd.sourceApp ?? null,
      isComplete: rd.isComplete,
      prepTime: rd.prepTime ?? null,
      cookTime: rd.cookTime ?? null,
      image: rd.image ?? null,
      ingredients: (rd.ingredients || []).map((item: any) => ({
        id: `edit-${item.id}`,
        ingredientId: item.ingredientId ?? null,
        quantity: item.quantity ?? 0,
        unit: item.unit || "",
        originalText: item.originalText || "",
        nameGuess: item.ingredient?.name || item.originalText || "",
        section: item.section ?? null,
        notes: item.notes || null,
      })),
    };
  };

  const handleEditClick = async (recipeId: number) => {
    setEditLoading(true);
    try {
      const draft = await loadDraftFromId(recipeId);
      setEditRecipe(draft);
      setEditMode(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load recipe");
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveNotes = async (field: 'optimization' | 'mealPrep') => {
    if (!selectedRecipe) return;
    setSavingNotes(true);
    try {
      const body = field === 'optimization'
        ? { optimizeAnalysis: notesText }
        : { mealPrepAnalysis: notesText };
      const res = await fetch(`/api/recipes/${selectedRecipe.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      const updatedRecipe = {
        ...selectedRecipe,
        ...(field === 'optimization' ? { optimizeAnalysis: notesText } : { mealPrepAnalysis: notesText }),
      };
      setSelectedRecipe(updatedRecipe);
      clientCache.set(`/api/recipes/${selectedRecipe.id}`, updatedRecipe);
      setEditingNotes(null);
      toast.success("Notes saved");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDuplicate = async (recipeId: number) => {
    try {
      const res = await fetch(`/api/recipes/${recipeId}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Duplicate failed");
      const draft = await loadDraftFromId(data.recipe.id);
      setEditRecipe(draft);
      setEditMode(true);
      setSelectedRecipe(null);
      const newRecipe = data.recipe;
      const updated = [...recipes, newRecipe].sort((a: RecipeSummary, b: RecipeSummary) => a.name.localeCompare(b.name));
      clientCache.set('/api/recipes', updated);
      setRecipes(updated);
    } catch (error) {
      console.error(error);
      toast.error("Failed to duplicate recipe");
    }
  };

  // Inline create: URL import
  const handleCreateUrlImport = async () => {
    if (!createImportUrl.trim()) return;
    setCreateImporting(true);
    setCreateImportError("");
    try {
      const res = await fetch("/api/recipes/import/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: createImportUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setCreateImportedRecipe(buildDraft(data, data.sourceApp || "URL Import"));
    } catch (error: any) {
      setCreateImportError(error.message || "Failed to import from URL");
    } finally {
      setCreateImporting(false);
    }
  };

  // Inline create: file import
  const handleCreateFileImport = async (file: File) => {
    setCreateImporting(true);
    setCreateImportError("");
    try {
      const markdown = await file.text();
      const res = await fetch("/api/recipes/import/pestle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setCreateImportedRecipe(buildDraft(data, data.sourceApp || "Pestle"));
    } catch (error: any) {
      setCreateImportError(error.message || "Failed to import file");
    } finally {
      setCreateImporting(false);
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

  const formatNutrientLabel = (recipe: RecipeSummary, key: string): string | null => {
    if (key === "name" || !recipe.totals) return null;
    const match = recipe.totals.find(t => t.displayName === key);
    if (!match) return null;
    return `${Math.round(match.value)} ${match.unit}`;
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

  return (
    <div className="h-full flex animate-fade-in" onClick={() => { if (!editMode && !createMode) setSelectedRecipe(null); }}>

      {/* ── Left: List pane ── */}
      <div className="w-[220px] min-w-[220px] flex flex-col bg-[var(--bg-nav)] relative z-[1]" style={{ boxShadow: '1px 0 4px rgba(0,0,0,0.07), inset 0 1px 0 rgba(0,0,0,0.04)' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-3 pb-3 shrink-0">
          <div className="flex items-baseline justify-between mb-3">
            <h1 className="font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--fg)] leading-none">Recipes</h1>
            <span className="font-mono text-[9px] text-[var(--muted)] bg-[var(--bg-subtle)] py-[2px] px-[6px] rounded-full">{filteredRecipes.length}</span>
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => updateSearchParam("search", e.target.value)}
            aria-label="Search recipes"
            className="w-full bg-[var(--bg-subtle)] border border-[var(--rule)] rounded-[var(--radius-sm,4px)] py-[7px] px-[10px] text-[11px] font-sans text-[var(--fg)] placeholder:text-[var(--placeholder)] focus:outline-none mb-2"
          />
          <div className="flex gap-[5px] flex-wrap mt-2">
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                aria-label={`Filter by ${tag}`}
                aria-pressed={selectedTags.includes(tag)}
                className={`py-[2px] px-[8px] font-mono text-[9px] tracking-[0.04em] uppercase rounded-full cursor-pointer transition-colors border-0 ${
                  selectedTags.includes(tag)
                    ? 'bg-[var(--accent-light)] text-[var(--accent)]'
                    : 'bg-[var(--bg-pill)] text-[var(--muted)] hover:text-[var(--fg)]'
                }`}
              >{tag}</button>
            ))}
            {selectedTags.length > 0 && (
              <button onClick={() => updateSearchParam("tags", "")} aria-label="Clear tag filters"
                className="py-[1px] px-[4px] font-mono text-[9px] tracking-[0.04em] uppercase bg-transparent text-[var(--muted)] border-0 cursor-pointer hover:text-[var(--fg)]">
                clear
              </button>
            )}
          </div>

          {/* Sort control */}
          <div className="flex items-center gap-[5px] mt-3 pt-3 border-t border-[var(--rule)]">
            <span className="font-mono text-[9px] tracking-[0.06em] uppercase text-[var(--muted)] shrink-0">Sort</span>
            <div ref={sortRef} className="relative flex-1">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                aria-label="Sort recipes by"
                aria-expanded={sortOpen}
                aria-haspopup="listbox"
                className="w-full flex items-center justify-between py-[3px] px-[8px] font-mono text-[9px] tracking-[0.04em] uppercase rounded-full cursor-pointer transition-colors border-0 bg-[var(--bg-pill)] text-[var(--muted)] hover:text-[var(--fg)]"
              >
                <span>{sortOptions.find(o => o.key === sortBy)?.label ?? "Name"}</span>
                <span className="ml-1 text-[8px]">▾</span>
              </button>
              {sortOpen && (
                <div role="listbox" aria-label="Sort options" className="absolute left-0 top-full mt-1 w-full bg-[var(--bg-nav)] border border-[var(--rule)] rounded-[6px] shadow-md z-10 py-[3px]">
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.key}
                      role="option"
                      aria-selected={sortBy === opt.key}
                      onClick={() => { updateSearchParam("sort", opt.key === "name" ? "" : opt.key); setSortOpen(false); }}
                      className={`w-full text-left py-[4px] px-[8px] font-mono text-[9px] tracking-[0.04em] uppercase border-0 cursor-pointer transition-colors ${
                        sortBy === opt.key ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'bg-transparent text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >{opt.label}</button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => updateSearchParam("dir", sortDir === "asc" ? "desc" : "asc")}
              aria-label={`Sort ${sortDir === "asc" ? "ascending" : "descending"}, click to toggle`}
              className="py-[3px] px-[6px] font-mono text-[9px] rounded-full cursor-pointer transition-colors border-0 bg-[var(--bg-pill)] text-[var(--muted)] hover:text-[var(--fg)]"
            >{sortDir === "asc" ? "↑" : "↓"}</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sortedRecipes.map((recipe) => {
            const isSelected = !editMode && !createMode && selectedRecipe?.id === recipe.id;
            const nutrientLabel = formatNutrientLabel(recipe, sortBy);
            return (
              <div
                key={recipe.id}
                className={`relative mx-[6px] my-[1px] py-[9px] px-[10px] rounded-[7px] cursor-pointer transition-[background] duration-[80ms] ease-in-out ${isSelected ? 'bg-[var(--bg-selected)]' : 'hover:bg-[var(--bg-subtle)]'}`}
                onClick={() => { setEditMode(false); setEditRecipe(null); setCreateMode(false); handleSelectRecipe(recipe); }}
              >
                <div className="text-[12px] font-medium text-[var(--fg)] leading-snug">{recipe.name}</div>
                {nutrientLabel && (
                  <div className="font-mono text-[9px] text-[var(--muted)] tracking-[0.04em] mt-[2px]">{nutrientLabel}</div>
                )}
                {recipe.isComplete === false && (
                  <div className="font-mono text-[9px] text-[var(--warning)] tracking-[0.04em] mt-[2px]">incomplete</div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => { setSelectedRecipe(null); setEditMode(false); setEditRecipe(null); setCreateMode(true); setCreateImportedRecipe(null); setCreateImportUrl(""); setCreateImportError(""); }}
          aria-label="Create new recipe"
          className="shrink-0 mx-[6px] mb-[6px] mt-[2px] py-[9px] px-[10px] font-mono text-[9px] tracking-[0.1em] uppercase bg-transparent text-[var(--muted)] border-0 cursor-pointer hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-colors text-left rounded-[7px]"
        >+ New Recipe</button>
      </div>

      {/* ── Center + right ── */}
      {createMode ? (
        <div className="flex-1 flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="px-6 pt-5 pb-4 shrink-0 flex items-start justify-between">
            <h2 className="font-serif text-[20px] text-[var(--fg)] leading-tight">New Recipe</h2>
            <div className="flex items-center gap-3">
              <button className="bg-[var(--accent)] text-[var(--accent-text)] py-[6px] px-4 text-[9px] font-mono tracking-[0.1em] uppercase border-0 rounded-[6px] hover:bg-[var(--accent-hover)] cursor-pointer transition-colors"
                onClick={() => createBuilderRef.current?.save()}>
                Create
              </button>
              <button className="bg-transparent text-[var(--muted)] py-[6px] px-0 text-[9px] font-mono tracking-[0.1em] uppercase border-0 hover:text-[var(--fg)] cursor-pointer"
                onClick={() => { setCreateMode(false); setCreateImportedRecipe(null); }}>
                Cancel
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 px-7">
            {/* Import section */}
            {!createImportedRecipe && (
              <div className="mb-6 p-4 rounded-[var(--radius,12px)] bg-[var(--bg-raised)]" style={{ boxShadow: 'var(--shadow-md)' }}>
                <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-3">Import Recipe</div>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="url"
                    placeholder="Paste recipe URL…"
                    value={createImportUrl}
                    onChange={(e) => setCreateImportUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateUrlImport(); }}
                    disabled={createImporting}
                    aria-label="Recipe URL to import"
                    className="flex-1 border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] rounded-none focus:outline-none focus:border-[var(--fg)] placeholder:text-[var(--placeholder)]"
                  />
                  <button
                    onClick={handleCreateUrlImport}
                    disabled={createImporting || !createImportUrl.trim()}
                    className="py-[5px] px-3 font-mono text-[9px] tracking-[0.1em] uppercase rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] border-0 cursor-pointer hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
                  >
                    {createImporting ? "Importing…" : "Import"}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">Or upload a .md file</span>
                  <input
                    ref={createFileRef}
                    type="file"
                    accept=".md,text/markdown"
                    className="sr-only"
                    aria-label="Upload Pestle markdown file"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCreateFileImport(f); }}
                    disabled={createImporting}
                  />
                  <button
                    type="button"
                    onClick={() => createFileRef.current?.click()}
                    disabled={createImporting}
                    className="px-3 py-[5px] font-mono text-[9px] uppercase tracking-[0.1em] rounded-[6px] border border-[var(--rule)] bg-[var(--bg-raised)] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] hover:border-[var(--rule-strong)] transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Choose File
                  </button>
                </div>
                {createImportError && (
                  <div className="font-mono text-[11px] text-[var(--error)] mt-2">{createImportError}</div>
                )}
              </div>
            )}
            {createImportedRecipe && (
              <div className="flex items-center justify-between mb-4 px-1">
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--accent)]">Imported — review and save</span>
                <button onClick={() => { setCreateImportedRecipe(null); setCreateImportUrl(""); }}
                  className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--fg)] bg-transparent border-0 cursor-pointer">
                  Clear import
                </button>
              </div>
            )}
            <RecipeBuilder
              ref={createBuilderRef}
              hideFooterButtons
              initialRecipe={createImportedRecipe || undefined}
              onSaved={() => { setCreateMode(false); setCreateImportedRecipe(null); setSelectedRecipe(null); loadRecipes(); }}
              onCancel={() => { setCreateMode(false); setCreateImportedRecipe(null); }}
            />
          </div>
        </div>

      ) : editMode ? (
        <div className="flex-1 flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="px-6 pt-5 pb-4 shrink-0 flex items-start justify-between">
            <h2 className="font-serif text-[20px] text-[var(--fg)] leading-tight">Edit Recipe</h2>
            <div className="flex items-center gap-3">
              <button
                className="bg-[var(--accent)] text-[var(--accent-text)] py-[6px] px-4 text-[9px] font-mono tracking-[0.1em] uppercase border-0 rounded-[6px] hover:bg-[var(--accent-hover)] cursor-pointer transition-colors"
                onClick={() => editBuilderRef.current?.save()}
              >
                Save
              </button>
              <button
                className="bg-transparent text-[var(--muted)] py-[6px] px-0 text-[9px] font-mono tracking-[0.1em] uppercase border-0 hover:text-[var(--fg)] cursor-pointer"
                onClick={() => { setEditMode(false); setEditRecipe(null); }}
              >
                Cancel
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 px-7">
            {editLoading || !editRecipe ? (
              <p className="text-[11px] text-[var(--muted)]">Loading…</p>
            ) : (
              <RecipeBuilder
                ref={editBuilderRef}
                initialRecipe={editRecipe}
                hideFooterButtons
                onSaved={() => {
                const editedId = editRecipe?.id;
                if (editedId) clientCache.delete(`/api/recipes/${editedId}`);
                setEditMode(false);
                setEditRecipe(null);
                setSelectedRecipe(null);
                loadRecipes();
                // Re-fetch the edited recipe's nutrition totals
                if (editedId) {
                  handleSelectRecipe({ id: editedId } as RecipeSummary);
                }
              }}
                onCancel={() => { setEditMode(false); setEditRecipe(null); }}
              />
            )}
          </div>
        </div>

      ) : loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="font-mono text-[12px] font-light text-[var(--muted)] animate-loading">Loading recipes...</div>
        </div>

      ) : !selectedRecipe ? (
        <div className="flex-1 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div className="text-center space-y-4 max-w-[280px]">
            <div className="font-serif text-[20px] text-[var(--fg)]">
              {recipes.length === 0 ? 'No recipes yet' : 'Select a recipe'}
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              {recipes.length === 0 ? 'Create a recipe from scratch or import one.' : 'Click a recipe from the list to view its details.'}
            </p>
            {recipes.length === 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedRecipe(null); setEditMode(false); setEditRecipe(null); setCreateMode(true); setCreateImportedRecipe(null); setCreateImportUrl(''); setCreateImportError(''); }}
                className="bg-[var(--accent)] text-[var(--accent-text)] rounded-[6px] px-5 py-[8px] text-[9px] font-mono uppercase tracking-[0.1em] hover:bg-[var(--accent-hover)] transition-colors border-0 cursor-pointer"
                aria-label="Create first recipe"
              >
                + New Recipe
              </button>
            )}
          </div>
        </div>

      ) : (
        <>
          <div className="flex-1 overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1 overflow-y-auto px-7 py-6" style={{ padding: '24px 28px' }}>
              {selectedRecipeLoading ? (
                <p className="text-[11px] text-[var(--muted)]">Loading…</p>
              ) : (
                <>
                  {/* Title + actions */}
                  <div className="flex items-start justify-between mb-[10px]">
                    <h2 className="font-serif text-[26px] text-[var(--fg)] leading-[1.2]">{selectedRecipe.name}</h2>
                    <div className="flex gap-[5px] shrink-0 ml-4 mt-1">
                      <button onClick={() => handleEditClick(selectedRecipe.id)}
                        className="py-[5px] px-3 text-[9px] font-mono tracking-[0.1em] uppercase bg-[var(--accent)] text-[var(--accent-text)] cursor-pointer hover:bg-[var(--accent-hover)] transition-colors rounded-[var(--radius-sm,4px)] border-0"
                        aria-label="Edit recipe">
                        Edit
                      </button>
                      <button onClick={() => handleDuplicate(selectedRecipe.id)}
                        className="py-[5px] px-3 text-[9px] font-mono tracking-[0.1em] uppercase bg-[var(--bg-raised)] text-[var(--muted)] border border-[var(--rule)] cursor-pointer hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] hover:border-[var(--rule-strong)] transition-colors rounded-[6px]"
                        aria-label="Duplicate recipe">
                        Duplicate
                      </button>
                      <button onClick={() => handleDelete(selectedRecipe.id, selectedRecipe.name)}
                        className="py-[5px] px-3 text-[9px] font-mono tracking-[0.1em] uppercase bg-[var(--error-light)] text-[var(--error)] cursor-pointer hover:bg-[var(--error)] hover:text-white transition-colors rounded-[var(--radius-sm,4px)] border-0"
                        aria-label="Delete recipe">
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap mb-5">
                    <span className="font-mono text-[10px] text-[var(--muted)]">{selectedRecipe.servingSize} {selectedRecipe.servingUnit}</span>
                    {selectedRecipe.prepTime != null && <><span className="w-[3px] h-[3px] rounded-full bg-[var(--rule-strong)] shrink-0" /><span className="font-mono text-[10px] text-[var(--muted)]">{selectedRecipe.prepTime} min prep</span></>}
                    {selectedRecipe.cookTime != null && <><span className="w-[3px] h-[3px] rounded-full bg-[var(--rule-strong)] shrink-0" /><span className="font-mono text-[10px] text-[var(--muted)]">{selectedRecipe.cookTime} min cook</span></>}
                    {selectedRecipe.tags && selectedRecipe.tags.split(",").map((tag) => (
                      <span key={tag} className="inline-block font-mono text-[9px] tracking-[0.04em] uppercase text-[var(--accent)] bg-[var(--accent-light)] py-[1px] px-[7px] rounded-full">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-0 border-b border-[var(--rule-faint)] mb-5">
                    {([
                      { key: 'recipe' as const, label: 'Recipe' },
                      { key: 'optimization' as const, label: 'Optimization' },
                      { key: 'mealPrep' as const, label: 'Meal Prep' },
                    ]).map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => { setDetailTab(key); setEditingNotes(null); }}
                        className={`font-mono text-[9px] tracking-[0.12em] uppercase py-[8px] mr-5 bg-transparent border-0 border-b-2 cursor-pointer transition-colors -mb-[1px] ${
                          detailTab === key
                            ? 'text-[var(--fg)] border-[var(--fg)]'
                            : 'text-[var(--muted)] border-transparent hover:text-[var(--fg)]'
                        }`}
                        aria-label={`${label} tab`}
                        aria-selected={detailTab === key}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* ── Recipe tab ── */}
                  {detailTab === 'recipe' && (
                    <>
                      {selectedRecipe.image && (
                        <div className="mb-5 rounded-[var(--radius,8px)] overflow-hidden">
                          <img src={selectedRecipe.image} alt={selectedRecipe.name} className="w-full max-h-[300px] object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        </div>
                      )}

                      {selectedRecipe.totals && selectedRecipe.totals.length > 0 && (() => {
                        const GRID_KEYS: { match: string[]; label: string; exact?: boolean }[] = [
                          { match: ["energy", "calorie"], label: "KCAL" },
                          { match: ["fat"], label: "FAT", exact: true },
                          { match: ["saturated"], label: "SAT FAT" },
                          { match: ["sodium"], label: "SODIUM" },
                          { match: ["carbohydrate", "carb"], label: "CARBS" },
                          { match: ["sugar"], label: "SUGAR" },
                          { match: ["protein"], label: "PROTEIN" },
                          { match: ["fiber"], label: "FIBER" },
                        ];
                        const gridNutrients = GRID_KEYS.map(({ match, label, exact }) => {
                          const n = selectedRecipe.totals!.find((t) => {
                            const name = t.displayName.toLowerCase();
                            return exact
                              ? match.some((k) => name === k)
                              : match.some((k) => name.includes(k));
                          });
                          return { label, value: n ? Math.round(n.value * 10) / 10 : 0, unit: n?.unit ?? "" };
                        });
                        return (
                          <div className="mb-5">
                            <div className="rounded-[var(--radius,12px)] bg-[var(--bg-raised)] p-3" style={{ boxShadow: 'var(--shadow-md)' }}>
                              <div className="grid grid-cols-4 gap-[1px] bg-[var(--rule-faint)] rounded-[8px] overflow-hidden">
                                {gridNutrients.map((n) => (
                                  <div key={n.label} className="py-[14px] px-3 text-center bg-[var(--bg-raised)]">
                                    <div className="font-serif text-[22px] text-[var(--fg)] leading-none">{n.value}{n.unit}</div>
                                    <div className="font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--muted)] mt-[3px]">{n.label}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="mb-5">
                        <div className="flex items-center justify-between mt-5 mb-2">
                          <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--muted)]">Ingredients</p>
                          <div className="flex items-center gap-1" role="group" aria-label="Scale recipe">
                            {[1, 2, 3, 4].map((n) => (
                              <button key={n} onClick={() => setScale(n)}
                                className={`font-mono text-[9px] tracking-[0.06em] px-[7px] py-[3px] rounded-[3px] border transition-colors ${scale === n ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)]' : 'bg-transparent text-[var(--muted)] border-[var(--rule)] hover:border-[var(--muted)]'}`}
                                aria-pressed={scale === n}
                                aria-label={`Scale ${n}×`}>{n}×</button>
                            ))}
                          </div>
                        </div>
                        {selectedRecipe.ingredients.map((ing, idx) => {
                          const prevSection = idx > 0 ? (selectedRecipe.ingredients[idx - 1] as any).section : null;
                          const showSection = (ing as any).section && (ing as any).section !== prevSection;
                          return (
                            <div key={ing.id}>
                              {showSection && (
                                <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] pt-3 pb-1 border-b border-[var(--rule-faint)]">
                                  {(ing as any).section}
                                </div>
                              )}
                              <div className={`flex items-center py-[8px] gap-[14px] ${idx < selectedRecipe.ingredients.length - 1 ? 'border-b border-[var(--rule-faint)]' : ''}`}>
                                <span className="font-mono text-[11px] text-[var(--mid)] min-w-[60px] tabular-nums">{parseFloat((ing.quantity * scale).toFixed(2))} {ing.unit}</span>
                                <span className="text-[12px] text-[var(--fg)] flex-1">{ing.ingredient?.name || "Unknown"}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {selectedRecipe.instructions && (
                        <div className="mb-5">
                          <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--muted)] mb-2 mt-5">Instructions</p>
                          <p className="text-[12px] text-[var(--mid)] whitespace-pre-wrap leading-[1.6]">{selectedRecipe.instructions}</p>
                        </div>
                      )}

                      {selectedRecipe.sourceApp?.startsWith("http") && (
                        <div className="mb-5">
                          <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--muted)] mb-1">Source</p>
                          <a href={selectedRecipe.sourceApp} target="_blank" rel="noopener noreferrer"
                            className="font-mono text-[10px] text-[var(--accent)] hover:underline break-all"
                            aria-label="View original recipe source">
                            {selectedRecipe.sourceApp}
                          </a>
                        </div>
                      )}
                    </>
                  )}

                  {/* ── Optimization tab ── */}
                  {detailTab === 'optimization' && (() => {
                    const notes = selectedRecipe.optimizeAnalysis;
                    const isEditing = editingNotes === 'optimization';
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--muted)]">Optimization Notes</span>
                          {!isEditing && notes && (
                            <button onClick={() => { setEditingNotes('optimization'); setNotesText(notes || ''); }}
                              className="font-mono text-[9px] tracking-[0.08em] uppercase bg-transparent border-0 text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer py-1 px-2 rounded-[var(--radius-sm,4px)] hover:bg-[var(--bg-subtle)]"
                              aria-label="Edit optimization notes">Edit</button>
                          )}
                        </div>
                        {isEditing ? (
                          <>
                            <textarea
                              className="w-full min-h-[400px] text-[12px] leading-[1.65] text-[var(--fg)] bg-[var(--bg-raised)] border border-[var(--rule)] rounded-[var(--radius-sm,4px)] p-[14px] outline-none resize-y font-sans"
                              placeholder="Paste optimization notes here (markdown supported)..."
                              value={notesText}
                              onChange={(e) => setNotesText(e.target.value)}
                              aria-label="Optimization notes editor"
                            />
                            <div className="flex justify-end gap-2 mt-3">
                              <button onClick={() => setEditingNotes(null)}
                                className="font-mono text-[9px] tracking-[0.08em] uppercase bg-transparent border-0 text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer py-[6px] px-3">Cancel</button>
                              <button onClick={() => handleSaveNotes('optimization')} disabled={savingNotes}
                                className="font-mono text-[9px] tracking-[0.08em] uppercase bg-[var(--accent)] text-[var(--accent-text)] border-0 py-[6px] px-4 rounded-[var(--radius-sm,4px)] cursor-pointer hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40">
                                {savingNotes ? 'Saving...' : 'Save'}</button>
                            </div>
                          </>
                        ) : notes ? (
                          <div className="prose-notes text-[12px] leading-[1.65] text-[var(--fg)]"
                            dangerouslySetInnerHTML={{ __html: renderNotesHtml(notes) }} />
                        ) : (() => {
                          const prompt = `You are a [cuisine] chef with a background in nutrition who works with clients to create great-tasting, healthy meals. List my recipes from Good Measure. Get the full recipe for ${selectedRecipe.name}. Analyze it for nutritional optimization — identify the top nutrient contributors, suggest substitutions to [meet your goals here], and preserve the original section headers in your analysis. Show me what you changed and why, including how each change could affect flavor, texture, and overall eating experience. Create a comparison table of the original vs. optimized nutrition numbers per serving.\n\nBefore suggesting any ingredient substitutions, use search_ingredients to check what's already in the database. Prefer substitutions that use existing ingredients — they'll have accurate nutrition data. You can still suggest new ingredients when no good match exists, but flag those clearly.\n\nI may give you feedback and request tweaks before we finalize. Do not save anything until I explicitly tell you I'm happy with the changes.\n\nOnce approved, save the optimized recipe using save_recipe with section headers preserved, and save the analysis notes using save_optimization_notes. Always report any stub ingredient warnings before moving on.`;
                          return (
                            <div>
                              <p className="text-[11px] text-[var(--muted)] mb-4">Copy this prompt into any MCP-connected AI assistant. Notes will save automatically once you approve.</p>
                              <p className="font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--muted)] mb-2">Step 1 — Copy prompt</p>
                              <div className="text-[11px] leading-[1.6] text-[var(--mid)] bg-[var(--bg-subtle)] border border-[var(--rule)] rounded-[4px] p-3 mb-3 whitespace-pre-wrap select-all">{prompt}</div>
                              <div className="flex items-center gap-3 mb-6">
                                <button
                                  onClick={() => { navigator.clipboard.writeText(prompt); setCopiedPrompt('optimization'); setTimeout(() => setCopiedPrompt(null), 2000); }}
                                  className="font-mono text-[9px] tracking-[0.08em] uppercase bg-[var(--accent)] text-[var(--accent-text)] border-0 py-[6px] px-4 rounded-[4px] cursor-pointer hover:bg-[var(--accent-hover)] transition-colors"
                                  aria-label="Copy optimization prompt">
                                  {copiedPrompt === 'optimization' ? 'Copied ✓' : 'Copy prompt →'}
                                </button>
                                <button onClick={() => { setEditingNotes('optimization'); setNotesText(''); }}
                                  className="font-mono text-[9px] tracking-[0.08em] uppercase bg-transparent border-0 text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer py-[6px] px-2"
                                  aria-label="Paste notes manually">Paste notes instead</button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}

                  {/* ── Meal Prep tab ── */}
                  {detailTab === 'mealPrep' && (() => {
                    const notes = selectedRecipe.mealPrepAnalysis;
                    const isEditing = editingNotes === 'mealPrep';
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--muted)]">Meal Prep Notes</span>
                          {!isEditing && notes && (
                            <button onClick={() => { setEditingNotes('mealPrep'); setNotesText(notes || ''); }}
                              className="font-mono text-[9px] tracking-[0.08em] uppercase bg-transparent border-0 text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer py-1 px-2 rounded-[var(--radius-sm,4px)] hover:bg-[var(--bg-subtle)]"
                              aria-label="Edit meal prep notes">Edit</button>
                          )}
                        </div>
                        {isEditing ? (
                          <>
                            <textarea
                              className="w-full min-h-[400px] text-[12px] leading-[1.65] text-[var(--fg)] bg-[var(--bg-raised)] border border-[var(--rule)] rounded-[var(--radius-sm,4px)] p-[14px] outline-none resize-y font-sans"
                              placeholder="Paste meal prep analysis here (markdown supported)..."
                              value={notesText}
                              onChange={(e) => setNotesText(e.target.value)}
                              aria-label="Meal prep notes editor"
                            />
                            <div className="flex justify-end gap-2 mt-3">
                              <button onClick={() => setEditingNotes(null)}
                                className="font-mono text-[9px] tracking-[0.08em] uppercase bg-transparent border-0 text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer py-[6px] px-3">Cancel</button>
                              <button onClick={() => handleSaveNotes('mealPrep')} disabled={savingNotes}
                                className="font-mono text-[9px] tracking-[0.08em] uppercase bg-[var(--accent)] text-[var(--accent-text)] border-0 py-[6px] px-4 rounded-[var(--radius-sm,4px)] cursor-pointer hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40">
                                {savingNotes ? 'Saving...' : 'Save'}</button>
                            </div>
                          </>
                        ) : notes ? (
                          <div className="prose-notes text-[12px] leading-[1.65] text-[var(--fg)]"
                            dangerouslySetInnerHTML={{ __html: renderNotesHtml(notes) }} />
                        ) : (() => {
                          const prompt = `You are a meal prep specialist with a background in nutrition. List my recipes from Good Measure. Get the full recipe for ${selectedRecipe.name}. Analyze it for meal prep with the following sections:\n\n1. Component-by-component breakdown — how each part stores, reheats, and holds up over time. Note anything that degrades in texture or flavor.\n2. Reheating instructions — for each component, give specific method, temperature, and time.\n3. Batch cooking recommendation — if it makes sense, suggest an optimal batch size with a scaled quantities table.\n4. This week vs. freeze-for-later — what to eat within the next 3–5 days and what to freeze now for future weeks.\n5. Day-by-day plan — a practical daily guide for the week assuming a Sunday prep session (e.g. Monday: reheat rice + cook salmon fresh, etc.).\n6. Storage summary table — fridge and freezer life per component.\n\nI may give you feedback before we finalize. Do not save anything until I explicitly tell you I'm happy.\n\nOnce approved, save the meal prep notes using save_meal_prep_notes. Always report any stub ingredient warnings before moving on.`;
                          return (
                            <div>
                              <p className="text-[11px] text-[var(--muted)] mb-4">Copy this prompt into any MCP-connected AI assistant. Notes will save automatically once you approve.</p>
                              <p className="font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--muted)] mb-2">Step 1 — Copy prompt</p>
                              <div className="text-[11px] leading-[1.6] text-[var(--mid)] bg-[var(--bg-subtle)] border border-[var(--rule)] rounded-[4px] p-3 mb-3 whitespace-pre-wrap select-all">{prompt}</div>
                              <div className="flex items-center gap-3 mb-6">
                                <button
                                  onClick={() => { navigator.clipboard.writeText(prompt); setCopiedPrompt('mealPrep'); setTimeout(() => setCopiedPrompt(null), 2000); }}
                                  className="font-mono text-[9px] tracking-[0.08em] uppercase bg-[var(--accent)] text-[var(--accent-text)] border-0 py-[6px] px-4 rounded-[4px] cursor-pointer hover:bg-[var(--accent-hover)] transition-colors"
                                  aria-label="Copy meal prep prompt">
                                  {copiedPrompt === 'mealPrep' ? 'Copied ✓' : 'Copy prompt →'}
                                </button>
                                <button onClick={() => { setEditingNotes('mealPrep'); setNotesText(''); }}
                                  className="font-mono text-[9px] tracking-[0.08em] uppercase bg-transparent border-0 text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer py-[6px] px-2"
                                  aria-label="Paste notes manually">Paste notes instead</button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}

                </>
              )}
            </div>
          </div>

          {!selectedRecipeLoading && (
            <div className="panel-slide-in w-[300px] min-w-[300px] h-full bg-[var(--bg-nav)] relative z-[1]" style={{ boxShadow: '-1px 0 4px rgba(0,0,0,0.07), inset 0 1px 0 rgba(0,0,0,0.04)' }} onClick={(e) => e.stopPropagation()}>
              <RecipeContextPanel
                recipeId={selectedRecipe.id}
                totals={selectedRecipe.totals || []}
                personId={selectedPerson?.id}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
