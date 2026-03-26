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
          <label className="block font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-2">
            Paste your ingredient data (CSV or TSV):
          </label>
          <textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder="Item	Qty	Unit	Grams	Calories	Fat (g)	..."
            className="w-full h-32 p-3 border border-[var(--rule)] bg-[var(--bg)] font-mono text-[11px] text-[var(--fg)] rounded-[var(--radius-sm,4px)]"
            aria-label="Ingredient CSV data"
          />
        </div>
        {error && <div className="text-[var(--error)] text-[11px]">{error}</div>}
        <button
          onClick={handleParse}
          className="w-full px-4 py-2 bg-[var(--accent)] text-[var(--accent-text)] rounded-[var(--radius-sm,4px)] hover:bg-[var(--accent-hover)] font-mono text-[9px] uppercase tracking-[0.1em] transition-colors"
        >
          Parse & Preview
        </button>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-raised)] border border-[var(--rule)] rounded-[var(--radius-lg,12px)] shadow-[var(--shadow-lg)] max-w-6xl w-full max-h-[90vh] flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--rule)]">
              <h3 className="font-sans text-[13px] font-medium text-[var(--fg)]">
                Preview: {parsedData.length} ingredient{parsedData.length !== 1 ? "s" : ""}
              </h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
                aria-label="Close preview"
              >
                Close
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto px-5 py-4">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-subtle)] sticky top-0">
                    <th className="border border-[var(--rule)] p-2 text-left font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted)]">Item</th>
                    <th className="border border-[var(--rule)] p-2 text-left font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted)]">Unit & Amount</th>
                    <th className="border border-[var(--rule)] p-2 text-right font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted)]">Cal</th>
                    <th className="border border-[var(--rule)] p-2 text-right font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted)]">Fat</th>
                    <th className="border border-[var(--rule)] p-2 text-right font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted)]">Sat</th>
                    <th className="border border-[var(--rule)] p-2 text-right font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted)]">Na</th>
                    <th className="border border-[var(--rule)] p-2 text-right font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted)]">Carb</th>
                    <th className="border border-[var(--rule)] p-2 text-right font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted)]">Sug</th>
                    <th className="border border-[var(--rule)] p-2 text-right font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted)]">Pro</th>
                    <th className="border border-[var(--rule)] p-2 text-right font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted)]">Fib</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((ing, i) => (
                    <tr key={i} className="hover:bg-[var(--bg-subtle)] border border-[var(--rule)]">
                      <td className="border border-[var(--rule)] p-2 font-medium text-left text-[var(--fg)]">{ing.name}</td>
                      <td className="border border-[var(--rule)] p-2 text-left text-[var(--muted)]">
                        {ing.customUnitAmountDisplay} {ing.customUnitName}
                        <div className="text-[10px] text-[var(--muted)]">({ing.customUnitGrams}g)</div>
                      </td>
                      <td className="border border-[var(--rule)] p-2 text-right text-[var(--fg)]">{ing.calories}</td>
                      <td className="border border-[var(--rule)] p-2 text-right text-[var(--fg)]">{ing.fat}</td>
                      <td className="border border-[var(--rule)] p-2 text-right text-[var(--fg)]">{ing.satFat}</td>
                      <td className="border border-[var(--rule)] p-2 text-right text-[var(--fg)]">{ing.sodium}</td>
                      <td className="border border-[var(--rule)] p-2 text-right text-[var(--fg)]">{ing.carbs}</td>
                      <td className="border border-[var(--rule)] p-2 text-right text-[var(--fg)]">{ing.sugar}</td>
                      <td className="border border-[var(--rule)] p-2 text-right text-[var(--fg)]">{ing.protein}</td>
                      <td className="border border-[var(--rule)] p-2 text-right text-[var(--fg)]">{ing.fiber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-[var(--rule)]">
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-[var(--accent)] text-[var(--accent-text)] rounded-[var(--radius-sm,4px)] hover:bg-[var(--accent-hover)] disabled:opacity-50 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors"
              >
                {loading ? "Importing..." : "Import All"}
              </button>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 border border-[var(--rule)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--rule-strong)] rounded-[var(--radius-sm,4px)] font-mono text-[9px] uppercase tracking-[0.1em] transition-colors"
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
