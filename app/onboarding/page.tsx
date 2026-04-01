"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { BrandName } from "@/app/components/BrandName";
import { usePersonContext } from "@/app/components/PersonContext";
import { THEMES, themeHex } from "@/lib/themes";
import { APP_TAGLINE } from "@/lib/brand";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Member = {
  id?: number;
  name: string;
  theme: string;
  color: string;
};

type GoalPreset = {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  kcal: number | null;
};

type ImportStatus = "idle" | "loading" | "success" | "error";

const TOTAL_STEPS = 6;

/* ─── Goal presets ───────────────────────────────────────────────────────── */

const GOAL_PRESETS: GoalPreset[] = [
  {
    id: "balanced",
    label: "Balanced",
    desc: "General health, maintenance",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20v-6M6 20V10M18 20V4" />
      </svg>
    ),
    kcal: 2000,
  },
  {
    id: "active",
    label: "Active",
    desc: "Higher protein, more fuel",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    kcal: 2500,
  },
  {
    id: "mindful",
    label: "Mindful",
    desc: "Lighter, focused portions",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    ),
    kcal: 1600,
  },
  {
    id: "custom",
    label: "Custom",
    desc: "I'll set my own targets",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" x2="4" y1="21" y2="14" /><line x1="4" x2="4" y1="10" y2="3" />
        <line x1="12" x2="12" y1="21" y2="12" /><line x1="12" x2="12" y1="8" y2="3" />
        <line x1="20" x2="20" y1="21" y2="16" /><line x1="20" x2="20" y1="12" y2="3" />
        <line x1="2" x2="6" y1="14" y2="14" /><line x1="10" x2="14" y1="8" y2="8" />
        <line x1="18" x2="22" y1="16" y2="16" />
      </svg>
    ),
    kcal: null,
  },
];

/* ─── Preset goal values (nutrient name → { low, high }) ─────────────── */

const GOAL_VALUES: Record<string, Record<string, { low?: number; high?: number }>> = {
  balanced: {
    calories: { low: 1800, high: 2200 },
    protein: { low: 50, high: 150 },
    fat: { low: 44, high: 78 },
    carbs: { low: 225, high: 325 },
    fiber: { low: 25 },
    sodium: { high: 2300 },
  },
  active: {
    calories: { low: 2300, high: 2700 },
    protein: { low: 100, high: 200 },
    fat: { low: 56, high: 97 },
    carbs: { low: 280, high: 400 },
    fiber: { low: 30 },
    sodium: { high: 2300 },
  },
  mindful: {
    calories: { low: 1400, high: 1800 },
    protein: { low: 50, high: 130 },
    fat: { low: 35, high: 62 },
    carbs: { low: 175, high: 260 },
    fiber: { low: 25 },
    sodium: { high: 2000 },
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════════════════════ */

export default function OnboardingPage() {
  const router = useRouter();
  const { persons, selectedPerson, refreshPersons } = usePersonContext();

  /* ── Step state ──────────────────────────────────────────────────────── */
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"fwd" | "back">("fwd");
  const [animating, setAnimating] = useState(false);
  const stepRef = useRef<HTMLDivElement>(null);

  /* ── Step 1: Profile ────────────────────────────────────────────────── */
  const [userName, setUserName] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("sage");

  /* ── Step 2: Household ──────────────────────────────────────────────── */
  const [members, setMembers] = useState<Member[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberTheme, setNewMemberTheme] = useState("terracotta");
  const [showAddForm, setShowAddForm] = useState(false);

  /* ── Step 3: Goals ──────────────────────────────────────────────────── */
  const [selectedGoal, setSelectedGoal] = useState("active");

  /* ── Step 4: Recipe import ──────────────────────────────────────────── */
  const [recipeUrl, setRecipeUrl] = useState("");
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [importResult, setImportResult] = useState<{ name: string; servings: number; ingredients: number } | null>(null);
  const [importError, setImportError] = useState("");

  /* ── Step 5: Completion checklist animation ─────────────────────────── */
  const [checklistRevealed, setChecklistRevealed] = useState(0);

  /* ── Seed profile from PersonContext ─────────────────────────────────── */
  useEffect(() => {
    if (selectedPerson && !userName) {
      setUserName(selectedPerson.name);
      setSelectedTheme(selectedPerson.theme || "sage");
    }
  }, [selectedPerson]);

  /* ── Navigation ─────────────────────────────────────────────────────── */
  const nav = useCallback(
    (to: number, dir: "fwd" | "back") => {
      if (animating) return;
      setDirection(dir);
      setAnimating(true);
      // Start exit animation, then switch step
      setTimeout(() => {
        setStep(to);
        setAnimating(false);
        // Trigger completion checklist stagger on final step
        if (to === 5) {
          let count = 0;
          const items = getChecklistItems();
          const interval = setInterval(() => {
            count++;
            setChecklistRevealed(count);
            if (count >= items.length) clearInterval(interval);
          }, 110);
        }
      }, 200);
    },
    [animating]
  );

  /* ── Apply theme live ───────────────────────────────────────────────── */
  const applyThemeLive = (themeName: string) => {
    document.documentElement.dataset.theme = themeName || "sage";
  };

  /* ── Step 1: Save profile ───────────────────────────────────────────── */
  const saveProfile = async () => {
    if (!selectedPerson) return;
    const hex = themeHex(selectedTheme);
    await fetch(`/api/persons/${selectedPerson.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: userName.trim() || selectedPerson.name,
        theme: selectedTheme,
        color: hex,
      }),
    });
    localStorage.setItem("theme", selectedTheme);
    await refreshPersons();
  };

  /* ── Step 2: Add household member ───────────────────────────────────── */
  const addMember = async () => {
    if (!newMemberName.trim()) return;
    const hex = themeHex(newMemberTheme);
    const res = await fetch("/api/persons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newMemberName.trim(), theme: newMemberTheme }),
    });
    if (res.ok) {
      const person = await res.json();
      // Update color after creation
      await fetch(`/api/persons/${person.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: hex }),
      });
      setMembers((prev) => [...prev, { id: person.id, name: newMemberName.trim(), theme: newMemberTheme, color: hex }]);
      setNewMemberName("");
      setNewMemberTheme("terracotta");
      setShowAddForm(false);
      await refreshPersons();
    }
  };

  const removeMember = async (index: number) => {
    const member = members[index];
    if (member.id) {
      await fetch(`/api/persons/${member.id}`, { method: "DELETE" });
      await refreshPersons();
    }
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  /* ── Step 3: Save nutrition goals ───────────────────────────────────── */
  const saveGoals = async () => {
    if (selectedGoal === "custom" || !selectedPerson) return;
    const preset = GOAL_VALUES[selectedGoal];
    if (!preset) return;

    // Fetch nutrient list to map names → IDs
    const res = await fetch("/api/nutrients");
    if (!res.ok) return;
    const nutrients: { id: number; name: string }[] = await res.json();

    const goals: Record<number, { lowGoal?: number; highGoal?: number }> = {};
    for (const n of nutrients) {
      const val = preset[n.name];
      if (val) {
        goals[n.id] = { lowGoal: val.low, highGoal: val.high };
      }
    }

    await fetch("/api/nutrition-goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: selectedPerson.id, goals }),
    });
  };

  /* ── Step 4: Import recipe ──────────────────────────────────────────── */
  const handleImport = async () => {
    if (!recipeUrl.trim()) return;
    setImportStatus("loading");
    setImportError("");
    try {
      const res = await fetch("/api/recipes/import/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: recipeUrl.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setImportError(data.error || "Failed to import recipe");
        setImportStatus("error");
        return;
      }
      const recipe = await res.json();
      // Save the recipe without unmatched ingredients — user resolves them in the recipe editor.
      // Only include ingredients that have a valid ingredientId (already matched to pantry).
      const matchedIngredients = (recipe.ingredients || []).filter(
        (ing: any) => ing.ingredientId && !isNaN(Number(ing.ingredientId))
      );
      const saveRes = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: recipe.name,
          servingSize: recipe.servingSize,
          servingUnit: recipe.servingUnit,
          instructions: recipe.instructions,
          sourceApp: recipe.sourceApp,
          tags: recipe.tags,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          image: recipe.image,
          isComplete: matchedIngredients.length > 0,
          ingredients: matchedIngredients,
        }),
      });
      if (saveRes.ok) {
        const saved = await saveRes.json();
        const totalParsed = recipe.ingredients?.length ?? 0;
        setImportResult({
          name: saved.name,
          servings: saved.servingSize,
          ingredients: totalParsed,
        });
        setImportStatus("success");
      } else {
        setImportError("Imported but failed to save");
        setImportStatus("error");
      }
    } catch {
      setImportError("Network error — check the URL and try again");
      setImportStatus("error");
    }
  };

  /* ── Step 5: Complete onboarding ────────────────────────────────────── */
  const completeOnboarding = async () => {
    if (!selectedPerson) return;
    await fetch(`/api/persons/${selectedPerson.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardingComplete: true }),
    });
    router.push("/");
  };

  /* ── Checklist items for step 5 ─────────────────────────────────────── */
  const getChecklistItems = () => {
    const items: { text: string; note: string; done: boolean }[] = [
      {
        text: "Profile",
        note: `${userName || "—"} · ${THEMES.find((t) => t.name === selectedTheme)?.label ?? "Sage"} theme`,
        done: true,
      },
      {
        text: "Household",
        note: members.length > 0 ? `${userName}${members.map((m) => ` + ${m.name}`).join("")}` : `Just ${userName}`,
        done: true,
      },
      {
        text: "Nutrition goals",
        note:
          selectedGoal === "custom"
            ? "Custom — set in Settings"
            : `${GOAL_PRESETS.find((g) => g.id === selectedGoal)?.label} · ${GOAL_PRESETS.find((g) => g.id === selectedGoal)?.kcal?.toLocaleString()} kcal target`,
        done: selectedGoal !== "custom" || true,
      },
      {
        text: importResult ? "Recipe imported" : "Import a recipe",
        note: importResult ? `${importResult.name} · ${importResult.ingredients} ingredients` : "Skipped — you can import later",
        done: !!importResult,
      },
      {
        text: "Create your first week's plan",
        note: "From the dashboard",
        done: false,
      },
    ];
    return items;
  };

  /* ── Handle "Continue" per step ─────────────────────────────────────── */
  const handleContinue = async () => {
    if (step === 1) await saveProfile();
    if (step === 3) await saveGoals();
    nav(step + 1, "fwd");
  };

  /* ── Progress dots ──────────────────────────────────────────────────── */
  const ProgressDots = () => (
    <div className="flex items-center gap-[6px]">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className="h-[5px] rounded-full transition-all duration-[350ms]"
          style={{
            width: i === step ? 22 : 5,
            background: i <= step ? "var(--accent)" : "var(--rule)",
            opacity: i < step ? 0.4 : 1,
            transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        />
      ))}
    </div>
  );

  /* ── Step animation class ───────────────────────────────────────────── */
  const stepAnimClass = animating
    ? direction === "fwd"
      ? "opacity-0 translate-y-[-8px]"
      : "opacity-0 translate-y-[-8px]"
    : "opacity-100 translate-y-0";

  /* ═══════════════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════════════ */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)]">
      <div
        className="w-full max-w-[480px] mx-4"
        ref={stepRef}
      >
        <div
          className="bg-white rounded-[12px] p-[44px] transition-all duration-[320ms]"
          style={{ boxShadow: "var(--shadow-md)", transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
        >
          {/* Card top: brand + progress + step counter */}
          <div className="flex items-center justify-between mb-8">
            <span className="font-sans text-[15px] font-medium text-[var(--fg)] tracking-[0.02em]">
              <BrandName />
            </span>
            <div className="flex items-center gap-3">
              <ProgressDots />
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">
                {step + 1}/{TOTAL_STEPS}
              </span>
            </div>
          </div>

          {/* Step content with animation */}
          <div className={`transition-all duration-[320ms] ${stepAnimClass}`} style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}>

            {/* ── Step 0: Welcome ────────────────────────────────────── */}
            {step === 0 && (
              <div>
                <h1 className="text-[30px] font-semibold tracking-[-0.025em] text-[var(--fg)] leading-[1.1] mb-3">
                  Know what&apos;s in your week.
                </h1>
                <p className="font-sans text-[16px] text-[var(--muted)] leading-[1.5] mb-8" style={{ textWrap: "pretty" }}>
                  Build recipes, plan your meals, and track your nutrition against your goals. Your dashboard updates in real time. Setup takes about two minutes.
                </p>
                <button
                  onClick={() => nav(1, "fwd")}
                  className="w-full py-[12px] px-6 bg-[var(--accent)] text-[var(--accent-text)] font-mono text-[9px] uppercase tracking-[0.1em] rounded-[8px] border-0 cursor-pointer hover:bg-[var(--accent-hover)] active:scale-[0.97] transition-all duration-[140ms]"
                  aria-label="Begin setup"
                >
                  Let&apos;s get set up
                </button>
                <button
                  onClick={() => nav(5, "fwd")}
                  className="w-full mt-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] bg-transparent border-0 cursor-pointer hover:text-[var(--fg)] transition-colors"
                  aria-label="Skip setup"
                >
                  Skip and explore on my own
                </button>
              </div>
            )}

            {/* ── Step 1: Profile ────────────────────────────────────── */}
            {step === 1 && (
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-2">Your Profile</div>
                <h2 className="text-[26px] font-semibold tracking-[-0.025em] text-[var(--fg)] leading-[1.1] mb-2">
                  Make it yours.
                </h2>
                <p className="font-sans text-[14px] text-[var(--muted)] leading-[1.5] mb-6" style={{ textWrap: "pretty" }}>
                  Pick a name and a theme color. This changes the look of the whole app — you can always update it later in Settings.
                </p>

                {/* Name input */}
                <label className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] block mb-2">Your name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full border border-[var(--rule)] rounded-[8px] px-[14px] py-[10px] font-sans text-[14px] text-[var(--fg)] bg-white focus:outline-none focus:border-[var(--accent)] transition-colors mb-5"
                  aria-label="Your name"
                />

                {/* Theme picker */}
                <label className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] block mb-3">Theme color</label>
                <div className="flex flex-wrap gap-[8px] mb-5">
                  {THEMES.map((t) => {
                    const isActive = selectedTheme === t.name;
                    return (
                      <button
                        key={t.name}
                        onClick={() => {
                          setSelectedTheme(t.name);
                          applyThemeLive(t.name);
                        }}
                        className="w-[22px] h-[22px] rounded-full border-0 cursor-pointer p-0 transition-transform duration-[140ms] hover:scale-110"
                        style={{
                          background: t.hex,
                          color: t.hex,
                          outline: isActive ? "2px solid currentColor" : "none",
                          outlineOffset: isActive ? "3px" : undefined,
                        }}
                        aria-label={t.label}
                        aria-pressed={isActive}
                      />
                    );
                  })}
                </div>

                <div className="px-[14px] py-[11px] bg-[var(--accent-light)] rounded-[8px] mb-6">
                  <p className="font-sans text-[12px] text-[var(--accent)] leading-[1.5]">
                    Your theme tints buttons, links, and highlights throughout the app. Each household member gets their own.
                  </p>
                </div>

                {/* Nav buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => nav(0, "back")}
                    className="px-6 py-[12px] font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] border border-[var(--rule)] rounded-[8px] bg-transparent cursor-pointer hover:text-[var(--fg)] hover:border-[var(--rule-strong)] transition-colors"
                    aria-label="Go back"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleContinue}
                    className="flex-1 py-[12px] px-6 bg-[var(--accent)] text-[var(--accent-text)] font-mono text-[9px] uppercase tracking-[0.1em] rounded-[8px] border-0 cursor-pointer hover:bg-[var(--accent-hover)] active:scale-[0.97] transition-all duration-[140ms]"
                    aria-label="Continue to household"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Household ──────────────────────────────────── */}
            {step === 2 && (
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-2">Your Household</div>
                <h2 className="text-[26px] font-semibold tracking-[-0.025em] text-[var(--fg)] leading-[1.1] mb-2">
                  Who&apos;s eating with you?
                </h2>
                <p className="font-sans text-[14px] text-[var(--muted)] leading-[1.5] mb-6" style={{ textWrap: "pretty" }}>
                  Recipes and pantry are shared. Meal plans and nutrition goals are personal — each person gets their own view.
                </p>

                {/* Current user card */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-[8px] mb-2" style={{ background: "var(--accent-light)" }}>
                  <div
                    className="w-[32px] h-[32px] rounded-full flex items-center justify-center font-mono text-[11px] font-medium text-white shrink-0"
                    style={{ background: themeHex(selectedTheme) }}
                    aria-hidden="true"
                  >
                    {(userName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-sans text-[13px] font-medium text-[var(--fg)]">{userName || "You"}</div>
                    <div className="font-sans text-[11px] text-[var(--muted)]">That&apos;s you</div>
                  </div>
                </div>

                {/* Added members */}
                {members.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-[8px] mb-2 border border-[var(--rule-faint)]">
                    <div
                      className="w-[32px] h-[32px] rounded-full flex items-center justify-center font-mono text-[11px] font-medium text-white shrink-0"
                      style={{ background: m.color }}
                      aria-hidden="true"
                    >
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-sans text-[13px] font-medium text-[var(--fg)]">{m.name}</div>
                      <div className="font-sans text-[11px] text-[var(--muted)]">
                        Household member · {THEMES.find((t) => t.name === m.theme)?.label}
                      </div>
                    </div>
                    <button
                      onClick={() => removeMember(i)}
                      className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--error)] bg-transparent border-0 cursor-pointer transition-colors"
                      aria-label={`Remove ${m.name}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {/* Add member form */}
                {showAddForm ? (
                  <div className="border border-[var(--rule)] rounded-[8px] p-4 mb-4">
                    <label className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] block mb-2">Name</label>
                    <input
                      type="text"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="Their name"
                      className="w-full border border-[var(--rule)] rounded-[8px] px-[14px] py-[10px] font-sans text-[14px] text-[var(--fg)] bg-white focus:outline-none focus:border-[var(--accent)] transition-colors mb-3 placeholder:text-[var(--placeholder)]"
                      aria-label="Member name"
                      autoFocus
                    />

                    <label className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] block mb-2">Their color</label>
                    <div className="flex flex-wrap gap-[10px] mb-4">
                      {THEMES.map((t) => {
                        const isActive = newMemberTheme === t.name;
                        return (
                          <button
                            key={t.name}
                            onClick={() => setNewMemberTheme(t.name)}
                            className="w-[18px] h-[18px] rounded-full border-0 cursor-pointer p-0 transition-transform duration-[140ms] hover:scale-110"
                            style={{
                              background: t.hex,
                              color: t.hex,
                              outline: isActive ? "2px solid currentColor" : "none",
                              outlineOffset: isActive ? "2px" : undefined,
                            }}
                            aria-label={t.label}
                            aria-pressed={isActive}
                          />
                        );
                      })}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={addMember}
                        disabled={!newMemberName.trim()}
                        className="px-4 py-[8px] bg-[var(--accent)] text-[var(--accent-text)] font-mono text-[9px] uppercase tracking-[0.1em] rounded-[6px] border-0 cursor-pointer hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
                        aria-label="Add member"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setShowAddForm(false); setNewMemberName(""); }}
                        className="px-4 py-[8px] font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] bg-transparent border-0 cursor-pointer hover:text-[var(--fg)] transition-colors"
                        aria-label="Cancel adding member"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : members.length < 3 ? (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-[8px] border border-dashed border-[var(--rule)] bg-transparent cursor-pointer hover:border-[var(--rule-strong)] hover:bg-[rgba(0,0,0,0.01)] transition-colors mb-4"
                    aria-label="Add a household member"
                  >
                    <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center bg-[var(--bg-subtle)]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </div>
                    <span className="font-sans text-[13px] text-[var(--muted)]">Add a household member</span>
                  </button>
                ) : null}

                {/* Switch preview — shows when members exist */}
                {members.length > 0 && (
                  <div
                    className="border border-[var(--rule-faint)] rounded-[8px] p-4 mb-4"
                    style={{ animation: "fadeUp 300ms cubic-bezier(0.23, 1, 0.32, 1)" }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-sans text-[12px] font-medium text-[var(--fg)] tracking-[0.02em] flex-1">
                        <BrandName />
                      </span>
                      <div className="flex items-center gap-[8px]">
                        <button
                          className="w-[26px] h-[26px] rounded-full flex items-center justify-center font-mono text-[10px] font-medium text-white shrink-0 border-0 cursor-default"
                          style={{
                            background: themeHex(selectedTheme),
                            boxShadow: `0 0 0 2px white, 0 0 0 4px ${themeHex(selectedTheme)}`,
                          }}
                          aria-label={userName}
                        >
                          {(userName || "?").charAt(0).toUpperCase()}
                        </button>
                        {members.map((m, i) => (
                          <button
                            key={i}
                            className="w-[26px] h-[26px] rounded-full flex items-center justify-center font-mono text-[10px] font-medium text-white shrink-0 border-0 cursor-default opacity-40"
                            style={{ background: m.color }}
                            aria-label={m.name}
                          >
                            {m.name.charAt(0).toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="font-sans text-[11px] text-[var(--muted)] leading-[1.5]">
                      Switch between people using the dots in the top bar. Recipes and pantry are shared — meal plans and nutrition goals change per person.
                    </p>
                  </div>
                )}

                {/* Nav buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => nav(1, "back")}
                    className="px-6 py-[12px] font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] border border-[var(--rule)] rounded-[8px] bg-transparent cursor-pointer hover:text-[var(--fg)] hover:border-[var(--rule-strong)] transition-colors"
                    aria-label="Go back"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleContinue}
                    className="flex-1 py-[12px] px-6 bg-[var(--accent)] text-[var(--accent-text)] font-mono text-[9px] uppercase tracking-[0.1em] rounded-[8px] border-0 cursor-pointer hover:bg-[var(--accent-hover)] active:scale-[0.97] transition-all duration-[140ms]"
                    aria-label="Continue to nutrition goals"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Nutrition Goals ────────────────────────────── */}
            {step === 3 && (
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-2">Nutrition Goals</div>
                <h2 className="text-[26px] font-semibold tracking-[-0.025em] text-[var(--fg)] leading-[1.1] mb-2">
                  Set a direction.
                </h2>
                <p className="font-sans text-[14px] text-[var(--muted)] leading-[1.5] mb-6" style={{ textWrap: "pretty" }}>
                  Pick a starting point — you can fine-tune every nutrient later in Settings.
                </p>

                <div className="flex flex-col gap-[8px] mb-6">
                  {GOAL_PRESETS.map((g) => {
                    const isSelected = selectedGoal === g.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setSelectedGoal(g.id)}
                        className="flex items-center gap-4 px-4 py-[14px] rounded-[8px] border cursor-pointer bg-transparent text-left transition-all duration-[140ms]"
                        style={{
                          borderColor: isSelected ? "var(--accent)" : "var(--rule)",
                          background: isSelected ? "var(--accent-light)" : "transparent",
                        }}
                        aria-pressed={isSelected}
                      >
                        <div
                          className="w-[38px] h-[38px] rounded-[8px] flex items-center justify-center shrink-0 transition-colors duration-[140ms]"
                          style={{
                            background: isSelected ? "var(--accent)" : "rgba(0,0,0,0.04)",
                            color: isSelected ? "white" : "var(--muted)",
                          }}
                        >
                          {g.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--fg)] mb-[2px]">{g.label}</div>
                          <div className="font-sans text-[11px] text-[var(--muted)]">{g.desc}</div>
                        </div>
                        {g.kcal && (
                          <div className="text-right shrink-0">
                            <div className="font-sans text-[21px] font-semibold text-[var(--fg)] leading-none tabular-nums">
                              {g.kcal.toLocaleString()}
                            </div>
                            <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted)] mt-[2px]">kcal/day</div>
                          </div>
                        )}
                        {g.id === "custom" && (
                          <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] shrink-0">In Settings</div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Nav buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => nav(2, "back")}
                    className="px-6 py-[12px] font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] border border-[var(--rule)] rounded-[8px] bg-transparent cursor-pointer hover:text-[var(--fg)] hover:border-[var(--rule-strong)] transition-colors"
                    aria-label="Go back"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleContinue}
                    className="flex-1 py-[12px] px-6 bg-[var(--accent)] text-[var(--accent-text)] font-mono text-[9px] uppercase tracking-[0.1em] rounded-[8px] border-0 cursor-pointer hover:bg-[var(--accent-hover)] active:scale-[0.97] transition-all duration-[140ms]"
                    aria-label="Continue to recipe import"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 4: First Recipe ───────────────────────────────── */}
            {step === 4 && (
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-2">First Recipe</div>
                <h2 className="text-[26px] font-semibold tracking-[-0.025em] text-[var(--fg)] leading-[1.1] mb-2">
                  Import a recipe you already love.
                </h2>
                <p className="font-sans text-[14px] text-[var(--muted)] leading-[1.5] mb-6" style={{ textWrap: "pretty" }}>
                  Paste any recipe blog URL — Good Measure will pull the ingredients and nutrition data automatically.
                </p>

                <label className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] block mb-2">Recipe URL</label>
                <div className="flex gap-2 mb-4">
                  <input
                    type="url"
                    value={recipeUrl}
                    onChange={(e) => setRecipeUrl(e.target.value)}
                    placeholder="https://..."
                    disabled={importStatus === "loading" || importStatus === "success"}
                    className="flex-1 border border-[var(--rule)] rounded-[8px] px-[14px] py-[10px] font-sans text-[14px] text-[var(--fg)] bg-white focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--placeholder)] disabled:opacity-50"
                    aria-label="Recipe URL"
                  />
                  <button
                    onClick={handleImport}
                    disabled={!recipeUrl.trim() || importStatus === "loading" || importStatus === "success"}
                    className="px-5 py-[10px] bg-[var(--accent)] text-[var(--accent-text)] font-mono text-[9px] uppercase tracking-[0.1em] rounded-[8px] border-0 cursor-pointer hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 shrink-0"
                    aria-label="Import recipe"
                  >
                    Import
                  </button>
                </div>

                {/* Import status area */}
                <div
                  className="rounded-[8px] px-[14px] py-[12px] mb-6 transition-all duration-[300ms]"
                  style={{
                    background:
                      importStatus === "success" ? "var(--accent-light)" :
                      importStatus === "error" ? "var(--error-light)" :
                      importStatus === "loading" ? "var(--bg-subtle)" : "var(--bg-subtle)",
                    borderColor:
                      importStatus === "success" ? "var(--accent)" :
                      importStatus === "error" ? "var(--error-border)" : "var(--rule)",
                    border: importStatus === "loading" ? "1px dashed var(--rule)" : "1px solid var(--rule-faint)",
                  }}
                >
                  {importStatus === "idle" && (
                    <p className="font-sans text-[12px] text-[var(--muted)]">
                      Paste a recipe URL and click Import
                    </p>
                  )}
                  {importStatus === "loading" && (
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full" style={{ animation: "spin 0.9s linear infinite" }} />
                      <p className="font-sans text-[12px] text-[var(--muted)]">Extracting ingredients…</p>
                    </div>
                  )}
                  {importStatus === "success" && importResult && (
                    <div className="flex items-center gap-3">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <p className="font-sans text-[12px] text-[var(--fg)]">
                        {importResult.name} · {importResult.servings} servings · {importResult.ingredients} ingredients matched
                      </p>
                    </div>
                  )}
                  {importStatus === "error" && (
                    <p className="font-sans text-[12px] text-[var(--error)]">{importError}</p>
                  )}
                </div>

                {/* Nav buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => nav(3, "back")}
                    className="px-6 py-[12px] font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] border border-[var(--rule)] rounded-[8px] bg-transparent cursor-pointer hover:text-[var(--fg)] hover:border-[var(--rule-strong)] transition-colors"
                    aria-label="Go back"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => nav(5, "fwd")}
                    className="flex-1 py-[12px] px-6 bg-[var(--accent)] text-[var(--accent-text)] font-mono text-[9px] uppercase tracking-[0.1em] rounded-[8px] border-0 cursor-pointer hover:bg-[var(--accent-hover)] active:scale-[0.97] transition-all duration-[140ms]"
                    aria-label={importResult ? "Continue to finish" : "Skip and finish"}
                  >
                    {importResult ? "Continue" : "Skip"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 5: Complete ───────────────────────────────────── */}
            {step === 5 && (
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-2">Setup Complete</div>
                <h2 className="text-[26px] font-semibold tracking-[-0.025em] text-[var(--fg)] leading-[1.1] mb-2">
                  You&apos;re set.
                </h2>
                <p className="font-sans text-[14px] text-[var(--muted)] leading-[1.5] mb-6" style={{ textWrap: "pretty" }}>
                  Here&apos;s what we set up. You can change any of this in Settings.
                </p>

                {/* Checklist */}
                <div className="flex flex-col gap-0 mb-6">
                  {getChecklistItems().map((item, i) => {
                    const visible = i < checklistRevealed;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 py-[10px] border-b border-[var(--rule-faint)] last:border-b-0 transition-all duration-[320ms]"
                        style={{
                          opacity: visible ? 1 : 0,
                          transform: visible ? "translateY(0)" : "translateY(8px)",
                          transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
                        }}
                      >
                        <div
                          className="w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background: item.done ? "var(--accent)" : "var(--rule)",
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-sans text-[13px] text-[var(--fg)]">{item.text}</span>
                          <span className="font-sans text-[11px] text-[var(--muted)] ml-2">{item.note}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={completeOnboarding}
                  className="w-full py-[12px] px-6 bg-[var(--accent)] text-[var(--accent-text)] font-mono text-[9px] uppercase tracking-[0.1em] rounded-[8px] border-0 cursor-pointer hover:bg-[var(--accent-hover)] active:scale-[0.97] transition-all duration-[140ms]"
                  aria-label="Open the app"
                >
                  Open Good Measure
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
