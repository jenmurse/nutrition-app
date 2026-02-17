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
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeSummary | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editRecipe, setEditRecipe] = useState<RecipeDraft | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  
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
    <div className="h-full overflow-y-auto">
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
            <div className="border divide-y">
              {filteredRecipes.map((recipe) => {
                const isSelected = selectedRecipe?.id === recipe.id;
                return (
                  <div
                    key={recipe.id}
                    className={`px-4 h-[40px] flex items-center transition cursor-pointer ${
                      isSelected ? 'bg-muted/40' : 'hover:bg-muted/20'
                    }`}
                    onClick={() => setSelectedRecipe(isSelected ? null : recipe)}
                  >
                    <div className="flex items-center justify-between gap-4 w-full">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{recipe.name}</h3>
                        {recipe.isComplete === false && (
                          <span className="text-[10px] text-amber-600">Incomplete</span>
                        )}
                      </div>
                      <p className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {recipe.servingSize} {recipe.servingUnit}
                      </p>
                      {isSelected && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(recipe.id);
                            }}
                            className="border bg-background px-3 py-1 text-xs font-medium hover:bg-muted/40 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(recipe.id, recipe.name);
                            }}
                            className="border border-rose-600/40 bg-rose-600/10 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-600/20 transition"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
