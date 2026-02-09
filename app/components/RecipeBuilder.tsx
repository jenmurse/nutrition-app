"use client";

import { useEffect, useState } from "react";
import { convertToGrams, getIngredientDensity } from "../../lib/unitConversion";

type Nutrient = { id: number; name: string; displayName: string; unit: string };
type Ingredient = { 
  id: number; 
  name: string; 
  defaultUnit: string; 
  customUnitName?: string | null;
  customUnitAmount?: number | null;
  customUnitGrams?: number | null;
  customUnitMeasurement?: string | null;
  nutrientValues: { id: number; value: number; nutrient: Nutrient }[] 
};

type Row = {
  id: string;
  ingredientId?: number | null;
  quantity?: number;
  unit?: string;
  notes?: string;
  originalText?: string;
  nameGuess?: string;
  section?: string | null;
};

type RecipeDraft = {
  id?: number;
  name: string;
  servingSize: number;
  servingUnit: string;
  instructions: string;
  sourceApp?: string | null;
  isComplete?: boolean;
  ingredients: Row[];
};

export default function RecipeBuilder({
  initialRecipe,
  onSaved,
}: {
  initialRecipe?: RecipeDraft | null;
  onSaved?: () => void;
}) {
  const [name, setName] = useState("");
  const [servings, setServings] = useState(1);
  const [servingUnit, setServingUnit] = useState("servings");
  const [instructions, setInstructions] = useState("");
  const [sourceApp, setSourceApp] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [nutrients, setNutrients] = useState<Nutrient[]>([]);
  const [rows, setRows] = useState<Row[]>([{ id: "r1" }]);

  useEffect(() => {
    fetch("/api/ingredients").then((r) => r.json()).then((d) => setIngredients(d || []));
    fetch("/api/nutrients").then((r) => r.json()).then((d) => setNutrients(d || []));
  }, []);

  useEffect(() => {
    if (!initialRecipe) {
      setEditingId(null);
      return;
    }
    setEditingId(initialRecipe.id ?? null);
    setName(initialRecipe.name || "");
    setServings(initialRecipe.servingSize || 1);
    setServingUnit(initialRecipe.servingUnit || "servings");
    setInstructions(initialRecipe.instructions || "");
    setSourceApp(initialRecipe.sourceApp ?? null);
    if (initialRecipe.ingredients?.length) {
      setRows(
        initialRecipe.ingredients.map((row) => ({
          ...row,
          id: row.id || `r${Date.now()}-${Math.random().toString(36).slice(2)}`,
        }))
      );
    } else {
      setRows([{ id: "r1" }]);
    }
  }, [initialRecipe]);

  function addRow() {
    setRows((s) => [...s, { id: `r${Date.now()}` }]);
  }

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((s) => s.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function computeTotals() {
    const totals: Record<number, number> = {};
    for (const row of rows) {
      if (!row.ingredientId) continue;
      const ingredient = ingredients.find((i) => i.id === row.ingredientId);
      if (!ingredient) continue;
      const density = getIngredientDensity(ingredient.name);
      const grams = convertToGrams(row.quantity || 0, row.unit || ingredient.defaultUnit || "g", density, ingredient);
      for (const iv of ingredient.nutrientValues) {
        const nid = iv.nutrient.id;
        const per100 = iv.value || 0;
        const contrib = (per100 * grams) / 100.0;
        totals[nid] = (totals[nid] || 0) + contrib;
      }
    }
    return totals;
  }

  async function handleSave() {
    if (!name.trim()) {
      alert("Recipe name is required");
      return;
    }
    
    const usableRows = rows.filter((r) => r.ingredientId || r.originalText || r.nameGuess);
    if (usableRows.length === 0) {
      alert("Add at least one ingredient");
      return;
    }

    const isComplete = usableRows.every((r) => r.ingredientId);

    const payload = {
      name: name.trim(),
      servingSize: Number(servings) || 1,
      servingUnit: servingUnit || "servings",
      instructions: instructions || "",
      sourceApp: sourceApp || null,
      isComplete,
      ingredients: usableRows.map((r) => ({
        ingredientId: r.ingredientId ?? null,
        originalText: r.originalText || null,
        quantity: Number(r.quantity) || 0,
        unit: r.unit || "",
        notes: r.notes || r.section || null,
      })),
    };
    try {
      const url = editingId ? `/api/recipes/${editingId}` : "/api/recipes";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) {
        alert(editingId ? "Recipe updated" : "Recipe saved");
        if (!editingId) {
          setName("");
          setServings(1);
          setServingUnit("servings");
          setInstructions("");
          setSourceApp(null);
          setRows([{ id: "r1" }]);
        }
        onSaved?.();
      } else {
        alert(`Failed to save recipe: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  async function handleSaveAndCreateIngredient(ingredientName: string) {
    if (!name.trim()) {
      alert("Please enter a recipe name before creating ingredients");
      return;
    }

    if (!confirm("Save this recipe before creating the ingredient?")) {
      return;
    }

    const usableRows = rows.filter((r) => r.ingredientId || r.originalText || r.nameGuess);
    const isComplete = usableRows.every((r) => r.ingredientId);

    const payload = {
      name: name.trim(),
      servingSize: Number(servings) || 1,
      servingUnit: servingUnit || "servings",
      instructions: instructions || "",
      sourceApp: sourceApp || null,
      isComplete,
      ingredients: usableRows.map((r) => ({
        ingredientId: r.ingredientId ?? null,
        originalText: r.originalText || null,
        quantity: Number(r.quantity) || 0,
        unit: r.unit || "",
        notes: r.notes || r.section || null,
      })),
    };

    try {
      const url = editingId ? `/api/recipes/${editingId}` : "/api/recipes";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      
      console.log("[RecipeBuilder] Response status:", res.status);
      console.log("[RecipeBuilder] Response data:", data);
      
      if (res.ok) {
        const recipeId = editingId || data.id;
        if (!editingId) {
          setEditingId(recipeId);
        }
        const returnUrl = `/recipes?edit=${recipeId}`;
        window.location.href = `/ingredients?name=${encodeURIComponent(ingredientName)}&returnTo=${encodeURIComponent(returnUrl)}`;
      } else {
        alert(`Failed to save recipe: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("[RecipeBuilder] Error:", err);
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  const totals = computeTotals();
  const hasMissingIngredients = rows.some((r) => !r.ingredientId && (r.originalText || r.nameGuess));

  return (
    <div className="p-4 border rounded bg-white">
      <h3 className="text-lg font-medium mb-3">{editingId ? "Edit Recipe" : "Create Recipe"}</h3>

      {hasMissingIngredients && (
        <div className="mb-3 p-2 border border-amber-300 bg-amber-50 rounded text-sm text-amber-900">
          This recipe is incomplete. Resolve missing ingredients before saving, or save as incomplete.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <input className="border rounded p-2 col-span-2" placeholder="Recipe name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex gap-2">
          <input className="border rounded p-2 flex-1" type="number" min={1} value={servings} onChange={(e) => setServings(Number(e.target.value))} />
          <select className="border rounded p-2" value={servingUnit} onChange={(e) => setServingUnit(e.target.value)}>
            <option value="servings">servings</option>
            <option value="g">g</option>
            <option value="ml">ml</option>
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium block mb-2">Instructions</label>
        <textarea
          className="w-full border rounded p-2 min-h-[120px]"
          placeholder="Instructions (markdown supported)"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>

      <div className="space-y-2 mb-4">
        {rows.map((row) => {
          const selectedIngredient = row.ingredientId ? ingredients.find((i) => i.id === row.ingredientId) : undefined;
          const defaultUnitForRow = selectedIngredient?.customUnitName || selectedIngredient?.defaultUnit || "g";
          const prefillName = row.nameGuess || row.originalText || "";
          const importedLabel = row.originalText || row.nameGuess || "";
          
          return (
            <div key={row.id} className="border rounded p-2">
              {row.section && (
                <div className="text-xs text-slate-500 mb-1">{row.section}</div>
              )}
              {importedLabel && (
                <div className="text-xs text-slate-500 mb-2">Imported: {importedLabel}</div>
              )}
              <div className="flex gap-2 items-center">
                <select 
                  className="border rounded p-2 flex-1" 
                  value={row.ingredientId ?? ""} 
                  onChange={(e) => {
                    const ingredientId = Number(e.target.value) || undefined;
                    // Auto-set unit to custom unit if ingredient has one
                    const ing = ingredientId ? ingredients.find((i) => i.id === ingredientId) : undefined;
                    const defaultUnit = ing?.customUnitName || ing?.defaultUnit || "g";
                    updateRow(row.id, { ingredientId, unit: defaultUnit });
                  }}
                >
                  <option value="">Select ingredient</option>
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                      {i.customUnitName ? ` (${i.customUnitName})` : ""}
                    </option>
                  ))}
                </select>
                
                {row.nameGuess && row.ingredientId && (
                  <div className="text-xs text-green-600">
                    Matched to: {selectedIngredient?.name}
                  </div>
                )}

                <input 
                  className="w-24 border rounded p-2" 
                  type="number" 
                  placeholder="qty" 
                  value={row.quantity ?? ""} 
                  onChange={(e) => {
                    const value = e.target.value === "" ? undefined : Number(e.target.value);
                    updateRow(row.id, { quantity: value });
                  }} 
                />
                <input 
                  className="w-24 border rounded p-2" 
                  placeholder={defaultUnitForRow}
                  title={selectedIngredient?.customUnitName ? `Custom unit: ${selectedIngredient.customUnitName}` : ""}
                  value={row.unit ?? ""} 
                  onChange={(e) => updateRow(row.id, { unit: e.target.value || defaultUnitForRow })} 
                />
                <button className="px-3 py-1 border rounded" onClick={() => setRows((s) => s.filter((r) => r.id !== row.id))}>Remove</button>
              </div>
              {prefillName && (
                <div className="mt-2 text-xs">
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => handleSaveAndCreateIngredient(prefillName)}
                  >
                    Create new ingredient →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-4">
        <button className="px-4 py-2 bg-slate-100 rounded" onClick={addRow}>Add ingredient</button>
      </div>

      <div className="mb-4">
        <h4 className="font-medium mb-2">Totals</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {nutrients.map((n) => (
            <div key={n.id} className="flex justify-between border rounded p-2">
              <div>{n.displayName}</div>
              <div>{Math.round((totals[n.id] || 0) * 100) / 100} {n.unit}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleSave}>Save Recipe</button>
      </div>
    </div>
  );
}
