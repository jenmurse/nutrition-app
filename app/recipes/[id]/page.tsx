"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import RecipeBuilder from "../../components/RecipeBuilder";

type ImportDraft = {
  id?: number;
  name: string;
  servingSize: number;
  servingUnit: string;
  instructions: string;
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

export default function EditRecipePage() {
  const params = useParams();
  const router = useRouter();
  const recipeId = params.id as string;
  
  const [recipe, setRecipe] = useState<ImportDraft | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const res = await fetch(`/api/recipes/${recipeId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Fetch failed");

        const recipeData = data.recipe;
        const draft: ImportDraft = {
          id: recipeData.id,
          name: recipeData.name,
          servingSize: recipeData.servingSize,
          servingUnit: recipeData.servingUnit,
          instructions: recipeData.instructions || "",
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

        setRecipe(draft);
      } catch (error) {
        console.error(error);
        alert("Failed to load recipe");
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [recipeId]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!recipe) return <div className="p-6">Recipe not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-4">
        <a href="/recipes" className="text-blue-600 hover:underline text-sm">
          ← Back to recipes
        </a>
      </div>
      <h1 className="text-2xl font-semibold mb-6">Edit Recipe</h1>
      
      <RecipeBuilder
        initialRecipe={recipe}
        onSaved={() => {
          router.push("/recipes");
        }}
      />
    </div>
  );
}
