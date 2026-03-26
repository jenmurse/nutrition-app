"use client";

import { Suspense, useRef } from "react";
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
  tags?: string;
  prepTime?: number | null;
  cookTime?: number | null;
  image?: string | null;
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

function buildDraft(data: any, source: string): ImportDraft {
  return {
    name: data.name || "Imported Recipe",
    servingSize: data.servingSize || 1,
    servingUnit: data.servingUnit || "servings",
    instructions: data.instructions || "",
    sourceApp: source,
    isComplete: data.isComplete,
    tags: data.tags || undefined,
    prepTime: data.prepTime ?? null,
    cookTime: data.cookTime ?? null,
    image: data.image ?? null,
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
}

export default function CreateRecipePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importedRecipe, setImportedRecipe] = useState<ImportDraft | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [importError, setImportError] = useState("");

  const handleFileImport = async (file: File) => {
    setImporting(true);
    setImportError("");
    try {
      const markdown = await file.text();
      const res = await fetch("/api/recipes/import/pestle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setImportedRecipe(buildDraft(data, data.sourceApp || "Pestle"));
    } catch (error: any) {
      console.error(error);
      setImportError(error.message || "Failed to import recipe");
    } finally {
      setImporting(false);
    }
  };

  const handleUrlImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportError("");
    try {
      const res = await fetch("/api/recipes/import/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setImportedRecipe(buildDraft(data, "URL Import"));
    } catch (error: any) {
      console.error(error);
      setImportError(error.message || "Failed to import from URL");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full page-container">
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 px-7 animate-fade-in">
        <button
          onClick={() => router.push('/recipes')}
          className="bg-transparent text-[var(--muted)] py-[8px] px-0 text-[9px] font-mono tracking-[0.1em] uppercase border-0 hover:text-[var(--fg)] cursor-pointer mb-4"
        >
          ← Back to list
        </button>
        <h1 className="font-serif text-[22px] text-[var(--fg)] leading-none mb-5">New Recipe</h1>

        <div className="space-y-5 max-w-[720px]">
        {!importedRecipe && (
          <div className="mb-6 p-4 border border-[var(--rule)]">
            <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-3">Import Recipe</div>

            {/* URL import */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="url"
                placeholder="Paste recipe URL..."
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleUrlImport(); }}
                disabled={importing}
                aria-label="Recipe URL"
                className="flex-1 border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] focus:outline-none focus:border-[var(--fg)] placeholder:text-[var(--placeholder)]"
              />
              <button
                onClick={handleUrlImport}
                disabled={importing || !importUrl.trim()}
                aria-label="Import from URL"
                className="py-[5px] px-3 font-mono text-[9px] tracking-[0.1em] uppercase bg-[var(--accent)] text-[var(--accent-text)] border-0 cursor-pointer hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
              >
                {importing ? "Importing..." : "Import"}
              </button>
            </div>

            {/* File import */}
            <div className="flex items-center gap-3 mt-1">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">Or upload a .md file</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,text/markdown"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileImport(file);
                }}
                disabled={importing}
                className="sr-only"
                aria-label="Upload Pestle markdown file"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="px-3 py-[5px] font-mono text-[9px] uppercase tracking-[0.1em] rounded-[6px] border border-[var(--rule)] bg-[var(--bg-raised)] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] hover:border-[var(--rule-strong)] transition-colors cursor-pointer disabled:opacity-40"
                aria-label="Choose markdown file to upload"
              >
                Choose File
              </button>
            </div>

            {importError && (
              <div className="font-mono text-[11px] text-[var(--error)] mt-2">{importError}</div>
            )}
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
    </div>
  );
}
