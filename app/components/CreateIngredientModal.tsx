"use client";

import { useEffect, useState } from "react";

type Nutrient = {
  id: number;
  name: string;
  displayName: string;
  unit: string;
};

type USDAResult = {
  fdcId: string;
  description: string;
  foodNutrients?: Array<{
    nutrient: { id: number; name: string; unitName: string };
    value: number;
  }>;
};

interface CreateIngredientModalProps {
  ingredientName: string;
  ingredientId: number;
  onClose: () => void;
  onNutritionAdded?: () => void;
}

export default function CreateIngredientModal({
  ingredientName,
  ingredientId,
  onClose,
  onNutritionAdded,
}: CreateIngredientModalProps) {
  const [nutrients, setNutrients] = useState<Nutrient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<USDAResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState<"search" | "manual">("search");
  const [manualNutrients, setManualNutrients] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch("/api/nutrients")
      .then((r) => r.json())
      .then((d) => setNutrients(Array.isArray(d) ? d : []))
      .catch((e) => console.error(e));
  }, []);

  const handleUSDASearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/usda/search?query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Search failed");
      }
      const data = await res.json();
      
      // Handle USDA API response format with 'foods' array
      const foods = data.foods || data || [];
      setSearchResults(Array.isArray(foods) ? foods : []);
      
      if (foods.length === 0) {
        alert("No results found for that search");
      }
    } catch (error) {
      console.error(error);
      alert(`Search failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectUSDAResult = async (result: USDAResult) => {
    try {
      const res = await fetch(`/api/usda/fetch/${result.fdcId}`);
      const data = await res.json();

      // Map USDA nutrients to our database nutrients
      const foodNutrients = data.foodNutrients || [];
      const updates = [];
      const seenNutrientIds = new Set();
      
      console.log("Full USDA response data:", data);
      console.log("USDA nutrients received:", foodNutrients.length);
      console.log("Our nutrients database:", nutrients.length, nutrients.map(n => n.name));
      
      for (const fn of foodNutrients) {
        const usdaName = fn.nutrient?.name?.toLowerCase() || "";
        const nutrientValue = fn.amount || 0;
        
        console.log(`Processing USDA nutrient: "${fn.nutrient?.name}" = ${nutrientValue} (unitName: ${fn.nutrientUnitName || "N/A"})`);
        
        // Map USDA nutrient names to our database names
        let dbNutrientName = "";
        
        if (usdaName.includes("energy")) {
          dbNutrientName = "calories";
        } else if (usdaName.includes("fat") && !usdaName.includes("saturated") && !usdaName.includes("monounsaturated") && !usdaName.includes("polyunsaturated")) {
          dbNutrientName = "fat";
        } else if (usdaName.includes("saturated")) {
          dbNutrientName = "satFat";
        } else if (usdaName.includes("sodium")) {
          dbNutrientName = "sodium";
        } else if (usdaName.includes("carbohydrate")) {
          dbNutrientName = "carbs";
        } else if (usdaName.includes("sugar")) {
          dbNutrientName = "sugar";
        } else if (usdaName.includes("protein")) {
          dbNutrientName = "protein";
        } else if (usdaName.includes("fiber")) {
          dbNutrientName = "fiber";
        }
        
        // Find matching nutrient in our database
        if (dbNutrientName) {
          const matchedNutrient = nutrients.find(
            (n) => n.name === dbNutrientName
          );
          
          // Only add if we haven't already mapped a nutrient to this database nutrient
          if (matchedNutrient && !seenNutrientIds.has(matchedNutrient.id)) {
            updates.push({
              nutrientId: matchedNutrient.id,
              value: nutrientValue,
            });
            seenNutrientIds.add(matchedNutrient.id);
            console.log(`✓ Matched: ${usdaName} -> ${dbNutrientName} (ID: ${matchedNutrient.id}) = ${nutrientValue}`);
          } else if (matchedNutrient && seenNutrientIds.has(matchedNutrient.id)) {
            console.log(`Skipped duplicate: ${usdaName} -> ${dbNutrientName} (already have this nutrient)`);
          }
        }
      }

      console.log("Updates to send:", updates);

      // Allow saving even with 0 nutrients - user can add manually
      const updateRes = await fetch(`/api/ingredients/${ingredientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          nutrientValues: updates, 
          fdcId: String(result.fdcId)
        }),
      });

      const updateData = await updateRes.json();
      console.log("Update response status:", updateRes.status);
      console.log("Update response:", updateData);

      if (!updateRes.ok) {
        console.error("Update failed with status:", updateRes.status);
        console.error("Update error response:", updateData);
        const errorMsg = updateData.details || updateData.error || "Unknown error";
        alert(`Failed to update ingredient: ${errorMsg}`);
        return;
      }

      console.log("Ingredient updated successfully");
      onNutritionAdded?.();
      onClose();
    } catch (error) {
      console.error("selectUSDAResult error:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleManualSave = async () => {
    const updates = Object.entries(manualNutrients)
      .filter(([, val]) => val && val.trim())
      .map(([nutrientId, value]) => ({
        nutrientId: Number(nutrientId),
        value: parseFloat(value),
      }));

    if (updates.length === 0) {
      alert("Please enter at least one nutrition value");
      return;
    }

    try {
      const updateRes = await fetch(`/api/ingredients/${ingredientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nutrientValues: updates }),
      });

      if (updateRes.ok) {
        onNutritionAdded?.();
        onClose();
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update ingredient");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Add nutrition for: {ingredientName}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b">
          <button
            onClick={() => setTab("search")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === "search"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            USDA Search
          </button>
          <button
            onClick={() => setTab("manual")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === "manual"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Manual Entry
          </button>
        </div>

        {/* USDA Search Tab */}
        {tab === "search" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                placeholder="Search USDA database..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUSDASearch()}
              />
              <button
                onClick={handleUSDASearch}
                disabled={searching}
                className="border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40 disabled:opacity-50 transition"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((result) => (
                  <div
                    key={result.fdcId}
                    className="p-3 border rounded hover:bg-muted/20 cursor-pointer transition"
                    onClick={() => handleSelectUSDAResult(result)}
                  >
                    <p className="text-sm font-medium">{result.description}</p>
                    <p className="text-xs text-muted-foreground">FDC ID: {result.fdcId}</p>
                  </div>
                ))}
              </div>
            )}

            {searchQuery && !searching && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground">No results found. Try a different search.</p>
            )}
          </div>
        )}

        {/* Manual Entry Tab */}
        {tab === "manual" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-3">
              Enter nutrition values per 100g or your preferred unit:
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {nutrients.map((nutrient) => (
                <div key={nutrient.id} className="flex items-center gap-3">
                  <label className="flex-1 text-sm font-medium">{nutrient.displayName}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    className="w-24 border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
                    value={manualNutrients[nutrient.id] ?? ""}
                    onChange={(e) =>
                      setManualNutrients({
                        ...manualNutrients,
                        [nutrient.id]: e.target.value,
                      })
                    }
                  />
                  <span className="w-12 text-xs text-muted-foreground text-right">{nutrient.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-6 border-t pt-4">
          <button
            onClick={onClose}
            className="flex-1 border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40 transition"
          >
            Skip for now
          </button>
          {tab === "manual" && (
            <button
              onClick={handleManualSave}
              className="flex-1 border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/40 transition"
            >
              Save nutrition
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
