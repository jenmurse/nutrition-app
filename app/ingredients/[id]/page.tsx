"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

export default function IngredientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ingredientId = params.id as string;
  
  const [ingredient, setIngredient] = useState<Ingredient | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("g");
  const [values, setValues] = useState<Record<number, number>>({});
  const [nutrients, setNutrients] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ingredRes, nutrRes] = await Promise.all([
          fetch(`/api/ingredients/${ingredientId}`),
          fetch("/api/nutrients"),
        ]);
        
        if (!ingredRes.ok) throw new Error("Failed to fetch ingredient");
        
        const ing = await ingredRes.json();
        const nutr = await nutrRes.json();
        
        setIngredient(ing);
        setName(ing.name);
        setUnit(ing.defaultUnit);
        setNutrients(Array.isArray(nutr) ? nutr : []);
        
        const vals: Record<number, number> = {};
        if (ing.nutrientValues && Array.isArray(ing.nutrientValues)) {
          ing.nutrientValues.forEach((nv: any) => {
            vals[nv.nutrient.id] = nv.value;
          });
        }
        setValues(vals);
      } catch (e) {
        console.error(e);
        alert("Failed to load ingredient");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [ingredientId]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Name is required");
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch(`/api/ingredients/${ingredientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          defaultUnit: unit,
          nutrientValues: Object.entries(values).map(([nutrientId, value]) => ({
            nutrientId: Number(nutrientId),
            value: Number(value),
          })),
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Save failed");
      }
      
      // Reload the ingredient data
      const updatedIng = await res.json();
      setIngredient(updatedIng);
      setEditMode(false);
      alert("Ingredient saved");
    } catch (e) {
      console.error(e);
      alert(`Failed to save: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (!ingredient || !confirm(`Delete "${ingredient.name}"?`)) return;
    try {
      const res = await fetch(`/api/ingredients/${ingredientId}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Delete failed");
      }
      router.push("/ingredients");
    } catch (err) {
      console.error(err);
      alert(`Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (!ingredient) return <div className="p-6">Ingredient not found</div>;

  if (editMode) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-4">
          <button onClick={() => setEditMode(false)} className="text-blue-600 hover:underline text-sm">
            ← Back to details
          </button>
        </div>
        <h1 className="text-2xl font-semibold mb-6">Edit Ingredient</h1>
        
        <div className="bg-white border rounded p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Default Unit</label>
            <select
              className="w-full border rounded p-2"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="g">g (grams)</option>
              <option value="ml">ml (milliliters)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-3">Nutrient Values (per 100g)</label>
            <div className="grid grid-cols-1 gap-3">
              {nutrients.map((n) => (
                <label key={n.id} className="flex items-center gap-3 border rounded p-3 bg-slate-50">
                  <div className="w-32 text-sm font-medium">{n.displayName}</div>
                  <input
                    type="number"
                    step="any"
                    className="border rounded p-2 flex-1"
                    value={values[n.id] ?? ""}
                    onChange={(e) =>
                      setValues((s) => {
                        if (e.target.value === "") {
                          const { [n.id]: _, ...rest } = s;
                          return rest;
                        }
                        return { ...s, [n.id]: Number(e.target.value) };
                      })
                    }
                  />
                  <div className="text-sm text-slate-600 w-12">{n.unit}</div>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex gap-2 pt-4">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              className="px-4 py-2 border rounded hover:bg-slate-50"
              onClick={() => setEditMode(false)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-4">
        <a href="/ingredients" className="text-blue-600 hover:underline text-sm">
          ← Back to ingredients
        </a>
      </div>
      
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{ingredient.name}</h1>
          <p className="text-slate-600 mt-1">
            Default: {ingredient.defaultUnit === "other" && ingredient.customUnitName 
              ? `${ingredient.customUnitAmount} ${ingredient.customUnitName}` 
              : ingredient.defaultUnit}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditMode(true)}
            className="px-4 py-2 border rounded bg-white hover:bg-slate-50"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 border border-red-300 rounded bg-red-50 text-red-700 hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      </div>
      
      <div className="bg-white border rounded p-6">
        <h2 className="text-lg font-semibold mb-4">Nutrition Information (per 100g)</h2>
        <div className="space-y-3">
          {ingredient.nutrientValues.map((nv) => (
            <div key={nv.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
              <span className="font-medium">{nv.nutrient.displayName}</span>
              <span className="text-slate-700">
                {formatNutrient(nv.value)} {nv.nutrient.unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
