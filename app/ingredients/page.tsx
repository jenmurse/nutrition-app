"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

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

type Nutrient = {
  id: number;
  name: string;
  displayName: string;
  unit: string;
};

const VOLUME_TO_ML: Record<string, number> = {
  tsp: 5,
  tbsp: 15,
  cup: 240,
};

function getAmountInGrams(
  amount: string,
  unit: string,
  customUnitName: string,
  customUnitAmount: string,
  customUnitGrams: string
): number {
  const parsed = Number(amount);
  if (!parsed || parsed <= 0) return 100;

  if (unit === "g") return parsed;
  if (unit === "ml") return parsed; // assume 1 ml = 1 g unless a custom gram mapping is set

  if (customUnitName && customUnitGrams && unit === customUnitName) {
    const customAmount = Number(customUnitAmount) || 1;
    return (parsed / customAmount) * Number(customUnitGrams);
  }

  const mlPerUnit = VOLUME_TO_ML[unit];
  return mlPerUnit ? parsed * mlPerUnit : parsed;
}

function getVolumeUnitNote(unit: string, hasCustomGrams: boolean): string {
  if (hasCustomGrams) return "";
  if (unit === "tsp") return "1 tsp = 5 ml";
  if (unit === "tbsp") return "1 tbsp = 15 ml";
  if (unit === "cup") return "1 cup = 240 ml";
  if (unit === "ml") return "1 ml = 1 g";
  return "";
}

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

export default function IngredientsPageWrapper() {
  return (
    <Suspense>
      <IngredientsPage />
    </Suspense>
  );
}

function IngredientsPage() {
  const searchParams = useSearchParams();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const searchQuery = searchParams?.get("search") || "";
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("g");
  const [editCustomUnitName, setEditCustomUnitName] = useState("");
  const [editCustomUnitAmount, setEditCustomUnitAmount] = useState("1");
  const [editCustomUnitGrams, setEditCustomUnitGrams] = useState("");
  const [editIsMealItem, setEditIsMealItem] = useState(false);
  const [editSpecifiedAmount, setEditSpecifiedAmount] = useState("100");
  const [editSpecifiedUnit, setEditSpecifiedUnit] = useState("g");
  const [editValues, setEditValues] = useState<Record<number, number>>({});
  const [createName, setCreateName] = useState("");
  const [createUnit, setCreateUnit] = useState("g");
  const [createCustomUnitName, setCreateCustomUnitName] = useState("");
  const [createCustomUnitAmount, setCreateCustomUnitAmount] = useState("1");
  const [createCustomUnitGrams, setCreateCustomUnitGrams] = useState("");
  const [createSpecifiedAmount, setCreateSpecifiedAmount] = useState("100");
  const [createSpecifiedUnit, setCreateSpecifiedUnit] = useState("g");
  const [createValues, setCreateValues] = useState<Record<number, number>>({});
  const [usdaLookupQuery, setUsdaLookupQuery] = useState("");
  const [usdaLookupResults, setUsdaLookupResults] = useState<any[]>([]);
  const [usdaLookupLoading, setUsdaLookupLoading] = useState(false);
  const [usdaSelectedFood, setUsdaSelectedFood] = useState<any | null>(null);
  const [nutrients, setNutrients] = useState<Nutrient[]>([]);
  const [saving, setSaving] = useState(false);

  const createBaseUnit = "g";
  const editBaseUnit = "g";
  const createVolumeNote = getVolumeUnitNote(
    createSpecifiedUnit,
    !!createCustomUnitGrams && createCustomUnitName === createSpecifiedUnit
  );
  const editVolumeNote = getVolumeUnitNote(
    editSpecifiedUnit,
    !!editCustomUnitGrams && editCustomUnitName === editSpecifiedUnit
  );

  useEffect(() => {
    const loadIngredients = () => {
      Promise.all([
        fetch("/api/ingredients").then((r) => r.json()),
        fetch("/api/nutrients").then((r) => r.json()),
      ])
        .then(([data, nutrData]) => {
          setIngredients(Array.isArray(data) ? data : []);
          setNutrients(Array.isArray(nutrData) ? nutrData : []);
        })
        .catch((e) => {
          console.error(e);
          setIngredients([]);
          setNutrients([]);
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
        setEditMode(false);
      }
      setIngredients((prev) => prev.filter((ing) => ing.id !== id));
    } catch (err) {
      console.error(err);
      alert(`Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleUsdaSearch = async (query: string) => {
    setUsdaLookupQuery(query);
    if (!query.trim()) {
      setUsdaLookupResults([]);
      return;
    }

    setUsdaLookupLoading(true);
    try {
      const res = await fetch(`/api/usda/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setUsdaLookupResults(data.foods || []);
      } else {
        setUsdaLookupResults([]);
      }
    } catch (err) {
      console.error("USDA search error:", err);
      setUsdaLookupResults([]);
    } finally {
      setUsdaLookupLoading(false);
    }
  };

  const handleUsdaSelect = async (food: any) => {
    try {
      // Set the selected food and name
      setUsdaSelectedFood(food);
      setCreateName(food.description);

      // Fetch full food details with nutrients
      const res = await fetch(`/api/usda/fetch/${food.fdcId}`);
      if (res.ok) {
        const foodData = await res.json();

        // Extract nutrient data from USDA
        const nutrientMap: Record<string, number> = {};
        if (foodData.foodNutrients && Array.isArray(foodData.foodNutrients)) {
          foodData.foodNutrients.forEach((fn: any) => {
            const nutrientName = fn.nutrient?.name || "";
            const value = fn.amount; // USDA uses 'amount', not 'value'

            // Map USDA nutrient names to our field names (case-insensitive, flexible matching)
            const lowerName = nutrientName.toLowerCase();
            if (lowerName.includes("energy")) {
              nutrientMap["calories"] = Math.round(value);
            } else if (lowerName.includes("total lipid") || lowerName.includes("total fat")) {
              nutrientMap["fat"] = Math.round(value * 10) / 10;
            } else if (lowerName.includes("saturated")) {
              nutrientMap["satFat"] = Math.round(value * 10) / 10;
            } else if (lowerName.includes("sodium")) {
              nutrientMap["sodium"] = Math.round(value);
            } else if (lowerName.includes("carbohydrate")) {
              nutrientMap["carbs"] = Math.round(value * 10) / 10;
            } else if (lowerName.includes("sugar")) {
              nutrientMap["sugar"] = Math.round(value * 10) / 10;
            } else if (lowerName.includes("protein")) {
              nutrientMap["protein"] = Math.round(value * 10) / 10;
            } else if (lowerName.includes("fiber")) {
              nutrientMap["fiber"] = Math.round(value * 10) / 10;
            }
          });
        }

        // Ensure we have nutrients loaded, if not fetch them
        let nutrientsList = nutrients;
        if (!nutrientsList || nutrientsList.length === 0) {
          const nutrRes = await fetch("/api/nutrients");
          if (nutrRes.ok) {
            nutrientsList = await nutrRes.json();
          }
        }

        // Map nutrient names to IDs and set values
        const newValues: Record<number, number> = {};
        nutrientsList.forEach((n: any) => {
          if (nutrientMap[n.name] !== undefined) {
            newValues[n.id] = nutrientMap[n.name];
          }
        });
        setCreateValues(newValues);
        console.log("State updated, checking createValues:", newValues);
        setUsdaLookupQuery("");
        setUsdaLookupResults([]);
      }
    } catch (err) {
      console.error("USDA fetch error:", err);
    }
  };

  const handleEditClick = (ing: Ingredient) => {
    setSelectedIngredient(ing);
    setEditMode(true);
    setEditName(ing.name);
    setEditUnit(ing.defaultUnit);
    setEditIsMealItem(Boolean(ing.isMealItem));
    setEditCustomUnitName(
      ing.customUnitName ?? ("tsp" === ing.defaultUnit || "tbsp" === ing.defaultUnit || "cup" === ing.defaultUnit
        ? ing.defaultUnit
        : "")
    );
    setEditCustomUnitAmount(ing.customUnitAmount != null ? String(ing.customUnitAmount) : "1");
    setEditCustomUnitGrams(ing.customUnitGrams != null ? String(ing.customUnitGrams) : "");
    setEditSpecifiedAmount("100");
    setEditSpecifiedUnit(ing.defaultUnit === "ml" ? "ml" : "g");
    const vals: Record<number, number> = {};
    ing.nutrientValues.forEach((nv) => {
      vals[nv.nutrient.id] = nv.value;
    });
    setEditValues(vals);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      alert("Name is required");
      return;
    }

    if (!selectedIngredient) return;

    const isCustomUnit = ["other", "tsp", "tbsp", "cup"].includes(editUnit);
    if (isCustomUnit && editUnit === "other" && !editCustomUnitName.trim()) {
      alert("Please enter a custom unit name (e.g., 'banana')");
      return;
    }

    setSaving(true);
    try {
      const specAmount = getAmountInGrams(
        editSpecifiedAmount,
        editSpecifiedUnit,
        editCustomUnitName,
        editCustomUnitAmount,
        editCustomUnitGrams
      );
      const normalizedValues = Object.entries(editValues).map(([nutrientId, value]) => ({
        nutrientId: Number(nutrientId),
        value: (Number(value) || 0) * (100 / specAmount),
      }));

      const body: any = {
        name: editName,
        defaultUnit: editUnit,
        isMealItem: editIsMealItem,
        nutrientValues: normalizedValues,
      };

      if (isCustomUnit) {
        const unitName = editUnit === "other" ? editCustomUnitName.trim() : editUnit;
        body.customUnitName = unitName;
        body.customUnitAmount = Number(editCustomUnitAmount) || 1;
        body.customUnitGrams = editCustomUnitGrams ? Number(editCustomUnitGrams) : null;
      }

      const res = await fetch(`/api/ingredients/${selectedIngredient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Save failed");
      }

      const updatedIng = await res.json();
      setIngredients((prev) =>
        prev.map((ing) => (ing.id === updatedIng.id ? updatedIng : ing))
      );
      setSelectedIngredient(updatedIng);
      setEditMode(false);
      const savedCount = updatedIng.nutrientValues?.length || 0;
      alert(`Ingredient saved with ${savedCount} nutrient values`);
    } catch (e) {
      console.error(e);
      alert(`Failed to save: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSave = async () => {
    if (!createName.trim()) {
      alert("Name is required");
      return;
    }

    const isCustomUnit = ["other", "tsp", "tbsp", "cup"].includes(createUnit);
    if (isCustomUnit && createUnit === "other" && !createCustomUnitName.trim()) {
      alert("Please enter a custom unit name (e.g., 'banana')");
      return;
    }

    setSaving(true);
    try {
      const specAmount = getAmountInGrams(
        createSpecifiedAmount,
        createSpecifiedUnit,
        createCustomUnitName,
        createCustomUnitAmount,
        createCustomUnitGrams
      );
      const normalizedValues = Object.entries(createValues).map(([nutrientId, value]) => ({
        nutrientId: Number(nutrientId),
        value: (Number(value) || 0) * (100 / specAmount),
      }));

      const body: any = {
        name: createName,
        defaultUnit: createUnit,
        nutrientValues: normalizedValues,
      };

      if (isCustomUnit) {
        const unitName = createUnit === "other" ? createCustomUnitName.trim() : createUnit;
        body.customUnitName = unitName;
        body.customUnitAmount = Number(createCustomUnitAmount) || 1;
        body.customUnitGrams = createCustomUnitGrams ? Number(createCustomUnitGrams) : null;
      }

      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Save failed");
      }

      const newIng = await res.json();
      setIngredients((prev) => [...prev, newIng]);
      setSelectedIngredient(newIng);
      setCreateMode(false);
      setCreateName("");
      setCreateUnit("g");
      setCreateCustomUnitName("");
      setCreateCustomUnitAmount("1");
      setCreateCustomUnitGrams("");
      setCreateSpecifiedAmount("100");
      setCreateSpecifiedUnit("g");
      setCreateValues({});
      const savedCount = newIng.nutrientValues?.length || 0;
      alert(`Ingredient created with ${savedCount} nutrient values`);
    } catch (e) {
      console.error(e);
      alert(`Failed to create: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredIngredients = ingredients.filter((ing) =>
    searchQuery ? ing.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const refreshSelectedIngredient = async (id: number) => {
    try {
      const res = await fetch(`/api/ingredients/${id}`);
      if (res.ok) {
        const updated = await res.json();
        console.log("Refreshed ingredient:", updated);
        setSelectedIngredient(updated);
      }
    } catch (err) {
      console.error("Failed to refresh ingredient:", err);
    }
  };

  /* ── Shared input/select style for forms ── */
  const inputClass =
    "w-full bg-transparent border-0 border-b border-[var(--rule)] py-[6px] px-0 font-mono text-[12px] font-light text-[var(--fg)] focus:outline-none focus:border-[#bbb] transition-colors";
  const selectClass =
    "w-full bg-transparent border-0 border-b border-[var(--rule)] py-[6px] px-0 font-mono text-[12px] font-light text-[var(--fg)] focus:outline-none focus:border-[#bbb] appearance-none transition-colors";
  const labelClass = "block text-[9px] tracking-[0.12em] uppercase text-[var(--muted)] mb-[6px]";
  const sectionLabelClass =
    "text-[9px] tracking-[0.12em] uppercase text-[var(--muted)] mb-[10px] pb-[6px] border-b border-[var(--rule)]";

  /* ── Helper: unit select dropdown SVG ── */
  const selectBgStyle = {
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23000' opacity='0.5' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat" as const,
    backgroundPosition: "right 0px center",
    backgroundSize: "12px",
  };

  /* ── Create Form JSX ── */
  const renderCreateForm = () => (
    <div className="flex-1 overflow-y-auto p-6 px-7 animate-fade-in">
      <button
        onClick={() => setCreateMode(false)}
        className="bg-transparent text-[var(--muted)] py-[8px] px-0 text-[9px] tracking-[0.12em] uppercase border-0 hover:text-[var(--fg)] cursor-pointer mb-4"
      >
        Back to list
      </button>
      <h1 className="font-sans text-[15px] font-normal mb-1">Create Ingredient</h1>
      <p className="text-[11px] text-[var(--muted)] mb-5">Add a new ingredient to your database</p>

      <div className="space-y-5">
        {/* USDA Lookup */}
        <div>
          <div className={sectionLabelClass}>USDA Lookup</div>
          <label className={labelClass}>Search USDA (Optional)</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g., 'almonds raw' or 'banana'"
            value={usdaLookupQuery}
            onChange={(e) => handleUsdaSearch(e.target.value)}
          />
        </div>

        {/* USDA Results */}
        {usdaLookupLoading && (
          <p className="text-[11px] text-[var(--muted)]">Searching USDA...</p>
        )}
        {usdaLookupResults.length > 0 && (
          <div className="border border-[var(--rule)] max-h-48 overflow-y-auto">
            {usdaLookupResults.map((food: any) => (
              <button
                key={food.fdcId}
                onClick={() => handleUsdaSelect(food)}
                className="block w-full text-left py-[8px] px-[12px] text-[11px] text-[var(--fg)] hover:bg-[#fafafa] border-b border-[var(--rule)] last:border-b-0 cursor-pointer bg-transparent transition-colors"
              >
                <div className="font-sans text-[11px]">{food.description.slice(0, 60)}</div>
                <div className="text-[10px] text-[var(--muted)]">{food.dataType}</div>
              </button>
            ))}
          </div>
        )}

        {/* Selected USDA Food Indicator */}
        {usdaSelectedFood && (
          <p className="text-[11px] text-[#408040]">Data imported from USDA FDC</p>
        )}

        {/* Name */}
        <div>
          <div className={sectionLabelClass}>Details</div>
          <label className={labelClass}>Name</label>
          <input
            type="text"
            className={inputClass}
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />
        </div>

        {/* Default Unit */}
        <div>
          <label className={labelClass}>Default Unit</label>
          <select
            className={selectClass}
            style={selectBgStyle}
            value={createUnit}
            onChange={(e) => {
              const nextUnit = e.target.value;
              setCreateUnit(nextUnit);
              if (
                nextUnit === "g" ||
                nextUnit === "ml" ||
                nextUnit === "tsp" ||
                nextUnit === "tbsp" ||
                nextUnit === "cup"
              ) {
                setCreateSpecifiedUnit(nextUnit);
              }
              if (nextUnit === "tsp" || nextUnit === "tbsp" || nextUnit === "cup") {
                setCreateCustomUnitName(nextUnit);
              }
            }}
          >
            <option value="g">g (grams)</option>
            <option value="ml">ml (milliliters)</option>
            <option value="tsp">tsp (teaspoon)</option>
            <option value="tbsp">tbsp (tablespoon)</option>
            <option value="cup">cup</option>
            <option value="other">other (custom unit)</option>
          </select>
        </div>

        {/* Custom Unit Settings */}
        {["other", "tsp", "tbsp", "cup"].includes(createUnit) && (
          <div className="border border-[var(--rule)] p-4 space-y-4">
            <div className={sectionLabelClass}>Custom Unit Settings</div>
            <div>
              <label className={labelClass}>Unit name</label>
              {createUnit === "other" ? (
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g., banana, scoop, cup"
                  value={createCustomUnitName}
                  onChange={(e) => setCreateCustomUnitName(e.target.value)}
                />
              ) : (
                <div className="py-[6px] font-mono text-[12px] font-light text-[var(--fg)]">
                  {createUnit}
                </div>
              )}
            </div>
            <div>
              <label className={labelClass}>Amount per unit</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="any"
                  className={inputClass + " w-32 flex-none"}
                  value={createCustomUnitAmount}
                  onChange={(e) => setCreateCustomUnitAmount(e.target.value)}
                />
                <span className="text-[11px] text-[var(--muted)]">
                  {createCustomUnitName || "unit"}
                </span>
              </div>
            </div>
            <div>
              <label className={labelClass}>Grams per unit</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="any"
                  className={inputClass + " flex-1"}
                  placeholder="e.g., 120 for an average banana"
                  value={createCustomUnitGrams}
                  onChange={(e) => setCreateCustomUnitGrams(e.target.value)}
                />
                <span className="text-[11px] text-[var(--muted)]">g</span>
              </div>
            </div>
          </div>
        )}

        {/* Specified amount for nutrient entry */}
        <div>
          <div className={sectionLabelClass}>Nutrient Basis</div>
          <label className={labelClass}>What amount are these nutrients for?</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="any"
              className={inputClass + " w-28 flex-none"}
              placeholder="100"
              value={createSpecifiedAmount}
              onChange={(e) => setCreateSpecifiedAmount(e.target.value)}
            />
            <select
              className={selectClass + " w-32 flex-none"}
              style={selectBgStyle}
              value={createSpecifiedUnit}
              onChange={(e) => setCreateSpecifiedUnit(e.target.value)}
            >
              <option value="g">g (grams)</option>
              <option value="ml">ml (milliliters)</option>
              <option value="tsp">tsp (teaspoon)</option>
              <option value="tbsp">tbsp (tablespoon)</option>
              <option value="cup">cup</option>
            </select>
            <div className="text-[10px] text-[var(--muted)] whitespace-nowrap">
              {createSpecifiedAmount && createSpecifiedUnit && createSpecifiedAmount !== "100"
                ? `Will convert to per 100${createBaseUnit}`
                : `Per 100${createBaseUnit}`}
              {createVolumeNote ? ` (${createVolumeNote})` : ""}
            </div>
          </div>
        </div>

        {/* Nutrient Values */}
        <div>
          <div className={sectionLabelClass}>
            Nutrient Values (per 100{createBaseUnit})
            <span className="ml-2 normal-case tracking-normal">
              {Object.keys(createValues).length} filled
            </span>
          </div>
          {nutrients.length === 0 ? (
            <p className="text-[11px] text-[var(--muted)]">Loading nutrients...</p>
          ) : (
            <div className="space-y-4">
              {nutrients.map((n) => {
                const inputValue = createValues[n.id];
                return (
                  <div key={n.id}>
                    <label className={labelClass}>{n.displayName} ({n.unit})</label>
                    <input
                      type="number"
                      step="any"
                      className={inputClass}
                      value={inputValue != null ? String(inputValue) : ""}
                      onChange={(e) =>
                        setCreateValues((prev) => {
                          if (e.target.value === "") {
                            const { [n.id]: _, ...rest } = prev;
                            return rest;
                          }
                          return { ...prev, [n.id]: Number(e.target.value) };
                        })
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-[6px] mt-5 border-t border-[var(--rule)] pt-4">
          <button
            className="bg-[var(--fg)] text-[var(--bg)] py-[8px] px-5 text-[9px] tracking-[0.12em] uppercase border-0 cursor-pointer disabled:opacity-50"
            onClick={handleCreateSave}
            disabled={saving}
          >
            {saving ? "Creating..." : "Create"}
          </button>
          <button
            className="bg-transparent text-[var(--muted)] py-[8px] px-0 text-[9px] tracking-[0.12em] uppercase border-0 hover:text-[var(--fg)] cursor-pointer disabled:opacity-50"
            onClick={() => setCreateMode(false)}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Edit Form JSX ── */
  const renderEditForm = () => (
    <div className="flex-1 overflow-y-auto p-6 px-7 animate-fade-in">
      <button
        onClick={() => setEditMode(false)}
        className="bg-transparent text-[var(--muted)] py-[8px] px-0 text-[9px] tracking-[0.12em] uppercase border-0 hover:text-[var(--fg)] cursor-pointer mb-4"
      >
        Back to list
      </button>
      <h1 className="font-sans text-[15px] font-normal mb-1">Edit Ingredient</h1>
      <p className="text-[11px] text-[var(--muted)] mb-5">Modify {selectedIngredient?.name}</p>

      <div className="space-y-5">
        {/* Name */}
        <div>
          <div className={sectionLabelClass}>Details</div>
          <label className={labelClass}>Name</label>
          <input
            type="text"
            className={inputClass}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
        </div>

        {/* Default Unit */}
        <div>
          <label className={labelClass}>Default Unit</label>
          <select
            className={selectClass}
            style={selectBgStyle}
            value={editUnit}
            onChange={(e) => {
              const nextUnit = e.target.value;
              setEditUnit(nextUnit);
              if (
                nextUnit === "g" ||
                nextUnit === "ml" ||
                nextUnit === "tsp" ||
                nextUnit === "tbsp" ||
                nextUnit === "cup"
              ) {
                setEditSpecifiedUnit(nextUnit);
              }
              if (nextUnit === "tsp" || nextUnit === "tbsp" || nextUnit === "cup") {
                setEditCustomUnitName(nextUnit);
              }
            }}
          >
            <option value="g">g (grams)</option>
            <option value="ml">ml (milliliters)</option>
            <option value="tsp">tsp (teaspoon)</option>
            <option value="tbsp">tbsp (tablespoon)</option>
            <option value="cup">cup</option>
            <option value="other">other (custom unit)</option>
          </select>
        </div>

        {/* Custom Unit Settings */}
        {["other", "tsp", "tbsp", "cup"].includes(editUnit) && (
          <div className="border border-[var(--rule)] p-4 space-y-4">
            <div className={sectionLabelClass}>Custom Unit Settings</div>
            <div>
              <label className={labelClass}>Unit name</label>
              {editUnit === "other" ? (
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g., banana, scoop, cup"
                  value={editCustomUnitName}
                  onChange={(e) => setEditCustomUnitName(e.target.value)}
                />
              ) : (
                <div className="py-[6px] font-mono text-[12px] font-light text-[var(--fg)]">
                  {editUnit}
                </div>
              )}
            </div>
            <div>
              <label className={labelClass}>Amount per unit</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="any"
                  className={inputClass + " w-32 flex-none"}
                  value={editCustomUnitAmount}
                  onChange={(e) => setEditCustomUnitAmount(e.target.value)}
                />
                <span className="text-[11px] text-[var(--muted)]">
                  {editCustomUnitName || "unit"}
                </span>
              </div>
            </div>
            <div>
              <label className={labelClass}>Grams per unit</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="any"
                  className={inputClass + " flex-1"}
                  placeholder="e.g., 120 for an average banana"
                  value={editCustomUnitGrams}
                  onChange={(e) => setEditCustomUnitGrams(e.target.value)}
                />
                <span className="text-[11px] text-[var(--muted)]">g</span>
              </div>
            </div>
          </div>
        )}

        {/* Meal Item Checkbox */}
        <div className="border border-[var(--rule)] p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editIsMealItem}
              onChange={(e) => setEditIsMealItem(e.target.checked)}
              className="w-3 h-3 cursor-pointer"
            />
            <span className="text-[11px] text-[var(--fg)]">This is a meal item</span>
          </label>
          <p className="text-[10px] text-[var(--muted)] mt-1 ml-5">
            Check this for foods you eat directly (fish, apple, chicken) but not for recipe ingredients (flour, salt, butter)
          </p>
        </div>

        {/* Specified amount for nutrient entry */}
        <div>
          <div className={sectionLabelClass}>Nutrient Basis</div>
          <label className={labelClass}>What amount are these nutrients for?</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="any"
              className={inputClass + " w-28 flex-none"}
              placeholder="100"
              value={editSpecifiedAmount}
              onChange={(e) => setEditSpecifiedAmount(e.target.value)}
            />
            <select
              className={selectClass + " w-32 flex-none"}
              style={selectBgStyle}
              value={editSpecifiedUnit}
              onChange={(e) => setEditSpecifiedUnit(e.target.value)}
            >
              <option value="g">g (grams)</option>
              <option value="ml">ml (milliliters)</option>
              <option value="tsp">tsp (teaspoon)</option>
              <option value="tbsp">tbsp (tablespoon)</option>
              <option value="cup">cup</option>
            </select>
            <div className="text-[10px] text-[var(--muted)] whitespace-nowrap">
              {editSpecifiedAmount && editSpecifiedUnit && editSpecifiedAmount !== "100"
                ? `Will convert to per 100${editBaseUnit}`
                : `Per 100${editBaseUnit}`}
              {editVolumeNote ? ` (${editVolumeNote})` : ""}
            </div>
          </div>
        </div>

        {/* Nutrient Values */}
        <div>
          <div className={sectionLabelClass}>
            Nutrient Values (per 100{editBaseUnit})
            <span className="ml-2 normal-case tracking-normal">
              {Object.keys(editValues).length} filled
            </span>
          </div>
          {nutrients.length === 0 ? (
            <p className="text-[11px] text-[var(--muted)]">Loading nutrients...</p>
          ) : (
            <div className="space-y-4">
              {nutrients.map((n) => (
                <div key={n.id}>
                  <label className={labelClass}>{n.displayName} ({n.unit})</label>
                  <input
                    type="number"
                    step="any"
                    className={inputClass}
                    value={editValues[n.id] != null ? String(editValues[n.id]) : ""}
                    onChange={(e) =>
                      setEditValues((prev) => {
                        if (e.target.value === "") {
                          const { [n.id]: _, ...rest } = prev;
                          return rest;
                        }
                        return { ...prev, [n.id]: Number(e.target.value) };
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-[6px] mt-5 border-t border-[var(--rule)] pt-4">
          <button
            className="bg-[var(--fg)] text-[var(--bg)] py-[8px] px-5 text-[9px] tracking-[0.12em] uppercase border-0 cursor-pointer disabled:opacity-50"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            className="bg-transparent text-[var(--muted)] py-[8px] px-0 text-[9px] tracking-[0.12em] uppercase border-0 hover:text-[var(--fg)] cursor-pointer disabled:opacity-50"
            onClick={() => setEditMode(false)}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Detail Panel JSX (right side of split) ── */
  const renderDetailPanel = () => {
    if (!selectedIngredient) return null;
    const ing = selectedIngredient;
    const unitDisplay = ing.customUnitName && ing.customUnitAmount
      ? `${ing.customUnitAmount} ${ing.customUnitName}`
      : ing.defaultUnit;

    return (
      <div className="flex-1 overflow-y-auto p-6 px-7">
        <h2 className="font-sans text-[15px] font-normal mb-1">{ing.name}</h2>
        <p className="text-[11px] text-[var(--muted)] mb-5">
          Default unit: {unitDisplay}
          {ing.isMealItem ? " / Meal item" : ""}
          {ing.fdcId ? ` / FDC #${ing.fdcId}` : ""}
        </p>

        {/* Nutrient Grid */}
        <div className={sectionLabelClass}>Nutrition per 100g</div>
        {ing.nutrientValues.length > 0 ? (
          <div
            className="grid grid-cols-2 border border-[var(--rule)]"
            style={{ gap: "1px", background: "var(--rule)" }}
          >
            {ing.nutrientValues.map((nv) => (
              <div key={nv.id} className="bg-[var(--bg)] p-[8px_12px]">
                <div className="text-[11px] text-[var(--muted)]">{nv.nutrient.displayName}</div>
                <div className="text-[11px] text-[var(--fg)]">
                  {formatNutrient(nv.value)} {nv.nutrient.unit}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-[var(--muted)]">No nutrient data</p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-[6px] mt-5 border-t border-[var(--rule)] pt-4">
          <button
            onClick={() => handleEditClick(ing)}
            className="flex-1 py-[7px] px-[10px] text-[9px] tracking-[0.1em] uppercase bg-transparent text-[var(--muted)] border border-[var(--rule)] cursor-pointer hover:text-[var(--fg)] hover:border-[#bbb] transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(ing.id, ing.name)}
            className="flex-1 py-[7px] px-[10px] text-[9px] tracking-[0.1em] uppercase bg-transparent text-[#c03030] border border-[#e8b0b0] cursor-pointer hover:bg-[#fff5f5] transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    );
  };

  /* ── Main Return ── */

  // Create mode: full-width form
  if (createMode) {
    return (
      <div className="flex flex-col h-full">
        {renderCreateForm()}
      </div>
    );
  }

  // Edit mode: full-width form
  if (editMode && selectedIngredient) {
    return (
      <div className="flex flex-col h-full">
        {renderEditForm()}
      </div>
    );
  }

  // List + optional detail split
  const hasSplit = !!selectedIngredient;

  return (
    <div className="flex flex-col h-full">
      {/* Page Head */}
      <div className="flex items-end justify-between px-7 pt-6 pb-5 border-b border-[var(--rule)]">
        <div>
          <div className="text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">Ingredients</div>
          <div className="font-sans text-[16px] font-normal text-[var(--fg)]">All Ingredients</div>
        </div>
        <div className="text-[9px] uppercase tracking-[0.06em] text-[var(--muted)]">
          {filteredIngredients.length} item{filteredIngredients.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[11px] text-[var(--muted)]">Loading...</p>
        </div>
      ) : filteredIngredients.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[11px] text-[var(--muted)]">
            {ingredients.length === 0
              ? "No ingredients yet. Create one to get started."
              : "No ingredients match your search."}
          </p>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          {/* List */}
          <div
            className={`overflow-y-auto ${
              hasSplit ? "w-[260px] border-r border-[var(--rule)] flex-none" : "flex-1"
            }`}
          >
            {filteredIngredients.map((ing) => {
              const isSelected = selectedIngredient?.id === ing.id;
              return (
                <div
                  key={ing.id}
                  className={`flex items-center justify-between py-[10px] px-7 border-b border-[var(--rule)] cursor-pointer transition-colors ${
                    isSelected ? "bg-[#f5f5f5]" : "hover:bg-[#fafafa]"
                  }`}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedIngredient(null);
                    } else {
                      setEditMode(false);
                      refreshSelectedIngredient(ing.id);
                    }
                  }}
                >
                  <span className="font-sans text-[12px] font-normal text-[var(--fg)] truncate">
                    {ing.name}
                  </span>
                  {!hasSplit && (
                    <span className="text-[11px] text-[var(--muted)] whitespace-nowrap ml-4">
                      {ing.customUnitName && ing.customUnitAmount
                        ? `${ing.customUnitAmount} ${ing.customUnitName}`
                        : ing.defaultUnit}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Detail Panel (split right) */}
          {hasSplit && renderDetailPanel()}
        </div>
      )}
    </div>
  );
}
