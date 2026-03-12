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

  if (loading) return <div className="px-7 py-5 font-mono text-[12px] font-light text-[var(--muted)]">Loading...</div>;
  if (!ingredient) return <div className="px-7 py-5 font-mono text-[12px] font-light text-[var(--muted)]">Ingredient not found</div>;

  if (editMode) {
    return (
      <div className="max-w-2xl px-7 py-5">
        <button
          onClick={() => setEditMode(false)}
          className="text-[11px] text-[var(--muted)] hover:text-[var(--fg)] mb-4"
        >
          ← Back to details
        </button>

        <div className="border-b border-[var(--rule)] pb-4 mb-6">
          <div className="font-mono text-[9px] font-light uppercase tracking-[0.12em] text-[var(--muted)]">Ingredients</div>
          <h1 className="font-sans text-[16px] font-normal text-[var(--fg)] mt-[2px]">Edit Ingredient</h1>
          <div className="font-mono text-[11px] text-[var(--muted)] mt-[2px]">Modify {ingredient.name}</div>
        </div>

        {/* Details section */}
        <div className="font-mono text-[9px] font-light uppercase tracking-[0.12em] text-[var(--muted)] mb-2 mt-6 border-b border-[var(--rule)] pb-2">Details</div>

        <div className="space-y-4">
          <div>
            <label className="font-sans text-[12px] font-medium text-[var(--fg)] block mb-1">Name</label>
            <input
              type="text"
              className="w-full border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] font-mono font-light focus:outline-none focus:border-[var(--fg)]"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="font-sans text-[12px] font-medium text-[var(--fg)] block mb-1">Default Unit</label>
            <select
              className="w-full border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] font-mono font-light focus:outline-none focus:border-[var(--fg)] appearance-none"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="g">g (grams)</option>
              <option value="ml">ml (milliliters)</option>
              <option value="other">other (custom unit)</option>
            </select>
          </div>

          {unit === "other" && (
            <div className="border border-[var(--rule)] p-4 mt-4">
              <div className="font-mono text-[9px] font-light uppercase tracking-[0.12em] text-[var(--muted)] mb-3">Custom Unit Settings</div>
              <div className="space-y-3">
                <div className="flex gap-3 items-center">
                  <label className="font-sans text-[12px] font-medium text-[var(--fg)] w-32 shrink-0">Unit name</label>
                  <input
                    className="flex-1 border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] font-mono font-light focus:outline-none focus:border-[var(--fg)]"
                    placeholder="e.g., banana, scoop, cup"
                    value={customUnitName}
                    onChange={(e) => setCustomUnitName(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 items-center">
                  <label className="font-sans text-[12px] font-medium text-[var(--fg)] w-32 shrink-0">Amount per unit</label>
                  <input
                    type="number"
                    step="any"
                    className="w-24 border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] font-mono font-light focus:outline-none focus:border-[var(--fg)]"
                    value={customUnitAmount}
                    onChange={(e) => setCustomUnitAmount(e.target.value)}
                  />
                  <span className="font-mono text-[11px] text-[var(--muted)]">{customUnitName || "unit"}</span>
                </div>
                <div className="flex gap-3 items-center">
                  <label className="font-sans text-[12px] font-medium text-[var(--fg)] w-32 shrink-0">Grams per unit</label>
                  <input
                    type="number"
                    step="any"
                    className="flex-1 border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] font-mono font-light focus:outline-none focus:border-[var(--fg)]"
                    value={customUnitGrams}
                    onChange={(e) => setCustomUnitGrams(e.target.value)}
                  />
                  <span className="font-mono text-[11px] text-[var(--muted)]">g</span>
                </div>
              </div>
            </div>
          )}

          <div className="border border-[var(--rule)] p-4 mt-4" data-testid="meal-item-checkbox-container">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isMealItem}
                onChange={(e) => setIsMealItem(e.target.checked)}
                className="w-4 h-4 cursor-pointer accent-[var(--fg)]"
                data-testid="meal-item-checkbox"
              />
              <span className="font-sans text-[12px] font-medium text-[var(--fg)]">This is a meal item (can be added directly to meal plans)</span>
            </label>
            <p className="font-mono text-[11px] text-[var(--muted)] mt-2 ml-6">Check this for foods you eat directly (fish, apple, chicken) but not for recipe ingredients (flour, salt, butter)</p>
          </div>
        </div>

        {/* Nutrient values section */}
        <div className="font-mono text-[9px] font-light uppercase tracking-[0.12em] text-[var(--muted)] mb-2 mt-6 border-b border-[var(--rule)] pb-2">Nutrient Values (per 100g)</div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-3">
          {nutrients.map((n) => (
            <div key={n.id} className="flex items-center gap-2">
              <label className="font-sans text-[12px] font-medium text-[var(--fg)] w-24 shrink-0">{n.displayName}</label>
              <input
                type="number"
                step="any"
                className="flex-1 border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] font-mono font-light focus:outline-none focus:border-[var(--fg)]"
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
              <div className="font-mono text-[11px] text-[var(--muted)] w-8 shrink-0">{n.unit}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-8">
          <button
            className="bg-[var(--fg)] text-[var(--bg)] px-5 py-[7px] text-[9px] font-mono uppercase tracking-[0.12em] hover:opacity-80 disabled:opacity-50"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--fg)]"
            onClick={() => setEditMode(false)}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl px-7 py-5">
      <button
        onClick={() => router.push("/ingredients")}
        className="text-[11px] text-[var(--muted)] hover:text-[var(--fg)] mb-4"
      >
        ← Back to list
      </button>

      <div className="border-b border-[var(--rule)] pb-4 mb-6">
        <div className="font-mono text-[9px] font-light uppercase tracking-[0.12em] text-[var(--muted)]">Ingredients</div>
        <h1 className="font-sans text-[16px] font-normal text-[var(--fg)] mt-[2px]">{ingredient.name}</h1>
        <div className="font-mono text-[11px] text-[var(--muted)] mt-[2px]">
          Default unit: {ingredient.defaultUnit === "other" && ingredient.customUnitName
            ? `${ingredient.customUnitAmount} ${ingredient.customUnitName}`
            : ingredient.defaultUnit}
          {ingredient.isMealItem && <span className="ml-3">Meal item</span>}
        </div>
      </div>

      {/* Nutrition grid */}
      <div className="font-mono text-[9px] font-light uppercase tracking-[0.12em] text-[var(--muted)] mb-2 border-b border-[var(--rule)] pb-2">Nutrition (per 100g)</div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-0">
        {ingredient.nutrientValues.map((nv) => (
          <div key={nv.id} className="flex items-center justify-between py-[6px] border-b border-[var(--rule)]">
            <span className="font-mono text-[12px] font-light text-[var(--fg)]">{nv.nutrient.displayName}</span>
            <span className="font-mono text-[12px] font-light text-[var(--muted)]">
              {formatNutrient(nv.value)} {nv.nutrient.unit}
            </span>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-8">
        <button
          onClick={() => setEditMode(true)}
          className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--fg)]"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          className="border border-[var(--error)] text-[var(--error)] px-5 py-[7px] text-[9px] font-mono uppercase tracking-[0.12em]"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
