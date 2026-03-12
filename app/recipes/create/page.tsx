"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

export default function CreateRecipePage() {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [importedRecipe, setImportedRecipe] = useState<ImportDraft | null>(null);

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const markdown = await file.text();
      const res = await fetch("/api/recipes/import/pestle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      const draft: ImportDraft = {
        name: data.name || "Imported Recipe",
        servingSize: data.servingSize || 1,
        servingUnit: data.servingUnit || "servings",
        instructions: data.instructions || "",
        sourceApp: data.sourceApp || "Pestle",
        isComplete: data.isComplete,
        ingredients: (data.ingredients || []).map((item: any) => ({
          id: `imp-${Math.random().toString(36).slice(2)}`,
          ingredientId: item.ingredientId ?? null,
          quantity: item.quantity ?? 0,
          unit: item.unit || "",
          originalText: item.originalText || "",
          nameGuess: item.nameGuess || "",
          section: item.section || null,
          notes: item.section || null,
        })),
      };

      setImportedRecipe(draft);
    } catch (error) {
      console.error(error);
      alert("Failed to import recipe");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="px-7 py-5 border-b border-[var(--rule)] flex items-center justify-between">
        <div>
          <div className="font-mono text-[9px] font-light uppercase tracking-[0.12em] text-[var(--muted)]">Recipes</div>
          <h1 className="font-sans text-[16px] font-normal text-[var(--fg)] mt-[2px]">New Recipe</h1>
        </div>
        <button onClick={() => router.push('/recipes')} className="text-[11px] text-[var(--muted)] hover:text-[var(--fg)]">
          ← Back to list
        </button>
      </div>

      <div className="px-7 py-5">
        {!importedRecipe && (
          <div className="mb-6 p-4 border border-[var(--rule)]">
            <h3 className="font-sans text-[12px] font-medium mb-2">Import from Pestle</h3>
            <p className="font-mono text-[12px] font-light text-[var(--muted)] mb-3">Or create a recipe from scratch below</p>
            <input
              type="file"
              accept=".md,text/markdown"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
              }}
              disabled={importing}
              className="text-[12px]"
            />
            {importing && <div className="font-mono text-[12px] font-light text-[var(--muted)] mt-2">Importing...</div>}
          </div>
        )}

        <Suspense fallback={<div className="font-mono text-[12px] font-light text-[var(--muted)]">Loading...</div>}>
          <RecipeBuilder
            initialRecipe={importedRecipe || undefined}
            onSaved={() => {
              router.push("/recipes");
            }}
            onCancel={() => {
              router.push("/recipes");
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
