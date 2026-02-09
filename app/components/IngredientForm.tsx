"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Nutrient = { id: number; name: string; displayName: string; unit: string };

type NutrientValue = { nutrientId: number; value: number };

export default function IngredientForm({ onCreated }: { onCreated?: () => void }) {
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [fdcId, setFdcId] = useState<string | null>(null);
  const [defaultUnit, setDefaultUnit] = useState("g");
  const [customUnitName, setCustomUnitName] = useState("");
  const [customUnitAmount, setCustomUnitAmount] = useState("1");
  const [customUnitGrams, setCustomUnitGrams] = useState("");
  const [customUnitMeasurement, setCustomUnitMeasurement] = useState("g");
  const [nutrients, setNutrients] = useState<Nutrient[]>([]);
  const [values, setValues] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [specifiedAmount, setSpecifiedAmount] = useState("100");
  const [specifiedUnit, setSpecifiedUnit] = useState("g");
  const [portions, setPortions] = useState<any[]>([]);
  const [selectedPortionIndex, setSelectedPortionIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/nutrients")
      .then((r) => r.json())
      .then((data) => setNutrients(data || []))
      .catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    const prefillName = searchParams.get("name");
    if (prefillName && !name) {
      setName(prefillName);
    }
  }, [searchParams, name]);

  function setNutrientValue(nutrientId: number, v: string) {
    setValues((s) => {
      if (v === "") {
        // Remove the key to show as empty, not 0
        const { [nutrientId]: _, ...rest } = s;
        return rest;
      }
      return { ...s, [nutrientId]: Number(v) };
    });
  }

  function formatNutrientValue(val: number): number {
    if (val >= 1) {
      // Values >= 1: at most 2 decimal places
      return Math.round(val * 100) / 100;
    } else if (val > 0) {
      // Values < 1: 2 significant digits
      const magnitude = Math.floor(Math.log10(val));
      const factor = Math.pow(10, 1 - magnitude);
      return Math.round(val * factor) / factor;
    }
    return 0;
  }

  async function handleSave() {
    setLoading(true);
    try {
      // Validate custom unit if selected
      if (defaultUnit === "other") {
        if (!customUnitName.trim()) {
          alert("Please enter a custom unit name (e.g., 'banana')");
          setLoading(false);
          return;
        }
        if (!customUnitGrams || Number(customUnitGrams) <= 0) {
          alert("Please enter grams for the custom unit (e.g., 120 for 1 banana)");
          setLoading(false);
          return;
        }
      }

      // Normalize values to per 100g, store full precision
      let normalizationFactor = 100;
      if (defaultUnit === "other") {
        // For custom units, normalize from the custom unit's weight (customUnitGrams) to per 100g
        normalizationFactor = Number(customUnitGrams) || 100;
      } else {
        // For standard units, use specifiedAmount
        const specAmount = Number(specifiedAmount) || 100;
        normalizationFactor = specAmount;
      }

      const normalizedValues: NutrientValue[] = Object.entries(values).map(([k, v]) => ({
        nutrientId: Number(k),
        value: (Number(v) || 0) * (100 / normalizationFactor),
      }));

      const body: any = { 
        name, 
        fdcId, 
        defaultUnit, 
        nutrientValues: normalizedValues 
      };

      // Add custom unit data if using custom units
      if (defaultUnit === "other") {
        body.customUnitName = customUnitName.trim();
        body.customUnitAmount = Number(customUnitAmount) || 1;
        body.customUnitGrams = Number(customUnitGrams);
        body.customUnitMeasurement = customUnitMeasurement;
      }

      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create");
      setName("");
      setFdcId(null);
      setDefaultUnit("g");
      setCustomUnitName("");
      setCustomUnitAmount("1");
      setCustomUnitGrams("");
      setCustomUnitMeasurement("g");
      setValues({});
      setSpecifiedAmount("100");
      setSpecifiedUnit("g");
      onCreated?.();
    } catch (err) {
      console.error(err);
      alert("Failed to save ingredient");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(query: string) {
    setShowSearch(true);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/usda/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data.foods) ? data.foods : []);
    } catch (e) {
      console.error(e);
      setSearchResults([]);
    }
  }

  async function selectSearchResult(item: any) {
    // item expected to have fdcId
    const id = item.fdcId || item.fdcId;
    if (!id) return;
    setShowSearch(false);
    setFdcId(String(id));
    try {
      const res = await fetch(`/api/usda/fetch/${id}`);
      const data = await res.json();

      // Extract available portions
      const availablePortions = data.foodPortions || [];
      setPortions(availablePortions);
      setSelectedPortionIndex(null); // Reset selection
      
      // Get serving size to normalize to per 100g
      const servingSize = data.servingSize || 100; // Default to 100 if not provided
      const servingSizeUnit = data.servingSizeUnit || "g";
      
      // Map USDA nutrients into our nutrient ids by name
      // USDA returns nutrients in data.foodNutrients
      const mapping: Record<string, number> = {};
      nutrients.forEach((n) => (mapping[n.name.toLowerCase()] = n.id));

      const newValues: Record<number, number> = {};
      const nutrientsArray = data.foodNutrients || [];
      
      nutrientsArray.forEach((u: any) => {
        const name = (u.nutrient?.name || u.nutrientName || u.name || "").toLowerCase();
        const number = u.nutrient?.number || u.number || "";
        
        // Match by USDA nutrient number (more reliable) or by name keywords
        let matched = false;
        
        // Map USDA nutrient numbers to our nutrient names
        const numberMapping: Record<string, string> = {
          "208": "calories",  // Energy
          "204": "fat",       // Total lipid (fat)
          "606": "satfat",    // Fatty acids, total saturated
          "307": "sodium",    // Sodium, Na
          "205": "carbs",     // Carbohydrate, by difference
          "269": "sugar",     // Total Sugars (or 269)
          "203": "protein",   // Protein
          "291": "fiber"      // Fiber, total dietary
        };
        
        if (number && numberMapping[number]) {
          const nutrientKey = numberMapping[number];
          const nid = mapping[nutrientKey];
          if (nid) {
            const rawVal = u.amount || 0;
            // Normalize to per 100g
            const normalized = servingSizeUnit === "g" ? (rawVal / servingSize) * 100 : rawVal;
            const val = formatNutrientValue(normalized);
            newValues[nid] = val;
            matched = true;
          }
        }
        
        // Fallback: try keyword matching
        if (!matched) {
          for (const key of Object.keys(mapping)) {
            if (name.includes(key)) {
              const nid = mapping[key];
              const rawVal = u.amount || 0;
              // Normalize to per 100g
              const normalized = servingSizeUnit === "g" ? (rawVal / servingSize) * 100 : rawVal;
              const val = formatNutrientValue(normalized);
              newValues[nid] = val;
              break;
            }
          }
        }
      });
      
      setValues((s) => ({ ...s, ...newValues }));
      
      // try to fill name from data.description or description
      const ingredientName = data.description || data.lowercaseDescription || item.description || "";
      if (ingredientName) setName(ingredientName);
    } catch (e) {
      console.error(e);
      alert("Failed to fetch USDA data");
    }
  }
  
  function handlePortionSelect(index: number) {
    const portion = portions[index];
    if (!portion) return;
    
    setSelectedPortionIndex(index);
    setSpecifiedAmount(String(portion.gramWeight || 100));
    setSpecifiedUnit("g");
    setDefaultUnit("other");
    
    // Extract unit name from portionDescription (e.g., "clove" from "1 clove")
    let unitName = "unit";
    const desc = portion.portionDescription || "";
    if (desc) {
      // Remove leading number and spaces: "1 clove" -> "clove"
      const parts = desc.trim().split(/\s+/);
      // Skip the first part if it's a number, use the rest
      if (parts.length > 1 && /^\d+/.test(parts[0])) {
        unitName = parts.slice(1).join(" ");
      } else if (parts.length > 0) {
        unitName = parts.join(" ");
      }
    }
    
    setCustomUnitName(unitName);
    setCustomUnitAmount("1"); // Always 1 for the reference amount
    setCustomUnitGrams(String(portion.gramWeight || 100));
    setCustomUnitMeasurement("g");
  }

  return (
    <div className="p-4 border rounded bg-white">
      <h3 className="text-lg font-medium mb-3">Add Ingredient</h3>

      {fdcId && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
          <span className="text-sm text-slate-600">USDA Source: </span>
          <a
            href={`https://fdc.nal.usda.gov/fdc-app.html#/food-details/${fdcId}/nutrients`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm"
          >
            View on USDA FoodData Central →
          </a>
        </div>
      )}

      {portions.length > 0 && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <h4 className="font-medium mb-2 text-sm">Available Portions</h4>
          <div className="grid grid-cols-1 gap-2">
            {portions.map((portion, index) => (
              <button
                key={index}
                onClick={() => handlePortionSelect(index)}
                className={`p-2 text-left rounded border text-sm transition ${
                  selectedPortionIndex === index
                    ? "bg-green-200 border-green-600"
                    : "bg-white border-green-300 hover:bg-green-100"
                }`}
              >
                <span className="font-medium">
                  {portion.portionDescription || `${portion.modifier || "1"} ${portion.measureUnitAbbr || ""}`}
                </span>
                <span className="text-slate-600 ml-2">
                  ({portion.gramWeight || portion.gramWeight === 0 ? portion.gramWeight : "?"} g)
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <input
          className="border rounded p-2 col-span-2"
          placeholder="Ingredient name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="flex gap-2">
          <select
            className="border rounded p-2 flex-1"
            value={defaultUnit}
            onChange={(e) => setDefaultUnit(e.target.value)}
          >
            <option value="g">g (grams)</option>
            <option value="ml">ml (milliliters)</option>
            <option value="other">other (custom unit)</option>
          </select>
          <button
            className="bg-slate-100 px-3 rounded"
            onClick={() => {
              const q = name || prompt("Search USDA for:") || "";
              if (q) handleSearch(q);
            }}
          >
            Lookup
          </button>
        </div>
      </div>

      {defaultUnit === "other" && (
        <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
          <h4 className="font-medium mb-2 text-sm">Custom Unit Settings</h4>
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <label className="w-32 text-sm font-medium">Unit name:</label>
              <input
                className="border rounded p-2 flex-1"
                placeholder="e.g., banana, scoop, cup"
                value={customUnitName}
                onChange={(e) => setCustomUnitName(e.target.value)}
              />
            </div>
            <div className="flex gap-2 items-center">
              <label className="w-32 text-sm font-medium">Amount per unit:</label>
              <input
                type="number"
                step="any"
                className="border rounded p-2 w-24"
                value={customUnitGrams}
                onChange={(e) => setCustomUnitGrams(e.target.value)}
              />
              <select
                className="border rounded p-2 w-20"
                value={customUnitMeasurement}
                onChange={(e) => setCustomUnitMeasurement(e.target.value)}
              >
                <option value="g">Grams</option>
                <option value="ml">mL</option>
              </select>
              <span className="text-sm text-slate-600">per {customUnitName || "unit"}</span>
            </div>
            <div className="flex gap-2 items-center">
              <label className="w-32 text-sm font-medium">Reference amount:</label>
              <input
                type="number"
                step="any"
                className="border rounded p-2 w-24"
                value={customUnitAmount}
                onChange={(e) => setCustomUnitAmount(e.target.value)}
              />
              <span className="text-sm text-slate-600">{customUnitName || "unit"}</span>
            </div>
          </div>
        </div>
      )}

      {showSearch && (
        <div className="mb-3">
          <div className="text-sm text-slate-600 mb-2">Select a USDA match</div>
          <div className="space-y-2 max-h-48 overflow-auto">
            {searchResults.map((r, i) => (
              <div
                key={i}
                className="p-2 border rounded hover:bg-slate-50 cursor-pointer"
                onClick={() => selectSearchResult(r)}
              >
                <div className="font-medium">{r.description || r.foodName || r.description}</div>
                <div className="text-sm text-slate-600">{r.brandOwner || r.dataType || r.foodCategory}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {defaultUnit !== "other" && (
        <div className="mb-4 p-3 bg-slate-50 rounded border">
          <h4 className="font-medium mb-2 text-sm">What amount are these nutrients for?</h4>
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              className="border rounded p-2 w-24"
              placeholder="100"
              value={specifiedAmount}
              onChange={(e) => setSpecifiedAmount(e.target.value)}
            />
            <select
              className="border rounded p-2 flex-1"
              value={specifiedUnit}
              onChange={(e) => setSpecifiedUnit(e.target.value)}
            >
              <option value="g">g (grams)</option>
              <option value="ml">ml (milliliters)</option>
            </select>
            <div className="text-sm text-slate-600 self-center">
              {specifiedAmount && specifiedUnit && specifiedAmount !== "100" ? (
                <span>Will convert to per 100{specifiedUnit}</span>
              ) : (
                <span>Per 100{specifiedUnit}</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-3">
        <h4 className="font-medium mb-2">Nutrient values (per 100g)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {nutrients.map((n) => (
            <label key={n.id} className="flex items-center gap-2 border rounded p-2">
              <div className="w-36 text-sm">{n.displayName}</div>
              <input
                type="number"
                step="any"
                className="border rounded p-1 flex-1"
                value={values[n.id] ?? ""}
                onChange={(e) => setNutrientValue(n.id, e.target.value)}
              />
              <div className="text-sm text-slate-600">{n.unit}</div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={handleSave}
          disabled={loading || !name}
        >
          {loading ? "Saving…" : "Save"}
        </button>

        <button
          className="px-4 py-2 border rounded"
          onClick={() => {
            setName("");
            setFdcId(null);
            setDefaultUnit("g");
            setCustomUnitName("");
            setCustomUnitAmount("1");
            setCustomUnitGrams("");
            setCustomUnitMeasurement("g");
            setValues({});
            setSpecifiedAmount("100");
            setSpecifiedUnit("g");
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
