"use client";

import { useEffect, useMemo, useState } from "react";
import { convertToGrams, getIngredientDensity } from "../../lib/unitConversion";
import CreateIngredientModal from "./CreateIngredientModal";

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
  prepTime?: number | null;
  cookTime?: number | null;
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
  onCancel,
}: {
  initialRecipe?: InitialRecipe;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState("");
  const [servings, setServings] = useState(1);
  const [servingUnit, setServingUnit] = useState("servings");
  const [instructions, setInstructions] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [nutrients, setNutrients] = useState<Nutrient[]>([]);
  const [rows, setRows] = useState<Row[]>([{ id: "r1" }]);
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [searchText, setSearchText] = useState<Record<string, string>>({});
  const [showDropdown, setShowDropdown] = useState<Record<string, boolean>>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [quantityText, setQuantityText] = useState<Record<string, string>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newIngredientId, setNewIngredientId] = useState<number | null>(null);

  const availableTags = ["breakfast", "lunch", "dinner", "snack", "side", "dessert", "beverage"];

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
    setPrepTime(initialRecipe.prepTime != null ? String(initialRecipe.prepTime) : "");
    setCookTime(initialRecipe.cookTime != null ? String(initialRecipe.cookTime) : "");

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

    // Initialize quantity text values
    const nextQuantityText: Record<string, string> = {};
    nextRows.forEach((item) => {
      if (item.quantity !== undefined) {
        nextQuantityText[item.id] = String(item.quantity);
      }
    });
    setQuantityText(nextQuantityText);
  }, [initialRecipe]);

  function addRow() {
    setRows((s) => [...s, { id: `r${Date.now()}` }]);
  }

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((s) => s.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function createIngredient(name: string, rowId: string) {
    try {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, defaultUnit: "g" }),
      });

      if (!res.ok) throw new Error("Failed to create ingredient");

      const newIngredient = await res.json();

      // Add to ingredients list
      setIngredients((prev) => [...prev, newIngredient]);

      // Select it in the current row
      updateRow(rowId, { ingredientId: newIngredient.id, unit: newIngredient.defaultUnit || "g" });
      setSearchText({ ...searchText, [rowId]: "" });
      setShowDropdown({ ...showDropdown, [rowId]: false });

      // Show modal to add nutrition
      setNewIngredientId(newIngredient.id);
      setShowCreateModal(true);

      return newIngredient;
    } catch (error) {
      console.error(error);
      alert("Failed to create ingredient");
    }
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const draggedIndex = rows.findIndex((r) => r.id === draggedId);
    const targetIndex = rows.findIndex((r) => r.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    setRows((s) => {
      const newRows = [...s];
      const draggedRow = newRows[draggedIndex];
      newRows.splice(draggedIndex, 1);
      newRows.splice(targetIndex, 0, draggedRow);
      return newRows;
    });

    setDraggedId(null);
  }

  function handleDragEnd() {
    setDraggedId(null);
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
    // Divide by serving size to get per-serving nutrition
    const servingSize = servings || 1;
    for (const nid in totals) {
      totals[nid] = totals[nid] / servingSize;
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

    setSaving(true);
    const payload = {
      name,
      servingSize: servings,
      servingUnit,
      instructions,
      tags: tags.join(","),
      prepTime: prepTime !== "" ? Number(prepTime) : null,
      cookTime: cookTime !== "" ? Number(cookTime) : null,
      isComplete: initialRecipe?.isComplete ?? true,
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
    } finally {
      setSaving(false);
    }
  }

  const totals = computeTotals();

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block font-sans text-[12px] font-medium mb-1">Recipe Name</label>
          <input
            className="w-full border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] focus:outline-none focus:border-[var(--fg)]"
            placeholder="Recipe name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-sans text-[12px] font-medium mb-1">Servings</label>
            <input
              className="w-full border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] focus:outline-none focus:border-[var(--fg)]"
              type="text"
              inputMode="decimal"
              value={servings === 0 ? "" : servings}
              onChange={(e) => {
                const val = e.target.value.trim();
                if (val === "") {
                  setServings(0);
                } else {
                  const numVal = parseFloat(val);
                  if (!isNaN(numVal)) {
                    setServings(numVal);
                  }
                }
              }}
            />
          </div>
          <div>
            <label className="block font-sans text-[12px] font-medium mb-1">Unit</label>
            <select
              className="w-full border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] focus:outline-none focus:border-[var(--fg)]"
              value={servingUnit}
              onChange={(e) => setServingUnit(e.target.value)}
            >
              <option value="servings">servings</option>
              <option value="g">g</option>
              <option value="ml">ml</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="block font-mono text-[9px] font-light uppercase tracking-[0.12em] text-[var(--muted)] mb-3">Tags</label>
        <div className="flex flex-wrap gap-3">
          {availableTags.map((tag) => (
            <label key={tag} className="flex items-center gap-1.5 cursor-pointer">
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
              <span className="text-[12px] capitalize">{tag}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-mono text-[9px] font-light uppercase tracking-[0.12em] text-[var(--muted)] mb-3">Time</label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block font-sans text-[12px] font-medium mb-1">Prep (min)</label>
            <input
              type="number"
              min={0}
              step={1}
              className="w-full border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] focus:outline-none focus:border-[var(--fg)]"
              placeholder="--"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-sans text-[12px] font-medium mb-1">Cook (min)</label>
            <input
              type="number"
              min={0}
              step={1}
              className="w-full border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] focus:outline-none focus:border-[var(--fg)]"
              placeholder="--"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-sans text-[12px] font-medium mb-1">Total (min)</label>
            <div className="w-full border-0 border-b border-dashed border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] text-[var(--muted)]">
              {(prepTime !== "" || cookTime !== "")
                ? (Number(prepTime) || 0) + (Number(cookTime) || 0)
                : "--"}
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block font-sans text-[12px] font-medium mb-1">Instructions</label>
        <textarea
          className="w-full border border-[var(--rule)] bg-transparent px-3 py-2 text-[12px] focus:outline-none focus:border-[var(--fg)] min-h-[120px]"
          placeholder="Add recipe instructions..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>

      <div>
        <label className="block font-mono text-[9px] font-light uppercase tracking-[0.12em] text-[var(--muted)] mb-3">Ingredients</label>
        <div className="space-y-0">
          {rows.map((row, index) => {
            const selectedIngredient = row.ingredientId ? ingredients.find((i) => i.id === row.ingredientId) : undefined;
            const defaultUnitForRow = selectedIngredient?.customUnitName || selectedIngredient?.defaultUnit || "g";
            const currentSearch = searchText[row.id] || "";
            const filteredIngredients = currentSearch
              ? ingredients.filter((i) => i.name.toLowerCase().includes(currentSearch.toLowerCase()))
              : ingredients;

            return (
              <div
                key={row.id}
                draggable
                onDragStart={(e) => handleDragStart(e, row.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, row.id)}
                onDragEnd={handleDragEnd}
                className={`flex gap-2 items-start py-2 border-b border-[var(--rule)] transition ${
                  draggedId === row.id
                    ? "opacity-50"
                    : draggedId
                      ? "border-dashed"
                      : ""
                }`}
              >
                <div
                  className="flex-shrink-0 px-1 py-[6px] cursor-grab active:cursor-grabbing text-[var(--muted)] hover:text-[var(--fg)] transition"
                  title="Drag to reorder ingredients"
                  style={{ userSelect: "none" }}
                >
                  ⋮⋮
                </div>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    className="w-full border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] focus:outline-none focus:border-[var(--fg)]"
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
                    onBlur={() => {
                      // Close dropdown after a small delay to allow click on dropdown items
                      setTimeout(() => {
                        setShowDropdown({ ...showDropdown, [row.id]: false });
                      }, 150);
                    }}
                  />
                  {showDropdown[row.id] && currentSearch && (
                    <div className="absolute z-10 w-full mt-1 border border-[var(--rule)] bg-[var(--bg)] max-h-48 overflow-auto">
                      {/* Show "Create new" option if search doesn't exactly match any ingredient */}
                      {currentSearch && !ingredients.some((i) => i.name.toLowerCase() === currentSearch.toLowerCase()) && (
                        <div
                          className="px-3 py-2 hover:bg-[var(--rule)] cursor-pointer text-[12px] border-b border-[var(--rule)] text-[var(--fg)] font-medium"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            createIngredient(currentSearch, row.id);
                          }}
                        >
                          + Create new ingredient: &ldquo;{currentSearch}&rdquo;
                        </div>
                      )}

                      {/* Show matching ingredients */}
                      {filteredIngredients.map((i) => (
                        <div
                          key={i.id}
                          className="px-3 py-2 hover:bg-[var(--rule)] cursor-pointer text-[12px]"
                          onMouseDown={(e) => {
                            // Use onMouseDown to prevent input blur from closing dropdown before click registers
                            e.preventDefault();
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

                      {/* Show "no results" if no matches and we're not showing create option */}
                      {filteredIngredients.length === 0 && ingredients.some((i) => i.name.toLowerCase() === currentSearch.toLowerCase()) && (
                        <div className="px-3 py-2 text-[12px] text-[var(--muted)]">
                          No matching ingredients
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <input
                  className="w-24 border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] focus:outline-none focus:border-[var(--fg)]"
                  type="text"
                  inputMode="decimal"
                  placeholder="qty"
                  value={quantityText[row.id] ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuantityText({ ...quantityText, [row.id]: val });

                    if (val === "") {
                      updateRow(row.id, { quantity: undefined });
                    } else {
                      const numVal = parseFloat(val);
                      if (!isNaN(numVal) && numVal >= 0) {
                        updateRow(row.id, { quantity: numVal });
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // Clean up the text on blur
                    const val = e.target.value;
                    if (val !== "") {
                      const numVal = parseFloat(val);
                      if (!isNaN(numVal) && numVal >= 0) {
                        setQuantityText({ ...quantityText, [row.id]: String(numVal) });
                      } else {
                        setQuantityText({ ...quantityText, [row.id]: "" });
                        updateRow(row.id, { quantity: undefined });
                      }
                    }
                  }}
                  draggable={false}
                />
                <select
                  className="w-32 border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] focus:outline-none focus:border-[var(--fg)]"
                  value={row.unit ?? defaultUnitForRow}
                  onChange={(e) => updateRow(row.id, { unit: e.target.value })}
                  draggable={false}
                >
                  <optgroup label="Weight">
                    <option value="g">g (grams)</option>
                    <option value="oz">oz (ounces)</option>
                    <option value="lb">lb (pounds)</option>
                    <option value="kg">kg (kilograms)</option>
                  </optgroup>
                  <optgroup label="Volume">
                    <option value="ml">ml (milliliters)</option>
                    <option value="l">l (liters)</option>
                    <option value="tsp">tsp (teaspoon)</option>
                    <option value="tbsp">tbsp (tablespoon)</option>
                    <option value="cup">cup</option>
                    <option value="fl-oz">fl oz (fluid ounce)</option>
                  </optgroup>
                  {selectedIngredient?.customUnitName && (
                    <optgroup label="Custom">
                      <option value={selectedIngredient.customUnitName}>
                        {selectedIngredient.customUnitName}
                      </option>
                    </optgroup>
                  )}
                </select>
                <button
                  className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--fg)] py-[6px]"
                  onClick={() => setRows((s) => s.filter((r) => r.id !== row.id))}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <button
          className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--fg)]"
          onClick={addRow}
        >
          + Add ingredient
        </button>
      </div>

      <div className="border-t border-[var(--rule)] pt-5">
        <h4 className="font-mono text-[9px] font-light uppercase tracking-[0.12em] text-[var(--muted)] mb-3">Nutrient Totals per Serving</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
          {nutrients.map((n) => (
            <div key={n.id} className="flex justify-between py-[5px] border-b border-[var(--rule)] text-[12px]">
              <div>{n.displayName}</div>
              <div className="font-mono text-[var(--muted)]">{Math.round((totals[n.id] || 0) * 100) / 100} {n.unit}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          className="bg-[var(--fg)] text-[var(--bg)] px-5 py-[7px] text-[9px] font-mono uppercase tracking-[0.12em] hover:opacity-80 disabled:opacity-50"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--fg)] px-5 py-[7px] disabled:opacity-50"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>

      {showCreateModal && newIngredientId && (
        <CreateIngredientModal
          ingredientName={ingredients.find((i) => i.id === newIngredientId)?.name || "New ingredient"}
          ingredientId={newIngredientId}
          onClose={() => {
            setShowCreateModal(false);
            setNewIngredientId(null);
          }}
          onNutritionAdded={() => {
            // Refresh ingredients list
            fetch("/api/ingredients")
              .then((r) => r.json())
              .then((d) => setIngredients(Array.isArray(d) ? d : []))
              .catch((e) => console.error(e));
          }}
        />
      )}
    </div>
  );
}
