"use client";

import { useEffect, useState, Suspense } from "react";
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
  prepTime?: number | null;
  cookTime?: number | null;
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

export default function RecipesPageWrapper() {
  return (
    <Suspense>
      <RecipesPage />
    </Suspense>
  );
}

function RecipesPage() {
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
        prepTime: recipeData.prepTime ?? null,
        cookTime: recipeData.cookTime ?? null,
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
        prepTime: recipeData.prepTime ?? null,
        cookTime: recipeData.cookTime ?? null,
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
    <div className="h-full flex flex-col animate-fade-in">
      {editMode ? (
        <div className="flex flex-col h-full">
          {/* Edit Mode Header */}
          <div className="flex items-end justify-between px-7 pt-6 pb-5 border-b border-[var(--rule)]">
            <div>
              <div className="text-[9px] uppercase tracking-[0.12em] text-[var(--muted)] mb-[2px]">Recipes</div>
              <h1 className="font-sans text-[16px] font-normal text-[var(--fg)]">Edit Recipe</h1>
            </div>
            <button
              onClick={() => {
                setEditMode(false);
                setEditRecipe(null);
              }}
              className="text-[11px] text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
            >
              Back to list
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 px-7">
            {editLoading || !editRecipe ? (
              <p className="text-[11px] text-[var(--muted)]">Loading...</p>
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
        </div>
      ) : (
        <div className="flex flex-col h-full" onClick={() => setSelectedRecipe(null)}>
          {/* Page Head */}
          <div className="flex items-end justify-between px-7 pt-6 pb-5 border-b border-[var(--rule)]">
            <div>
              <div className="text-[9px] uppercase tracking-[0.12em] text-[var(--muted)] mb-[2px]">Recipes</div>
              <h1 className="font-sans text-[16px] font-normal text-[var(--fg)]">All Recipes</h1>
            </div>
            <div className="text-[9px] uppercase tracking-[0.06em] text-[var(--muted)]">
              {filteredRecipes.length} of {recipes.length}
            </div>
          </div>

          {filteredRecipes.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-[11px] text-[var(--muted)]">
                {recipes.length === 0
                  ? <>No recipes yet. Click &quot;+ Create Recipe&quot; in the sidebar to get started.</>
                  : "No recipes match your filters."
                }
              </p>
            </div>
          ) : (
            <div
              className="flex flex-1 min-h-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Recipe List */}
              <div
                className={`overflow-y-auto ${selectedRecipe ? 'w-[260px] min-w-[260px] border-r border-[var(--rule)]' : 'flex-1'}`}
              >
                {filteredRecipes.map((recipe) => {
                  const isSelected = selectedRecipe?.id === recipe.id;
                  const recipeTags = recipe.tags ? recipe.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
                  return (
                    <div
                      key={recipe.id}
                      className={`py-[10px] px-7 border-b border-[var(--rule)] cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#f5f5f5]' : 'hover:bg-[#fafafa]'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRecipe(recipe);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-[12px] font-normal text-[var(--fg)]">{recipe.name}</span>
                        {recipe.isComplete === false && (
                          <span className="text-[9px] tracking-[0.06em] uppercase text-[#c08000] border border-[#e8c060] py-[2px] px-[5px] leading-none">Incomplete</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--muted)] mt-[2px]">
                        {recipe.servingSize} {recipe.servingUnit}
                        {recipeTags.length > 0 && <> &middot; {recipeTags[0]}</>}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Recipe Detail View */}
              {selectedRecipe && (
                <div
                  className="flex-1 overflow-y-auto p-6 px-7"
                  onClick={(e) => e.stopPropagation()}
                >
                  {selectedRecipeLoading ? (
                    <p className="text-[11px] text-[var(--muted)]">Loading...</p>
                  ) : (
                    <div>
                      {/* Title + subtitle */}
                      <h2 className="font-sans text-[15px] font-normal text-[var(--fg)] mb-1">{selectedRecipe.name}</h2>
                      <div className="text-[11px] text-[var(--muted)] mb-[14px]">
                        {selectedRecipe.servingSize} {selectedRecipe.servingUnit}
                        {selectedRecipe.prepTime != null && <> &middot; Prep {selectedRecipe.prepTime} min</>}
                        {selectedRecipe.cookTime != null && <> &middot; Cook {selectedRecipe.cookTime} min</>}
                      </div>

                      {/* Tags */}
                      {selectedRecipe.tags && (
                        <div className="flex flex-wrap gap-[4px] mb-[18px]">
                          {selectedRecipe.tags.split(",").map((tag) => (
                            <span key={tag} className="inline-block text-[9px] tracking-[0.06em] uppercase text-[var(--muted)] border border-[var(--rule)] py-[2px] px-[6px] mr-1">
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Incomplete badge in detail */}
                      {selectedRecipe.isComplete === false && (
                        <div className="mb-[18px]">
                          <span className="text-[9px] tracking-[0.06em] uppercase text-[#c08000] border border-[#e8c060] py-[2px] px-[5px]">Incomplete</span>
                        </div>
                      )}

                      {/* Instructions */}
                      {selectedRecipe.instructions && (
                        <div className="mb-[18px]">
                          <div className="text-[9px] tracking-[0.12em] uppercase text-[var(--muted)] mb-[10px] pb-[6px] border-b border-[var(--rule)]">Instructions</div>
                          <p className="text-[11px] text-[var(--muted)] whitespace-pre-wrap leading-[1.6]">{selectedRecipe.instructions}</p>
                        </div>
                      )}

                      {/* Ingredients */}
                      <div className="mb-[18px]">
                        <div className="text-[9px] tracking-[0.12em] uppercase text-[var(--muted)] mb-[10px] pb-[6px] border-b border-[var(--rule)]">Ingredients</div>
                        <div>
                          {selectedRecipe.ingredients.map((ing, idx) => (
                            <div
                              key={ing.id}
                              className={`flex justify-between items-baseline py-[7px] text-[11px] ${
                                idx < selectedRecipe.ingredients.length - 1 ? 'border-b border-[var(--rule)]' : ''
                              }`}
                            >
                              <span className="text-[var(--fg)]">{ing.ingredient?.name || "Unknown"}</span>
                              <span className="text-[var(--muted)]">
                                {ing.quantity} {ing.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Nutrition per Serving */}
                      {selectedRecipe.totals && selectedRecipe.totals.length > 0 && (
                        <div className="mb-[18px]">
                          <div className="text-[9px] tracking-[0.12em] uppercase text-[var(--muted)] mb-[10px] pb-[6px] border-b border-[var(--rule)]">Nutrition per Serving</div>
                          <div className="grid grid-cols-2 gap-[1px] border border-[var(--rule)] bg-[var(--rule)]">
                            {selectedRecipe.totals.map((nutrient) => (
                              <div key={nutrient.nutrientId} className="bg-[var(--bg)] p-[8px_12px] flex justify-between items-baseline">
                                <span className="text-[11px] text-[var(--muted)]">{nutrient.displayName}</span>
                                <span className="text-[11px] text-[var(--fg)]">{Math.round(nutrient.value * 100) / 100} {nutrient.unit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-[6px] mt-5 border-t border-[var(--rule)] pt-4">
                        <button
                          onClick={() => handleDuplicate(selectedRecipe.id)}
                          className="flex-1 py-[7px] px-[10px] text-[9px] tracking-[0.1em] uppercase bg-transparent text-[var(--muted)] border border-[var(--rule)] cursor-pointer hover:text-[var(--fg)] hover:border-[#bbb] transition-colors"
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={() => handleEditClick(selectedRecipe.id)}
                          className="flex-1 py-[7px] px-[10px] text-[9px] tracking-[0.1em] uppercase bg-transparent text-[var(--muted)] border border-[var(--rule)] cursor-pointer hover:text-[var(--fg)] hover:border-[#bbb] transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(selectedRecipe.id, selectedRecipe.name)}
                          className="flex-1 py-[7px] px-[10px] text-[9px] tracking-[0.1em] uppercase bg-transparent text-[#c03030] border border-[#e8b0b0] cursor-pointer hover:bg-[#fff5f5] transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
