"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Recipes</h1>
        <Link
          href="/recipes/create"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Create Recipe
        </Link>
      </div>

      {recipes.length > 0 && (
        <div className="mb-6 space-y-3">
          <input
            type="text"
            className="w-full border rounded p-3"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          <div className="bg-slate-50 border rounded p-3">
            <label className="block text-sm font-medium mb-2">Filter by tags:</label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <label key={tag} className="flex items-center gap-1 cursor-pointer bg-white border rounded px-3 py-1 hover:bg-slate-100">
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
                  <span className="text-sm capitalize">{tag}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {filteredRecipes.length === 0 ? (
        <p className="text-slate-600">
          {recipes.length === 0 
            ? <>No recipes yet. <Link href="/recipes/create" className="text-blue-600 hover:underline">Create one</Link></>
            : "No recipes match your search criteria."
          }
        </p>
      ) : (
        <div className="space-y-3">
          {filteredRecipes.map((recipe) => {
            const recipeTags = recipe.tags ? recipe.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
            return (
              <div key={recipe.id} className="border rounded p-4 bg-white flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{recipe.name}</h3>
                  <p className="font-mono text-sm text-slate-600 mb-2">
                    {recipe.servingSize} {recipe.servingUnit}
                    {recipe.sourceApp && ` • From ${recipe.sourceApp}`}
                  </p>
                  {recipeTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {recipeTags.map((tag) => (
                        <span key={tag} className="inline-block px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 capitalize">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {recipe.isComplete === false && (
                    <div className="inline-block px-2 py-1 rounded text-xs bg-amber-100 text-amber-800">
                      Incomplete - has unmatched ingredients
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/recipes/${recipe.id}`}
                    className="px-3 py-2 border rounded bg-white hover:bg-slate-50"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(recipe.id, recipe.name)}
                    className="px-3 py-2 border rounded bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
