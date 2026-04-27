"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePersonContext } from "@/app/components/PersonContext";
import { THEMES, themeHex } from "@/lib/themes";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type GoalId = "maintain" | "lean" | "build" | "custom";

type PendingMember = {
  id: string;
  name: string;
  inviteUrl: string | null;
  copied: boolean;
};

/* ─── Goal presets ───────────────────────────────────────────────────────── */

const GOAL_PRESETS: { id: GoalId; label: string; desc: string; detail: string }[] = [
  { id: "maintain", label: "MAINTAIN", desc: "Stay where you are.",   detail: "2,000 KCAL · BALANCED" },
  { id: "lean",     label: "LEAN OUT", desc: "Modest deficit.",        detail: "1,700 KCAL · HIGH PROTEIN" },
  { id: "build",    label: "BUILD",    desc: "Lean gain.",             detail: "2,400 KCAL · HIGH PROTEIN" },
  { id: "custom",   label: "CUSTOM",   desc: "Set my own.",            detail: "CONFIGURE LATER" },
];

const GOAL_VALUES: Record<string, Record<string, { low?: number; high?: number }>> = {
  maintain: {
    calories: { low: 1800, high: 2200 },
    protein:  { low: 50,   high: 150  },
    fat:      { low: 44,   high: 78   },
    carbs:    { low: 225,  high: 325  },
    fiber:    { low: 25 },
    sodium:   { high: 2300 },
  },
  lean: {
    calories: { low: 1500, high: 1900 },
    protein:  { low: 100,  high: 180  },
    fat:      { low: 40,   high: 65   },
    carbs:    { low: 150,  high: 230  },
    fiber:    { low: 25 },
    sodium:   { high: 2000 },
  },
  build: {
    calories: { low: 2200, high: 2600 },
    protein:  { low: 130,  high: 210  },
    fat:      { low: 56,   high: 97   },
    carbs:    { low: 260,  high: 380  },
    fiber:    { low: 30 },
    sodium:   { high: 2300 },
  },
  custom: {},
};

/* ═══════════════════════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════════════════════ */

export default function OnboardingPage() {
  const router = useRouter();
  const { selectedPerson, refreshPersons } = usePersonContext();

  /* ── Step state ──────────────────────────────────────────────────────── */
  // 0 = Welcome, 1 = Profile, 2 = Household, 3 = Goals, 4 = Complete
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"fwd" | "back">("fwd");

  /* ── Profile step ────────────────────────────────────────────────────── */
  const [userName, setUserName] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("sage");

  /* ── Household step ──────────────────────────────────────────────────── */
  const [householdName, setHouseholdName] = useState("");
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const copyTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /* ── Goals step ──────────────────────────────────────────────────────── */
  const [selectedGoal, setSelectedGoal] = useState<GoalId>("maintain");

  /* ── Seed from PersonContext ─────────────────────────────────────────── */
  useEffect(() => {
    if (selectedPerson && !userName) {
      setUserName(selectedPerson.name);
      setSelectedTheme(selectedPerson.theme || "sage");
      setHouseholdName(`${selectedPerson.name}\u2019s household`);
    }
  }, [selectedPerson]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Navigation ─────────────────────────────────────────────────────── */
  const nav = useCallback((to: number, dir: "fwd" | "back") => {
    setDirection(dir);
    setStep(to);
  }, []);

  /* ── Apply theme live ───────────────────────────────────────────────── */
  const applyThemeLive = (themeName: string) => {
    document.documentElement.dataset.theme = themeName || "sage";
  };

  /* ── Save profile ───────────────────────────────────────────────────── */
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

  /* ── Add household member ────────────────────────────────────────────── */
  const addMember = async () => {
    const name = newMemberName.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    const member: PendingMember = { id, name, inviteUrl: null, copied: false };
    setPendingMembers(prev => [...prev, member]);
    setNewMemberName("");
    setAddingMember(false);
    try {
      const res = await fetch("/api/households/invite", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPendingMembers(prev =>
          prev.map(m => m.id === id ? { ...m, inviteUrl: data.url } : m)
        );
      }
    } catch {}
  };

  /* ── Copy invite link ────────────────────────────────────────────────── */
  const copyInvite = async (member: PendingMember) => {
    if (!member.inviteUrl) return;
    await navigator.clipboard.writeText(member.inviteUrl);
    if (copyTimers.current[member.id]) clearTimeout(copyTimers.current[member.id]);
    setPendingMembers(prev =>
      prev.map(m => m.id === member.id ? { ...m, copied: true } : m)
    );
    copyTimers.current[member.id] = setTimeout(() => {
      setPendingMembers(prev =>
        prev.map(m => m.id === member.id ? { ...m, copied: false } : m)
      );
    }, 2500);
  };

  /* ── Save goals ─────────────────────────────────────────────────────── */
  const saveGoals = async () => {
    if (!selectedPerson || selectedGoal === "custom") return;
    const preset = GOAL_VALUES[selectedGoal];
    if (!preset || Object.keys(preset).length === 0) return;
    const res = await fetch("/api/nutrients");
    if (!res.ok) return;
    const nutrients: { id: number; name: string }[] = await res.json();
    const goals: Record<number, { lowGoal?: number; highGoal?: number }> = {};
    for (const n of nutrients) {
      const val = preset[n.name];
      if (val) goals[n.id] = { lowGoal: val.low, highGoal: val.high };
    }
    await fetch("/api/nutrition-goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: selectedPerson.id, goals }),
    });
  };

  /* ── Complete onboarding ────────────────────────────────────────────── */
  const completeOnboarding = async () => {
    if (!selectedPerson) return;
    await fetch(`/api/persons/${selectedPerson.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardingComplete: true }),
    });
    await refreshPersons();
    router.push("/home");
  };

  /* ── Handle CONTINUE per step ───────────────────────────────────────── */
  const handleContinue = async () => {
    if (step === 1) await saveProfile();
    if (step === 3) await saveGoals();
    nav(step + 1, "fwd");
  };

  /* ── Step counter ───────────────────────────────────────────────────── */
  const counterLabel: Record<number, string> = { 1: "01 / 03", 2: "02 / 03", 3: "03 / 03" };
  const showCounter = step >= 1 && step <= 3;

  /* ── Theme hex helper ───────────────────────────────────────────────── */
  const getThemeHex = (name: string) =>
    THEMES.find(t => t.name === name)?.hex ?? "#5A9B6A";

  /* ── Animation class ────────────────────────────────────────────────── */
  const animClass = direction === "fwd" ? "ob-step-fwd" : "ob-step-back";

  /* ═══════════════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════════════ */

  return (
    <div className="ob-page">

      {/* ── Top chrome ────────────────────────────────────────────────── */}
      <div className="ob-chrome">
        <span className="ob-wordmark">Good Measure</span>
        <span
          className="ob-counter"
          aria-hidden={!showCounter}
          style={{ visibility: showCounter ? "visible" : "hidden" }}
        >
          {counterLabel[step] ?? ""}
        </span>
      </div>

      {/* ── Step body ─────────────────────────────────────────────────── */}
      <div className="ob-body">
        <div key={step} className={animClass}>

          {/* ── Welcome (step 0) ──────────────────────────────────────── */}
          {step === 0 && (
            <div className="ob-col ob-col--welcome">
              <div className="ob-eyebrow">§ WELCOME</div>
              <h1 className="ob-headline ob-headline--welcome">
                Measure what <em>matters.</em>
              </h1>
              <p className="ob-lede">
                A nutrition tracker built around real recipes,<br />
                real households, and the way you actually cook.
              </p>
              <div className="ob-actions ob-actions--center">
                <button
                  className="ob-cta"
                  onClick={() => nav(1, "fwd")}
                  aria-label="Begin setup"
                >
                  GET STARTED →
                </button>
              </div>
            </div>
          )}

          {/* ── Profile (step 1) ──────────────────────────────────────── */}
          {step === 1 && (
            <div className="ob-col">
              <div className="ob-eyebrow">§ YOUR PROFILE</div>
              <h1 className="ob-headline">Pick your color.</h1>
              <p className="ob-lede">
                Your color marks what&rsquo;s yours across the app.<br />
                Avatar, planner column, the accent on this page.
              </p>

              <label className="ob-label" htmlFor="ob-name">NAME</label>
              <input
                id="ob-name"
                className="ob-input"
                type="text"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                aria-label="Your name"
              />

              <label className="ob-label" style={{ marginTop: 20 }}>THEME</label>
              <div className="ob-swatches" role="group" aria-label="Theme color">
                {THEMES.map(t => (
                  <button
                    key={t.name}
                    className="ob-swatch"
                    style={{
                      background: t.hex,
                      boxShadow: selectedTheme === t.name
                        ? `0 0 0 2px var(--bg), 0 0 0 3.5px var(--fg)`
                        : "none",
                    }}
                    onClick={() => { setSelectedTheme(t.name); applyThemeLive(t.name); }}
                    aria-label={t.label}
                    aria-pressed={selectedTheme === t.name}
                  />
                ))}
              </div>

              <div className="ob-actions">
                <button className="ob-back" onClick={() => nav(0, "back")}>← BACK</button>
                <button className="ob-cta" onClick={handleContinue}>CONTINUE</button>
              </div>
            </div>
          )}

          {/* ── Household (step 2) ────────────────────────────────────── */}
          {step === 2 && (
            <div className="ob-col ob-col--household">
              <div className="ob-eyebrow">§ YOUR HOUSEHOLD</div>
              <h1 className="ob-headline">Who else is eating?</h1>
              <p className="ob-lede">
                Add the people you&rsquo;re planning meals for.<br />
                Each gets their own goals, plan, and color.
              </p>

              <label className="ob-label" htmlFor="ob-household-name">HOUSEHOLD NAME</label>
              <input
                id="ob-household-name"
                className="ob-input"
                type="text"
                value={householdName}
                onChange={e => setHouseholdName(e.target.value)}
                aria-label="Household name"
              />

              <div className="ob-members" role="list" aria-label="Household members">
                <div className="ob-label" style={{ marginTop: 20, marginBottom: 12 }}>MEMBERS</div>

                {/* Current user — not removable */}
                <div className="ob-member-row" role="listitem">
                  <span
                    className="ob-member-dot"
                    style={{ background: getThemeHex(selectedTheme) }}
                    aria-hidden="true"
                  />
                  <span className="ob-member-name">{userName || "You"}</span>
                  <span className="ob-member-you">YOU</span>
                </div>

                {/* Pending invited members */}
                {pendingMembers.map(member => (
                  <div key={member.id} className="ob-member-row" role="listitem">
                    <span
                      className="ob-member-dot"
                      style={{ background: "var(--rule)" }}
                      aria-hidden="true"
                    />
                    <span className="ob-member-name">{member.name}</span>
                    {member.inviteUrl ? (
                      <button
                        className={`ob-member-action${member.copied ? " ob-member-action--copied" : ""}`}
                        onClick={() => copyInvite(member)}
                        aria-label={`Copy invite link for ${member.name}`}
                      >
                        {member.copied
                          ? `✓ COPIED — SEND TO ${member.name.toUpperCase()}`
                          : "COPY INVITE LINK"}
                      </button>
                    ) : (
                      <span className="ob-member-you">GENERATING…</span>
                    )}
                  </div>
                ))}

                {/* Add another person */}
                {addingMember ? (
                  <div className="ob-member-row" role="listitem">
                    <span className="ob-member-dot ob-member-dot--dashed" aria-hidden="true" />
                    <input
                      className="ob-member-inline-input"
                      type="text"
                      placeholder="Name"
                      value={newMemberName}
                      onChange={e => setNewMemberName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") addMember();
                        if (e.key === "Escape") { setAddingMember(false); setNewMemberName(""); }
                      }}
                      autoFocus
                      aria-label="New member name"
                    />
                    <button
                      className="ob-member-action"
                      onClick={addMember}
                      aria-label="Confirm add member"
                    >
                      + ADD
                    </button>
                  </div>
                ) : (
                  <div
                    className="ob-member-row ob-member-row--placeholder"
                    onClick={() => setAddingMember(true)}
                    role="listitem"
                    tabIndex={0}
                    onKeyDown={e => e.key === "Enter" && setAddingMember(true)}
                    aria-label="Add another person"
                  >
                    <span className="ob-member-dot ob-member-dot--dashed" aria-hidden="true" />
                    <span className="ob-member-name ob-member-muted">Add another person…</span>
                    <button
                      className="ob-member-action"
                      onClick={e => { e.stopPropagation(); setAddingMember(true); }}
                      aria-label="Add a household member"
                      tabIndex={-1}
                    >
                      + ADD
                    </button>
                  </div>
                )}
              </div>

              <div className="ob-actions">
                <button className="ob-back" onClick={() => nav(1, "back")}>← BACK</button>
                <button className="ob-cta" onClick={() => nav(3, "fwd")}>CONTINUE</button>
              </div>
            </div>
          )}

          {/* ── Goals (step 3) ────────────────────────────────────────── */}
          {step === 3 && (
            <div className="ob-col ob-col--goals">
              <div className="ob-eyebrow">§ DAILY GOALS</div>
              <h1 className="ob-headline">A starting point.</h1>
              <p className="ob-lede">
                Pick a preset close to what you&rsquo;re after.<br />
                Tune the exact numbers later in Settings.
              </p>

              <div className="ob-goal-grid" role="group" aria-label="Goal presets">
                {GOAL_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    className={`ob-goal-card${selectedGoal === preset.id ? " ob-goal-card--selected" : ""}`}
                    onClick={() => setSelectedGoal(preset.id)}
                    aria-pressed={selectedGoal === preset.id}
                  >
                    <span className="ob-goal-card-label">{preset.label}</span>
                    <span className="ob-goal-card-desc">{preset.desc}</span>
                    <span className="ob-goal-card-detail">{preset.detail}</span>
                  </button>
                ))}
              </div>

              <div className="ob-actions">
                <button className="ob-back" onClick={() => nav(2, "back")}>← BACK</button>
                <button className="ob-cta" onClick={handleContinue}>FINISH →</button>
              </div>
            </div>
          )}

          {/* ── Complete (step 4) ─────────────────────────────────────── */}
          {step === 4 && (
            <div className="ob-col ob-col--complete">
              <div className="ob-check-icon" aria-hidden="true">
                <svg
                  width="56"
                  height="56"
                  viewBox="0 0 56 56"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="28" cy="28" r="26.25" stroke="var(--fg)" strokeWidth="1.5" />
                  <polyline
                    points="17,28 25,36 39,20"
                    stroke="var(--fg)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="ob-eyebrow">§ READY</div>
              <h1 className="ob-headline ob-headline--complete">
                You&rsquo;re all <em>set.</em>
              </h1>
              <p className="ob-lede">
                Now let&rsquo;s add a recipe or two.<br />
                The dashboard has a checklist to walk you through it.
              </p>
              <div className="ob-actions ob-actions--center">
                <button
                  className="ob-cta"
                  onClick={completeOnboarding}
                  aria-label="Go to dashboard"
                >
                  GO TO DASHBOARD →
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
