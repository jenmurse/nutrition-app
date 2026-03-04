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
  isMealItem?: boolean;
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
  const [isMealItem, setIsMealItem] = useState(false);
  const [customUnitName, setCustomUnitName] = useState("");
  const [customUnitAmount, setCustomUnitAmount] = useState("1");
  const [customUnitGrams, setCustomUnitGrams] = useState("");
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
        setIsMealItem(Boolean(ing.isMealItem));
        setCustomUnitName(ing.customUnitName || "");
        setCustomUnitAmount(String(ing.customUnitAmount || "1"));
        setCustomUnitGrams(String(ing.customUnitGrams || ""));
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
    
    // Validate custom unit if selected
    if (unit === "other") {
      if (!customUnitName.trim()) {
        alert("Please enter a custom unit name (e.g., 'banana')");
        return;
      }
      if (!customUnitGrams || Number(customUnitGrams) <= 0) {
        alert("Please enter grams for the custom unit (e.g., 120 for 1 banana)");
        return;
      }
    }
    
    setSaving(true);
    try {
      const body: any = {
        name,
        defaultUnit: unit,
        isMealItem,
        nutrientValues: Object.entries(values).map(([nutrientId, value]) => ({
          nutrientId: Number(nutrientId),
          value: Number(value),
        })),
      };
      
      // Add custom unit data if using custom units
      if (unit === "other") {
        body.customUnitName = customUnitName.trim();
        body.customUnitAmount = Number(customUnitAmount) || 1;
        body.customUnitGrams = Number(customUnitGrams);
      }
      
      const res = await fetch(`/api/ingredients/${ingredientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        <button onClick={() => setEditMode(false)} className="text-blue-600 hover:underline text-sm mb-4">
          ← Back to details
        </button>
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
              <option value="other">other (custom unit)</option>
            </select>
          </div>
          
          {unit === "other" && (
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <h4 className="font-medium mb-2 text-sm">Custom Unit Settings</h4>
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <label className="w-40 text-sm font-medium">Unit name:</label>
                  <input
                    className="border rounded p-2 flex-1"
                    placeholder="e.g., banana, scoop, cup"
                    value={customUnitName}
                    onChange={(e) => setCustomUnitName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <label className="w-40 text-sm font-medium">Amount per unit:</label>
                  <input
                    type="number"
                    step="any"
                    className="border rounded p-2 w-24"
                    value={customUnitAmount}
                    onChange={(e) => setCustomUnitAmount(e.target.value)}
                  />
                  <span className="text-sm text-slate-600">{customUnitName || "unit"}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <label className="w-40 text-sm font-medium">Grams per unit:</label>
                  <input
                    type="number"
                    step="any"
                    className="border rounded p-2 flex-1"
                    value={customUnitGrams}
                    onChange={(e) => setCustomUnitGrams(e.target.value)}
                  />
                  <span className="text-sm text-slate-600">g</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="p-3 bg-amber-50 rounded border border-amber-200" data-testid="meal-item-checkbox-container">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isMealItem}
                onChange={(e) => setIsMealItem(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
                data-testid="meal-item-checkbox"
              />
              <span className="text-sm font-medium">This is a meal item (can be added directly to meal plans)</span>
            </label>
            <p className="text-xs text-slate-600 mt-2 ml-6">Check this for foods you eat directly (fish, apple, chicken) but not for recipe ingredients (flour, salt, butter)</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-3">Nutrient Values (per 100g)</label>
            <div className="space-y-2">
              {nutrients.map((n) => (
                <div key={n.id} className="flex items-center gap-2 border rounded p-2 bg-slate-50">
                  <label className="w-32 text-sm font-medium">{n.displayName}</label>
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
                </div>
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
          <p className="font-mono text-slate-600 mt-1">
            Default: {ingredient.defaultUnit === "other" && ingredient.customUnitName 
              ? `${ingredient.customUnitAmount} ${ingredient.customUnitName}` 
              : ingredient.defaultUnit}
          </p>
          {ingredient.isMealItem && (
            <p className="text-sm font-medium text-amber-700 bg-amber-50 rounded px-2 py-1 inline-block mt-2">
              ✓ Meal Item
            </p>
          )}
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
              <span className="font-mono text-slate-700">
                {formatNutrient(nv.value)} {nv.nutrient.unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
