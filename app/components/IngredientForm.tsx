"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";

type Nutrient = { id: number; name: string; displayName: string; unit: string };

type NutrientValue = { nutrientId: number; value: number };

export default function IngredientForm({ onCreated }: { onCreated?: () => void }) {
  const [name, setName] = useState("");
  const [fdcId, setFdcId] = useState<string | null>(null);
  const [defaultUnit, setDefaultUnit] = useState("g");
  const [customUnitName, setCustomUnitName] = useState("");
  const [customUnitAmount, setCustomUnitAmount] = useState("1");
  const [customUnitGrams, setCustomUnitGrams] = useState("");
  const [isMealItem, setIsMealItem] = useState(false);
  const [nutrients, setNutrients] = useState<Nutrient[]>([]);
  const [values, setValues] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searching, setSearching] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [specifiedAmount, setSpecifiedAmount] = useState("100");
  const [specifiedUnit, setSpecifiedUnit] = useState("g");
  const [duplicateIngredient, setDuplicateIngredient] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    fetch("/api/nutrients")
      .then((r) => r.json())
      .then((data) => setNutrients(Array.isArray(data) ? data : []))
      .catch((e) => {
        console.error(e);
        setNutrients([]);
      });
  }, []);

  function setNutrientValue(nutrientId: number, v: string) {
    setValues((s) => ({ ...s, [nutrientId]: v }));
  }

  async function handleSave() {
    setLoading(true);
    try {
      // Validate custom unit if selected
      if (defaultUnit === "other") {
        if (!customUnitName.trim()) {
          toast.error("Please enter a custom unit name (e.g., 'banana')");
          setLoading(false);
          return;
        }
        if (!customUnitGrams || Number(customUnitGrams) <= 0) {
          toast.error("Please enter grams for the custom unit (e.g., 120 for 1 banana)");
          setLoading(false);
          return;
        }
      }

      // Normalize values to per 100g, store full precision
      const specAmount = Number(specifiedAmount) || 100;
      const normalizedValues: NutrientValue[] = Object.entries(values).map(([k, v]) => ({
        nutrientId: Number(k),
        value: (Number(v) || 0) * (100 / specAmount),
      }));

      const body: any = { 
        name, 
        fdcId, 
        defaultUnit,
        isMealItem,
        nutrientValues: normalizedValues 
      };

      // Add custom unit data if using custom units
      if (defaultUnit === "other") {
        body.customUnitName = customUnitName.trim();
        body.customUnitAmount = Number(customUnitAmount) || 1;
        body.customUnitGrams = Number(customUnitGrams);
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
      setIsMealItem(false);
      setValues({});
      setSpecifiedAmount("100");
      setSpecifiedUnit("g");
      onCreated?.();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save ingredient");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(query: string) {
    setShowSearch(true);
    setSearchResults([]);
    setSearching(true);
    try {
      const res = await fetch(`/api/usda/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) {
        console.error('USDA search error:', data);
        toast.error(data.error || 'Failed to search USDA database');
        setSearchResults([]);
      } else {
        setSearchResults(data.foods || data || []);
      }
    } catch (e) {
      console.error(e);
      toast.error('Network error while searching USDA database');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function selectSearchResult(item: any) {
    // item expected to have fdcId
    const id = item.fdcId || item.fdcId;
    if (!id) return;
    setDuplicateIngredient(null);

    // Check for existing ingredient with this fdcId
    try {
      const dupRes = await fetch(`/api/ingredients/by-fdc-id/${id}`);
      const dupData = await dupRes.json();
      if (dupData.found) {
        setDuplicateIngredient({ id: dupData.ingredient.id, name: dupData.ingredient.name });
      }
    } catch (e) {
      // Non-blocking — proceed even if check fails
    }

    setShowSearch(false);
    setFdcId(String(id));
    setFetchingDetails(true);
    try {
      const res = await fetch(`/api/usda/fetch/${id}`);
      const data = await res.json();
      
      if (!res.ok) {
        console.error('USDA fetch error:', data);
        toast.error(data.error || 'Failed to fetch food details');
        return;
      }
      
      console.log('USDA fetch response:', data);
      
      // Map USDA nutrient IDs to our nutrient names
      // USDA uses nested structure: foodNutrients[].nutrient.id
      const usdaToOurNutrients: Record<number, string> = {
        1008: "calories",  // Energy (nutrient.id 1008, number "208")
        1004: "fat",       // Total lipid (fat)
        1258: "satFat",    // Fatty acids, total saturated
        1093: "sodium",    // Sodium, Na  
        1005: "carbs",     // Carbohydrate, by difference
        2000: "sugar",     // Sugars, total including NLEA
        1003: "protein",   // Protein
        1079: "fiber",     // Fiber, total dietary
      };
      
      // Create mapping from our nutrient names to IDs
      const ourNutrientMap: Record<string, number> = {};
      nutrients.forEach((n) => (ourNutrientMap[n.name] = n.id));

      const newValues: Record<number, string> = {};
      const nutrientsArray = data.foodNutrients || [];
      
      console.log('Processing nutrients, found:', nutrientsArray.length);
      
      nutrientsArray.forEach((u: any) => {
        // USDA API has nested structure: u.nutrient.id
        const usdaNutrientId = u.nutrient?.id || u.nutrientId;
        const amount = u.amount || u.value || 0;
        
        if (usdaNutrientId && usdaToOurNutrients[usdaNutrientId]) {
          const ourNutrientName = usdaToOurNutrients[usdaNutrientId];
          const ourNutrientId = ourNutrientMap[ourNutrientName];
          if (ourNutrientId) {
            console.log(`Mapping USDA nutrient ${usdaNutrientId} (${u.nutrient?.name}) to ${ourNutrientName}: ${amount}`);
            newValues[ourNutrientId] = String(amount);
          }
        }
      });
      
      console.log('Final mapped values:', newValues);
      setValues((s) => ({ ...s, ...newValues }));
      
      // try to fill name from data.description
      if (data.description) setName(data.description);
      else if (data.lowercaseDescription) setName(data.lowercaseDescription);
    } catch (e) {
      console.error(e);
      toast.error("Network error while fetching USDA data");
    } finally {
      setFetchingDetails(false);
    }
  }

  return (
    <div>
      <h3 className="text-lg font-medium mb-3">Add Ingredient</h3>

      <div className="flex flex-col gap-3 mb-3">
        <div className="flex gap-3">
          <input
            className="border p-2 flex-1"
            placeholder="Ingredient name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="flex gap-2">
          <select
            className="border p-2 flex-1"
            value={defaultUnit}
            onChange={(e) => setDefaultUnit(e.target.value)}
          >
            <option value="g">g (grams)</option>
            <option value="ml">ml (milliliters)</option>
            <option value="other">other (custom unit)</option>
          </select>
          <button
            className="bg-[var(--bg-subtle)] px-4 py-2 disabled:opacity-50"
            disabled={searching || fetchingDetails}
            onClick={() => {
              const q = name || prompt("Search USDA for:") || "";
              if (q) handleSearch(q);
            }}
          >
            {searching ? "Searching..." : fetchingDetails ? "Loading..." : "Lookup"}
          </button>
        </div>
        </div>
      </div>

      {defaultUnit === "other" && (
        <div className="mb-4 p-3 bg-[var(--bg-subtle)] border border-[var(--rule)]">
          <h4 className="font-medium mb-2 text-sm">Custom Unit Settings</h4>
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <label className="w-32 text-sm font-medium">Unit name:</label>
              <input
                className="border p-2 flex-1"
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
                className="border p-2 w-24"
                value={customUnitAmount}
                onChange={(e) => setCustomUnitAmount(e.target.value)}
              />
              <span className="text-sm text-[var(--muted)]">{customUnitName || "unit"}</span>
            </div>
            <div className="flex gap-2 items-center">
              <label className="w-32 text-sm font-medium">Grams per unit:</label>
              <input
                type="number"
                step="any"
                className="border p-2 flex-1"
                placeholder="e.g., 120 for an average banana"
                value={customUnitGrams}
                onChange={(e) => setCustomUnitGrams(e.target.value)}
              />
              <span className="text-sm text-[var(--muted)]">g</span>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 p-3 bg-[var(--bg-subtle)] border border-[var(--rule)]">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isMealItem}
            onChange={(e) => setIsMealItem(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">This is a meal item (can be added directly to meal plans)</span>
        </label>
        <p className="text-xs text-[var(--muted)] mt-2 ml-6">
          Check this for foods you eat directly (fish, apple, chicken) but not for recipe ingredients (flour, salt, butter)
        </p>
      </div>

      {showSearch && (
        <div className="mb-3">
          <div className="text-sm text-[var(--muted)] mb-2">
            {searching ? "Searching USDA database..." : "Select a USDA match"}
          </div>
          <div className="space-y-2 max-h-48 overflow-auto">
            {searchResults.map((r, i) => (
              <div
                key={i}
                className="p-2 border hover:bg-[var(--bg-subtle)] cursor-pointer"
                onClick={() => selectSearchResult(r)}
              >
                <div className="font-medium">{r.description || r.foodName || r.description}</div>
                <div className="text-sm text-[var(--muted)]">{r.brandOwner || r.dataType || r.foodCategory}</div>
              </div>
            ))}
            {!searching && searchResults.length === 0 && (
              <div className="p-2 text-sm text-[var(--muted)]">No results found</div>
            )}
          </div>
        </div>
      )}

      {fetchingDetails && (
        <div className="mb-3 p-3 bg-[var(--bg-subtle)] text-sm text-[var(--fg)]">
          Loading food details from USDA...
        </div>
      )}

      {duplicateIngredient && (
        <div className="mb-3 p-3 border border-[var(--warning)] bg-[var(--warning-bg,var(--bg-subtle))]" role="status" aria-live="polite">
          <p className="text-sm">
            This food already exists as <strong>{duplicateIngredient.name}</strong> in your ingredients.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              className="text-sm underline"
              onClick={() => {
                setDuplicateIngredient(null);
                setName("");
                setFdcId(null);
                setValues({});
                onCreated?.();
              }}
              aria-label={`Use existing ingredient ${duplicateIngredient.name}`}
            >
              Dismiss
            </button>
            <button
              className="text-sm underline"
              onClick={() => setDuplicateIngredient(null)}
              aria-label="Create ingredient anyway"
            >
              Add anyway
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 p-3 bg-[var(--bg-subtle)] border">
        <h4 className="font-medium mb-2 text-sm">What amount are these nutrients for?</h4>
        <div className="flex gap-2">
          <input
            type="number"
            step="any"
            className="border p-2 w-24"
            placeholder="100"
            value={specifiedAmount}
            onChange={(e) => setSpecifiedAmount(e.target.value)}
          />
          <select
            className="border p-2 flex-1"
            value={specifiedUnit}
            onChange={(e) => setSpecifiedUnit(e.target.value)}
          >
            <option value="g">g (grams)</option>
            <option value="ml">ml (milliliters)</option>
          </select>
          <div className="text-sm text-[var(--muted)] self-center">
            {specifiedAmount && specifiedUnit && specifiedAmount !== "100" ? (
              <span>Will convert to per 100{specifiedUnit}</span>
            ) : (
              <span>Per 100{specifiedUnit}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-3">
        <h4 className="font-medium mb-2">Nutrient values (per 100g)</h4>
        <div className="grid grid-cols-1 gap-2">
          {nutrients.map((n) => (
            <label key={n.id} className="flex items-center gap-2 border p-2">
              <div className="w-36 text-sm">{n.displayName}</div>
              <input
                type="number"
                step="any"
                className="border p-1 flex-1"
                value={values[n.id] ?? ""}
                onChange={(e) => setNutrientValue(n.id, e.target.value)}
              />
              <div className="text-sm text-[var(--muted)]">{n.unit}</div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="bg-[var(--accent)] text-[var(--accent-text)] px-4 py-2 disabled:opacity-50"
          onClick={handleSave}
          disabled={loading || !name}
        >
          {loading ? "Saving…" : "Save"}
        </button>

        <button
          className="px-4 py-2 border"
          onClick={() => {
            setName("");
            setFdcId(null);
            setDefaultUnit("g");
            setCustomUnitName("");
            setCustomUnitAmount("1");
            setCustomUnitGrams("");
            setIsMealItem(false);
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
