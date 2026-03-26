"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { convertToGrams, getIngredientDensity } from "../../lib/unitConversion";
import CreateIngredientModal from "./CreateIngredientModal";
import { toast } from "@/lib/toast";

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

type Row = { id: string; ingredientId?: number; quantity?: number; unit?: string; notes?: string; nameGuess?: string };

type InitialRecipe = {
  id?: number;
  name: string;
  servingSize: number;
  servingUnit: string;
  instructions?: string;
  tags?: string | string[];
  prepTime?: number | null;
  cookTime?: number | null;
  image?: string | null;
  ingredients: Array<{
    id: string;
    ingredientId?: number | null;
    quantity?: number;
    unit?: string;
    notes?: string | null;
    nameGuess?: string;
  }>;
  sourceApp?: string | null;
  isComplete?: boolean;
};

export type RecipeBuilderHandle = { save: () => void };


type Person = { id: number; name: string };
type Goal = { nutrientId: number; lowGoal: number | null; highGoal: number | null; nutrient: { displayName: string; unit: string } };

const RecipeBuilder = forwardRef<RecipeBuilderHandle, {
  initialRecipe?: InitialRecipe;
  onSaved?: () => void;
  onCancel?: () => void;
  hideFooterButtons?: boolean;
}>(function RecipeBuilder({
  initialRecipe,
  onSaved,
  onCancel,
  hideFooterButtons,
}, ref) {
  const [name, setName] = useState("");
  const [servings, setServings] = useState(1);
  const [servingUnit, setServingUnit] = useState("servings");
  const [instructions, setInstructions] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [nutrients, setNutrients] = useState<Nutrient[]>([]);
  const [rows, setRows] = useState<Row[]>([{ id: "r1" }]);
  const [image, setImage] = useState("");
  const imageFileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [guidedMode, setGuidedMode] = useState(false);
  const [guidedPersonId, setGuidedPersonId] = useState<number | null>(null);
  const [guidedFocus, setGuidedFocus] = useState<number[]>([]);
  const [focusCaps, setFocusCaps] = useState<Record<number, string>>({});
  const [persons, setPersons] = useState<Person[]>([]);
  const [personGoals, setPersonGoals] = useState<Goal[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [searchText, setSearchText] = useState<Record<string, string>>({});
  const [showDropdown, setShowDropdown] = useState<Record<string, boolean>>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [quantityText, setQuantityText] = useState<Record<string, string>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newIngredientId, setNewIngredientId] = useState<number | null>(null);
  const [sourceRowId, setSourceRowId] = useState<string | null>(null);

  const availableTags = ["breakfast", "lunch", "dinner", "snack", "side", "dessert", "beverage"];

  useEffect(() => {
    fetch("/api/ingredients")
      .then((r) => r.json())
      .then((d) => setIngredients(Array.isArray(d) ? d : []))
      .catch((e) => { console.error(e); setIngredients([]); });
    fetch("/api/nutrients")
      .then((r) => r.json())
      .then((d) => setNutrients(Array.isArray(d) ? d : []))
      .catch((e) => { console.error(e); setNutrients([]); });
    fetch("/api/persons")
      .then((r) => r.json())
      .then((d) => setPersons(Array.isArray(d?.persons) ? d.persons : Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!guidedPersonId) { setPersonGoals([]); setGuidedFocus([]); setFocusCaps({}); return; }
    fetch(`/api/persons/${guidedPersonId}/goals`)
      .then((r) => r.json())
      .then((d) => setPersonGoals(Array.isArray(d) ? d : []))
      .catch(() => setPersonGoals([]));
  }, [guidedPersonId]);

  useEffect(() => {
    if (!initialRecipe) return;

    setName(initialRecipe.name || "");
    setServings(Number(initialRecipe.servingSize) || 1);
    setServingUnit(initialRecipe.servingUnit || "servings");
    setInstructions(initialRecipe.instructions || "");
    setPrepTime(initialRecipe.prepTime != null ? String(initialRecipe.prepTime) : "");
    setCookTime(initialRecipe.cookTime != null ? String(initialRecipe.cookTime) : "");
    setImage(initialRecipe.image ?? "");

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
      nameGuess: item.nameGuess ?? undefined,
    }));

    setRows(nextRows.length > 0 ? nextRows : [{ id: "r1" }]);

    // Initialize quantity text values
    const nextQuantityText: Record<string, string> = {};
    nextRows.forEach((item) => {
      if (item.quantity !== undefined) {
        nextQuantityText[item.id] = String(parseFloat((item.quantity).toFixed(2)));
      }
    });
    setQuantityText(nextQuantityText);

    // Pre-fill search text for unmatched imported rows — clean footnote markers and leading qty/unit
    const cleanGuess = (s: string) => s
      .replace(/\(\([^)]*\)\)/g, "")
      .replace(/\([^)]*note[^)]*\)/gi, "")
      .replace(/\([^)]*\*[^)]*\)/g, "")
      // Strip leading quantity + unit, e.g. "1/4 cup ", "2 tbsp ", "1.5 oz "
      .replace(/^\d+(?:\/\d+)?(?:\.\d+)?\s+(?:cups?|tbsp?|tsp?|oz|ml|g|kg|lb|lbs|fl\.?\s*oz|pints?|quarts?|gallons?|pieces?|slices?|cans?|cloves?|stalks?|sprigs?|pinch|dash|handful)\s+/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    const nextSearchText: Record<string, string> = {};
    nextRows.forEach((item) => {
      if (item.nameGuess) {
        nextSearchText[item.id] = cleanGuess(item.nameGuess) || item.nameGuess;
      }
    });
    setSearchText(nextSearchText);
  }, [initialRecipe]);

  function addRow() {
    setRows((s) => [...s, { id: `r${Date.now()}` }]);
  }

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((s) => s.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function createIngredient(name: string, rowId: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    // Check if ingredient already exists locally — if so, just open the modal
    const existing = ingredients.find((i) => i.name.toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
      updateRow(rowId, { ingredientId: existing.id, unit: existing.defaultUnit || "g" });
      setSearchText({ ...searchText, [rowId]: "" });
      setShowDropdown({ ...showDropdown, [rowId]: false });
      setNewIngredientId(existing.id);
      setSourceRowId(rowId);
      setShowCreateModal(true);
      return existing;
    }

    try {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, defaultUnit: "g" }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to create ingredient");

      setIngredients((prev) => [...prev, resData]);
      updateRow(rowId, { ingredientId: resData.id, unit: resData.defaultUnit || "g" });
      setSearchText({ ...searchText, [rowId]: "" });
      setShowDropdown({ ...showDropdown, [rowId]: false });
      setNewIngredientId(resData.id);
      setSourceRowId(rowId);
      setShowCreateModal(true);

      return resData;
    } catch (error) {
      console.error("createIngredient error:", error);
      toast.error(`Could not add ingredient: ${error instanceof Error ? error.message : "Unknown error"}`);
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

  function computeContributors(nutrientId: number): Array<{ name: string; value: number; pct: number }> {
    const results: Array<{ name: string; value: number; pct: number }> = [];
    for (const row of rows) {
      if (!row.ingredientId) continue;
      const ingredient = ingredients.find((i) => i.id === row.ingredientId);
      if (!ingredient) continue;
      const density = getIngredientDensity(ingredient.name);
      const grams = convertToGrams(row.quantity || 0, row.unit || ingredient.defaultUnit || "g", density, ingredient);
      const iv = ingredient.nutrientValues.find((v) => v.nutrient.id === nutrientId);
      if (!iv || !iv.value) continue;
      const contrib = (iv.value * grams) / 100.0 / (servings || 1);
      if (contrib > 0.001) results.push({ name: ingredient.name, value: contrib, pct: 0 });
    }
    const total = results.reduce((sum, r) => sum + r.value, 0);
    return results
      .map((r) => ({ ...r, pct: total > 0 ? Math.round((r.value / total) * 100) : 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
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
      toast.error("Recipe name is required");
      return;
    }

    // Filter only rows with ingredientId
    const validRows = rows.filter((r) => r.ingredientId && r.quantity && r.unit);
    if (validRows.length === 0) {
      toast.error("Add at least one ingredient with quantity and unit");
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
      image: image.trim() || null,
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
        toast.success(isEdit ? "Recipe updated" : "Recipe saved");
        if (!isEdit) {
          setName("");
          setTags([]);
          setRows([{ id: "r1" }]);
          setInstructions("");
        }
        onSaved?.();
      } else {
        toast.error(`Failed to save recipe: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  useImperativeHandle(ref, () => ({ save: handleSave }));

  const totals = computeTotals();

  return (
    <>
    <div className={guidedMode ? "flex gap-8 items-start" : ""}>
    <div className={`space-y-6 ${guidedMode ? "flex-1 min-w-0" : ""}`}>

      {/* Guided mode toggle */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
          <input
            type="checkbox"
            checked={guidedMode}
            onChange={(e) => { setGuidedMode(e.target.checked); if (!e.target.checked) { setGuidedPersonId(null); setGuidedFocus([]); setFocusCaps({}); } }}
            className="cursor-pointer"
          />
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">Nutrition guidance</span>
        </label>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-1">Recipe Name</label>
          <input
            className="w-full border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] rounded-none focus:outline-none focus:border-[var(--fg)]"
            placeholder="Recipe name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-2">Image</label>
          <input
            ref={imageFileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Upload image file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => setImage(ev.target?.result as string);
              reader.readAsDataURL(file);
            }}
          />
          {!image ? (
            <div className="flex items-center gap-3">
              <input
                type="url"
                className="flex-1 border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] rounded-none focus:outline-none focus:border-[var(--fg)] placeholder:text-[var(--placeholder)]"
                placeholder="Paste image URL…"
                onChange={(e) => setImage(e.target.value)}
              />
              <span className="font-mono text-[9px] text-[var(--muted)] shrink-0">or</span>
              <button
                type="button"
                onClick={() => imageFileRef.current?.click()}
                className="font-mono text-[9px] uppercase tracking-[0.1em] px-3 py-[5px] border border-[var(--rule)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--rule-strong)] transition-colors shrink-0"
              >
                Upload file
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 overflow-hidden border border-[var(--rule)] shrink-0">
                <img src={image} alt="Recipe preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] text-[var(--muted)] truncate mb-1">
                  {image.startsWith("data:") ? "Uploaded image" : image}
                </div>
                <button
                  type="button"
                  onClick={() => { setImage(""); if (imageFileRef.current) imageFileRef.current.value = ""; }}
                  className="font-mono text-[9px] uppercase tracking-[0.1em] px-2 py-[3px] border border-[var(--rule)] text-[var(--muted)] hover:text-[var(--error)] hover:border-[var(--error-border)] transition-colors"
                  aria-label="Remove image"
                >
                  Remove image
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-1">Servings</label>
            <input
              className="w-full border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] rounded-none focus:outline-none focus:border-[var(--fg)]"
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
            <label className="block font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-1">Unit</label>
            <select
              className="w-full border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] rounded-none focus:outline-none focus:border-[var(--fg)]"
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
        <label className="block font-mono text-[9px] font-light uppercase tracking-[0.1em] text-[var(--muted)] mb-3">Tags</label>
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
        <label className="block font-mono text-[9px] font-light uppercase tracking-[0.1em] text-[var(--muted)] mb-3">Time</label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-1">Prep (min)</label>
            <input
              type="number"
              min={0}
              step={1}
              className="w-full border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] rounded-none focus:outline-none focus:border-[var(--fg)]"
              placeholder="--"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-1">Cook (min)</label>
            <input
              type="number"
              min={0}
              step={1}
              className="w-full border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] rounded-none focus:outline-none focus:border-[var(--fg)]"
              placeholder="--"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-1">Total (min)</label>
            <div className="w-full border-0 border-b border-dashed border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] text-[var(--muted)]">
              {(prepTime !== "" || cookTime !== "")
                ? (Number(prepTime) || 0) + (Number(cookTime) || 0)
                : "--"}
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-1">Instructions</label>
        <textarea
          className="w-full border border-[var(--rule)] rounded-[var(--radius-sm,4px)] bg-transparent px-3 py-2 text-[12px] focus:outline-none focus:border-[var(--fg)] min-h-[120px]"
          placeholder="Add recipe instructions..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>

      <div>
        <label className="block font-mono text-[9px] font-light uppercase tracking-[0.1em] text-[var(--muted)] mb-3">Ingredients</label>
        <div className="space-y-0">
          {rows.map((row, index) => {
            const selectedIngredient = row.ingredientId ? ingredients.find((i) => i.id === row.ingredientId) : undefined;
            const defaultUnitForRow = selectedIngredient?.customUnitName || selectedIngredient?.defaultUnit || "g";
            const rawSearch = searchText[row.id] || "";
            const currentSearch = rawSearch
              .replace(/\(\([^)]*\)\)/g, "")
              .replace(/\([^)]*note[^)]*\)/gi, "")
              .replace(/\([^)]*\*[^)]*\)/g, "")
              .replace(/\s{2,}/g, " ")
              .trim() || rawSearch;
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
                    className={`w-full border-0 border-b bg-transparent px-0 py-[6px] text-[12px] rounded-none focus:outline-none focus:border-[var(--fg)] ${!selectedIngredient && row.nameGuess && !currentSearch ? 'border-[var(--warning)] text-[var(--warning)]' : 'border-[var(--rule)]'}`}
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
                  {/* Unmatched import warning */}
                  {!selectedIngredient && row.nameGuess && (
                    <div className="flex items-center gap-1 mt-[3px]">
                      <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--warning)]">Not in library —</span>
                      <button
                        type="button"
                        onClick={() => {
                          createIngredient(currentSearch || row.nameGuess!, row.id);
                        }}
                        className="font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--accent)] underline bg-transparent border-0 p-0 cursor-pointer"
                      >
                        Add to library
                      </button>
                    </div>
                  )}
                </div>

                <input
                  className="w-24 border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] rounded-none focus:outline-none focus:border-[var(--fg)]"
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
                  className="w-32 border-0 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[12px] rounded-none focus:outline-none focus:border-[var(--fg)]"
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
                  className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--fg)] py-[6px]"
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
          className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--fg)]"
          onClick={addRow}
        >
          + Add ingredient
        </button>
      </div>

      <div className="border-t border-[var(--rule)] pt-5">
        <h4 className="font-mono text-[9px] font-light uppercase tracking-[0.1em] text-[var(--muted)] mb-3">Nutrient Totals per Serving</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
          {nutrients.map((n) => (
            <div key={n.id} className="flex justify-between py-[5px] border-b border-[var(--rule)] text-[12px]">
              <div>{n.displayName}</div>
              <div className="font-mono text-[var(--muted)]">{Math.round((totals[n.id] || 0) * 100) / 100} {n.unit}</div>
            </div>
          ))}
        </div>
      </div>

      {!hideFooterButtons && (
        <div className="flex gap-3 pt-4">
          <button
            className="bg-[var(--accent)] text-[var(--accent-text)] px-5 py-[7px] text-[9px] font-mono uppercase tracking-[0.1em] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (initialRecipe ? "Saving..." : "Creating...") : (initialRecipe ? "Save" : "Create")}
          </button>
          <button
            className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--fg)] px-5 py-[7px] disabled:opacity-50"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      )}

    </div>

    {/* ── Goals Panel (guided mode only) ── */}
    {guidedMode && (
      <div className="w-80 shrink-0 sticky top-4 border border-[var(--rule)] rounded-[var(--radius-md,8px)] bg-[var(--bg-raised)] p-5 space-y-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">Nutrition Guidance</div>

        {/* Person picker */}
        {persons.length > 0 && (
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-2">For</div>
            <div className="flex flex-wrap gap-[6px]">
              {persons.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setGuidedPersonId(p.id === guidedPersonId ? null : p.id)}
                  className={`font-mono text-[9px] uppercase tracking-[0.1em] py-[4px] px-[8px] border transition-colors cursor-pointer ${
                    guidedPersonId === p.id
                      ? "bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)]"
                      : "text-[var(--muted)] border-[var(--rule)] hover:text-[var(--fg)]"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Focus nutrients */}
        {guidedPersonId && personGoals.length > 0 && (
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-2">Focus</div>
            <div className="flex flex-wrap gap-[6px]">
              {personGoals
                .filter((g) => (g.highGoal ?? g.lowGoal ?? 0) > 0)
                .map((g) => (
                <button
                  key={g.nutrientId}
                  onClick={() => {
                    setGuidedFocus((prev) => prev.includes(g.nutrientId) ? prev.filter((x) => x !== g.nutrientId) : [...prev, g.nutrientId]);
                    if (guidedFocus.includes(g.nutrientId)) {
                      setFocusCaps((prev) => { const next = { ...prev }; delete next[g.nutrientId]; return next; });
                    }
                  }}
                  className={`font-mono text-[9px] uppercase tracking-[0.1em] py-[4px] px-[8px] border transition-colors cursor-pointer ${
                    guidedFocus.includes(g.nutrientId)
                      ? "bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)]"
                      : "text-[var(--muted)] border-[var(--rule)] hover:text-[var(--fg)]"
                  }`}
                >
                  {g.nutrient.displayName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nutrition bars */}
        {guidedPersonId && personGoals.length > 0 && (
          <div className="border-t border-[var(--rule)] pt-3 space-y-0">
            {personGoals
              .filter((g) => (g.highGoal ?? g.lowGoal ?? 0) > 0)
              .map((g) => {
                const baseGoal = g.highGoal ?? g.lowGoal ?? 0;
                const capVal = focusCaps[g.nutrientId] ? parseFloat(focusCaps[g.nutrientId]) : null;
                const goal = (capVal && capVal > 0) ? capVal : baseGoal;
                const current = totals[g.nutrientId] ?? 0;
                const pct = goal > 0 ? Math.min(Math.round((current / goal) * 100), 100) : 0;
                const isFocused = guidedFocus.length === 0 || guidedFocus.includes(g.nutrientId);
                const isOver = goal > 0 && current > goal * 1.05;
                const isNear = !isOver && goal > 0 && current >= goal * 0.8;
                const barColor = isFocused && guidedFocus.length > 0
                  ? "bg-[var(--accent)]"
                  : "bg-[var(--muted)]";
                const valColor = "text-[var(--muted)]";
                return (
                  <div
                    key={g.nutrientId}
                    className={`py-[6px] border-b border-[var(--rule)] last:border-b-0 transition-opacity ${isFocused ? "opacity-100" : "opacity-40"}`}
                  >
                    <div className="flex justify-between items-baseline mb-[4px]">
                      <span className={`font-mono text-[10px] ${isFocused ? "text-[var(--fg)]" : "text-[var(--muted)]"}`}>
                        {g.nutrient.displayName}
                      </span>
                      <span className={`font-mono text-[10px] tabular-nums ${valColor}`}>
                        {Math.round(current * 10) / 10} / {Math.round(goal)} {g.nutrient.unit}
                      </span>
                    </div>
                    <div className="h-[4px] bg-[var(--bg-subtle)] rounded-[var(--radius-sm,4px)] overflow-hidden">
                      <div
                        className={`h-full rounded-[var(--radius-sm,4px)] ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {isFocused && guidedFocus.includes(g.nutrientId) && (
                      <div className="flex items-center gap-[6px] mt-[5px]">
                        <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--muted)]">Cap</span>
                        <input
                          type="number"
                          min="0"
                          value={focusCaps[g.nutrientId] ?? ""}
                          onChange={(e) => setFocusCaps((prev) => ({ ...prev, [g.nutrientId]: e.target.value }))}
                          placeholder={String(Math.round(baseGoal))}
                          className="w-14 font-mono text-[9px] border border-[var(--rule)] bg-transparent px-[6px] py-[2px] text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
                        />
                        <span className="font-mono text-[8px] text-[var(--muted)]">{g.nutrient.unit}</span>
                        {focusCaps[g.nutrientId] && (
                          <button
                            type="button"
                            onClick={() => setFocusCaps((prev) => { const next = { ...prev }; delete next[g.nutrientId]; return next; })}
                            className="font-mono text-[8px] text-[var(--muted)] hover:text-[var(--fg)] ml-auto"
                          >
                            clear
                          </button>
                        )}
                      </div>
                    )}
                    {isOver && (() => {
                      const contributors = computeContributors(g.nutrientId);
                      if (contributors.length === 0) return null;
                      return (
                        <div className="mt-[8px] pt-[6px] border-t border-[var(--rule)] space-y-[5px]">
                          <div className="font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--error)]">Top contributors</div>
                          {contributors.map((c) => (
                            <div key={c.name} className="flex items-baseline justify-between gap-2">
                              <span className="font-sans text-[10px] text-[var(--fg)]">{c.name}</span>
                              <span className="font-mono text-[9px] text-[var(--muted)] shrink-0 tabular-nums whitespace-nowrap">
                                {c.pct}% · −{parseFloat((c.value / 2).toFixed(1))}{g.nutrient.unit} if halved
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
          </div>
        )}

        {guidedPersonId && personGoals.length === 0 && (
          <p className="font-sans text-[11px] text-[var(--muted)]">No goals set for this person.</p>
        )}
      </div>
    )}
    </div>

    {/* Modal rendered outside all content divs to avoid stacking context issues */}
    {showCreateModal && newIngredientId && (
      <CreateIngredientModal
        ingredientName={ingredients.find((i) => i.id === newIngredientId)?.name || "New ingredient"}
        ingredientId={newIngredientId}
        onClose={() => {
          setShowCreateModal(false);
          setNewIngredientId(null);
          setSourceRowId(null);
        }}
        onNutritionAdded={() => {
          // Capture the source row's nameGuess before state clears
          const sourceNameGuess = rows.find((r) => r.id === sourceRowId)?.nameGuess?.toLowerCase();
          const savedIngredientId = newIngredientId;

          fetch("/api/ingredients")
            .then((r) => r.json())
            .then((d) => {
              const fresh = Array.isArray(d) ? d : [];
              setIngredients(fresh);
              // Auto-link any other unmatched rows that share the same original nameGuess
              if (savedIngredientId && sourceNameGuess) {
                const saved = fresh.find((i) => i.id === savedIngredientId);
                if (saved) {
                  setRows((prev) => prev.map((row) => {
                    if (row.ingredientId || !row.nameGuess) return row;
                    if (row.nameGuess.toLowerCase() === sourceNameGuess) {
                      return { ...row, ingredientId: saved.id, unit: saved.defaultUnit || "g" };
                    }
                    return row;
                  }));
                }
              }
            })
            .catch((e) => console.error(e));
        }}
      />
    )}
    </>
  );
});

export default RecipeBuilder;
