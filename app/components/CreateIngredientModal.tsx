"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { clientCache } from "@/lib/clientCache";
import type { Nutrient } from "@/types";
import { resolveAddedSugarFromUsda } from "@/lib/usdaAddedSugar";

type USDAResult = {
  fdcId: string;
  description: string;
};

type PendingResult = {
  fdcId: string;
  usdaDescription: string;
  nutrientUpdates: { nutrientId: number; value: number }[];
};

const CATEGORIES = [
  "Produce", "Meat & Seafood", "Dairy & Eggs", "Grains, Pasta & Bread",
  "Legumes", "Baking", "Nuts & Seeds", "Spices & Seasonings",
  "Condiments & Sauces", "Oils & Fats", "Frozen", "Canned & Jarred",
  "Beverages", "Alcohol", "Snacks",
];

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
  const [category, setCategory] = useState("");

  // Confirmation step
  const [pending, setPending] = useState<PendingResult | null>(null);
  const [confirmedName, setConfirmedName] = useState("");
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cached = clientCache.get<Nutrient[]>("/api/nutrients");
    if (cached) setNutrients(cached);
    fetch("/api/nutrients")
      .then((r) => r.json())
      .then((d) => { const list = Array.isArray(d) ? d : []; clientCache.set("/api/nutrients", list); setNutrients(list); })
      .catch((e) => { console.error(e); if (!cached) setNutrients([]); });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (pending) setTimeout(() => nameInputRef.current?.select(), 50);
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
      const [dupRes, globalRes] = await Promise.all([
        fetch(`/api/ingredients/by-fdc-id/${result.fdcId}`).catch(() => null),
        fetch(`/api/global-ingredients?fdcId=${result.fdcId}`),
      ]);

      if (dupRes?.ok) {
        const dupData = await dupRes.json();
        if (dupData.found && dupData.ingredient.id !== ingredientId) {
          setDuplicateWarning(`"${dupData.ingredient.name}" already uses this USDA food.`);
        }
      }

      const globalData = globalRes.ok ? await globalRes.json() : null;

      if (globalData) {
        const updates = globalData.nutrients.map((gn: { nutrientId: number; value: number }) => ({
          nutrientId: gn.nutrientId,
          value: gn.value,
        }));
        setPending({ fdcId: result.fdcId, usdaDescription: result.description, nutrientUpdates: updates });
        setConfirmedName(searchQuery.trim() || ingredientName);
        return;
      }

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
        // Order matters: "added sugar" must match before plain "sugar"
        else if (usdaName.includes("added") && usdaName.includes("sugar")) dbName = "addedSugar";
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

      // Whole-food whitelist fallback for added sugar
      const addedSugarNutrient = nutrients.find((n) => n.name === "addedSugar");
      if (addedSugarNutrient && !seen.has(addedSugarNutrient.id)) {
        const fallback = resolveAddedSugarFromUsda(data);
        if (fallback !== null) {
          updates.push({ nutrientId: addedSugarNutrient.id, value: fallback });
          seen.add(addedSugarNutrient.id);
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
          category,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Save failed");
      clientCache.invalidate("/api/ingredients");
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
        body: JSON.stringify({ nutrientValues: updates, category }),
      });
      if (res.ok) { clientCache.invalidate("/api/ingredients"); onNutritionAdded?.(); onClose(); }
    } catch { toast.error("Failed to update ingredient"); }
  };

  const handleSkip = async () => {
    if (category) {
      try {
        await fetch(`/api/ingredients/${ingredientId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category }),
        });
        clientCache.invalidate("/api/ingredients");
      } catch { /* non-blocking */ }
    }
    onClose();
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ci-title"
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in"
        style={{
          background: "var(--bg)",
          border: "1px solid var(--fg)",
          borderRadius: 0,
          width: "90%",
          maxWidth: "560px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between" style={{ padding: "28px 32px 20px", gap: "16px", flexShrink: 0 }}>
          <h2
            id="ci-title"
            style={{
              fontFamily: "var(--font-sans), sans-serif",
              fontSize: "24px",
              fontWeight: 700,
              color: "var(--fg)",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            {pending ? "Review & save." : `Add nutrition for "${ingredientName}".`}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="bg-transparent border-0 cursor-pointer hover:opacity-70 transition-opacity"
            style={{ color: "var(--muted)", fontSize: "16px", lineHeight: 1, padding: 0, marginTop: "4px" }}
          >
            ✕
          </button>
        </div>

        {/* ── Confirmation step ── */}
        {pending ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "0 32px 28px", overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}>
            {duplicateWarning && (
              <p
                style={{
                  fontFamily: "var(--font-mono), 'DM Mono', ui-monospace, monospace",
                  fontSize: "9px",
                  fontWeight: 400,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                }}
              >
                Note — {duplicateWarning}
              </p>
            )}

            {/* USDA source */}
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono), 'DM Mono', ui-monospace, monospace",
                  fontSize: "9px",
                  fontWeight: 400,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  marginBottom: "6px",
                }}
              >
                USDA source
              </div>
              <p
                style={{
                  fontFamily: "var(--font-sans), sans-serif",
                  fontSize: "13px",
                  color: "var(--fg-2)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.6,
                }}
              >
                {pending.usdaDescription}
              </p>
            </div>

            {/* Editable name */}
            <div>
              <label
                htmlFor="confirmed-name"
                style={{
                  display: "block",
                  fontFamily: "var(--font-mono), 'DM Mono', ui-monospace, monospace",
                  fontSize: "9px",
                  fontWeight: 400,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  marginBottom: "8px",
                }}
              >
                Save as
              </label>
              <input
                id="confirmed-name"
                ref={nameInputRef}
                type="text"
                className="ed-input"
                value={confirmedName}
                onChange={(e) => setConfirmedName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConfirmSave()}
                aria-label="Ingredient name"
              />
            </div>

            {/* Category */}
            <div>
              <label
                htmlFor="confirmed-category"
                style={{
                  display: "block",
                  fontFamily: "var(--font-mono), 'DM Mono', ui-monospace, monospace",
                  fontSize: "9px",
                  fontWeight: 400,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  marginBottom: "8px",
                }}
              >
                Category
              </label>
              <select
                id="confirmed-category"
                className="ed-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Ingredient category"
                style={{ width: "100%" }}
              >
                <option value="">Uncategorized</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Nutrient preview */}
            {pending.nutrientUpdates.length > 0 && (
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono), 'DM Mono', ui-monospace, monospace",
                    fontSize: "9px",
                    fontWeight: 400,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: "10px",
                  }}
                >
                  Nutrition per 100g
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px" }}>
                  {pending.nutrientUpdates.map((u) => {
                    const n = nutrients.find((x) => x.id === u.nutrientId);
                    if (!n) return null;
                    return (
                      <div
                        key={u.nutrientId}
                        style={{
                          fontFamily: "var(--font-mono), 'DM Mono', ui-monospace, monospace",
                          fontSize: "11px",
                          color: "var(--fg)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        <span style={{ color: "var(--muted)", textTransform: "uppercase" }}>{n.displayName} </span>
                        {Math.round(u.value * 10) / 10}{n.unit}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingTop: "16px", borderTop: "1px solid var(--rule)" }}>
              <button onClick={() => { setPending(null); setDuplicateWarning(null); }} className="ed-btn ghost">
                ← Back
              </button>
              <div style={{ flex: 1 }} />
              <button onClick={handleSkip} className="ed-btn">Skip</button>
              <button onClick={handleConfirmSave} disabled={saving || !confirmedName.trim()} className="ed-btn primary">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "0 32px 28px", overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}>
            {/* Category — surfaced up front so it isn't forgotten */}
            <div>
              <label
                htmlFor="ci-category"
                style={{
                  display: "block",
                  fontFamily: "var(--font-mono), 'DM Mono', ui-monospace, monospace",
                  fontSize: "9px",
                  fontWeight: 400,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  marginBottom: "8px",
                }}
              >
                Category
              </label>
              <select
                id="ci-category"
                className="ed-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Ingredient category"
                style={{ width: "100%" }}
              >
                <option value="">Uncategorized</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Tabs — ink underline (active toggle convention §11) */}
            <div style={{ display: "flex", gap: "20px", borderBottom: "1px solid var(--rule)" }}>
              {(["search", "manual"] as const).map((t) => {
                const active = tab === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      fontFamily: "var(--font-mono), 'DM Mono', ui-monospace, monospace",
                      fontSize: "9px",
                      fontWeight: 400,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      background: "none",
                      border: "none",
                      borderBottom: `1.5px solid ${active ? "var(--fg)" : "transparent"}`,
                      color: active ? "var(--fg)" : "var(--muted)",
                      paddingBottom: "10px",
                      marginBottom: "-1px",
                      cursor: "pointer",
                      transition: "color 120ms var(--ease-out)",
                    }}
                  >
                    {t === "search" ? "USDA Search" : "Manual Entry"}
                  </button>
                );
              })}
            </div>

            {/* USDA Search Tab */}
            {tab === "search" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                  <input
                    type="text"
                    className="ed-input"
                    style={{ flex: 1 }}
                    placeholder="Search USDA database…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUSDASearch()}
                    autoFocus
                  />
                  <button onClick={handleUSDASearch} disabled={searching} className="ed-btn">
                    {searching ? "Searching…" : "Search"}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div style={{ maxHeight: "320px", overflowY: "auto", border: "1px solid var(--rule)" }}>
                    {searchResults.map((result) => {
                      const isLoading = fetchingFdcId === result.fdcId;
                      return (
                        <div
                          key={result.fdcId}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelectResult(result)}
                          onKeyDown={(e) => e.key === "Enter" && handleSelectResult(result)}
                          style={{
                            padding: "12px 14px",
                            borderBottom: "1px solid var(--rule)",
                            cursor: fetchingFdcId ? (isLoading ? "wait" : "not-allowed") : "pointer",
                            opacity: fetchingFdcId && !isLoading ? 0.4 : 1,
                            transition: "background 120ms var(--ease-out)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "12px",
                          }}
                          onMouseEnter={(e) => { if (!fetchingFdcId) e.currentTarget.style.background = "var(--bg-2)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                          <span style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: "13px", letterSpacing: "-0.03em", color: "var(--fg)" }}>
                            {result.description}
                          </span>
                          {isLoading && (
                            <span style={{ fontFamily: "var(--font-mono), 'DM Mono', ui-monospace, monospace", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", flexShrink: 0 }}>
                              Loading…
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {!searching && searchResults.length === 0 && searchQuery !== ingredientName && (
                  <p style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: "13px", color: "var(--muted)", letterSpacing: "-0.03em" }}>
                    No results. Try a different term.
                  </p>
                )}
              </div>
            )}

            {/* Manual Entry Tab */}
            {tab === "manual" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: "13px", color: "var(--fg-2)", letterSpacing: "-0.03em" }}>
                  Enter nutrition values per 100g.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "320px", overflowY: "auto" }}>
                  {nutrients.map((nutrient) => (
                    <div key={nutrient.id} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <label style={{ flex: 1, fontFamily: "var(--font-sans), sans-serif", fontSize: "13px", letterSpacing: "-0.03em", color: "var(--fg)" }}>
                        {nutrient.displayName}
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        className="ed-input"
                        style={{ width: "96px", textAlign: "right" }}
                        value={manualNutrients[nutrient.id] ?? ""}
                        onChange={(e) => setManualNutrients({ ...manualNutrients, [nutrient.id]: e.target.value })}
                      />
                      <span style={{ width: "32px", fontFamily: "var(--font-mono), 'DM Mono', ui-monospace, monospace", fontSize: "11px", color: "var(--muted)", textAlign: "right" }}>
                        {nutrient.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px", paddingTop: "16px", borderTop: "1px solid var(--rule)" }}>
              <button onClick={handleSkip} className="ed-btn">Skip for now</button>
              {tab === "manual" && (
                <button onClick={handleManualSave} className="ed-btn primary">Save nutrition</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
