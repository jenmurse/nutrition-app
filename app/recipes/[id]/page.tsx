"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import RecipeBuilder from "../../components/RecipeBuilder";
import { toast } from "@/lib/toast";

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
      toast.error("Failed to duplicate recipe");
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
        toast.error("Failed to load recipe");
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [recipeId]);

  if (loading) return <div className="px-7 py-5 text-[12px] font-mono font-light text-[var(--muted)]">Loading...</div>;
  if (!recipe) return <div className="px-7 py-5 text-[12px] font-mono font-light text-[var(--muted)]">Recipe not found</div>;

  return (
    <div className="flex flex-col h-full page-container">
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 px-7 animate-fade-in">
        <button
          onClick={() => router.push('/recipes')}
          className="bg-transparent text-[var(--muted)] py-[8px] px-0 text-[9px] font-mono tracking-[0.1em] uppercase border-0 hover:text-[var(--fg)] cursor-pointer mb-4"
        >
          ← Back to list
        </button>
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-serif text-[22px] text-[var(--fg)] leading-none">Edit Recipe</h1>
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--fg)] disabled:opacity-50 bg-transparent border-0 cursor-pointer"
          >
            {duplicating ? "Duplicating..." : "Duplicate"}
          </button>
        </div>

        <div className="space-y-5 max-w-[720px]">
          <RecipeBuilder
            initialRecipe={recipe}
            onSaved={() => {
              router.push("/recipes");
            }}
          />
        </div>
      </div>
    </div>
  );
}
