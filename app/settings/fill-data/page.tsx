"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "@/lib/toast";

type Nutrient = { id: number; name: string; displayName: string; unit: string; orderIndex: number };

type IngredientRow = {
  id: number;
  name: string;
  category: string;
  // Per-nutrient value, keyed by nutrient.id. undefined = no row exists (unknown).
  nutrientValues: Record<number, number | undefined>;
};

type Filter = "all" | "set" | "unknown";

export default function FillDataPage() {
  const [nutrients, setNutrients] = useState<Nutrient[]>([]);
  const [selectedNutrientId, setSelectedNutrientId] = useState<number | null>(null);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [drafts, setDrafts] = useState<Record<number, string>>({}); // input strings keyed by ingredient.id
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load nutrients + ingredients
  useEffect(() => {
    (async () => {
      const [nutRes, ingRes] = await Promise.all([
        fetch("/api/nutrients"),
        fetch("/api/ingredients"),
      ]);
      if (!nutRes.ok || !ingRes.ok) {
        toast.error("Failed to load data");
        return;
      }
      const nuts: Nutrient[] = await nutRes.json();
      const ings: Array<{
        id: number;
        name: string;
        category?: string;
        nutrientValues: Array<{ nutrientId: number; value: number }>;
      }> = await ingRes.json();

      setNutrients(nuts);
      // Default to addedSugar if it exists; else first nutrient
      const added = nuts.find((n) => n.name === "addedSugar");
      setSelectedNutrientId(added?.id ?? nuts[0]?.id ?? null);
      setIngredients(
        ings.map((i) => ({
          id: i.id,
          name: i.name,
          category: i.category || "—",
          nutrientValues: Object.fromEntries(i.nutrientValues.map((nv) => [nv.nutrientId, nv.value])),
        }))
      );
      setLoading(false);
    })();
  }, []);

  const selectedNutrient = useMemo(
    () => nutrients.find((n) => n.id === selectedNutrientId) ?? null,
    [nutrients, selectedNutrientId]
  );

  const filtered = useMemo(() => {
    if (!selectedNutrient) return [];
    const q = search.trim().toLowerCase();
    return ingredients
      .filter((ing) => {
        if (q && !ing.name.toLowerCase().includes(q)) return false;
        const hasValue = ing.nutrientValues[selectedNutrient.id] !== undefined;
        if (filter === "set" && !hasValue) return false;
        if (filter === "unknown" && hasValue) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [ingredients, selectedNutrient, search, filter]);

  const counts = useMemo(() => {
    if (!selectedNutrient) return { set: 0, unknown: 0, total: 0 };
    let set = 0;
    let unknown = 0;
    for (const ing of ingredients) {
      if (ing.nutrientValues[selectedNutrient.id] !== undefined) set++;
      else unknown++;
    }
    return { set, unknown, total: ingredients.length };
  }, [ingredients, selectedNutrient]);

  function getDraftValue(ing: IngredientRow): string {
    if (drafts[ing.id] !== undefined) return drafts[ing.id];
    if (!selectedNutrient) return "";
    const v = ing.nutrientValues[selectedNutrient.id];
    return v !== undefined ? String(v) : "";
  }

  function setDraft(ingId: number, value: string) {
    setDrafts((prev) => ({ ...prev, [ingId]: value }));
  }

  async function saveRow(ing: IngredientRow) {
    if (!selectedNutrient) return;
    const raw = drafts[ing.id];
    if (raw === undefined) return; // no change
    const trimmed = raw.trim();
    const value: number | null = trimmed === "" ? null : Number(trimmed);
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      toast.error("Enter a non-negative number, or leave blank for unknown");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/ingredients/bulk-nutrient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nutrientId: selectedNutrient.id,
          updates: [{ ingredientId: ing.id, value }],
        }),
      });
      if (!r.ok) throw new Error("save failed");
      // Update local state
      setIngredients((prev) =>
        prev.map((i) => {
          if (i.id !== ing.id) return i;
          const next = { ...i.nutrientValues };
          if (value === null) delete next[selectedNutrient.id];
          else next[selectedNutrient.id] = value;
          return { ...i, nutrientValues: next };
        })
      );
      setDrafts((prev) => {
        const { [ing.id]: _, ...rest } = prev;
        return rest;
      });
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function bulkSetUnknownToZero() {
    if (!selectedNutrient) return;
    const targets = filtered.filter((i) => i.nutrientValues[selectedNutrient.id] === undefined);
    if (targets.length === 0) {
      toast.error("No unknown items in view");
      return;
    }
    const confirmed = window.confirm(
      `Set ${targets.length} unknown ${selectedNutrient.displayName} value${targets.length === 1 ? "" : "s"} to 0?`
    );
    if (!confirmed) return;
    setSaving(true);
    try {
      const r = await fetch("/api/ingredients/bulk-nutrient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nutrientId: selectedNutrient.id,
          updates: targets.map((t) => ({ ingredientId: t.id, value: 0 })),
        }),
      });
      if (!r.ok) throw new Error("bulk save failed");
      const body = await r.json();
      setIngredients((prev) =>
        prev.map((i) => {
          if (!targets.find((t) => t.id === i.id)) return i;
          return { ...i, nutrientValues: { ...i.nutrientValues, [selectedNutrient.id]: 0 } };
        })
      );
      toast.success(`Set ${body.written ?? targets.length} to 0`);
    } catch {
      toast.error("Bulk save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 64, color: "var(--muted)" }}>Loading…</div>;
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px 96px" }}>
      <div style={{ marginBottom: 32 }}>
        <Link href="/settings" className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] hover:text-[var(--fg)]">← Settings</Link>
      </div>

      <div style={{ marginBottom: 8 }}>
        <span className="font-mono text-[13px] font-semibold text-[var(--rule)] tracking-[0.14em]">§ FILL DATA</span>
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 500, letterSpacing: "-0.03em", marginBottom: 8 }}>
        Fill missing nutrient data.
      </h1>
      <p style={{ color: "var(--muted)", lineHeight: 1.6, maxWidth: 720, marginBottom: 32 }}>
        Bulk-edit nutrient values across your pantry. A blank input means unknown — the recipe panel will show <span style={{ color: "var(--fg)" }}>—</span> instead of <span style={{ color: "var(--fg)" }}>0g</span>. Type a number (including <code>0</code>) for an explicit value.
      </p>

      {/* ── Nutrient picker ─────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <label className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]" style={{ display: "block", marginBottom: 6 }}>
          Nutrient
        </label>
        <select
          className="ed-input"
          value={selectedNutrientId ?? ""}
          onChange={(e) => {
            setSelectedNutrientId(Number(e.target.value));
            setDrafts({});
          }}
          style={{ maxWidth: 280 }}
        >
          {nutrients.map((n) => (
            <option key={n.id} value={n.id}>
              {n.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* ── Summary ─────────────────────────────────── */}
      {selectedNutrient && (
        <div style={{ display: "flex", gap: 24, marginBottom: 24, fontFamily: "var(--font-mono), 'DM Mono', monospace", fontSize: 11, color: "var(--muted)" }}>
          <span><strong style={{ color: "var(--fg)", fontWeight: 500 }}>{counts.set}</strong> set</span>
          <span><strong style={{ color: "var(--fg)", fontWeight: 500 }}>{counts.unknown}</strong> unknown</span>
          <span>of <strong style={{ color: "var(--fg)", fontWeight: 500 }}>{counts.total}</strong> total</span>
        </div>
      )}

      {/* ── Filter + search + bulk action ───────────── */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, border: "1px solid var(--rule)" }}>
          {(["all", "set", "unknown"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="font-mono text-[9px] uppercase tracking-[0.14em]"
              style={{
                padding: "8px 14px",
                background: filter === f ? "var(--fg)" : "transparent",
                color: filter === f ? "var(--bg)" : "var(--muted)",
                border: 0,
                cursor: "pointer",
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ed-input"
          style={{ flex: 1, maxWidth: 320 }}
        />
        <button
          type="button"
          onClick={bulkSetUnknownToZero}
          disabled={saving || filter === "set"}
          className="ed-btn"
          style={{ opacity: saving ? 0.4 : 1 }}
        >
          SET UNKNOWN VISIBLE → 0
        </button>
      </div>

      {/* ── Table ───────────────────────────────────── */}
      {selectedNutrient && (
        <div style={{ borderTop: "1px solid var(--rule)" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
              No ingredients match.
            </div>
          ) : (
            filtered.map((ing) => {
              const currentValue = ing.nutrientValues[selectedNutrient.id];
              const isUnknown = currentValue === undefined;
              const draft = getDraftValue(ing);
              const isDirty = drafts[ing.id] !== undefined;
              return (
                <div
                  key={ing.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto auto",
                    gap: 16,
                    alignItems: "center",
                    padding: "14px 16px",
                    borderBottom: "1px solid var(--rule)",
                    background: isDirty ? "var(--bg-2)" : "transparent",
                  }}
                >
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.14em]"
                    style={{ color: "var(--muted)", minWidth: 100 }}
                  >
                    {ing.category || "—"}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.03em", color: "var(--fg)" }}>
                    {ing.name}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder={isUnknown ? "—" : "0"}
                      value={draft}
                      onChange={(e) => setDraft(ing.id, e.target.value)}
                      onBlur={() => isDirty && saveRow(ing)}
                      onKeyDown={(e) => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); } }}
                      style={{
                        width: 80,
                        padding: "6px 8px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono), 'DM Mono', monospace",
                        fontSize: 12,
                        border: `1px solid ${isDirty ? "var(--fg)" : "var(--rule)"}`,
                        background: "var(--bg)",
                        color: "var(--fg)",
                      }}
                      aria-label={`${selectedNutrient.displayName} for ${ing.name}`}
                    />
                    <span className="font-mono text-[9px] text-[var(--muted)]" style={{ minWidth: 24 }}>
                      {selectedNutrient.unit}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(ing.id, "");
                      saveRow({ ...ing, nutrientValues: { ...ing.nutrientValues, [selectedNutrient.id]: undefined } });
                    }}
                    disabled={isUnknown}
                    className="font-mono text-[9px] uppercase tracking-[0.14em]"
                    style={{
                      padding: "6px 10px",
                      background: "transparent",
                      color: isUnknown ? "var(--rule)" : "var(--muted)",
                      border: 0,
                      cursor: isUnknown ? "default" : "pointer",
                    }}
                    aria-label={`Clear ${selectedNutrient.displayName} for ${ing.name}`}
                    title={isUnknown ? "Already unknown" : "Clear to unknown"}
                  >
                    Clear
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
