"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import RecipeBuilder, { type RecipeBuilderHandle } from "../../components/RecipeBuilder";
import { usePersonContext } from "../../components/PersonContext";
import { toast } from "@/lib/toast";
import { dialog } from "@/lib/dialog";
import { clientCache } from "@/lib/clientCache";
import { marked } from "marked";
import { APP_NAME } from "@/lib/brand";
import ContextualTip from "../../components/ContextualTip";
import EmptyState from "../../components/EmptyState";
import Link from "next/link";
import type { Goal } from "@/types";

type RecipeDetail = {
  id: number;
  name: string;
  isComplete?: boolean;
  servingSize: number;
  servingUnit: string;
  instructions: string;
  sourceApp?: string | null;
  tags?: string;
  prepTime?: number | null;
  cookTime?: number | null;
  image?: string | null;
  optimizeAnalysis?: string | null;
  mealPrepAnalysis?: string | null;
  isFavorited?: boolean;
  totals?: Array<{ nutrientId: number; displayName: string; value: number; unit: string }>;
  ingredients: Array<{
    id: number;
    ingredientId?: number | null;
    quantity: number;
    unit: string;
    notes?: string | null;
    originalText?: string | null;
    section?: string | null;
    ingredient?: { id: number; name: string } | null;
  }>;
};

type RecipeDraft = {
  id?: number;
  name: string;
  servingSize: number;
  servingUnit: string;
  instructions: string;
  tags?: string;
  sourceApp?: string | null;
  isComplete?: boolean;
  prepTime?: number | null;
  cookTime?: number | null;
  image?: string | null;
  ingredients: Array<{
    id: string;
    ingredientId?: number | null;
    quantity?: number;
    unit?: string;
    originalText?: string;
    nameGuess?: string;
    section?: string | null;
    notes?: string;
  }>;
};


const JUMP_SECTIONS = [
  { id: "rd-sec-ing", n: "01", label: "Ingredients" },
  { id: "rd-sec-nut", n: "02", label: "Nutrition" },
  { id: "rd-sec-steps", n: "03", label: "Instructions" },
  { id: "rd-sec-opt", n: "04", label: "Optimize" },
  { id: "rd-sec-prep", n: "05", label: "Meal Prep" },
];

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { selectedPerson } = usePersonContext();
  const recipeId = Number(params.id);
  const builderRef = useRef<RecipeBuilderHandle>(null);

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<RecipeDraft | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Jump nav active section
  const [activeSection, setActiveSection] = useState(JUMP_SECTIONS[0].id);

  // Scale
  const [scale, setScale] = useState(1);

  // Favorites
  const [isFavorited, setIsFavorited] = useState(false);

  // Notes
  const [editingNotes, setEditingNotes] = useState<"optimization" | "mealPrep" | null>(null);
  const [notesText, setNotesText] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState<"optimization" | "mealPrep" | null>(null);
  const [hasMcp, setHasMcp] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detect touch/tablet devices (phones + iPads both get the MCP unavailable message)
  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // Goals for nutrition bars
  const [goals, setGoals] = useState<Goal[]>([]);

  // Fetch recipe
  useEffect(() => {
    const cached = clientCache.get<RecipeDetail>(`/api/recipes/${recipeId}`);
    if (cached) {
      setRecipe(cached);
      setIsFavorited(!!cached.isFavorited);
      setLoading(false);
      // Background revalidate
      fetch(`/api/recipes/${recipeId}`).then(r => r.json()).then(data => {
        if (data?.recipe) {
          const full = { ...data.recipe, totals: data.totals, isFavorited: !!data.isFavorited };
          clientCache.set(`/api/recipes/${recipeId}`, full);
          setRecipe(full);
          setIsFavorited(!!data.isFavorited);
        }
      }).catch(console.error);
      return;
    }
    setLoading(true);
    fetch(`/api/recipes/${recipeId}`)
      .then(r => r.json())
      .then(data => {
        if (data?.recipe) {
          const full = { ...data.recipe, totals: data.totals, isFavorited: !!data.isFavorited };
          clientCache.set(`/api/recipes/${recipeId}`, full);
          setRecipe(full);
          setIsFavorited(!!data.isFavorited);
        }
      })
      .catch(e => { console.error(e); toast.error("Failed to load recipe"); })
      .finally(() => setLoading(false));
  }, [recipeId]);

  // Fetch goals
  useEffect(() => {
    if (!selectedPerson?.id) return;
    const cacheKey = `/api/persons/${selectedPerson.id}/goals`;
    const cached = clientCache.get<Goal[]>(cacheKey);
    if (cached) { setGoals(cached); return; }
    fetch(cacheKey).then(r => r.ok ? r.json() : []).then(data => {
      const list = Array.isArray(data) ? data : [];
      clientCache.set(cacheKey, list);
      setGoals(list);
    }).catch(() => {});
  }, [selectedPerson?.id]);

  // Check MCP setup
  useEffect(() => {
    fetch("/api/onboarding").then(r => r.json()).then(d => {
      if (typeof d.hasMcp === "boolean") setHasMcp(d.hasMcp);
    }).catch(() => {});
  }, []);

  // Scroll-position tracking for jump nav
  const jumpNavLocked = useRef(false);
  useEffect(() => {
    const scrollEl = document.getElementById("rd-scroll-container");
    if (!scrollEl || editMode) return;
    const sectionIds = JUMP_SECTIONS.map(s => s.id);
    const update = () => {
      if (jumpNavLocked.current) return;
      const paneRect = scrollEl.getBoundingClientRect();
      const nearBottom = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 60;
      let activeId = sectionIds[0];
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - paneRect.top <= 100) activeId = id;
      }
      if (nearBottom) {
        const threshold = paneRect.top + paneRect.height * 0.6;
        for (const id of sectionIds) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top < threshold) activeId = id;
        }
      }
      setActiveSection(activeId);
    };
    scrollEl.addEventListener("scroll", update, { passive: true });
    update();
    return () => scrollEl.removeEventListener("scroll", update);
  }, [recipe, editMode]);

  // Render notes
  function renderNotesHtml(text: string): string {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed?.sections) && parsed.sections[0]?.suggestions) {
        return parsed.sections.map((s: { label: string; suggestions: string[] }) =>
          `<h3>${s.label}</h3><ul>${s.suggestions.map((t: string) => `<li>${t}</li>`).join("")}</ul>`
        ).join("");
      }
      if (Array.isArray(parsed?.sections) && parsed.sections[0]?.notes) {
        const header = parsed.scoreLabel ? `<p><strong>${parsed.scoreLabel}</strong> (score: ${parsed.score}/5)</p>` : "";
        return header + parsed.sections.map((s: { label: string; notes: string[] }) =>
          `<h3>${s.label}</h3><ul>${s.notes.map((t: string) => `<li>${t}</li>`).join("")}</ul>`
        ).join("");
      }
    } catch { /* markdown */ }
    const normalized = text.replace(/¼/g, "1/4").replace(/½/g, "1/2").replace(/¾/g, "3/4").replace(/⅓/g, "1/3").replace(/⅔/g, "2/3");
    return marked.parse(normalized) as string;
  }

  const handleDelete = async () => {
    if (!recipe) return;
    if (!await dialog.confirm({ title: `Delete "${recipe.name}"?`, body: "This can't be undone.", confirmLabel: "Delete", danger: true })) return;
    try {
      const r = await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
      if (r.ok) {
        clientCache.delete(`/api/recipes/${recipe.id}`);
        const cached = clientCache.get<any[]>("/api/recipes");
        if (cached) clientCache.set("/api/recipes", cached.filter(r => r.id !== recipe.id));
        router.push("/recipes");
      } else toast.error("Failed to delete recipe");
    } catch { toast.error("Failed to delete recipe"); }
  };

  const handleDuplicate = async () => {
    if (!recipe) return;
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Duplicate failed");
      clientCache.delete("/api/recipes");
      clientCache.delete("/api/recipes?slim=true");
      router.push(`/recipes/${data.recipe.id}`);
    } catch (e) { console.error(e); toast.error("Failed to duplicate recipe"); }
  };

  const handleEditClick = async () => {
    if (!recipe) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fetch failed");
      const rd = data.recipe;
      setEditDraft({
        id: rd.id,
        name: rd.name,
        servingSize: rd.servingSize,
        servingUnit: rd.servingUnit,
        instructions: rd.instructions || "",
        tags: rd.tags || "",
        sourceApp: rd.sourceApp ?? null,
        isComplete: rd.isComplete,
        prepTime: rd.prepTime ?? null,
        cookTime: rd.cookTime ?? null,
        image: rd.image ?? null,
        ingredients: (rd.ingredients || []).map((item: any) => ({
          id: `edit-${item.id}`,
          ingredientId: item.ingredientId ?? null,
          quantity: item.quantity ?? 0,
          unit: item.unit || "",
          originalText: item.originalText || "",
          nameGuess: item.ingredient?.name || item.originalText || "",
          section: item.section ?? null,
          notes: item.notes || null,
        })),
      });
      setEditMode(true);
    } catch (e) { console.error(e); toast.error("Failed to load recipe"); }
    finally { setEditLoading(false); }
  };

  const handleSaveNotes = async (field: "optimization" | "mealPrep") => {
    if (!recipe) return;
    setSavingNotes(true);
    try {
      const body = field === "optimization" ? { optimizeAnalysis: notesText } : { mealPrepAnalysis: notesText };
      const res = await fetch(`/api/recipes/${recipe.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Save failed");
      const updated = { ...recipe, ...(field === "optimization" ? { optimizeAnalysis: notesText } : { mealPrepAnalysis: notesText }) };
      setRecipe(updated);
      clientCache.set(`/api/recipes/${recipe.id}`, updated);
      setEditingNotes(null);
      toast.success("Notes saved");
    } catch { toast.error("Failed to save notes"); }
    finally { setSavingNotes(false); }
  };

  const toggleFavorite = async () => {
    const next = !isFavorited;
    setIsFavorited(next);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/favorite`, { method: next ? "POST" : "DELETE" });
      if (!res.ok) {
        setIsFavorited(!next);
      } else {
        clientCache.delete("/api/recipes");
        clientCache.delete("/api/recipes?slim=true");
        const cached = clientCache.get<RecipeDetail>(`/api/recipes/${recipeId}`);
        if (cached) clientCache.set(`/api/recipes/${recipeId}`, { ...cached, isFavorited: next });
      }
    } catch {
      setIsFavorited(!next);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    const container = document.getElementById("rd-scroll-container");
    if (el && container) {
      setActiveSection(id);
      jumpNavLocked.current = true;
      container.scrollTo({ top: el.offsetTop - 40, behavior: "smooth" });
      setTimeout(() => { jumpNavLocked.current = false; }, 800);
    }
  };

  // Nutrition helpers
  const GRID_KEYS: { match: string[]; label: string; exact?: boolean }[] = [
    { match: ["energy", "calorie"], label: "CALORIES" },
    { match: ["fat"], label: "FAT", exact: true },
    { match: ["saturated"], label: "SAT FAT" },
    { match: ["sodium"], label: "SODIUM" },
    { match: ["carbohydrate", "carb"], label: "CARBS" },
    { match: ["sugar"], label: "SUGAR" },
    { match: ["protein"], label: "PROTEIN" },
    { match: ["fiber"], label: "FIBER" },
  ];

  const getNutrient = (totals: RecipeDetail["totals"], keys: string[], exact?: boolean) => {
    if (!totals) return null;
    return totals.find(t => {
      const name = t.displayName.toLowerCase();
      return exact ? keys.some(k => name === k) : keys.some(k => name.includes(k));
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="font-mono text-[13px] font-light text-[var(--muted)] animate-loading">Loading recipe…</div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          eyebrow="§ RECIPE NOT FOUND"
          headline="Nothing here."
          lede="This recipe may have been deleted or the link is broken."
          ctaLabel="← BACK TO RECIPES"
          ctaHref="/recipes"
        />
      </div>
    );
  }

  // ── Edit Mode ──
  if (editMode && editDraft) {
    const EDIT_SECTIONS = [
      { id: "rf-sec-basics", n: "01", label: "Basics" },
      { id: "rf-sec-photo", n: "02", label: "Photo" },
      { id: "rf-sec-ingredients", n: "03", label: "Ingredients" },
      { id: "rf-sec-method", n: "04", label: "Method" },
      { id: "rf-sec-nutrition", n: "05", label: "Nutrition" },
    ];
    return (
      <div className="form-page-shell h-full relative">
        {/* Jump Nav — outside animated wrapper */}
        <nav className="detail-jump-nav fixed z-50 flex flex-col" style={{ left: "40px", top: "calc(var(--nav-h) + 48px)", width: 140 }} aria-label="Recipe form navigation">
          {EDIT_SECTIONS.map((s, i) => (
            <button key={s.id}
              onClick={() => {
                const el = document.getElementById(s.id);
                const container = document.getElementById("rf-edit-scroll");
                if (el && container) container.scrollTo({ top: el.offsetTop - 64, behavior: "smooth" });
              }}
              className={`flex items-baseline gap-[10px] font-mono text-[9px] tracking-[0.1em] uppercase py-[8px] border-0 border-b border-[var(--rule)] bg-transparent cursor-pointer transition-colors text-left text-[var(--muted)] hover:text-[var(--fg)]`}
              style={i === 0 ? { paddingTop: 0 } : undefined}
              aria-label={`Jump to ${s.label}`}
            >
              <span className="font-serif text-[9px] font-bold min-w-[16px] text-[var(--rule)]">{s.n}</span>
              {s.label}
            </button>
          ))}
        </nav>

        <div id="rf-edit-scroll" className="h-full overflow-y-auto animate-page-enter">
          <div className="form-back-row">
            <a href="/recipes" className="back-link">← Back</a>
            <span className="form-back-sep" aria-hidden="true" />
            <span className="form-back-title">Edit Recipe</span>
          </div>
          <div className="detail-content max-w-[1100px] mx-auto" style={{ padding: "48px 64px 60px 196px" }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
              <div className="font-mono text-[9px] tracking-[0.12em] uppercase text-[var(--muted)] mb-[6px]">Recipe / Edit</div>
              <h1 className="font-serif font-bold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(22px, 2.4vw, 32px)" }}>Edit Recipe</h1>
            </div>

            <RecipeBuilder
              ref={builderRef}
              initialRecipe={editDraft}
              onSaved={() => {
                clientCache.delete(`/api/recipes/${recipeId}`);
                clientCache.delete("/api/recipes");
                clientCache.delete("/api/recipes?slim=true");
                setEditMode(false);
                setEditDraft(null);
                setLoading(true);
                fetch(`/api/recipes/${recipeId}`).then(r => r.json()).then(data => {
                  if (data?.recipe) {
                    const full = { ...data.recipe, totals: data.totals };
                    clientCache.set(`/api/recipes/${recipeId}`, full);
                    setRecipe(full);
                  }
                }).catch(console.error).finally(() => setLoading(false));
              }}
              onCancel={() => { setEditMode(false); setEditDraft(null); }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Detail View ──
  const tags = recipe.tags ? recipe.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
  const optNotes = recipe.optimizeAnalysis;
  const prepNotes = recipe.mealPrepAnalysis;

  return (
    <div className="h-full relative">
      {/* ── Jump Nav (fixed left — outside animated wrapper) ── */}
      <nav
        className="detail-jump-nav fixed z-50 flex flex-col"
        style={{ left: "40px", top: "calc(var(--nav-h) + 48px)", width: 140 }}
        aria-label="Jump to section"
      >
        {JUMP_SECTIONS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => scrollToSection(s.id)}
            className={`flex items-baseline gap-[10px] font-mono text-[9px] tracking-[0.1em] uppercase py-[8px] border-0 border-b border-[var(--rule)] bg-transparent cursor-pointer transition-colors text-left ${
              activeSection === s.id ? "text-[var(--fg)]" : "text-[var(--muted)] hover:text-[var(--fg)]"
            }`}
            style={i === 0 ? { paddingTop: 0 } : undefined}
            aria-label={`Jump to ${s.label}`}
          >
            <span className={`font-serif text-[9px] font-bold min-w-[16px] transition-colors ${
              activeSection === s.id ? "text-[var(--cta)]" : "text-[var(--rule)]"
            }`}>{s.n}</span>
            {s.label}
          </button>
        ))}
      </nav>

      {/* ── Main Scroll ── */}
      <div id="rd-scroll-container" className="h-full overflow-y-auto animate-page-enter">

<div className="detail-content max-w-[1100px] mx-auto" style={{ padding: "0 64px 120px 196px" }}>

          {/* ── Hero ── */}
          <div className="rd-hero grid gap-[56px] items-start" style={{ gridTemplateColumns: "1fr 1fr", padding: "48px 0 72px", minHeight: "50vh" }}>
            <div>
              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex gap-[12px] mb-4 font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)]">
                  {tags.map(tag => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              )}
              {/* Name */}
              <h1 className="font-serif font-bold tracking-[-0.03em] leading-[1.05] text-[var(--fg)] mb-4" style={{ fontSize: "clamp(30px, 3.4vw, 48px)", textWrap: "balance" }}>
                {recipe.name}
              </h1>
              {/* Meta */}
              <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)] mb-10">
                <span>{recipe.servingSize} {recipe.servingUnit}</span>
                {recipe.prepTime != null && <> · <span>{recipe.prepTime} min prep</span></>}
                {recipe.cookTime != null && <> · <span>{recipe.cookTime} min cook</span></>}
              </div>
              {/* Source */}
              {recipe.sourceApp?.startsWith("http") && (() => {
                let domain = recipe.sourceApp;
                try { domain = new URL(recipe.sourceApp).hostname.replace(/^www\./, ''); } catch {}
                return (
                  <div className="font-mono text-[9px] text-[var(--muted)] mt-3">
                    Source: <a href={recipe.sourceApp} target="_blank" rel="noopener noreferrer" className="text-[var(--fg)] no-underline border-b border-transparent hover:border-[var(--fg)] transition-colors">{domain} →</a>
                  </div>
                );
              })()}
              {/* Actions */}
              <div className="flex flex-col" style={{ marginTop: 24, gap: 16 }}>
                {/* Row 1: edit / duplicate / delete */}
                <div className="flex gap-[10px] items-center">
                  <button onClick={handleEditClick} disabled={editLoading}
                    className="ed-btn disabled:opacity-50"
                    aria-label="Edit recipe">{editLoading ? "Loading…" : "Edit"}</button>
                  <button onClick={handleDuplicate}
                    className="ed-btn"
                    aria-label="Duplicate recipe">Duplicate</button>
                  <button onClick={handleDelete}
                    className="ed-btn danger"
                    aria-label="Delete recipe">Delete</button>
                </div>
                {/* Row 2: favorite */}
                <button
                  onClick={toggleFavorite}
                  className={`rcp-fav-btn favorite-btn${isFavorited ? " is-on" : ""}`}
                  aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
                  aria-pressed={isFavorited}
                >
                  {isFavorited ? (
                    <>★ Favorited<span className="favorite-remove"> · Remove</span></>
                  ) : "Add to Favorites"}
                </button>
              </div>
            </div>
            {/* Image */}
            <div className="rd-hero-img">
              {recipe.image ? (
                <div className="w-full overflow-hidden" style={{ aspectRatio: "4/3" }}>
                  <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover block" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              ) : (
                <div className="w-full bg-[var(--bg-3)] flex items-end p-6" style={{ aspectRatio: "4/3" }}>
                  <span className="font-serif text-[clamp(28px,3vw,40px)] font-bold tracking-[-0.03em] leading-[0.92] text-[var(--fg)] opacity-[0.12]">{recipe.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Section: Ingredients + Nutrition (2-col) ── */}
          <div id="rd-sec-ing" style={{ padding: "56px 0" }}>
            <div className="rd-two-col grid gap-[56px]" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {/* Ingredients */}
              <div>
                <div className="flex items-baseline gap-3 mb-8">
                  <span className="font-serif text-[13px] font-bold text-[var(--rule)]">01</span>
                  <span className="font-serif font-semibold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>Ingredients</span>
                  <span className="flex-1 h-px bg-[var(--rule)]" />
                </div>
                {/* Scale */}
                <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)] mb-3 flex items-center gap-[14px]">
                  <span>Scale</span>
                  <div className="flex gap-[14px]" role="group" aria-label="Scale recipe">
                    {[1, 2, 4, 6].map(n => (
                      <button key={n} onClick={() => setScale(n)}
                        className={`scale-chip font-mono text-[9px] tracking-[0.06em] px-[7px] py-[2px] border rounded-pill transition-colors active:scale-[0.97] ${
                          scale === n
                            ? "active bg-[var(--cta)] text-[var(--cta-ink)] border-[var(--cta)]"
                            : "bg-transparent text-[var(--muted)] border-[var(--rule)] hover:border-[var(--muted)]"
                        }`}
                        aria-pressed={scale === n}
                        aria-label={`Scale ${n}×`}>{n}×</button>
                    ))}
                  </div>
                </div>
                {/* List */}
                <ul className="list-none p-0 m-0">
                  {recipe.ingredients.map((ing, idx) => {
                    const prevSection = idx > 0 ? recipe.ingredients[idx - 1].section : null;
                    const showSection = ing.section && ing.section !== prevSection;
                    return (
                      <li key={ing.id}>
                        {showSection && (
                          <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] pt-8 pb-1 border-b border-[var(--rule)]">{ing.section}</div>
                        )}
                        <div className="flex gap-[18px] py-3 border-b border-[var(--rule)]">
                          <span className="font-mono text-[11px] text-[var(--fg-2)] min-w-[70px] text-right shrink-0 tabular-nums pt-[3px]">
                            {parseFloat((ing.quantity * scale).toFixed(2))} {ing.unit}
                          </span>
                          <span>
                            <span className="text-[16px] leading-[1.4]">{ing.ingredient?.name || ing.originalText || "Unknown"}</span>
                            {ing.notes && (
                              <span className="block text-[11px] text-[var(--muted)] mt-[2px] leading-[1.4]">{ing.notes}</span>
                            )}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Nutrition */}
              <div id="rd-sec-nut">
                <div className="flex items-baseline gap-3 mb-8">
                  <span className="font-serif text-[13px] font-bold text-[var(--rule)]">02</span>
                  <span className="font-serif font-semibold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>Nutrition</span>
                  <span className="flex-1 h-px bg-[var(--rule)]" />
                </div>
                {/* Partial nutrition warning */}
                {(() => {
                  const missingCount = recipe.ingredients.filter(i => !i.ingredientId || !i.ingredient).length;
                  if (missingCount === 0) return null;
                  return (
                    <div className="flex items-center justify-between gap-3 px-3 py-2 mb-4 bg-[var(--bg-2)] text-[13px] text-[var(--muted)] leading-[1.5]">
                      <span>Nutrition is partial — {missingCount} ingredient{missingCount > 1 ? "s" : ""} {missingCount > 1 ? "don't" : "doesn't"} have data yet.</span>
                      <a href={`/recipes/${recipe.id}/edit`} className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--cta)] whitespace-nowrap hover:opacity-75 transition-opacity">Add missing data →</a>
                    </div>
                  );
                })()}
                {selectedPerson && (
                  <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)] mb-3">Per serving · vs goals</div>
                )}
                <div className="flex flex-col gap-[10px]">
                  {GRID_KEYS.map(({ match, label, exact }) => {
                    const n = getNutrient(recipe.totals, match, exact);
                    const value = n ? Math.round(n.value * 10) / 10 : 0;
                    const unit = n?.unit ?? "";
                    const goal = goals.find(g => {
                      const gName = g.nutrient.displayName.toLowerCase();
                      return exact ? match.some(k => gName === k) : match.some(k => gName.includes(k));
                    });
                    const target = goal?.highGoal || goal?.lowGoal || 0;
                    const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
                    const isOver = target > 0 && value > target;
                    const fillClass = isOver ? "bg-[var(--err)]" : pct > 80 ? "bg-[var(--warn)]" : "bg-[var(--ok)]";
                    return (
                      <div key={label}>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--fg-2)]">{label}</span>
                          <span className="font-mono text-[9px] text-[var(--fg)] tabular-nums">
                            {Math.round(value)}{unit !== "kcal" ? unit : ""}
                            {target > 0 && <span className="text-[9px] text-[var(--muted)]"> / {Math.round(target)}{unit !== "kcal" ? unit : ""}</span>}
                          </span>
                        </div>
                        {target > 0 && (
                          <div className="h-[3px] bg-[var(--rule)] overflow-hidden">
                            <div className={`h-full transition-[width] duration-700 ${fillClass}`} style={{ width: `${Math.min(pct, 100)}%`, transitionTimingFunction: "var(--ease-out)" }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Section: Instructions ── */}
          {recipe.instructions && (
            <div id="rd-sec-steps" style={{ padding: "56px 0" }}>
              <div className="flex items-baseline gap-3 mb-8">
                <span className="font-serif text-[13px] font-bold text-[var(--rule)]">03</span>
                <span className="font-serif font-semibold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>Instructions</span>
                <span className="flex-1 h-px bg-[var(--rule)]" />
              </div>
              <div className="flex flex-col">
                {recipe.instructions.split("\n").filter(s => s.trim()).map((step, idx) => {
                  const steps = recipe.instructions.split("\n").filter(s => s.trim());
                  return (
                    <div key={idx} className={`flex gap-6 items-start py-5 ${idx < steps.length - 1 ? "border-b border-[var(--rule)]" : ""}`}>
                      <span className="font-serif text-[28px] font-bold text-[var(--rule)] min-w-[40px] leading-none shrink-0 pt-[2px] tabular-nums">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[13px] leading-[1.7] text-[var(--fg-2)] pt-[6px]">{step.replace(/^\d+[\.\)]\s*/, "")}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Section: Optimization ── */}
          <div id="rd-sec-opt" style={{ padding: "56px 0" }}>
            <div className="flex items-baseline gap-3 mb-8">
              <span className="font-serif text-[13px] font-bold text-[var(--rule)]">04</span>
              <span className="font-serif font-semibold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>Optimization</span>
              <span className="flex-1 h-px bg-[var(--rule)]" />
            </div>
            <ContextualTip tipId="ai-optimize" label="AI Optimization">
              {hasMcp
                ? "Copy the prompt below into any MCP-connected AI assistant. It reads your recipe directly from Good Measure, suggests changes, and saves the optimized version back automatically once you approve."
                : <>To use this feature, connect an MCP-enabled AI assistant. It reads your recipe directly from Good Measure, suggests changes, and saves the optimized version back automatically once you approve.
                  <div className="mt-2">
                    <Link href="/settings" className="font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--accent)] hover:text-[var(--fg)] transition-colors no-underline">Set up MCP in Settings →</Link>
                  </div>
                </>}
            </ContextualTip>
            <div className="mt-4">
              {editingNotes === "optimization" ? (
                <>
                  <textarea
                    className="rd-notes-textarea"
                    placeholder="Paste optimization notes here (markdown supported)..."
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    aria-label="Optimization notes editor"
                  />
                  <div className="flex justify-end gap-[10px] mt-3">
                    <button onClick={() => setEditingNotes(null)} className="ed-btn ghost" aria-label="Cancel editing notes">Cancel</button>
                    <button onClick={() => handleSaveNotes("optimization")} disabled={savingNotes}
                      className="ed-btn primary disabled:opacity-40"
                      aria-label="Save optimization notes">
                      {savingNotes ? "Saving…" : "Save"}</button>
                  </div>
                </>
              ) : optNotes ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--muted)]">Optimization Notes</span>
                    <button onClick={() => { setEditingNotes("optimization"); setNotesText(optNotes || ""); }}
                      className="font-mono text-[9px] tracking-[0.08em] uppercase bg-transparent border-0 text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer py-1 px-2"
                      aria-label="Edit optimization notes">Edit</button>
                  </div>
                  <div className="prose-notes" dangerouslySetInnerHTML={{ __html: renderNotesHtml(optNotes) }} />
                </>
              ) : (() => {
                const prompt = `You are a [cuisine] chef with a background in nutrition who works with clients to create great-tasting, healthy meals. Use get_recipe with id ${recipe.id} to fetch the full details for ${recipe.name}. Analyze it for nutritional optimization — identify the top nutrient contributors, suggest substitutions to [meet your goals here], and preserve the original section headers in your analysis. Show me what you changed and why, including how each change could affect flavor, texture, and overall eating experience. Create a comparison table of the original vs. optimized nutrition numbers per serving.\n\nBefore suggesting any ingredient substitutions, use search_ingredients to check what's already in the database. Prefer substitutions that use existing ingredients — they'll have accurate nutrition data. You can still suggest new ingredients when no good match exists, but flag those clearly.\n\nI may give you feedback and request tweaks before we finalize. Do not save anything until I explicitly tell you I'm happy with the changes.\n\nFormatting rules — follow exactly:\n- Title the document with ## Optimization Notes (H2, not H1)\n- The nutrition comparison section must be headed ### Nutrition comparison (per serving)\n\nOnce approved, save the optimized recipe using save_recipe with section headers preserved. When saving, include the original recipe's sourceApp URL (if it has one) and pass copyImageFromRecipeId set to ${recipe.id} so the image is copied automatically. Then save the analysis notes using save_optimization_notes. Always report any stub ingredient warnings before moving on.`;
                return (
                  <div>
                    {isTouchDevice ? (
                      <p className="text-[13px] text-[var(--muted)] mb-4 leading-[1.6] bg-[var(--bg-2)] px-3 py-2">This feature works with any MCP-compatible AI assistant on a desktop. Notes you generate there will appear here automatically.</p>
                    ) : (
                      <>
                        <p className="text-[13px] text-[var(--muted)] mb-4 leading-[1.6]">Copy this prompt into any MCP-connected AI assistant. Notes will save automatically once you approve.</p>
                        <div className="text-[13px] leading-[1.7] text-[var(--fg-2)] mb-6 whitespace-pre-wrap select-all" style={{ borderLeft: "2px solid var(--rule)", padding: "16px 0 16px 20px" }}>{prompt}</div>
                        <div className="flex items-center gap-[10px] mb-6">
                          <button
                            onClick={() => { navigator.clipboard.writeText(prompt); setCopiedPrompt("optimization"); setTimeout(() => setCopiedPrompt(null), 2000); }}
                            className="ed-btn primary"
                            aria-label="Copy optimization prompt">{copiedPrompt === "optimization" ? "Copied ✓" : "Copy prompt →"}</button>
                          <button onClick={() => { setEditingNotes("optimization"); setNotesText(""); }}
                            className="ed-btn ghost"
                            aria-label="Paste notes manually">Paste notes instead</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── Section: Meal Prep ── */}
          <div id="rd-sec-prep" style={{ padding: "56px 0" }}>
            <div className="flex items-baseline gap-3 mb-8">
              <span className="font-serif text-[13px] font-bold text-[var(--rule)]">05</span>
              <span className="font-serif font-semibold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>Meal Prep</span>
              <span className="flex-1 h-px bg-[var(--rule)]" />
            </div>
            <ContextualTip tipId="ai-meal-prep" label="AI Meal Prep">
              {hasMcp
                ? "Copy the prompt below into any MCP-connected AI assistant. It analyzes your recipe for batch cooking, storage, and reheating — then saves the notes back to Good Measure automatically."
                : <>To use this feature, connect an MCP-enabled AI assistant. It analyzes your recipe for batch cooking, storage, and reheating — then saves the notes back to Good Measure automatically.
                  <div className="mt-2">
                    <Link href="/settings" className="font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--accent)] hover:text-[var(--fg)] transition-colors no-underline">Set up MCP in Settings →</Link>
                  </div>
                </>}
            </ContextualTip>
            <div className="mt-4">
              {editingNotes === "mealPrep" ? (
                <>
                  <textarea
                    className="rd-notes-textarea"
                    placeholder="Paste meal prep analysis here (markdown supported)..."
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    aria-label="Meal prep notes editor"
                  />
                  <div className="flex justify-end gap-[10px] mt-3">
                    <button onClick={() => setEditingNotes(null)} className="ed-btn ghost" aria-label="Cancel editing notes">Cancel</button>
                    <button onClick={() => handleSaveNotes("mealPrep")} disabled={savingNotes}
                      className="ed-btn primary disabled:opacity-40"
                      aria-label="Save meal prep notes">
                      {savingNotes ? "Saving…" : "Save"}</button>
                  </div>
                </>
              ) : prepNotes ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--muted)]">Meal Prep Notes</span>
                    <button onClick={() => { setEditingNotes("mealPrep"); setNotesText(prepNotes || ""); }}
                      className="font-mono text-[9px] tracking-[0.08em] uppercase bg-transparent border-0 text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer py-1 px-2"
                      aria-label="Edit meal prep notes">Edit</button>
                  </div>
                  <div className="prose-notes" dangerouslySetInnerHTML={{ __html: renderNotesHtml(prepNotes) }} />
                </>
              ) : (() => {
                const prompt = `You are a meal prep specialist with a background in nutrition. Use get_recipe with id ${recipe.id} to fetch the full details for ${recipe.name}. Analyze it for meal prep with the following sections:\n\n1. Component-by-component breakdown — how each part stores, reheats, and holds up over time. Note anything that degrades in texture or flavor.\n2. Reheating instructions — for each component, give specific method, temperature, and time.\n3. Batch cooking recommendation — if it makes sense, suggest an optimal batch size with a scaled quantities table.\n4. This week vs. freeze for later — what to eat within the next 3–5 days and what to freeze now for future weeks.\n5. Day-by-day plan — a practical daily guide for the week assuming a Sunday prep session (e.g. Monday: reheat rice + cook salmon fresh, etc.).\n6. Storage summary table — fridge and freezer life per component.\n\nFormatting rules — follow exactly:\n- Title the document with ## Meal Prep Notes (H2, not H1)\n- Use ### (H3) for each section heading — no section numbers\n- Section headings must match exactly: Component-by-component breakdown / Reheating instructions / Batch cooking recommendation / This week vs. freeze for later / Day-by-day plan / Storage summary\n- Scaling line format: **Scaled quantities — [total] servings ([N]×)** (e.g. "8 servings (2×)") — no trailing colon, always use × symbol\n- Batch table columns: Base ([n] srv) and Batch ([N]×)\n\nI may give you feedback before we finalize. Do not save anything until I explicitly tell you I'm happy.\n\nOnce approved, save the meal prep notes using save_meal_prep_notes. Always report any stub ingredient warnings before moving on.`;
                return (
                  <div>
                    {isTouchDevice ? (
                      <p className="text-[13px] text-[var(--muted)] mb-4 leading-[1.6] bg-[var(--bg-2)] px-3 py-2">This feature works with any MCP-compatible AI assistant on a desktop. Notes you generate there will appear here automatically.</p>
                    ) : (
                      <>
                        <p className="text-[13px] text-[var(--muted)] mb-4 leading-[1.6]">Copy this prompt into any MCP-connected AI assistant.</p>
                        <div className="text-[13px] leading-[1.7] text-[var(--fg-2)] mb-6 whitespace-pre-wrap select-all" style={{ borderLeft: "2px solid var(--rule)", padding: "16px 0 16px 20px" }}>{prompt}</div>
                        <div className="flex items-center gap-[10px] mb-6">
                          <button
                            onClick={() => { navigator.clipboard.writeText(prompt); setCopiedPrompt("mealPrep"); setTimeout(() => setCopiedPrompt(null), 2000); }}
                            className="ed-btn primary"
                            aria-label="Copy meal prep prompt">{copiedPrompt === "mealPrep" ? "Copied ✓" : "Copy prompt →"}</button>
                          <button onClick={() => { setEditingNotes("mealPrep"); setNotesText(""); }}
                            className="ed-btn ghost"
                            aria-label="Paste notes manually">Paste notes instead</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
