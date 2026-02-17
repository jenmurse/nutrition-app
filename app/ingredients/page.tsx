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
      setIngredients((prev) => prev.filter((ing) => ing.id !== id));
    } catch (err) {
      console.error(err);
      alert(`Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
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
        <div className="bg-white border rounded divide-y">
          {ingredients.map((ing) => (
            <Link
              key={ing.id}
              href={`/ingredients/${ing.id}`}
              className="block px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-lg">{ing.name}</h3>
                  <p className="text-sm text-slate-600">
                    Default: {ing.defaultUnit === "other" && ing.customUnitName 
                      ? `${ing.customUnitAmount} ${ing.customUnitName}` 
                      : ing.defaultUnit}
                  </p>
                </div>
                <span className="text-slate-400">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
