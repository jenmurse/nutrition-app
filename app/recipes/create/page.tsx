"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import RecipeBuilder from "../../components/RecipeBuilder";

const JUMP_SECTIONS = [
  { id: "rf-sec-basics", n: "01", label: "Basics" },
  { id: "rf-sec-photo", n: "02", label: "Photo" },
  { id: "rf-sec-ingredients", n: "03", label: "Ingredients" },
  { id: "rf-sec-method", n: "04", label: "Method" },
  { id: "rf-sec-nutrition", n: "05", label: "Nutrition" },
];

type ImportDraft = {
  id?: number;
  name: string;
  servingSize: number;
  servingUnit: string;
  instructions: string;
  sourceApp?: string | null;
  isComplete?: boolean;
  tags?: string;
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

function buildDraft(data: any, source: string): ImportDraft {
  return {
    name: data.name || "Imported Recipe",
    servingSize: data.servingSize || 1,
    servingUnit: data.servingUnit || "servings",
    instructions: data.instructions || "",
    sourceApp: source,
    isComplete: data.isComplete,
    tags: data.tags || undefined,
    prepTime: data.prepTime ?? null,
    cookTime: data.cookTime ?? null,
    image: data.image ?? null,
    ingredients: (data.ingredients || []).map((item: any) => ({
      id: `imp-${Math.random().toString(36).slice(2)}`,
      ingredientId: item.ingredientId ?? null,
      quantity: item.quantity ?? 0,
      unit: item.unit || "",
      originalText: item.originalText || "",
      nameGuess: item.nameGuess || "",
      section: item.section || null,
      notes: item.section || null,
    })),
  };
}

export default function CreateRecipePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importedRecipe, setImportedRecipe] = useState<ImportDraft | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [importError, setImportError] = useState("");

  // Jump nav
  const [activeSection, setActiveSection] = useState(JUMP_SECTIONS[0].id);
  const jumpNavLocked = useRef(false);

  useEffect(() => {
    const scrollEl = document.getElementById("rf-scroll-container");
    if (!scrollEl) return;
    const sectionIds = JUMP_SECTIONS.map((s) => s.id);
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
  }, [importedRecipe]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    const container = document.getElementById("rf-scroll-container");
    if (el && container) {
      setActiveSection(id);
      jumpNavLocked.current = true;
      container.scrollTo({ top: el.offsetTop - 64, behavior: "smooth" });
      setTimeout(() => { jumpNavLocked.current = false; }, 800);
    }
  };

  const handleFileImport = async (file: File) => {
    setImporting(true);
    setImportError("");
    try {
      const markdown = await file.text();
      const res = await fetch("/api/recipes/import/pestle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setImportedRecipe(buildDraft(data, data.sourceApp || "Markdown Import"));
    } catch (error: any) {
      console.error(error);
      setImportError(error.message || "Failed to import recipe");
    } finally {
      setImporting(false);
    }
  };

  const handleUrlImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportError("");
    try {
      const res = await fetch("/api/recipes/import/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setImportedRecipe(buildDraft(data, "URL Import"));
    } catch (error: any) {
      console.error(error);
      setImportError(error.message || "Failed to import from URL");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="h-full relative">
      {/* ── Jump Nav (fixed left — outside animated wrapper) ── */}
      <nav
        className="detail-jump-nav fixed z-50 flex flex-col"
        style={{ left: "40px", top: "calc(var(--nav-h) + 48px)", width: 140 }}
        aria-label="Recipe form navigation"
      >
        {JUMP_SECTIONS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => scrollToSection(s.id)}
            className={`flex items-baseline gap-[10px] font-mono text-[9px] tracking-[0.14em] uppercase py-[8px] border-0 border-b border-[var(--rule)] bg-transparent cursor-pointer transition-colors text-left ${
              activeSection === s.id ? "text-[var(--fg)]" : "text-[var(--muted)] hover:text-[var(--fg)]"
            }`}
            style={i === 0 ? { paddingTop: 0 } : undefined}
            aria-label={`Jump to ${s.label}`}
          >
            <span className={`font-serif text-[9px] font-bold min-w-[16px] transition-colors ${
              activeSection === s.id ? "text-[var(--fg)]" : "text-[var(--rule)]"
            }`}>{s.n}</span>
            {s.label}
          </button>
        ))}
      </nav>

      {/* ── Main Scroll ── */}
      <div id="rf-scroll-container" className="h-full overflow-y-auto animate-page-enter">
        <div className="detail-content max-w-[1100px] mx-auto" style={{ padding: "48px 64px 60px 196px" }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div className="font-mono text-[9px] tracking-[0.12em] uppercase text-[var(--muted)] mb-[6px]">§ NEW</div>
            <h1 className="form-title">A new recipe.</h1>
          </div>

          {/* Import section */}
          {!importedRecipe && (
            <div style={{ marginBottom: 64 }}>
              <div className="font-mono text-[9px] tracking-[0.12em] uppercase text-[var(--muted)] mb-[10px]">Import Recipe</div>
              <div className="flex gap-[10px] items-end">
                <div className="ed-field flex-1" style={{ marginBottom: 0 }}>
                  <input
                    className="ed-input"
                    type="url"
                    placeholder="Paste recipe URL…"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleUrlImport(); }}
                    disabled={importing}
                    aria-label="Import from URL"
                  />
                </div>
                <button className="ed-btn" onClick={handleUrlImport} disabled={importing || !importUrl.trim()} aria-label="Import from URL">
                  {importing ? "Importing…" : "Import"}
                </button>
                <span className="font-mono text-[9px] text-[var(--muted)]" style={{ padding: "0 4px" }}>or</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,text/markdown"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileImport(file); }}
                  disabled={importing}
                  className="sr-only"
                  aria-label="Upload markdown file"
                />
                <button className="ed-btn" onClick={() => fileInputRef.current?.click()} disabled={importing} aria-label="Upload file">
                  Upload File
                </button>
              </div>
              {importError && (
                <div className="font-mono text-[9px] text-[var(--err)] mt-1">{importError}</div>
              )}
            </div>
          )}

          {/* Recipe Builder */}
          <Suspense fallback={<div className="font-mono text-[13px] font-light text-[var(--muted)] animate-loading">Loading…</div>}>
            <RecipeBuilder
              initialRecipe={importedRecipe || undefined}
              onSaved={() => router.push("/recipes")}
              onCancel={() => router.push("/recipes")}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
