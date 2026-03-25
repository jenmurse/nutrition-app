"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import RecipeBuilder, { type RecipeBuilderHandle } from "../components/RecipeBuilder";
import RecipeContextPanel from "../components/RecipeContextPanel";
import { usePersonContext } from "../components/PersonContext";
import { toast } from "@/lib/toast";
import { dialog } from "@/lib/dialog";
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

  // Filters
  const searchQuery = searchParams?.get("search") || "";
  const selectedTags = searchParams?.get("tags")?.split(",").filter(Boolean) || [];
  const availableTags = ["breakfast", "lunch", "dinner", "snack", "side", "dessert", "beverage"];

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
        if (cachedDetail) setSelectedRecipe(cachedDetail);
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
        section: null,
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
      setCreateImportedRecipe(buildDraft(data, "URL Import"));
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

  const filteredRecipes = recipes.filter((recipe) => {
    if (searchQuery && !recipe.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedTags.length > 0) {
      const recipeTags = recipe.tags ? recipe.tags.split(",").map(t => t.trim()) : [];
      if (!selectedTags.some(tag => recipeTags.includes(tag))) return false;
    }
    return true;
  });

  return (
    <div className="h-full flex animate-fade-in" onClick={() => { if (!editMode && !createMode) setSelectedRecipe(null); }}>

      {/* ── Left: List pane ── */}
      <div className="w-[220px] min-w-[220px] flex flex-col border-r border-[var(--rule)]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-[var(--rule)] shrink-0">
          <div className="flex items-baseline justify-between mb-3">
            <h1 className="font-serif text-[18px] text-[var(--fg)] leading-none">Recipes</h1>
            <span className="font-mono text-[9px] tracking-[0.1em] text-[var(--muted)] uppercase">{filteredRecipes.length}</span>
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => updateSearchParam("search", e.target.value)}
            aria-label="Search recipes"
            className="w-full bg-transparent border border-[var(--rule)] py-1 px-2 text-[11px] font-mono text-[var(--fg)] placeholder:text-[var(--placeholder)] focus:outline-none mb-2"
          />
          <div className="flex gap-[3px] flex-wrap mt-1">
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                aria-label={`Filter by ${tag}`}
                aria-pressed={selectedTags.includes(tag)}
                className={`py-[2px] px-[6px] font-mono text-[8px] tracking-[0.1em] uppercase border cursor-pointer transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)]'
                    : 'bg-transparent text-[var(--muted)] border-[var(--rule)] hover:text-[var(--fg)]'
                }`}
              >{tag}</button>
            ))}
            {selectedTags.length > 0 && (
              <button onClick={() => updateSearchParam("tags", "")} aria-label="Clear tag filters"
                className="py-[2px] px-[4px] font-mono text-[8px] tracking-[0.1em] uppercase bg-transparent text-[var(--muted)] border-0 cursor-pointer hover:text-[var(--fg)]">
                clear
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredRecipes.map((recipe) => {
            const isSelected = !editMode && !createMode && selectedRecipe?.id === recipe.id;
            return (
              <div
                key={recipe.id}
                className={`py-[10px] px-6 border-b border-[var(--rule)] cursor-pointer transition-colors ${isSelected ? 'bg-[var(--accent-light)]' : 'hover:bg-[var(--bg-subtle)]'}`}
                onClick={() => { setEditMode(false); setEditRecipe(null); setCreateMode(false); handleSelectRecipe(recipe); }}
              >
                <div className="flex items-center gap-2">
                  {recipe.image ? (
                    <img src={recipe.image} alt="" aria-hidden="true" className="w-8 h-8 object-cover shrink-0 border border-[var(--rule)]" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-8 h-8 bg-[var(--bg-subtle)] border border-[var(--rule)] shrink-0" />
                  )}
                  <span className="font-sans text-[12px] font-normal text-[var(--fg)] truncate">{recipe.name}</span>
                  {recipe.isComplete === false && (
                    <span className="font-mono text-[8px] tracking-[0.1em] uppercase text-[var(--warning)] border border-[var(--warning-border)] py-[1px] px-[4px] leading-none shrink-0">Incomplete</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => { setSelectedRecipe(null); setEditMode(false); setEditRecipe(null); setCreateMode(true); setCreateImportedRecipe(null); setCreateImportUrl(""); setCreateImportError(""); }}
          aria-label="Create new recipe"
          className="shrink-0 w-full py-[10px] px-6 font-mono text-[9px] tracking-[0.1em] uppercase bg-[var(--accent)] text-[var(--accent-text)] border-0 border-t border-[var(--rule)] cursor-pointer hover:bg-[var(--accent-hover)] transition-colors text-left"
        >+ New Recipe</button>
      </div>

      {/* ── Center + right ── */}
      {createMode ? (
        <div className="flex-1 flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="px-6 pt-5 pb-4 border-b border-[var(--rule)] shrink-0 flex items-start justify-between">
            <h2 className="font-serif text-[20px] text-[var(--fg)] leading-tight">New Recipe</h2>
            <div className="flex items-center gap-3">
              <button className="bg-[var(--accent)] text-[var(--accent-text)] py-[6px] px-4 text-[9px] font-mono tracking-[0.1em] uppercase border-0 hover:bg-[var(--accent-hover)] cursor-pointer transition-colors"
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
              <div className="mb-6 p-4 border border-[var(--rule)]">
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
                    className="flex-1 border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] focus:outline-none focus:border-[var(--fg)] placeholder:text-[var(--placeholder)]"
                  />
                  <button
                    onClick={handleCreateUrlImport}
                    disabled={createImporting || !createImportUrl.trim()}
                    className="py-[5px] px-3 font-mono text-[9px] tracking-[0.1em] uppercase bg-[var(--accent)] text-[var(--accent-text)] border-0 cursor-pointer hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
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
                    className="px-3 py-[5px] font-mono text-[9px] uppercase tracking-[0.1em] border border-[var(--rule)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--rule-strong)] transition-colors bg-transparent cursor-pointer disabled:opacity-40"
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
          <div className="px-6 pt-5 pb-4 border-b border-[var(--rule)] shrink-0 flex items-start justify-between">
            <h2 className="font-serif text-[20px] text-[var(--fg)] leading-tight">Edit Recipe</h2>
            <div className="flex items-center gap-3">
              <button
                className="bg-[var(--accent)] text-[var(--accent-text)] py-[6px] px-4 text-[9px] font-mono tracking-[0.1em] uppercase border-0 hover:bg-[var(--accent-hover)] cursor-pointer transition-colors"
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
                className="bg-[var(--accent)] text-[var(--accent-text)] px-5 py-[8px] text-[9px] font-mono uppercase tracking-[0.1em] hover:bg-[var(--accent-hover)] transition-colors border-0 cursor-pointer"
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
            <div className="px-6 pt-5 pb-4 border-b border-[var(--rule)] shrink-0 flex items-start justify-between">
              <div>
                <h2 className="font-serif text-[20px] text-[var(--fg)] leading-tight mb-1">{selectedRecipe.name}</h2>
                <div className="font-mono text-[10px] text-[var(--muted)]">
                  {selectedRecipe.servingSize} {selectedRecipe.servingUnit}
                  {selectedRecipe.prepTime != null && <> &middot; Prep {selectedRecipe.prepTime} min</>}
                  {selectedRecipe.cookTime != null && <> &middot; Cook {selectedRecipe.cookTime} min</>}
                </div>
                {selectedRecipe.tags && (
                  <div className="flex flex-wrap gap-[4px] mt-2">
                    {selectedRecipe.tags.split(",").map((tag) => (
                      <span key={tag} className="inline-block font-mono text-[8px] tracking-[0.1em] uppercase text-[var(--muted)] border border-[var(--rule)] py-[2px] px-[5px]">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-[5px] shrink-0 ml-4 mt-1">
                <button onClick={() => handleEditClick(selectedRecipe.id)}
                  className="py-[5px] px-3 text-[9px] font-mono tracking-[0.1em] uppercase bg-transparent text-[var(--muted)] border border-[var(--rule)] cursor-pointer hover:text-[var(--fg)] hover:border-[var(--rule-strong)] transition-colors">
                  Edit
                </button>
                <button onClick={() => handleDuplicate(selectedRecipe.id)}
                  className="py-[5px] px-3 text-[9px] font-mono tracking-[0.1em] uppercase bg-transparent text-[var(--muted)] border border-[var(--rule)] cursor-pointer hover:text-[var(--fg)] hover:border-[var(--rule-strong)] transition-colors">
                  Duplicate
                </button>
                <button onClick={() => handleDelete(selectedRecipe.id, selectedRecipe.name)}
                  className="py-[5px] px-3 text-[9px] font-mono tracking-[0.1em] uppercase bg-transparent text-[var(--muted)] border border-[var(--rule)] cursor-pointer hover:text-[var(--error)] hover:border-[var(--error-border)] transition-colors">
                  Delete
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {selectedRecipeLoading ? (
                <p className="text-[11px] text-[var(--muted)]">Loading…</p>
              ) : (
                <>
                  {selectedRecipe.image && (
                    <div className="mb-5 -mx-6 -mt-5">
                      <img src={selectedRecipe.image} alt={selectedRecipe.name} className="w-full max-h-[300px] object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                  )}
                  {selectedRecipe.instructions && (
                    <div className="mb-[18px]">
                      <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--muted)] mb-[8px]">Instructions</div>
                      <p className="text-[11px] text-[var(--muted)] whitespace-pre-wrap leading-[1.6]">{selectedRecipe.instructions}</p>
                    </div>
                  )}
                  <div className="mb-[18px]">
                    <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--muted)] mb-[8px] pb-[5px] border-b border-[var(--rule)]">Ingredients</div>
                    {selectedRecipe.ingredients.map((ing, idx) => (
                      <div key={ing.id}
                        className={`flex justify-between items-baseline py-[7px] text-[11px] ${idx < selectedRecipe.ingredients.length - 1 ? 'border-b border-[var(--rule)]' : ''}`}>
                        <span className="text-[var(--fg)]">{ing.ingredient?.name || "Unknown"}</span>
                        <span className="font-mono text-[var(--muted)]">{parseFloat((ing.quantity).toFixed(2))} {ing.unit}</span>
                      </div>
                    ))}
                  </div>
                  {selectedRecipe.totals && selectedRecipe.totals.length > 0 && (
                    <div className="mb-[18px]">
                      <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--muted)] mb-[8px] pb-[5px] border-b border-[var(--rule)]">Nutrition per Serving</div>
                      {selectedRecipe.totals.map((nutrient) => (
                        <div key={nutrient.nutrientId} className="flex justify-between items-baseline py-[6px] text-[11px]">
                          <span className="text-[var(--muted)]">{nutrient.displayName}</span>
                          <span className="font-mono text-[var(--muted)]">{Math.round(nutrient.value * 100) / 100} {nutrient.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {!selectedRecipeLoading && (
            <div className="panel-slide-in w-[300px] min-w-[300px] h-full border-l border-[var(--rule)]" onClick={(e) => e.stopPropagation()}>
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
