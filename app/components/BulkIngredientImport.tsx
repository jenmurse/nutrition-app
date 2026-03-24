"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";

type BulkIngredient = {
  name: string;
  calories: number;
  fat: number;
  satFat: number;
  protein: number;
  carbs: number;
  fiber: number;
  sodium: number;
  sugar: number;
  cholesterol?: number;
  customUnitName: string;
  customUnitAmount: number;
  customUnitGrams: number;
  customUnitAmountDisplay?: string; // For showing fractions like "1/64"
};

export default function BulkIngredientImport({
  onImportComplete,
}: {
  onImportComplete?: () => void;
}) {
  const [csvData, setCsvData] = useState("");
  const [parsedData, setParsedData] = useState<BulkIngredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Parse CSV/TSV data
  const handleParse = () => {
    setError("");
    try {
      const lines = csvData.trim().split("\n");
      if (lines.length < 2) {
        throw new Error("Please paste at least header + 1 data row");
      }

      // Detect if it's TSV or CSV
      const delimiter = lines[0].includes("\t") ? "\t" : ",";
      const headers = lines[0].split(delimiter).map((h) => h.trim());

      // Find column indices
      const colIndex = (name: string) =>
        headers.findIndex((h) => h.toLowerCase().includes(name.toLowerCase()));

      const itemIdx = colIndex("item");
      const qtyIdx = colIndex("qty");
      const unitIdx = colIndex("unit");
      const gramsIdx = colIndex("grams");
      const caloriesIdx = colIndex("calories");
      const fatIdx = colIndex("fat");
      const satFatIdx = colIndex("sat fat");
      const proteinIdx = colIndex("protein");
      const carbsIdx = colIndex("carbs");
      const fiberIdx = colIndex("fiber");
      const sodiumIdx = colIndex("sodium");
      const sugarIdx = colIndex("sugar");

      if (
        itemIdx === -1 ||
        gramsIdx === -1 ||
        caloriesIdx === -1 ||
        fatIdx === -1
      ) {
        throw new Error(
          "Missing required columns: Item, Grams, Calories, Fat"
        );
      }

      const ingredients: BulkIngredient[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].split(delimiter);
        if (!line[itemIdx]?.trim()) continue; // Skip empty rows

        const gramAmount = parseFloat(line[gramsIdx]);
        const itemName = line[itemIdx].trim();
        const qtyValue = line[qtyIdx]?.trim() || "1";
        const unitValue = line[unitIdx]?.trim() || "g";

        // Parse quantity (handle fractions like "1/2", "1/64", decimals, etc.)
        let customUnitAmount = 1;
        if (qtyValue.includes("/")) {
          const [num, den] = qtyValue.split("/").map((x) => parseFloat(x));
          customUnitAmount = num / den;
        } else {
          customUnitAmount = parseFloat(qtyValue) || 1;
        }

        // Normalize nutrition values to per 100g
        const caloriesPer100g =
          (parseFloat(line[caloriesIdx]) / gramAmount) * 100;
        const fatPer100g = (parseFloat(line[fatIdx]) / gramAmount) * 100;
        const satFatPer100g =
          satFatIdx !== -1
            ? (parseFloat(line[satFatIdx]) / gramAmount) * 100
            : 0;
        const proteinPer100g =
          proteinIdx !== -1
            ? (parseFloat(line[proteinIdx]) / gramAmount) * 100
            : 0;
        const carbsPer100g =
          carbsIdx !== -1 ? (parseFloat(line[carbsIdx]) / gramAmount) * 100 : 0;
        const fiberPer100g =
          fiberIdx !== -1 ? (parseFloat(line[fiberIdx]) / gramAmount) * 100 : 0;
        const sodiumPer100g =
          sodiumIdx !== -1
            ? (parseFloat(line[sodiumIdx]) / gramAmount) * 100
            : 0;
        const sugarPer100g =
          sugarIdx !== -1 ? (parseFloat(line[sugarIdx]) / gramAmount) * 100 : 0;

        ingredients.push({
          name: itemName,
          calories: Math.round(caloriesPer100g * 10) / 10,
          fat: Math.round(fatPer100g * 10) / 10,
          satFat: Math.round(satFatPer100g * 10) / 10,
          protein: Math.round(proteinPer100g * 10) / 10,
          carbs: Math.round(carbsPer100g * 10) / 10,
          fiber: Math.round(fiberPer100g * 10) / 10,
          sodium: Math.round(sodiumPer100g * 10) / 10,
          sugar: Math.round(sugarPer100g * 10) / 10,
          customUnitName: unitValue, // Just the unit name (tsp, cup, etc.)
          customUnitAmount: customUnitAmount, // The quantity (1, 0.0156, 2.5, etc.)
          customUnitGrams: gramAmount, // How many grams in that amount
          customUnitAmountDisplay: qtyValue, // Original string for display (1/64, 1/2, etc.)
        });
      }

      setParsedData(ingredients);
      setShowPreviewModal(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse data"
      );
    }
  };

  const handleImport = async () => {
    setLoading(true);
    let successCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    try {
      // Batch create ingredients
      for (const ing of parsedData) {
        try {
          const res = await fetch("/api/ingredients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: ing.name,
              defaultUnit: "other",
              customUnitName: ing.customUnitName,
              customUnitAmount: ing.customUnitAmount,
              customUnitGrams: ing.customUnitGrams,
              nutrientValues: [
                { nutrientId: 17, value: ing.calories }, // calories
                { nutrientId: 18, value: ing.fat }, // fat
                { nutrientId: 19, value: ing.satFat }, // saturated fat
                { nutrientId: 20, value: ing.sodium }, // sodium
                { nutrientId: 21, value: ing.carbs }, // carbs
                { nutrientId: 22, value: ing.sugar }, // sugar
                { nutrientId: 23, value: ing.protein }, // protein
                { nutrientId: 24, value: ing.fiber }, // fiber
              ],
            }),
          });

          if (!res.ok) {
            const errorData = await res.json();
            // Check if it's a unique constraint error (already exists)
            if (errorData.error?.includes("Unique constraint")) {
              skippedCount++;
            } else {
              throw new Error(
                `Failed to create "${ing.name}": ${errorData.error || res.statusText}`
              );
            }
          } else {
            successCount++;
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          errors.push(errorMsg);
        }
      }

      setCsvData("");
      setParsedData([]);
      setShowPreviewModal(false);
      
      let message = `Imported ${successCount} ingredient${successCount !== 1 ? "s" : ""}`;
      if (skippedCount > 0) message += `, ${skippedCount} skipped`;
      toast.success(message);
      if (errors.length > 0) toast.error(`${errors.length} error${errors.length !== 1 ? "s" : ""}: ${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} more)` : ""}`);
      onImportComplete?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to import ingredients"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Paste your ingredient data (CSV or TSV):
          </label>
          <textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder="Item	Qty	Unit	Grams	Calories	Fat (g)	..."
            className="w-full h-32 p-3 border rounded font-mono text-xs"
          />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button
          onClick={handleParse}
          className="w-full px-4 py-2 bg-[var(--accent)] text-[var(--accent-text)] rounded hover:bg-[var(--accent-hover)] text-sm font-medium"
        >
          Parse & Preview
        </button>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg">
                Preview: {parsedData.length} ingredient{parsedData.length !== 1 ? "s" : ""}
              </h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 sticky top-0">
                    <th className="border p-2 text-left">Item</th>
                    <th className="border p-2 text-left">Unit & Amount</th>
                    <th className="border p-2 text-right">Cal</th>
                    <th className="border p-2 text-right">Fat</th>
                    <th className="border p-2 text-right">Sat</th>
                    <th className="border p-2 text-right">Na</th>
                    <th className="border p-2 text-right">Carb</th>
                    <th className="border p-2 text-right">Sug</th>
                    <th className="border p-2 text-right">Pro</th>
                    <th className="border p-2 text-right">Fib</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((ing, i) => (
                    <tr key={i} className="hover:bg-gray-50 border">
                      <td className="border p-2 font-medium text-left">{ing.name}</td>
                      <td className="border p-2 text-left text-gray-600">
                        {ing.customUnitAmountDisplay} {ing.customUnitName}
                        <div className="text-xs text-gray-500">({ing.customUnitGrams}g)</div>
                      </td>
                      <td className="border p-2 text-right">{ing.calories}</td>
                      <td className="border p-2 text-right">{ing.fat}</td>
                      <td className="border p-2 text-right">{ing.satFat}</td>
                      <td className="border p-2 text-right">{ing.sodium}</td>
                      <td className="border p-2 text-right">{ing.carbs}</td>
                      <td className="border p-2 text-right">{ing.sugar}</td>
                      <td className="border p-2 text-right">{ing.protein}</td>
                      <td className="border p-2 text-right">{ing.fiber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {loading ? "Importing..." : "Import All"}
              </button>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
