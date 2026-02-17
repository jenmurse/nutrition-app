"use client";

import { useEffect, useState } from "react";
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

export default function IngredientsPage() {
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

  return (
    <div className="flex h-full">
      {/* Center Panel - Ingredient List or Edit Form */}
      <div className="flex-1 overflow-y-auto p-6">
        {createMode ? (
          // Create Form
          <div>
            <button
              onClick={() => setCreateMode(false)}
              className="mb-4 text-sm text-foreground hover:underline"
            >
              ← Back to list
            </button>
            <h1 className="text-xl font-semibold mb-6">Create Ingredient</h1>

            <div className="space-y-4">
              {/* USDA Lookup */}
              <div>
                <label className="block text-sm font-medium mb-2">Search USDA (Optional)</label>
                <input
                  type="text"
                  className="w-full border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                  placeholder="e.g., 'almonds raw' or 'banana'"
                  value={usdaLookupQuery}
                  onChange={(e) => handleUsdaSearch(e.target.value)}
                />
              </div>

              {/* USDA Results */}
              {usdaLookupLoading && (
                <p className="text-xs text-muted-foreground">Searching USDA...</p>
              )}
              {usdaLookupResults.length > 0 && (
                <div className="border rounded bg-muted/10 p-3 space-y-2 max-h-48 overflow-y-auto">
                  {usdaLookupResults.map((food: any) => (
                    <button
                      key={food.fdcId}
                      onClick={() => handleUsdaSelect(food)}
                      className="block w-full text-left p-2 text-sm hover:bg-muted/40 rounded border border-transparent hover:border-foreground/20 transition"
                    >
                      <div className="font-medium">{food.description.slice(0, 60)}</div>
                      <div className="text-xs text-muted-foreground">{food.dataType}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected USDA Food Indicator */}
              {usdaSelectedFood && (
                <p className="text-xs text-green-600">✓ Data imported from USDA FDC</p>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  className="w-full border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Default Unit</label>
                <select
                  className="w-full border bg-background px-3 py-2 pr-8 text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-foreground"
                  style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23000' opacity='0.5' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 8px center",
                    backgroundSize: "12px",
                  }}
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
                  <option value="g" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>g (grams)</option>
                  <option value="ml" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>ml (milliliters)</option>
                  <option value="tsp" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>tsp (teaspoon)</option>
                  <option value="tbsp" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>tbsp (tablespoon)</option>
                  <option value="cup" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>cup</option>
                  <option value="other" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>other (custom unit)</option>
                </select>
              </div>

              {["other", "tsp", "tbsp", "cup"].includes(createUnit) && (
                <div className="border bg-muted/10 p-3 space-y-3">
                  <div className="text-sm font-medium">Custom Unit Settings</div>
                  <div className="flex items-center gap-3">
                    <label className="w-40 text-sm">Unit name</label>
                    {createUnit === "other" ? (
                      <input
                        type="text"
                        className="flex-1 border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                        placeholder="e.g., banana, scoop, cup"
                        value={createCustomUnitName}
                        onChange={(e) => setCreateCustomUnitName(e.target.value)}
                      />
                    ) : (
                      <div className="flex-1 border bg-background px-3 py-2 text-sm">
                        {createUnit}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="w-40 text-sm">Amount per unit</label>
                    <input
                      type="number"
                      step="any"
                      className="w-32 border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                      value={createCustomUnitAmount}
                      onChange={(e) => setCreateCustomUnitAmount(e.target.value)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {createCustomUnitName || "unit"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="w-40 text-sm">Grams per unit</label>
                    <input
                      type="number"
                      step="any"
                      className="flex-1 border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                      placeholder="e.g., 120 for an average banana"
                      value={createCustomUnitGrams}
                      onChange={(e) => setCreateCustomUnitGrams(e.target.value)}
                    />
                    <span className="text-sm text-muted-foreground">g</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">What amount are these nutrients for?</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    className="w-28 border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                    placeholder="100"
                    value={createSpecifiedAmount}
                    onChange={(e) => setCreateSpecifiedAmount(e.target.value)}
                  />
                  <select
                    className="w-32 border bg-background px-3 py-2 pr-8 text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-foreground"
                    style={{
                      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23000' opacity='0.5' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E\")",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 8px center",
                      backgroundSize: "12px",
                    }}
                    value={createSpecifiedUnit}
                    onChange={(e) => setCreateSpecifiedUnit(e.target.value)}
                  >
                    <option value="g" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>g (grams)</option>
                    <option value="ml" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>ml (milliliters)</option>
                    <option value="tsp" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>tsp (teaspoon)</option>
                    <option value="tbsp" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>tbsp (tablespoon)</option>
                    <option value="cup" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>cup</option>
                  </select>
                  <div className="text-xs text-muted-foreground">
                    {createSpecifiedAmount && createSpecifiedUnit && createSpecifiedAmount !== "100"
                      ? `Will convert to per 100${createBaseUnit}`
                      : `Per 100${createBaseUnit}`}
                    {createVolumeNote ? ` (${createVolumeNote})` : ""}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">
                  Nutrient Values (per 100{createBaseUnit})
                  <span className="text-xs text-muted-foreground ml-2">
                    {Object.keys(createValues).length} filled
                  </span>
                </label>
                {nutrients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Loading nutrients...</p>
                ) : (
                  <div className="space-y-3">
                    {nutrients.map((n) => {
                      const inputValue = createValues[n.id];
                      return (
                        <label key={n.id} className="flex items-center gap-3 border rounded p-3 bg-muted/20">
                          <div className="w-40 text-sm font-medium">{n.displayName}</div>
                          <input
                            type="number"
                            step="any"
                            className="flex-1 border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
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
                          <div className="text-sm text-muted-foreground w-12">{n.unit}</div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  className="flex flex-1 items-center justify-center border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40 transition disabled:opacity-50"
                  onClick={handleCreateSave}
                  disabled={saving}
                >
                  {saving ? "Creating…" : "Create"}
                </button>
                <button
                  className="flex flex-1 items-center justify-center border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40 transition disabled:opacity-50"
                  onClick={() => setCreateMode(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : editMode && selectedIngredient ? (
          // Edit Form
          <div>
            <button
              onClick={() => setEditMode(false)}
              className="mb-4 text-sm text-foreground hover:underline"
            >
              ← Back to list
            </button>
            <h1 className="text-xl font-semibold mb-6">Edit Ingredient</h1>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  className="w-full border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Default Unit</label>
                <select
                  className="w-full border bg-background px-3 py-2 pr-8 text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-foreground"
                  style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23000' opacity='0.5' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 8px center",
                    backgroundSize: "12px",
                  }}
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
                  <option value="g" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>g (grams)</option>
                  <option value="ml" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>ml (milliliters)</option>
                  <option value="tsp" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>tsp (teaspoon)</option>
                  <option value="tbsp" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>tbsp (tablespoon)</option>
                  <option value="cup" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>cup</option>
                  <option value="other" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>other (custom unit)</option>
                </select>
              </div>

              {["other", "tsp", "tbsp", "cup"].includes(editUnit) && (
                <div className="border bg-muted/10 p-3 space-y-3">
                  <div className="text-sm font-medium">Custom Unit Settings</div>
                  <div className="flex items-center gap-3">
                    <label className="w-40 text-sm">Unit name</label>
                    {editUnit === "other" ? (
                      <input
                        type="text"
                        className="flex-1 border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                        placeholder="e.g., banana, scoop, cup"
                        value={editCustomUnitName}
                        onChange={(e) => setEditCustomUnitName(e.target.value)}
                      />
                    ) : (
                      <div className="flex-1 border bg-background px-3 py-2 text-sm">
                        {editUnit}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="w-40 text-sm">Amount per unit</label>
                    <input
                      type="number"
                      step="any"
                      className="w-32 border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                      value={editCustomUnitAmount}
                      onChange={(e) => setEditCustomUnitAmount(e.target.value)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {editCustomUnitName || "unit"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="w-40 text-sm">Grams per unit</label>
                    <input
                      type="number"
                      step="any"
                      className="flex-1 border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                      placeholder="e.g., 120 for an average banana"
                      value={editCustomUnitGrams}
                      onChange={(e) => setEditCustomUnitGrams(e.target.value)}
                    />
                    <span className="text-sm text-muted-foreground">g</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">What amount are these nutrients for?</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    className="w-28 border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                    placeholder="100"
                    value={editSpecifiedAmount}
                    onChange={(e) => setEditSpecifiedAmount(e.target.value)}
                  />
                  <select
                    className="w-32 border bg-background px-3 py-2 pr-8 text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-foreground"
                    style={{
                      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23000' opacity='0.5' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E\")",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 8px center",
                      backgroundSize: "12px",
                    }}
                    value={editSpecifiedUnit}
                    onChange={(e) => setEditSpecifiedUnit(e.target.value)}
                  >
                    <option value="g" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>g (grams)</option>
                    <option value="ml" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>ml (milliliters)</option>
                    <option value="tsp" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>tsp (teaspoon)</option>
                    <option value="tbsp" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>tbsp (tablespoon)</option>
                    <option value="cup" style={{ backgroundColor: "#f5f5f5", color: "#000" }}>cup</option>
                  </select>
                  <div className="text-xs text-muted-foreground">
                    {editSpecifiedAmount && editSpecifiedUnit && editSpecifiedAmount !== "100"
                      ? `Will convert to per 100${editBaseUnit}`
                      : `Per 100${editBaseUnit}`}
                    {editVolumeNote ? ` (${editVolumeNote})` : ""}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">
                  Nutrient Values (per 100{editBaseUnit})
                  <span className="text-xs text-muted-foreground ml-2">
                    {Object.keys(editValues).length} filled
                  </span>
                </label>
                {nutrients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Loading nutrients...</p>
                ) : (
                  <div className="space-y-3">
                    {nutrients.map((n) => (
                      <label key={n.id} className="flex items-center gap-3 border rounded p-3 bg-muted/20">
                        <div className="w-40 text-sm font-medium">{n.displayName}</div>
                        <input
                          type="number"
                          step="any"
                          className="flex-1 border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
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
                        <div className="text-sm text-muted-foreground w-12">{n.unit}</div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  className="flex flex-1 items-center justify-center border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40 transition disabled:opacity-50"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  className="flex flex-1 items-center justify-center border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40 transition disabled:opacity-50"
                  onClick={() => setEditMode(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          // List View
          <>
            <h1 className="text-xl font-semibold mb-6">Ingredients</h1>

            {/* Ingredient Count */}
            <div className="mb-4 text-sm text-muted-foreground">
              Showing <span className="font-mono font-semibold text-foreground">{filteredIngredients.length}</span> of{' '}
              <span className="font-mono font-semibold text-foreground">{ingredients.length}</span> ingredients
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : filteredIngredients.length === 0 ? (
              <div className="flex h-64 items-center justify-center border">
                <p className="text-sm text-muted-foreground">
                  {ingredients.length === 0
                    ? <>No ingredients yet. Click "+ Create Ingredient" in the sidebar to get started.</>
                    : "No ingredients match your search."
                  }
                </p>
              </div>
            ) : (
              <div className="border divide-y">
                {filteredIngredients.map((ing) => {
                  const isSelected = selectedIngredient?.id === ing.id;
                  return (
                    <div
                      key={ing.id}
                      className={`px-4 h-[40px] flex items-center transition cursor-pointer ${
                        isSelected ? 'bg-muted/40' : 'hover:bg-muted/20'
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
                      <div className="flex items-center justify-between gap-4 w-full">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{ing.name}</h3>
                        </div>
                        <p className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {ing.defaultUnit === "other" && ing.customUnitName
                            ? `${ing.customUnitAmount} ${ing.customUnitName}`
                            : ing.defaultUnit}
                        </p>
                        {isSelected && (
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(ing);
                              }}
                              className="border bg-background px-3 py-1 text-xs font-medium hover:bg-muted/40 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(ing.id, ing.name);
                              }}
                              className="border border-rose-600/40 bg-rose-600/10 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-600/20 transition"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
