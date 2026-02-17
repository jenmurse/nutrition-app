"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type NutrientValue = {
  id: number;
  value: number;
  nutrient: { id: number; name: string; displayName: string; unit: string };
};

type Ingredient = {
  id: number;
  name: string;
  fdcId?: string | null;
  defaultUnit: string;
  customUnitName?: string | null;
  customUnitAmount?: number | null;
  customUnitGrams?: number | null;
  nutrientValues: NutrientValue[];
};

function formatNutrient(num: number): string {
  if (num === 0) return "0";

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const intPart = Math.floor(absNum);
  const fracPart = absNum - intPart;

  if (fracPart === 0) return String(num);

  const fracStr = fracPart.toString().split(".")[1] || "";
  let firstNonZeroIdx = fracStr.length;
  for (let i = 0; i < fracStr.length; i++) {
    if (fracStr[i] !== "0") {
      firstNonZeroIdx = i;
      break;
    }
  }

  const decimalPlaces = firstNonZeroIdx + 2;
  const factor = Math.pow(10, decimalPlaces);
  const truncated = Math.floor(absNum * factor) / factor;

  const result = isNegative ? -truncated : truncated;
  return result.toString();
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadIngredients = () => {
      fetch("/api/ingredients")
        .then((r) => r.json())
        .then((data) => setIngredients(Array.isArray(data) ? data : []))
        .catch((e) => {
          console.error(e);
          setIngredients([]);
        })
        .finally(() => setLoading(false));
    };

    loadIngredients();
  }, []);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/ingredients/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Delete failed");
      }
      if (selectedIngredient?.id === id) {
        setSelectedIngredient(null);
      }
      setIngredients((prev) => prev.filter((ing) => ing.id !== id));
    } catch (err) {
      console.error(err);
      alert(`Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const filteredIngredients = ingredients.filter((ing) =>
    searchQuery ? ing.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <div className="flex h-full">
      {/* Center Panel - Ingredient List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl">
          <h1 className="text-xl font-semibold mb-6">Ingredients</h1>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filteredIngredients.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {ingredients.length === 0 
                  ? <>No ingredients yet. Create one from the sidebar →</>
                  : "No ingredients match your search."
                }
              </p>
            </div>
          ) : (
            <div className="border divide-y">
              {filteredIngredients.map((ing) => {
                const isSelected = selectedIngredient?.id === ing.id;
                return (
                  <div
                    key={ing.id}
                    className={`px-4 py-3 transition cursor-pointer ${
                      isSelected ? 'bg-muted/40' : 'hover:bg-muted/20'
                    }`}
                    onClick={() => setSelectedIngredient(ing)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-base truncate">{ing.name}</h3>
                        <p className="font-mono text-xs text-muted-foreground">
                          Default: {ing.defaultUnit === "other" && ing.customUnitName 
                            ? `${ing.customUnitAmount} ${ing.customUnitName}` 
                            : ing.defaultUnit}
                        </p>
                      </div>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/ingredients/${ing.id}`}
                          className="px-3 py-1.5 border text-xs hover:bg-muted/40 transition"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(ing.id, ing.name)}
                          className="px-3 py-1.5 border border-rose-600/40 bg-rose-600/10 text-xs text-rose-700 hover:bg-rose-600/20 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Search & Details */}
      <aside className="flex w-80 flex-col border-l bg-muted/10">
        {/* Header */}
        <div className="border-b p-4">
          <h2 className="text-sm font-semibold">Actions & Details</h2>
        </div>

        {/* Create Button */}
        <div className="border-b p-4">
          <Link
            href="/ingredients/create"
            className="flex w-full items-center justify-center border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40 transition"
          >
            + Create Ingredient
          </Link>
        </div>

        {/* Search */}
        <div className="border-b p-4 space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Search
          </label>
          <input
            type="text"
            className="w-full border bg-background px-3 py-2 text-sm"
            placeholder="Type ingredient name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Ingredient Count */}
        <div className="border-b p-4">
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-mono font-semibold text-foreground">{filteredIngredients.length}</span> of{' '}
            <span className="font-mono font-semibold text-foreground">{ingredients.length}</span> ingredients
          </div>
        </div>

        {/* Selected Ingredient Details */}
        {selectedIngredient && (
          <div className="flex-1 overflow-y-auto">
            <div className="border-b p-4">
              <h3 className="text-sm font-semibold">Nutrition Info</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">{selectedIngredient.name}</h4>
                <p className="font-mono text-xs text-muted-foreground">
                  per 100{selectedIngredient.defaultUnit}
                </p>
              </div>

              {selectedIngredient.nutrientValues.length > 0 ? (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    Nutrients ({selectedIngredient.nutrientValues.length})
                  </div>
                  <div className="space-y-2">
                    {selectedIngredient.nutrientValues.map((nv) => (
                      <div key={nv.id} className="flex items-center justify-between text-xs border-b pb-2">
                        <span className="text-muted-foreground">{nv.nutrient.displayName}</span>
                        <span className="font-mono font-semibold">
                          {formatNutrient(nv.value)} {nv.nutrient.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  No nutrient data available
                </div>
              )}

              <Link
                href={`/ingredients/${selectedIngredient.id}`}
                className="flex w-full items-center justify-center border bg-background px-4 py-2 text-xs font-medium hover:bg-muted/40 transition"
              >
                Edit Full Details
              </Link>
            </div>
          </div>
        )}

        {!selectedIngredient && !loading && ingredients.length > 0 && (
          <div className="p-4">
            <div className="text-xs text-muted-foreground text-center">
              Select an ingredient to view nutrition details
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
