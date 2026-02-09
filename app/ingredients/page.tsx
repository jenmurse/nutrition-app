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
  customUnitMeasurement?: string | null;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadIngredients = () => {
      fetch("/api/ingredients")
        .then((r) => r.json())
        .then((data) => setIngredients(data || []))
        .catch((e) => console.error(e))
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
      setIngredients((prev) => prev.filter((ing) => ing.id !== id));
    } catch (err) {
      console.error(err);
      alert(`Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ingredients</h1>
        <Link
          href="/ingredients/create"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Create Ingredient
        </Link>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : ingredients.length === 0 ? (
        <p className="text-slate-600">No ingredients yet. <Link href="/ingredients/create" className="text-blue-600 hover:underline">Create one</Link></p>
      ) : (
        <div className="space-y-3">
          {ingredients.map((ing) => (
            <div key={ing.id} className="bg-white border rounded p-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{ing.name}</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Default: {ing.defaultUnit === "other" && ing.customUnitName 
                    ? `${ing.customUnitAmount} ${ing.customUnitName}` 
                    : ing.defaultUnit}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {ing.nutrientValues.map((nv) => (
                    <div key={nv.id} className="flex gap-2">
                      <span className="font-medium">{nv.nutrient.displayName}:</span>
                      <span>{formatNutrient(nv.value)} {nv.nutrient.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/ingredients/${ing.id}`}
                  className="px-3 py-2 border rounded bg-white hover:bg-slate-50"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(ing.id, ing.name)}
                  className="px-3 py-2 border border-red-300 rounded bg-red-50 text-red-700 hover:bg-red-100"
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
