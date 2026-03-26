"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";

type Nutrient = {
  id: number;
  name: string;
  displayName: string;
  unit: string;
};

type USDAResult = {
  fdcId: string;
  description: string;
};

type PendingResult = {
  fdcId: string;
  usdaDescription: string;
  nutrientUpdates: { nutrientId: number; value: number }[];
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
  const [searchQuery, setSearchQuery] = useState(ingredientName);
  const [searchResults, setSearchResults] = useState<USDAResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [fetchingFdcId, setFetchingFdcId] = useState<string | null>(null);
  const [tab, setTab] = useState<"search" | "manual">("search");
  const [manualNutrients, setManualNutrients] = useState<Record<number, string>>({});

  // Confirmation step
  const [pending, setPending] = useState<PendingResult | null>(null);
  const [confirmedName, setConfirmedName] = useState("");
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/nutrients")
      .then((r) => r.json())
      .then((d) => setNutrients(Array.isArray(d) ? d : []))
      .catch((e) => console.error(e));
  }, []);

  // Focus name field when confirm step appears
  useEffect(() => {
    if (pending) {
      setTimeout(() => nameInputRef.current?.select(), 50);
    }
  }, [pending]);

  const handleUSDASearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setPending(null);
    try {
      const res = await fetch(`/api/usda/search?query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Search failed");
      }
      const data = await res.json();
      const foods = data.foods || data || [];
      setSearchResults(Array.isArray(foods) ? foods : []);
      if (foods.length === 0) toast.info("No results found. Try a different search term.");
    } catch (error) {
      toast.error(`Search failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = async (result: USDAResult) => {
    if (fetchingFdcId) return;
    setFetchingFdcId(result.fdcId);
    setDuplicateWarning(null);

    try {
      // Check global ingredient cache + duplicate in parallel
      const [dupRes, globalRes] = await Promise.all([
        fetch(`/api/ingredients/by-fdc-id/${result.fdcId}`).catch(() => null),
        fetch(`/api/global-ingredients?fdcId=${result.fdcId}`),
      ]);

      if (dupRes?.ok) {
        const dupData = await dupRes.json();
        if (dupData.found && dupData.ingredient.id !== ingredientId) {
          setDuplicateWarning(`Note: "${dupData.ingredient.name}" already uses this USDA food.`);
        }
      }

      const globalData = globalRes.ok ? await globalRes.json() : null;

      if (globalData) {
        // Use global cache — no USDA API call needed
        const updates = globalData.nutrients.map((gn: any) => ({
          nutrientId: gn.nutrientId,
          value: gn.value,
        }));
        setPending({ fdcId: result.fdcId, usdaDescription: result.description, nutrientUpdates: updates });
        setConfirmedName(searchQuery.trim() || ingredientName);
        return;
      }

      // Not in global cache — fall back to USDA API
      const usdaRes = await fetch(`/api/usda/fetch/${result.fdcId}`);
      const data = await usdaRes.json();
      const foodNutrients = data.foodNutrients || [];
      const updates: { nutrientId: number; value: number }[] = [];
      const seen = new Set<number>();

      for (const fn of foodNutrients) {
        const usdaName = fn.nutrient?.name?.toLowerCase() || "";
        const value = fn.amount || 0;
        let dbName = "";

        if (usdaName.includes("energy")) dbName = "calories";
        else if (usdaName.includes("fat") && !usdaName.includes("saturated") && !usdaName.includes("monounsaturated") && !usdaName.includes("polyunsaturated")) dbName = "fat";
        else if (usdaName.includes("saturated")) dbName = "satFat";
        else if (usdaName.includes("sodium")) dbName = "sodium";
        else if (usdaName.includes("carbohydrate")) dbName = "carbs";
        else if (usdaName.includes("sugar")) dbName = "sugar";
        else if (usdaName.includes("protein")) dbName = "protein";
        else if (usdaName.includes("fiber")) dbName = "fiber";

        if (dbName) {
          const matched = nutrients.find((n) => n.name === dbName);
          if (matched && !seen.has(matched.id)) {
            updates.push({ nutrientId: matched.id, value });
            seen.add(matched.id);
          }
        }
      }

      setPending({ fdcId: result.fdcId, usdaDescription: result.description, nutrientUpdates: updates });
      setConfirmedName(searchQuery.trim() || ingredientName);
    } catch (error) {
      toast.error(`Error fetching nutrition: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setFetchingFdcId(null);
    }
  };

  const handleConfirmSave = async () => {
    if (!pending || !confirmedName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ingredients/${ingredientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: confirmedName.trim(),
          nutrientValues: pending.nutrientUpdates,
          fdcId: String(pending.fdcId),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Save failed");
      onNutritionAdded?.();
      onClose();
    } catch (error) {
      toast.error(`Failed to save: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleManualSave = async () => {
    const updates = Object.entries(manualNutrients)
      .filter(([, val]) => val?.trim())
      .map(([nutrientId, value]) => ({ nutrientId: Number(nutrientId), value: parseFloat(value) }));

    if (updates.length === 0) {
      toast.error("Please enter at least one nutrition value");
      return;
    }
    try {
      const res = await fetch(`/api/ingredients/${ingredientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nutrientValues: updates }),
      });
      if (res.ok) { onNutritionAdded?.(); onClose(); }
    } catch { toast.error("Failed to update ingredient"); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-raised)] border border-[var(--rule)] rounded-[var(--radius-lg,12px)] shadow-[var(--shadow-lg)] p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-[16px] text-[var(--fg)]">
            {pending ? "Review & save ingredient" : `Add nutrition for: ${ingredientName}`}
          </h2>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--fg)]" aria-label="Close">✕</button>
        </div>

        {/* ── Confirmation step ── */}
        {pending ? (
          <div className="space-y-5">
            {duplicateWarning && (
              <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--warning)]">{duplicateWarning}</p>
            )}

            {/* USDA source */}
            <div>
              <div className="font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--muted)] mb-1">USDA source</div>
              <p className="font-sans text-[12px] text-[var(--muted)]">{pending.usdaDescription}</p>
            </div>

            {/* Editable name */}
            <div>
              <label className="font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--muted)] mb-1 block" htmlFor="confirmed-name">
                Save as
              </label>
              <input
                id="confirmed-name"
                ref={nameInputRef}
                type="text"
                className="w-full border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[14px] text-[var(--fg)] focus:outline-none focus:border-[var(--fg)]"
                value={confirmedName}
                onChange={(e) => setConfirmedName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConfirmSave()}
                aria-label="Ingredient name"
              />
            </div>

            {/* Nutrient preview */}
            {pending.nutrientUpdates.length > 0 && (
              <div>
                <div className="font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--muted)] mb-2">Nutrition per 100g</div>
                <div className="flex flex-wrap gap-3">
                  {pending.nutrientUpdates.map((u) => {
                    const n = nutrients.find((x) => x.id === u.nutrientId);
                    if (!n) return null;
                    return (
                      <div key={u.nutrientId} className="font-mono text-[10px] text-[var(--fg)]">
                        <span className="text-[var(--muted)]">{n.displayName} </span>{Math.round(u.value * 10) / 10}{n.unit}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2 border-t border-[var(--rule)]">
              <button
                onClick={() => { setPending(null); setDuplicateWarning(null); }}
                className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--muted)] hover:text-[var(--fg)] bg-transparent border-0 cursor-pointer transition-colors"
              >
                ← Back
              </button>
              <div className="flex-1" />
              <button
                onClick={onClose}
                className="px-4 py-[7px] font-mono text-[9px] uppercase tracking-[0.08em] border border-[var(--rule)] text-[var(--muted)] hover:text-[var(--fg)] bg-transparent cursor-pointer transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={saving || !confirmedName.trim()}
                className="px-4 py-[7px] font-mono text-[9px] uppercase tracking-[0.08em] border border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)] cursor-pointer disabled:opacity-40 transition-colors"
              >
                {saving ? "Saving…" : "Save ingredient"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b border-[var(--rule)]">
              {(["search", "manual"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{ borderRadius: 0 }}
                  className={`px-4 py-2 font-mono text-[9px] uppercase tracking-[0.08em] border-b-2 transition ${
                    tab === t
                      ? "border-[var(--accent)] text-[var(--fg)]"
                      : "border-transparent text-[var(--muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  {t === "search" ? "USDA Search" : "Manual Entry"}
                </button>
              ))}
            </div>

            {/* USDA Search Tab */}
            {tab === "search" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 border-b border-[var(--rule)] bg-transparent px-0 py-[6px] text-[13px] text-[var(--fg)] rounded-none focus:outline-none focus:border-[var(--fg)]"
                    placeholder="Search USDA database…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUSDASearch()}
                    autoFocus
                  />
                  <button
                    onClick={handleUSDASearch}
                    disabled={searching}
                    className="px-4 py-[7px] font-mono text-[9px] uppercase tracking-[0.08em] border border-[var(--rule)] text-[var(--fg)] hover:border-[var(--rule-strong)] bg-transparent cursor-pointer disabled:opacity-40 transition-colors shrink-0"
                  >
                    {searching ? "Searching…" : "Search"}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-[2px] max-h-80 overflow-y-auto border border-[var(--rule)] rounded-[var(--radius-sm,4px)]">
                    {searchResults.map((result) => {
                      const isLoading = fetchingFdcId === result.fdcId;
                      return (
                        <div
                          key={result.fdcId}
                          role="button"
                          tabIndex={0}
                          className={`px-3 py-[10px] border-b border-[var(--rule)] transition ${
                            fetchingFdcId
                              ? isLoading
                                ? "bg-[var(--bg-subtle)] cursor-wait"
                                : "opacity-40 cursor-not-allowed"
                              : "hover:bg-[var(--bg-subtle)] cursor-pointer"
                          }`}
                          onClick={() => handleSelectResult(result)}
                          onKeyDown={(e) => e.key === "Enter" && handleSelectResult(result)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-sans text-[13px] text-[var(--fg)]">{result.description}</span>
                            {isLoading && (
                              <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--muted)] shrink-0">Loading…</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!searching && searchResults.length === 0 && searchQuery !== ingredientName && (
                  <p className="font-sans text-[12px] text-[var(--muted)]">No results. Try a different term.</p>
                )}
              </div>
            )}

            {/* Manual Entry Tab */}
            {tab === "manual" && (
              <div className="space-y-4">
                <p className="font-sans text-[12px] text-[var(--muted)]">Enter nutrition values per 100g:</p>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {nutrients.map((nutrient) => (
                    <div key={nutrient.id} className="flex items-center gap-3">
                      <label className="flex-1 font-sans text-[13px] text-[var(--fg)]">{nutrient.displayName}</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        className="w-24 border-b border-[var(--rule)] bg-transparent px-0 py-[4px] text-[13px] text-[var(--fg)] text-right focus:outline-none focus:border-[var(--fg)]"
                        value={manualNutrients[nutrient.id] ?? ""}
                        onChange={(e) => setManualNutrients({ ...manualNutrients, [nutrient.id]: e.target.value })}
                      />
                      <span className="w-10 font-mono text-[10px] text-[var(--muted)] text-right">{nutrient.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-6 pt-4 border-t border-[var(--rule)]">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-[7px] font-mono text-[9px] uppercase tracking-[0.08em] border border-[var(--rule)] text-[var(--muted)] hover:text-[var(--fg)] bg-transparent cursor-pointer transition-colors"
              >
                Skip for now
              </button>
              {tab === "manual" && (
                <button
                  onClick={handleManualSave}
                  className="flex-1 px-4 py-[7px] font-mono text-[9px] uppercase tracking-[0.08em] border border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)] cursor-pointer transition-colors"
                >
                  Save nutrition
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
