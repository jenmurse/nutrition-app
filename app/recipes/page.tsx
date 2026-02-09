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

  const loadRecipes = () => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data) => setRecipes(data || []))
      .catch((e) => console.error(e));
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

      {recipes.length === 0 ? (
        <p className="text-slate-600">
          No recipes yet. <Link href="/recipes/create" className="text-blue-600 hover:underline">Create one</Link>
        </p>
      ) : (
        <div className="space-y-3">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="border rounded p-4 bg-white flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{recipe.name}</h3>
                <p className="text-sm text-slate-600 mb-2">
                  {recipe.servingSize} {recipe.servingUnit}
                  {recipe.sourceApp && ` • From ${recipe.sourceApp}`}
                </p>
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
          ))}
        </div>
      )}
    </div>
  );
}
