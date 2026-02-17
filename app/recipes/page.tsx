"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RecipeBuilder from "../components/RecipeBuilder";

type RecipeSummary = {
  id: number;
  name: string;
  isComplete?: boolean;
  servingSize: number;
  servingUnit: string;
  instructions: string;
  sourceApp?: string | null;
  tags?: string;
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

type RecipeDraft = {
  id?: number;
  name: string;
  servingSize: number;
  servingUnit: string;
  instructions: string;
  tags?: string;
  sourceApp?: string | null;
  isComplete?: boolean;
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

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeSummary | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editRecipe, setEditRecipe] = useState<RecipeDraft | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  
  const availableTags = ["breakfast", "lunch", "dinner", "snack", "dessert", "beverage"];

  const loadRecipes = () => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data) => setRecipes(Array.isArray(data) ? data : []))
      .catch((e) => {
        console.error(e);
        setRecipes([]);
      });
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Delete recipe "${name}"?`)) {
      fetch(`/api/recipes/${id}`, { method: "DELETE" })
        .then((r) => {
          if (r.ok) {
            if (selectedRecipe?.id === id) {
              setSelectedRecipe(null);
            }
            loadRecipes();
          } else {
            alert("Failed to delete recipe");
          }
        })
        .catch((e) => {
          console.error(e);
          alert("Failed to delete recipe");
        });
    }
  };

  const handleEditClick = async (recipeId: number) => {
    setEditLoading(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fetch failed");

      const recipeData = data.recipe;
      const draft: RecipeDraft = {
        id: recipeData.id,
        name: recipeData.name,
        servingSize: recipeData.servingSize,
        servingUnit: recipeData.servingUnit,
        instructions: recipeData.instructions || "",
        tags: recipeData.tags || "",
        sourceApp: recipeData.sourceApp ?? null,
        isComplete: recipeData.isComplete,
        ingredients: (recipeData.ingredients || []).map((item: any) => ({
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

      setEditRecipe(draft);
      setEditMode(true);
    } catch (error) {
      console.error(error);
      alert("Failed to load recipe");
    } finally {
      setEditLoading(false);
    }
  };

  useEffect(() => {
    loadRecipes();
  }, []);

  // Filter recipes based on search and tags
  const filteredRecipes = recipes.filter((recipe) => {
    // Search filter
    if (searchQuery && !recipe.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Tag filter
    if (selectedTags.length > 0) {
      const recipeTags = recipe.tags ? recipe.tags.split(",").map(t => t.trim()) : [];
      const hasMatchingTag = selectedTags.some(tag => recipeTags.includes(tag));
      if (!hasMatchingTag) return false;
    }
    return true;
  });

  return (
    <div className="flex h-full">
      {/* Center Panel - Recipe List */}
      <div className="flex-1 overflow-y-auto p-6">
        {editMode ? (
          <div>
            <button
              onClick={() => {
                setEditMode(false);
                setEditRecipe(null);
              }}
              className="mb-4 text-sm text-foreground hover:underline"
            >
              ← Back to list
            </button>
            <h1 className="text-xl font-semibold mb-6">Edit Recipe</h1>
            {editLoading || !editRecipe ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <RecipeBuilder
                initialRecipe={editRecipe}
                onSaved={() => {
                  setEditMode(false);
                  setEditRecipe(null);
                  loadRecipes();
                }}
                onCancel={() => {
                  setEditMode(false);
                  setEditRecipe(null);
                }}
              />
            )}
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold mb-6">Recipes</h1>

            {filteredRecipes.length === 0 ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  {recipes.length === 0
                    ? <>No recipes yet. Create one from the sidebar →</>
                    : "No recipes match your filters."
                  }
                </p>
              </div>
            ) : (
              <div className="border divide-y">
                {filteredRecipes.map((recipe) => {
                  const isSelected = selectedRecipe?.id === recipe.id;
                  return (
                    <div
                      key={recipe.id}
                      className={`px-4 py-2.5 transition cursor-pointer ${
                        isSelected ? 'bg-muted/40' : 'hover:bg-muted/20'
                      }`}
                      onClick={() => setSelectedRecipe(recipe)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{recipe.name}</h3>
                        </div>
                        <p className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {recipe.servingSize} {recipe.servingUnit}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Right Sidebar - Search & Filters */}
      <aside className="flex w-80 flex-col border-l bg-muted/10">
        {/* Header */}
        <div className="p-4 space-y-1">
          <h2 className="text-sm font-semibold">Recipes</h2>
          <p className="text-xs text-muted-foreground">Select a recipe to view details</p>
        </div>

        {/* Create Button */}
        <div className="p-4">
          <Link
            href="/recipes/create"
            className="flex w-full items-center justify-center border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40 transition"
          >
            + Create Recipe
          </Link>
        </div>

        {/* Search */}
        <div className="p-4 space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Search
          </label>
          <input
            type="text"
            className="w-full border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
            placeholder="Type recipe name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tag Filters */}
        <div className="p-4 space-y-3">
          <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Filter by Tags
          </label>
          <div className="space-y-1.5">
            {availableTags.map((tag) => (
              <label key={tag} className="flex items-center gap-2 cursor-pointer text-sm hover:text-foreground transition">
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTags([...selectedTags, tag]);
                    } else {
                      setSelectedTags(selectedTags.filter((t) => t !== tag));
                    }
                  }}
                  className="cursor-pointer"
                />
                <span className="capitalize">{tag}</span>
              </label>
            ))}
          </div>
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="text-xs text-muted-foreground hover:text-foreground transition"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Recipe Count */}
        <div className="p-4">
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-mono font-semibold text-foreground">{filteredRecipes.length}</span> of{' '}
            <span className="font-mono font-semibold text-foreground">{recipes.length}</span> recipes
          </div>
        </div>

        {/* Selected Recipe Preview */}
        {selectedRecipe && (
          <div className="flex-1 border-t overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold">Recipe Details</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">{selectedRecipe.name}</h4>
                <p className="font-mono text-xs text-muted-foreground">
                  {selectedRecipe.servingSize} {selectedRecipe.servingUnit}
                </p>
                {selectedRecipe.sourceApp && (
                  <p className="text-xs text-muted-foreground mt-1">
                    From {selectedRecipe.sourceApp}
                  </p>
                )}
                {selectedRecipe.isComplete === false && (
                  <div className="inline-block px-2 py-0.5 border border-amber-600/40 bg-amber-600/10 text-[10px] uppercase tracking-wider mt-2">
                    Incomplete
                  </div>
                )}
              </div>
              
              {selectedRecipe.ingredients.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    Ingredients ({selectedRecipe.ingredients.length})
                  </div>
                  <div className="space-y-1">
                    {selectedRecipe.ingredients.slice(0, 5).map((ing) => (
                      <div key={ing.id} className="text-xs text-muted-foreground">
                        • {ing.ingredient?.name || ing.originalText || 'Unknown'}
                      </div>
                    ))}
                    {selectedRecipe.ingredients.length > 5 && (
                      <div className="text-xs text-muted-foreground">
                        ... and {selectedRecipe.ingredients.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedRecipe.instructions && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    Instructions
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-6">
                    {selectedRecipe.instructions}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleEditClick(selectedRecipe.id)}
                  className="flex flex-1 items-center justify-center border bg-background px-4 py-2 text-xs font-medium hover:bg-muted/40 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(selectedRecipe.id, selectedRecipe.name)}
                  className="flex flex-1 items-center justify-center border border-rose-600/40 bg-rose-600/10 px-4 py-2 text-xs font-medium text-rose-700 hover:bg-rose-600/20 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
