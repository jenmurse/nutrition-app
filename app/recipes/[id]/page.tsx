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

export default function EditRecipePage() {
  const params = useParams();
  const router = useRouter();
  const recipeId = params.id as string;

  const [recipe, setRecipe] = useState<ImportDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState(false);

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Duplicate failed");

      // Navigate to the new duplicated recipe
      router.push(`/recipes/${data.recipe.id}`);
    } catch (error) {
      console.error(error);
      alert("Failed to duplicate recipe");
    } finally {
      setDuplicating(false);
    }
  };

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

  if (loading) return <div className="px-7 py-5 text-[12px] font-mono font-light text-[var(--muted)]">Loading...</div>;
  if (!recipe) return <div className="px-7 py-5 text-[12px] font-mono font-light text-[var(--muted)]">Recipe not found</div>;

  return (
    <div>
      <div className="px-7 py-5 border-b border-[var(--rule)] flex items-center justify-between">
        <div>
          <div className="font-mono text-[9px] font-light uppercase tracking-[0.12em] text-[var(--muted)]">Recipes</div>
          <h1 className="font-sans text-[16px] font-normal text-[var(--fg)] mt-[2px]">Edit Recipe</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--fg)] disabled:opacity-50"
          >
            {duplicating ? "Duplicating..." : "Duplicate"}
          </button>
          <button onClick={() => router.push('/recipes')} className="text-[11px] text-[var(--muted)] hover:text-[var(--fg)]">
            ← Back to list
          </button>
        </div>
      </div>

      <div className="px-7 py-5">
        <RecipeBuilder
          initialRecipe={recipe}
          onSaved={() => {
            router.push("/recipes");
          }}
        />
      </div>
    </div>
  );
}
