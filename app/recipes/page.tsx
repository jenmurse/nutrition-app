"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editRecipe, setEditRecipe] = useState<RecipeDraft | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedRecipeLoading, setSelectedRecipeLoading] = useState(false);
  
  // Read filters from URL params
  const searchQuery = searchParams?.get("search") || "";
  const selectedTags = searchParams?.get("tags")?.split(",").filter(Boolean) || [];

  const loadRecipes = () => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data) => setRecipes(Array.isArray(data) ? data : []))
      .catch((e) => {
        console.error(e);
        setRecipes([]);
      });
  };

  const handleSelectRecipe = async (recipe: RecipeSummary) => {
    if (selectedRecipe?.id === recipe.id) {
      setSelectedRecipe(null);
      return;
    }

    setSelectedRecipeLoading(true);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fetch failed");

      setSelectedRecipe({
        ...recipe,
        totals: data.totals,
      });
    } catch (error) {
      console.error(error);
      alert("Failed to load recipe details");
    } finally {
      setSelectedRecipeLoading(false);
    }
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

  const handleDuplicate = async (recipeId: number) => {
    try {
      const res = await fetch(`/api/recipes/${recipeId}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Duplicate failed");

      // Load the newly duplicated recipe and open it in edit mode
      const newRecipeId = data.recipe.id;
      const newRes = await fetch(`/api/recipes/${newRecipeId}`);
      const newData = await newRes.json();
      if (!newRes.ok) throw new Error(newData.error || "Fetch failed");

      const recipeData = newData.recipe;
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
      setSelectedRecipe(null);
      loadRecipes();
    } catch (error) {
      console.error(error);
      alert("Failed to duplicate recipe");
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
    <div className="h-full overflow-y-auto animate-fade-in">
      {editMode ? (
        <div className="p-6">
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
        <div className="p-6">
          <h1 className="text-xl font-semibold mb-6">Recipes</h1>

          {/* Recipe Count */}
          <div className="mb-4 text-sm text-muted-foreground">
            Showing <span className="font-mono font-semibold text-foreground">{filteredRecipes.length}</span> of{' '}
            <span className="font-mono font-semibold text-foreground">{recipes.length}</span> recipes
          </div>

          {filteredRecipes.length === 0 ? (
            <div className="flex h-64 items-center justify-center border">
              <p className="text-sm text-muted-foreground">
                {recipes.length === 0
                  ? <>No recipes yet. Click "+ Create Recipe" in the sidebar to get started.</>
                  : "No recipes match your filters."
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recipe List */}
              <div
                className="lg:col-span-1 border cursor-pointer"
                onClick={() => setSelectedRecipe(null)}
              >
                <div className="divide-y">
                  {filteredRecipes.map((recipe) => {
                    const isSelected = selectedRecipe?.id === recipe.id;
                    return (
                      <div
                        key={recipe.id}
                        className={`px-4 py-3 transition cursor-pointer ${
                          isSelected ? 'bg-muted/40' : 'hover:bg-muted/20'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRecipe(recipe);
                        }}
                      >
                        <div>
                          <h3 className="font-medium text-sm">{recipe.name}</h3>
                          {recipe.isComplete === false && (
                            <span className="text-[10px] text-amber-600">Incomplete</span>
                          )}
                          <p className="font-mono text-xs text-muted-foreground mt-1">
                            {recipe.servingSize} {recipe.servingUnit}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recipe Detail View */}
              <div className="lg:col-span-2 border bg-muted/5 p-6">
                {selectedRecipeLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : selectedRecipe ? (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <h2 className="text-2xl font-semibold">{selectedRecipe.name}</h2>
                        {selectedRecipe.isComplete === false && (
                          <span className="text-xs text-amber-600 bg-amber-600/10 px-2 py-1 rounded">Incomplete</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedRecipe.servingSize} {selectedRecipe.servingUnit}
                      </p>
                      {selectedRecipe.tags && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedRecipe.tags.split(",").map((tag) => (
                            <span key={tag} className="text-xs bg-muted px-2 py-1 rounded capitalize">
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedRecipe.instructions && (
                      <div>
                        <h3 className="font-semibold text-sm mb-2">Instructions</h3>
                        <p className="text-sm whitespace-pre-wrap text-muted-foreground">{selectedRecipe.instructions}</p>
                      </div>
                    )}

                    <div>
                      <h3 className="font-semibold text-sm mb-3">Ingredients</h3>
                      <div className="space-y-2">
                        {selectedRecipe.ingredients.map((ing) => (
                          <div key={ing.id} className="flex justify-between text-sm border-b pb-2">
                            <span>{ing.ingredient?.name || "Unknown"}</span>
                            <span className="font-mono text-muted-foreground">
                              {ing.quantity} {ing.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedRecipe.totals && selectedRecipe.totals.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-sm mb-3">Nutrition per Serving</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedRecipe.totals.map((nutrient) => (
                            <div key={nutrient.nutrientId} className="flex justify-between border bg-muted/10 px-3 py-2 text-sm rounded">
                              <span>{nutrient.displayName}</span>
                              <span className="font-mono">{Math.round(nutrient.value * 100) / 100} {nutrient.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4 border-t">
                      <button
                        onClick={() => handleDuplicate(selectedRecipe.id)}
                        className="flex-1 border bg-background px-3 py-2 text-sm font-medium hover:bg-muted/40 transition"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleEditClick(selectedRecipe.id)}
                        className="flex-1 border bg-background px-3 py-2 text-sm font-medium hover:bg-muted/40 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(selectedRecipe.id, selectedRecipe.name)}
                        className="flex-1 border border-rose-600/40 bg-rose-600/10 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-600/20 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a recipe to view details</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
