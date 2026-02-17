"use client";

import { useEffect, useMemo, useState } from "react";
import { convertToGrams, getIngredientDensity } from "../../lib/unitConversion";

type Nutrient = { id: number; name: string; displayName: string; unit: string };
type Ingredient = { 
  id: number; 
  name: string; 
  defaultUnit: string; 
  customUnitName?: string | null;
  customUnitAmount?: number | null;
  customUnitGrams?: number | null;
  nutrientValues: { id: number; value: number; nutrient: Nutrient }[] 
};

type Row = { id: string; ingredientId?: number; quantity?: number; unit?: string; notes?: string };

type InitialRecipe = {
  id?: number;
  name: string;
  servingSize: number;
  servingUnit: string;
  instructions?: string;
  tags?: string | string[];
  ingredients: Array<{
    id: string;
    ingredientId?: number | null;
    quantity?: number;
    unit?: string;
    notes?: string | null;
  }>;
  sourceApp?: string | null;
  isComplete?: boolean;
};

export default function RecipeBuilder({
  initialRecipe,
  onSaved,
}: {
  initialRecipe?: InitialRecipe;
  onSaved?: () => void;
}) {
  const [name, setName] = useState("");
  const [servings, setServings] = useState(1);
  const [servingUnit, setServingUnit] = useState("servings");
  const [instructions, setInstructions] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [nutrients, setNutrients] = useState<Nutrient[]>([]);
  const [rows, setRows] = useState<Row[]>([{ id: "r1" }]);
  const [tags, setTags] = useState<string[]>([]);
  const [searchText, setSearchText] = useState<Record<string, string>>({});
  const [showDropdown, setShowDropdown] = useState<Record<string, boolean>>({});

  const availableTags = ["breakfast", "lunch", "dinner", "snack", "dessert", "beverage"];

  useEffect(() => {
    fetch("/api/ingredients")
      .then((r) => r.json())
      .then((d) => setIngredients(Array.isArray(d) ? d : []))
      .catch((e) => {
        console.error(e);
        setIngredients([]);
      });
    fetch("/api/nutrients")
      .then((r) => r.json())
      .then((d) => setNutrients(Array.isArray(d) ? d : []))
      .catch((e) => {
        console.error(e);
        setNutrients([]);
      });
  }, []);

  useEffect(() => {
    if (!initialRecipe) return;

    setName(initialRecipe.name || "");
    setServings(Number(initialRecipe.servingSize) || 1);
    setServingUnit(initialRecipe.servingUnit || "servings");
    setInstructions(initialRecipe.instructions || "");

    const nextTags = Array.isArray(initialRecipe.tags)
      ? initialRecipe.tags
      : typeof initialRecipe.tags === "string"
        ? initialRecipe.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];
    setTags(nextTags);

    const nextRows = (initialRecipe.ingredients || []).map((item) => ({
      id: item.id,
      ingredientId: item.ingredientId ?? undefined,
      quantity: item.quantity ?? undefined,
      unit: item.unit ?? undefined,
      notes: item.notes ?? undefined,
    }));

    setRows(nextRows.length > 0 ? nextRows : [{ id: "r1" }]);
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

  const rowConversionGrams = useMemo(() => {
    const gramsByRow: Record<string, number | null> = {};
    for (const row of rows) {
      if (!row.ingredientId || !row.quantity || !row.unit) {
        gramsByRow[row.id] = null;
        continue;
      }
      const ingredient = ingredients.find((i) => i.id === row.ingredientId);
      if (!ingredient) {
        gramsByRow[row.id] = null;
        continue;
      }
      const density = getIngredientDensity(ingredient.name);
      gramsByRow[row.id] = convertToGrams(row.quantity, row.unit, density, ingredient);
    }
    return gramsByRow;
  }, [ingredients, rows]);

  async function handleSave() {
    if (!name.trim()) {
      alert("Recipe name is required");
      return;
    }
    
    // Filter only rows with ingredientId
    const validRows = rows.filter((r) => r.ingredientId && r.quantity && r.unit);
    if (validRows.length === 0) {
      alert("Add at least one ingredient with quantity and unit");
      return;
    }

    const payload = {
      name,
      servingSize: servings,
      servingUnit,
      instructions,
      tags: tags.join(","), // Store as comma-separated string
      ingredients: validRows.map((r) => ({
        ingredientId: r.ingredientId,
        quantity: r.quantity,
        unit: r.unit,
        notes: r.notes,
        conversionGrams: rowConversionGrams[r.id] ?? null,
      })),
    };
    try {
      const isEdit = Boolean(initialRecipe?.id);
      const url = isEdit ? `/api/recipes/${initialRecipe?.id}` : "/api/recipes";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) {
        alert(isEdit ? "Recipe updated" : "Recipe saved");
        if (!isEdit) {
          setName("");
          setTags([]);
          setRows([{ id: "r1" }]);
          setInstructions("");
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

  const totals = computeTotals();

  return (
    <div className="p-4 border rounded bg-white">
      <h3 className="text-lg font-medium mb-3">{initialRecipe?.id ? "Edit Recipe" : "Create Recipe"}</h3>

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

      <div className="mb-4 p-3 bg-slate-50 rounded border">
        <label className="block text-sm font-medium mb-2">Tags</label>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <label key={tag} className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={tags.includes(tag)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setTags([...tags, tag]);
                  } else {
                    setTags(tags.filter((t) => t !== tag));
                  }
                }}
                className="cursor-pointer"
              />
              <span className="text-sm capitalize">{tag}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Instructions</label>
        <textarea
          className="w-full border rounded p-2 min-h-[120px]"
          placeholder="Add recipe instructions..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>

      <div className="space-y-2 mb-4">
        {rows.map((row) => {
          const selectedIngredient = row.ingredientId ? ingredients.find((i) => i.id === row.ingredientId) : undefined;
          const defaultUnitForRow = selectedIngredient?.customUnitName || selectedIngredient?.defaultUnit || "g";
          const currentSearch = searchText[row.id] || "";
          const filteredIngredients = currentSearch
            ? ingredients.filter((i) => i.name.toLowerCase().includes(currentSearch.toLowerCase()))
            : ingredients;
          
          return (
            <div key={row.id} className="flex gap-2 items-start">
              <div className="flex-1 relative">
                <input
                  type="text"
                  className="w-full border rounded p-2"
                  placeholder="Type to search ingredients..."
                  value={selectedIngredient ? selectedIngredient.name : currentSearch}
                  onChange={(e) => {
                    setSearchText({ ...searchText, [row.id]: e.target.value });
                    setShowDropdown({ ...showDropdown, [row.id]: true });
                    if (!e.target.value && row.ingredientId) {
                      updateRow(row.id, { ingredientId: undefined });
                    }
                  }}
                  onFocus={() => setShowDropdown({ ...showDropdown, [row.id]: true })}
                />
                {showDropdown[row.id] && filteredIngredients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-auto">
                    {filteredIngredients.map((i) => (
                      <div
                        key={i.id}
                        className="p-2 hover:bg-slate-100 cursor-pointer"
                        onClick={() => {
                          const defaultUnit = i.customUnitName || i.defaultUnit || "g";
                          updateRow(row.id, { ingredientId: i.id, unit: defaultUnit });
                          setSearchText({ ...searchText, [row.id]: "" });
                          setShowDropdown({ ...showDropdown, [row.id]: false });
                        }}
                      >
                        {i.name}
                        {i.customUnitName ? ` (${i.customUnitName})` : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <input 
                className="w-24 border rounded p-2" 
                type="number" 
                placeholder="qty" 
                value={row.quantity ?? ""} 
                onChange={(e) => updateRow(row.id, { quantity: Number(e.target.value) || undefined })} 
              />
              <input 
                className="w-24 border rounded p-2" 
                placeholder={defaultUnitForRow}
                title={selectedIngredient?.customUnitName ? `Custom unit: ${selectedIngredient.customUnitName}` : ""}
                value={row.unit ?? ""} 
                onChange={(e) => updateRow(row.id, { unit: e.target.value || defaultUnitForRow })} 
              />
              <button className="px-3 py-2 border rounded" onClick={() => setRows((s) => s.filter((r) => r.id !== row.id))}>Remove</button>
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
