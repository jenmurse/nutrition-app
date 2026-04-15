'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { APP_NAME } from '@/lib/brand';
import { usePersonContext } from '@/app/components/PersonContext';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';
import { dialog } from '@/lib/dialog';
import { THEMES } from '@/lib/themes';

interface Nutrient {
  id: number;
  name: string;
  displayName: string;
  unit: string;
  orderIndex: number;
}

interface DashboardStats {
  enabledStats: string[];
  showGreeting: boolean;
}

const DASHBOARD_STAT_OPTIONS = [
  { key: 'calories', label: 'Calories' },
  { key: 'fat', label: 'Fat' },
  { key: 'sat-fat', label: 'Saturated Fat' },
  { key: 'sodium', label: 'Sodium' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'sugar', label: 'Sugar' },
  { key: 'protein', label: 'Protein' },
  { key: 'fiber', label: 'Fiber' },
];

const GOALS_LAYOUT: { nutrientName: string }[][] = [
  // Left column
  [{ nutrientName: 'Calories' }, { nutrientName: 'Fat' }, { nutrientName: 'Saturated Fat' }, { nutrientName: 'Sodium' }],
  // Right column
  [{ nutrientName: 'Carbs' }, { nutrientName: 'Sugar' }, { nutrientName: 'Protein' }, { nutrientName: 'Fiber' }],
];

interface Invite {
  id: number;
  token: string;
  url: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedByName: string | null;
  expired: boolean;
}

// ─── Jump nav sections ─────────────────────────────────────────────────────
const JUMP_SECTIONS = [
  { id: 'set-sec-people', n: '01', label: 'People' },
  { id: 'set-sec-goals', n: '02', label: 'Daily Goals' },
  { id: 'set-sec-dashboard', n: '03', label: 'Dashboard' },
  { id: 'set-sec-mcp', n: '04', label: 'MCP' },
  { id: 'set-sec-data', n: '05', label: 'Data' },
];

// ─── Household section ──────────────────────────────────────────────────────

// ─── Section header component ───────────────────────────────────────────────
function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-8">
      <span className="font-serif text-[13px] font-bold text-[var(--rule)]">{number}</span>
      <span className="font-serif font-semibold tracking-[-0.02em] text-[var(--fg)]" style={{ fontSize: "clamp(18px, 1.8vw, 26px)" }}>{title}</span>
      <span className="flex-1 h-px bg-[var(--rule)]" />
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

const SettingsPage = () => {
  const { persons, selectedPersonId, refreshPersons } = usePersonContext();
  const supabase = createClient();

  const handleSignOut = async () => {
    localStorage.removeItem('selectedPersonId');
    localStorage.removeItem('theme');
    document.documentElement.removeAttribute('data-theme');
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const [nutrients, setNutrients] = useState<Nutrient[]>([]);
  const [savingThemeId, setSavingThemeId] = useState<number | null>(null);

  // Goals section
  const [goalsPersonId, setGoalsPersonId] = useState<number | null>(null);
  const [goals, setGoals] = useState<Record<number, { lowGoal?: number; highGoal?: number }>>({});
  const [goalsLoaded, setGoalsLoaded] = useState(false);
  const [goalsSaving, setGoalsSaving] = useState(false);

  // Dashboard prefs (localStorage)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(() => {
    if (typeof window === 'undefined') return { enabledStats: ['calories', 'protein', 'carbs'], showGreeting: true };
    const defaults = { enabledStats: ['calories', 'protein', 'carbs'], showGreeting: true };
    try {
      const stored = localStorage.getItem('dashboard-stats');
      if (stored) return JSON.parse(stored);
    } catch {}
    // Write defaults so GettingStartedCard can detect them
    localStorage.setItem('dashboard-stats', JSON.stringify(defaults));
    return defaults;
  });

  // Jump nav active section
  const [activeSection, setActiveSection] = useState(JUMP_SECTIONS[0].id);

  // Household info — seed from localStorage so name appears instantly
  const [householdName, setHouseholdName] = useState(
    () => (typeof window !== 'undefined' ? localStorage.getItem('householdName') ?? '' : '')
  );
  const [editingHouseholdName, setEditingHouseholdName] = useState(false);
  const [householdNameDraft, setHouseholdNameDraft] = useState('');
  const [householdNameSaving, setHouseholdNameSaving] = useState(false);
  const [memberRoles, setMemberRoles] = useState<Record<number, string>>({});
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviting, setInviting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Add member
  const [addingPerson, setAddingPerson] = useState(false);
  const [newName, setNewName] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  // API key
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [editingApiKey, setEditingApiKey] = useState(false);
  const [newApiKeyValue, setNewApiKeyValue] = useState('');
  const [apiSaving, setApiSaving] = useState(false);


  // MCP token
  const [hasMcpToken, setHasMcpToken] = useState(false);
  const [newMcpToken, setNewMcpToken] = useState<string | null>(null);
  const [mcpTokenLoading, setMcpTokenLoading] = useState(false);
  const [revokingMcpToken, setRevokingMcpToken] = useState(false);
  const [mcpCopied, setMcpCopied] = useState(false);
  const [configBlockCopied, setConfigBlockCopied] = useState(false);

  // Data export / import
  const [exportLoading, setExportLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Load nutrients once
  useEffect(() => {
    fetch('/api/nutrients')
      .then((r) => r.ok ? r.json() : [])
      .then(setNutrients)
      .catch(() => {});
  }, []);

  // Load household info once
  useEffect(() => {
    fetch('/api/households')
      .then((r) => r.ok ? r.json() : [])
      .then((data: { name: string; active: boolean; members: { personId: number; role: string }[] }[]) => {
        const active = data.find((h) => h.active) ?? data[0];
        if (active) {
          setHouseholdName(active.name);
          localStorage.setItem('householdName', active.name);
          const roles: Record<number, string> = {};
          active.members.forEach((m) => { roles[m.personId] = m.role; });
          setMemberRoles(roles);
        }
      })
      .catch(() => {});

    fetch('/api/households/invite')
      .then((r) => r.ok ? r.json() : [])
      .then(setInvites)
      .catch(() => {});
  }, []);

  // Scroll-based active section tracking (handles near-bottom edge case)
  const jumpNavLocked = useRef(false);
  const jumpNavTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const scrollEl = document.getElementById('settings-scroll-container');
    if (!scrollEl) return;

    const update = () => {
      if (jumpNavLocked.current) return;
      const paneRect = scrollEl.getBoundingClientRect();
      const nearBottom = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 60;
      const sectionIds = JUMP_SECTIONS.map((s) => s.id);
      let activeId = sectionIds[0];

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - paneRect.top <= 100) activeId = id;
      }

      // Near bottom: pick last section in upper 60% of viewport
      if (nearBottom) {
        for (const id of sectionIds) {
          const el = document.getElementById(id);
          if (!el) continue;
          if (el.getBoundingClientRect().top - paneRect.top < scrollEl.clientHeight * 0.6) activeId = id;
        }
      }

      setActiveSection(activeId);
    };

    scrollEl.addEventListener('scroll', update, { passive: true });
    setTimeout(update, 50);
    return () => scrollEl.removeEventListener('scroll', update);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    const container = document.getElementById('settings-scroll-container');
    if (el && container) {
      const paneRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offset = container.scrollTop + (elRect.top - paneRect.top) - 64;
      container.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
      // Immediately set active, lock scroll tracking for 800ms
      setActiveSection(id);
      jumpNavLocked.current = true;
      if (jumpNavTimeout.current) clearTimeout(jumpNavTimeout.current);
      jumpNavTimeout.current = setTimeout(() => { jumpNavLocked.current = false; }, 800);
    }
  };

  const loadInvites = async () => {
    const r = await fetch('/api/households/invite');
    if (r.ok) setInvites(await r.json());
  };

  // Auto-select first person for goals tab
  useEffect(() => {
    if (persons.length > 0 && goalsPersonId === null) {
      setGoalsPersonId(persons[0].id);
    }
  }, [persons, goalsPersonId]);

  // Load goals when person tab changes
  useEffect(() => {
    if (goalsPersonId === null) return;
    setGoalsLoaded(false);
    fetch(`/api/nutrition-goals?personId=${goalsPersonId}`)
      .then((r) => r.ok ? r.json() : { goals: {} })
      .then((data) => {
        const filled: Record<number, { lowGoal?: number; highGoal?: number }> = {};
        nutrients.forEach((n) => {
          filled[n.id] = {
            lowGoal: data.goals?.[n.id]?.lowGoal ?? undefined,
            highGoal: data.goals?.[n.id]?.highGoal ?? undefined,
          };
        });
        setGoals(filled);
        setGoalsLoaded(true);
      })
      .catch(() => setGoalsLoaded(true));
  }, [goalsPersonId, nutrients]);

  const handleGoalChange = (nutrientId: number, field: 'lowGoal' | 'highGoal', value: string) => {
    setGoals((prev) => ({
      ...prev,
      [nutrientId]: {
        ...prev[nutrientId],
        [field]: value === '' ? undefined : parseFloat(value),
      },
    }));
  };

  const handleSaveGoals = async () => {
    if (goalsPersonId === null) return;
    setGoalsSaving(true);
    try {
      await fetch('/api/nutrition-goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals, personId: goalsPersonId }),
      });
      toast.success('Goals saved');
    } finally {
      setGoalsSaving(false);
    }
  };

  const handleResetGoals = () => {
    const cleared: Record<number, { lowGoal?: number; highGoal?: number }> = {};
    nutrients.forEach((n) => { cleared[n.id] = { lowGoal: undefined, highGoal: undefined }; });
    setGoals(cleared);
  };

  const saveDashboardStats = (updated: DashboardStats) => {
    setDashboardStats(updated);
    localStorage.setItem('dashboard-stats', JSON.stringify(updated));
  };

  const toggleDashboardStat = (key: string) => {
    const current = dashboardStats.enabledStats;
    const updated = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    saveDashboardStats({ ...dashboardStats, enabledStats: updated });
  };


  const handleSaveHouseholdName = async () => {
    if (!householdNameDraft.trim() || householdNameDraft.trim() === householdName) {
      setEditingHouseholdName(false);
      return;
    }
    setHouseholdNameSaving(true);
    try {
      const res = await fetch('/api/households', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: householdNameDraft.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setHouseholdName(data.name);
        localStorage.setItem('householdName', data.name);
        setEditingHouseholdName(false);
      }
    } finally {
      setHouseholdNameSaving(false);
    }
  };

  const handleInvite = async () => {
    setInviting(true);
    try {
      const res = await fetch('/api/households/invite', { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();
      await navigator.clipboard.writeText(data.url);
      setCopiedToken(data.token);
      setTimeout(() => setCopiedToken(null), 3000);
      await loadInvites();
    } finally {
      setInviting(false);
    }
  };

  const handleCopyInvite = async (url: string, token: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const loadMcpToken = useCallback(async () => {
    try {
      const res = await fetch('/api/mcp/token');
      if (!res.ok) return;
      const data = await res.json();
      setHasMcpToken(data.hasToken);
    } catch {}
  }, []);

  const handleGenerateMcpToken = async () => {
    setMcpTokenLoading(true);
    setNewMcpToken(null);
    try {
      const res = await fetch('/api/mcp/token', { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();
      setNewMcpToken(data.token);
      setHasMcpToken(true);
    } finally {
      setMcpTokenLoading(false);
    }
  };

  const handleRevokeMcpToken = async () => {
    if (!await dialog.confirm('Revoke this token? Any configured MCP servers will stop working until you generate a new one.', { confirmLabel: 'Revoke', danger: true })) return;
    setRevokingMcpToken(true);
    try {
      await fetch('/api/mcp/token', { method: 'DELETE' });
      setHasMcpToken(false);
      setNewMcpToken(null);
    } finally {
      setRevokingMcpToken(false);
    }
  };

  const handleCopyMcpToken = async () => {
    if (!newMcpToken) return;
    await navigator.clipboard.writeText(newMcpToken);
    setMcpCopied(true);
    setTimeout(() => setMcpCopied(false), 3000);
  };

  // Load API settings
  const loadApiSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) return;
      const data = await res.json();
      setHasApiKey(data.hasKey);
      setMaskedKey(data.maskedKey);
    } catch {}
  }, []);

  useEffect(() => {
    loadApiSettings();
    loadMcpToken();
  }, [loadApiSettings, loadMcpToken]);

  const handleSaveApiKey = async () => {
    setApiSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: newApiKeyValue }),
      });
      if (res.ok) {
        setEditingApiKey(false);
        setNewApiKeyValue('');
        await loadApiSettings();
      }
    } finally {
      setApiSaving(false);
    }
  };

  const handleRemoveApiKey = async () => {
    if (!await dialog.confirm('Remove the API key? AI analysis will fall back to mock data.', { confirmLabel: 'Remove', danger: true })) return;
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: '' }),
    });
    await loadApiSettings();
  };


  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await fetch('/api/export');
      if (!res.ok) { toast.error('Export failed'); return; }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      const safeName = (data.householdName || 'course').replace(/[^a-z0-9]/gi, '-').toLowerCase();
      a.href = url;
      a.download = `${safeName}-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    if (!await dialog.confirm('This will permanently overwrite all household data with the contents of this backup. Continue?', { confirmLabel: 'Overwrite', danger: true })) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const text = await importFile.text();
      const data = JSON.parse(text);
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setImportResult({ ok: true, message: 'Import complete. Reload the page to see your restored data.' });
        setImportFile(null);
      } else {
        const err = await res.json();
        setImportResult({ ok: false, message: err.error || 'Import failed.' });
      }
    } catch {
      setImportResult({ ok: false, message: `Could not read file. Make sure it is a valid ${APP_NAME} backup.` });
    } finally {
      setImportLoading(false);
    }
  };

  const handleAddPerson = async () => {
    if (!newName.trim()) return;
    setAddSaving(true);
    try {
      const res = await fetch('/api/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        await refreshPersons();
        setAddingPerson(false);
        setNewName('');
      }
    } finally {
      setAddSaving(false);
    }
  };

  const handleThemeSave = async (personId: number, themeName: string) => {
    setSavingThemeId(personId);
    // Apply live if this is the selected person
    if (personId === selectedPersonId) {
      document.documentElement.dataset.theme = themeName;
      localStorage.setItem('theme', themeName);
    }
    try {
      await fetch(`/api/persons/${personId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: themeName }),
      });
      await refreshPersons();
    } finally {
      setSavingThemeId(null);
    }
  };

  return (
    <div className="h-full overflow-hidden relative">
      {/* ─── Fixed jump nav ─── */}
      <nav
        className="detail-jump-nav fixed z-50 flex flex-col"
        style={{ left: 'var(--pad)', top: 'calc(var(--nav-h) + 48px)', width: 140, opacity: 0, animation: 'contentEnter 400ms var(--ease-out) both' }}
        aria-label="Settings sections"
      >
        {JUMP_SECTIONS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => scrollToSection(s.id)}
            className={`flex items-baseline gap-[10px] font-mono text-[9px] tracking-[0.1em] uppercase py-[8px] border-0 bg-transparent cursor-pointer transition-colors text-left ${
              i < JUMP_SECTIONS.length - 1 ? 'border-b border-[var(--rule)]' : ''
            } ${
              activeSection === s.id ? 'text-[var(--fg)]' : 'text-[var(--muted)] hover:text-[var(--accent-btn)]'
            }`}
            style={i === 0 ? { paddingTop: 0 } : undefined}
            aria-label={`Jump to ${s.label}`}
          >
            <span className={`font-serif text-[9px] font-bold min-w-[16px] transition-colors ${
              activeSection === s.id ? 'text-[var(--accent-btn)]' : 'text-[var(--rule)]'
            }`}>{s.n}</span>
            {s.label}
          </button>
        ))}
      </nav>

      {/* ─── Scrollable content ─── */}
      <div id="settings-scroll-container" className="h-full overflow-y-auto animate-page-enter">
        <div className="detail-content max-w-[1100px] mx-auto" style={{ padding: '0 64px 60px 196px' }}>

          {/* ════════════════════════════════════════════════════════════════════
              01 — PEOPLE
              ════════════════════════════════════════════════════════════════════ */}
          <div id="set-sec-people" style={{ paddingTop: 48, paddingBottom: 56 }}>
            <SectionHeader number="01" title="People" />

            {/* Household name — full width above members */}
            <div className="mb-[32px]">
              <div className="ed-label mb-[8px]">Household Name</div>
              <div className="flex gap-[8px] items-end">
                <div className="flex-1">
                  <input
                    type="text"
                    value={editingHouseholdName ? householdNameDraft : householdName}
                    onChange={(e) => { if (!editingHouseholdName) { setHouseholdNameDraft(e.target.value); setEditingHouseholdName(true); } else { setHouseholdNameDraft(e.target.value); } }}
                    onFocus={() => { if (!editingHouseholdName) { setHouseholdNameDraft(householdName); setEditingHouseholdName(true); } }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveHouseholdName(); if (e.key === 'Escape') setEditingHouseholdName(false); }}
                    className="w-full bg-transparent border-0 border-b border-[var(--rule)] px-0 py-[6px] font-sans text-[13px] text-[var(--fg)] rounded-none focus:outline-none focus:border-[var(--accent)]"
                    aria-label="Household name"
                  />
                </div>
                <button
                  onClick={handleSaveHouseholdName}
                  disabled={householdNameSaving}
                  className="ed-btn primary disabled:opacity-40"
                >{householdNameSaving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>

            {/* Member list — full width */}
            <div>
                {/* Member rows */}
                {persons.map((person) => {
                  const role = memberRoles[person.id];
                  const isSaving = savingThemeId === person.id;
                  return (
                    <div key={person.id} className="set-person-row flex items-center gap-[12px] py-[12px] border-b border-[var(--rule)]">
                      <span
                        className="w-[10px] h-[10px] rounded-full shrink-0"
                        style={{ background: person.color || 'var(--accent)' }}
                        aria-hidden="true"
                      />
                      <span className="text-[13px] text-[var(--fg)] font-medium">{person.name}</span>
                      {role && (
                        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] border border-[var(--rule)] px-[6px] py-[2px] rounded-pill">{role}</span>
                      )}
                      {role !== 'owner' && (
                        <button
                          onClick={async () => {
                            if (!await dialog.confirm(`Remove ${person.name} from the household? Their meal plans and goals will be deleted.`, { confirmLabel: 'Remove', danger: true })) return;
                            const res = await fetch(`/api/persons/${person.id}`, { method: 'DELETE' });
                            if (res.ok) { await refreshPersons(); } else {
                              const data = await res.json();
                              toast.error(data.error || 'Failed to remove person');
                            }
                          }}
                          className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--muted)] hover:text-[var(--error)] bg-transparent border-0 cursor-pointer transition-colors"
                          aria-label={`Remove ${person.name}`}
                        >
                          Remove
                        </button>
                      )}
                      <div className="set-theme-chips flex items-center gap-[6px] ml-auto" role="radiogroup" aria-label={`Theme color for ${person.name}`}>
                        {THEMES.map((t) => {
                          const isActive = (person.theme || 'sage') === t.name;
                          return (
                            <button
                              key={t.name}
                              onClick={() => !isSaving && handleThemeSave(person.id, t.name)}
                              disabled={isSaving}
                              title={t.label}
                              className="w-[20px] h-[20px] rounded-full border-0 cursor-pointer p-0 disabled:opacity-50 transition-transform hover:scale-[1.15] active:scale-95 flex items-center justify-center"
                              style={{
                                background: t.hex,
                                boxShadow: isActive ? `0 0 0 2px var(--bg), 0 0 0 3.5px ${t.hex}` : 'none',
                              }}
                              aria-label={`${t.label}${isActive ? ' (current)' : ''}`}
                              role="radio"
                              aria-checked={isActive}
                            >
                              {isActive && (
                                <svg width="7" height="5" viewBox="0 0 8 6" fill="none" aria-hidden="true">
                                  <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {/* Add / Invite buttons */}
                <div className="set-invite-btns pt-[12px] flex gap-[8px] flex-wrap">
                  {!addingPerson ? (
                    <button
                      onClick={() => setAddingPerson(true)}
                      className="ed-btn"
                      aria-label="Add a household member"
                    >+ Add Member</button>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddPerson(); if (e.key === 'Escape') { setAddingPerson(false); setNewName(''); } }}
                        placeholder="Name" autoFocus
                        className="bg-[var(--bg-2)] border border-[var(--rule)] px-3 py-2 font-mono text-[11px] text-[var(--fg)] w-[160px] focus:outline-none focus:border-[var(--accent)]"
                        aria-label="New member name" />
                      <button onClick={handleAddPerson} disabled={!newName.trim() || addSaving}
                        className="ed-btn primary disabled:opacity-40">
                        {addSaving ? 'Adding…' : 'Add'}
                      </button>
                      <button onClick={() => { setAddingPerson(false); setNewName(''); }}
                        className="ed-btn ghost">Cancel</button>
                    </div>
                  )}
                  <button onClick={handleInvite} disabled={inviting}
                    className="ed-btn disabled:opacity-40"
                    aria-label="Generate invite link">
                    {inviting ? 'Generating…' : '+ Invite Link'}
                  </button>
                </div>
              </div>

            {/* ── Invite Links table ── */}
            {invites.length > 0 && (
              <div className="set-invite-wrap mt-[32px]">
                <div className="ed-label mb-[10px]">Invite Links</div>
                <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['URL', 'Status', 'Created', 'Redeemed', ''].map((h, i) => (
                        <th key={i} className="ed-label text-left font-normal py-[8px] border-b border-[var(--rule)]"
                          style={i === 4 ? { width: 80 } : i >= 1 && i <= 3 ? { width: 80 } : undefined}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((inv) => {
                      const status = inv.usedAt ? 'redeemed' : inv.expired ? 'expired' : 'active';
                      return (
                        <tr key={inv.id} className="border-b border-[var(--rule)]">
                          <td className="font-mono text-[11px] text-[var(--fg)] py-[8px]" title={inv.url}>
                            {inv.url.replace(/^https?:\/\//, '')}
                          </td>
                          <td className={`font-mono text-[11px] py-[8px] ${status === 'active' ? 'text-[var(--ok)]' : 'text-[var(--muted)]'}`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </td>
                          <td className="font-mono text-[11px] text-[var(--muted)] py-[8px]">
                            {new Date(inv.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
                          </td>
                          <td className="font-mono text-[11px] text-[var(--muted)] py-[8px]">
                            {inv.usedAt ? new Date(inv.usedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                          </td>
                          <td className="text-right py-[8px]">
                            {status === 'active' ? (
                              <button
                                className="ed-btn danger"
                                aria-label="Revoke invite"
                                onClick={async () => {
                                  if (!await dialog.confirm('Revoke this invite link?', { confirmLabel: 'Revoke', danger: true })) return;
                                  const res = await fetch(`/api/households/invite/${inv.id}`, { method: 'DELETE' });
                                  if (res.ok) await loadInvites();
                                  else toast.error('Failed to revoke invite');
                                }}
                              >Revoke</button>
                            ) : (
                              <button
                                className="w-[22px] h-[22px] flex items-center justify-center bg-[var(--bg)] border border-[var(--rule)] text-[var(--muted)] text-[11px] cursor-pointer hover:text-[var(--err)] hover:border-[var(--err)] transition-colors ml-auto rounded-full"
                                aria-label="Remove expired invite"
                                onClick={async () => {
                                  const res = await fetch(`/api/households/invite/${inv.id}`, { method: 'DELETE' });
                                  if (res.ok) await loadInvites();
                                  else toast.error('Failed to remove invite');
                                }}
                              >×</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              02 — DAILY GOALS
              ════════════════════════════════════════════════════════════════════ */}
          <div id="set-sec-goals" style={{ padding: '56px 0' }}>
            <SectionHeader number="02" title="Daily Goals" />

            <div>
              {/* Person tabs */}
              <div className="flex items-center gap-[8px] mb-[16px]" role="tablist" aria-label="Select person for goals">
                {persons.map((person) => {
                  const isActive = goalsPersonId === person.id;
                  return (
                    <button
                      key={person.id}
                      onClick={() => setGoalsPersonId(person.id)}
                      role="tab"
                      aria-selected={isActive}
                      className="px-[16px] py-[6px] font-mono text-[9px] uppercase tracking-[0.1em] border-0 cursor-pointer transition-colors"
                      style={{
                        background: isActive ? 'var(--accent-btn)' : 'var(--bg-2)',
                        color: isActive ? 'var(--accent-fg)' : 'var(--muted)',
                        borderRadius: 'var(--radius-pill)',
                      }}
                      aria-label={`Goals for ${person.name}`}
                    >
                      {person.name}
                    </button>
                  );
                })}
              </div>

              {/* 2-column nutrient grid */}
              {!goalsLoaded ? (
                <div className="text-[11px] text-[var(--muted)] py-4">Loading goals...</div>
              ) : (
                <>
                  <div className="set-goals-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 56px' }}>
                    {GOALS_LAYOUT.map((column, colIdx) => (
                      <div key={colIdx}>
                        {column.map(({ nutrientName }) => {
                          const nutrient = nutrients.find((n) => n.displayName === nutrientName);
                          if (!nutrient) return null;
                          return (
                            <div
                              key={nutrient.id}
                              className="flex items-center gap-[12px]"
                              style={{ padding: '8px 0' }}
                            >
                              <span className="text-[13px] text-[var(--fg)]" style={{ flex: 1 }}>
                                {nutrient.displayName}
                              </span>
                              <span className="font-mono text-[9px] text-[var(--muted)]" style={{ width: 24 }}>Min</span>
                              <input
                                type="number"
                                placeholder="—"
                                value={goals[nutrient.id]?.lowGoal ?? ''}
                                onChange={(e) => handleGoalChange(nutrient.id, 'lowGoal', e.target.value)}
                                step="0.1"
                                className="border-0 border-b border-[var(--rule)] px-0 py-[2px] font-mono text-[var(--fg)] bg-transparent text-right rounded-none focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--placeholder)]"
                                style={{ width: 56, fontSize: 13 }}
                                aria-label={`${nutrient.displayName} minimum`}
                              />
                              <span className="font-mono text-[9px] text-[var(--muted)]" style={{ width: 24 }}>Max</span>
                              <input
                                type="number"
                                placeholder="—"
                                value={goals[nutrient.id]?.highGoal ?? ''}
                                onChange={(e) => handleGoalChange(nutrient.id, 'highGoal', e.target.value)}
                                step="0.1"
                                className="border-0 border-b border-[var(--rule)] px-0 py-[2px] font-mono text-[var(--fg)] bg-transparent text-right rounded-none focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--placeholder)]"
                                style={{ width: 56, fontSize: 13 }}
                                aria-label={`${nutrient.displayName} maximum`}
                              />
                              <span className="font-mono text-[9px] text-[var(--muted)]" style={{ width: 28 }}>{nutrient.unit}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Save / Reset — mockup: Reset left, Save right */}
                  <div className="flex items-center justify-end gap-4 mt-5">
                    <button
                      onClick={handleResetGoals}
                      className="ed-btn ghost"
                      aria-label="Reset goals to defaults"
                    >
                      Reset to defaults
                    </button>
                    <button
                      onClick={handleSaveGoals}
                      disabled={goalsSaving}
                      className="ed-btn primary disabled:opacity-40"
                      aria-label="Save goals"
                    >
                      {goalsSaving ? 'Saving...' : 'Save Goals'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              03 — DASHBOARD
              ════════════════════════════════════════════════════════════════════ */}
          <div id="set-sec-dashboard" style={{ padding: '56px 0' }}>
            <SectionHeader number="03" title="Dashboard" />

            <div>
              {/* Home Stats */}
              <div className="ed-label mb-[8px]">Home Stats</div>
              <p className="text-[13px] text-[var(--fg-2)] leading-[1.6] mb-[16px]" style={{ maxWidth: 480 }}>
                Select three nutrition stats to display on your dashboard and meal cards.
              </p>
              <div style={{ maxWidth: 400 }}>
                {DASHBOARD_STAT_OPTIONS.map((opt) => {
                  const checked = dashboardStats.enabledStats.includes(opt.key);
                  const atLimit = dashboardStats.enabledStats.length >= 3 && !checked;
                  return (
                    <label
                      key={opt.key}
                      className={`flex items-center gap-[12px] py-[9px] border-b border-[var(--rule)] ${atLimit ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={atLimit}
                        onChange={() => toggleDashboardStat(opt.key)}
                        aria-label={opt.label}
                      />
                      <span className="text-[13px] text-[var(--fg)]">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
              {dashboardStats.enabledStats.length < 3 && (
                <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--warn)] mt-[10px]">
                  Select {3 - dashboardStats.enabledStats.length} more
                </div>
              )}

            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              04 — MCP
              ════════════════════════════════════════════════════════════════════ */}
          <div id="set-sec-mcp" style={{ padding: '56px 0' }}>
            <SectionHeader number="04" title="MCP Integration" />

            <div>
              {/* Token status dot + label */}
              <div className="flex items-center gap-[8px] mb-[16px]">
                <span className={`w-[8px] h-[8px] rounded-full shrink-0 ${hasMcpToken ? 'bg-[var(--ok)]' : 'bg-[var(--rule)]'}`} aria-hidden="true" />
                <span className="font-mono text-[9px] text-[var(--muted)] tracking-[0.06em]">
                  {hasMcpToken ? 'Token active' : 'No token'}
                </span>
              </div>

              {/* Generate / Revoke buttons */}
              <div className="flex gap-[8px] mb-[16px]">
                <button
                  onClick={handleGenerateMcpToken}
                  disabled={mcpTokenLoading}
                  className="ed-btn disabled:opacity-40"
                  aria-label={hasMcpToken ? 'Regenerate MCP token' : 'Generate MCP token'}
                >
                  {mcpTokenLoading ? 'Generating…' : hasMcpToken ? 'Regenerate' : 'Generate Token'}
                </button>
                {hasMcpToken && (
                  <button
                    onClick={handleRevokeMcpToken}
                    disabled={revokingMcpToken}
                    className="ed-btn danger disabled:opacity-40"
                    aria-label="Revoke MCP token"
                  >
                    {revokingMcpToken ? 'Revoking…' : 'Revoke'}
                  </button>
                )}
              </div>

              {/* New token display */}
              {newMcpToken && (
                <div className="mb-[16px]">
                  <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--accent-btn)] mb-[8px]">
                    Copy this token now — it won&apos;t be shown again
                  </div>
                  <div className="flex items-center gap-[10px] bg-[var(--bg-2)] border border-[var(--accent-btn)] px-[16px] py-[12px]">
                    <code className="font-mono text-[11px] text-[var(--fg)] break-all flex-1">{newMcpToken}</code>
                    <button
                      onClick={handleCopyMcpToken}
                      className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--accent-btn)] hover:opacity-70 bg-transparent border-0 cursor-pointer transition-opacity shrink-0"
                      aria-label="Copy MCP token"
                    >
                      {mcpCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Configuration ── */}
              <div className="mt-[40px]">
                <div className="ed-label mb-[8px]">Connect to your AI assistant</div>
                <p className="text-[13px] text-[var(--fg-2)] leading-[1.6] mb-[20px]">
                  {APP_NAME} works with any MCP-compatible assistant. Generate a token above, then paste the config block into the file for your tool.
                </p>

                {/* Config table — stacks on mobile */}
                <div className="border border-[var(--rule)] mb-[20px]">
                  {/* Header — hidden on mobile */}
                  <div className="hidden sm:grid grid-cols-[160px_1fr] border-b border-[var(--rule)]">
                    <div className="ed-label px-[14px] py-[8px]">Assistant</div>
                    <div className="ed-label px-[14px] py-[8px]">Config file path</div>
                  </div>
                  {[
                    { name: 'Claude Desktop', path: '~/Library/Application Support/Claude/claude_desktop_config.json' },
                    { name: 'Cursor',          path: '~/.cursor/mcp.json' },
                    { name: 'Windsurf',        path: '~/.codeium/windsurf/mcp_config.json' },
                    { name: 'Roo Code',        path: '~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json' },
                    { name: 'VS Code + Copilot', path: '.vscode/mcp.json  (or run "MCP: Open User Configuration" in command palette)' },
                    { name: 'Zed',             path: '~/.config/zed/settings.json  (under "context_servers" key)' },
                  ].map((row, i, arr) => (
                    <div key={row.name} className={`sm:grid sm:grid-cols-[160px_1fr] ${i < arr.length - 1 ? 'border-b border-[var(--rule)]' : ''}`}>
                      <div className="text-[13px] font-medium text-[var(--fg)] px-[14px] pt-[10px] pb-[2px] sm:py-[10px]">{row.name}</div>
                      <div className="font-mono text-[9px] text-[var(--muted)] px-[14px] pb-[10px] sm:py-[10px] break-all leading-[1.6]">{row.path}</div>
                    </div>
                  ))}
                </div>

                {/* Config block */}
                <p className="text-[13px] text-[var(--fg-2)] leading-[1.6] mb-[10px]">
                  Add this to your config file&apos;s <code className="font-mono text-[11px] bg-[var(--bg-3)] px-1">mcpServers</code> object.
                  {newMcpToken
                    ? <strong className="text-[var(--fg)]"> Your token is pre-filled below.</strong>
                    : ' Generate a token above to pre-fill your token.'}
                </p>
                <div className="bg-[var(--bg-2)] px-[20px] py-[16px] relative overflow-x-auto">
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] absolute top-[8px] left-[12px]">JSON</span>
                  <button
                    onClick={() => {
                      const origin = typeof window !== 'undefined' ? window.location.origin : '';
                      const token = newMcpToken ?? 'YOUR_TOKEN_HERE';
                      navigator.clipboard.writeText(`"good-measure": {\n  "command": "npx",\n  "args": ["-y", "good-measure-mcp"],\n  "env": {\n    "GOOD_MEASURE_API_URL": "${origin}",\n    "GOOD_MEASURE_API_TOKEN": "${token}"\n  }\n}`);
                      setConfigBlockCopied(true);
                      setTimeout(() => setConfigBlockCopied(false), 2000);
                    }}
                    className="text-[var(--accent-btn)] bg-transparent border-0 cursor-pointer absolute top-[8px] right-[12px] hover:opacity-70 transition-opacity"
                    aria-label="Copy configuration block"
                  >
                    {configBlockCopied ? (
                      <span className="font-mono text-[9px] uppercase tracking-[0.1em]">Copied ✓</span>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="5" width="9" height="9" rx="1"/><path d="M11 5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2"/></svg>
                    )}
                  </button>
                  <pre className="font-mono text-[11px] text-[var(--fg-2)] leading-[1.7] pt-[12px] whitespace-pre" style={{ tabSize: 2 }}>{`"good-measure": {
  "command": "npx",
  "args": ["-y", "good-measure-mcp"],
  "env": {
    "GOOD_MEASURE_API_URL": "${typeof window !== 'undefined' ? window.location.origin : ''}",
    "GOOD_MEASURE_API_TOKEN": "${newMcpToken ?? 'YOUR_TOKEN_HERE'}"
  }
}`}</pre>
                </div>

                {/* Mac Homebrew note */}
                <div className="border-l-2 border-[var(--rule)] px-[14px] py-[10px] mt-[12px] text-[12px] text-[var(--muted)] leading-[1.6]">
                  <strong className="text-[var(--fg-2)]">Mac + Homebrew?</strong> If the MCP server fails to start, replace <code className="font-mono text-[10px] bg-[var(--bg-3)] px-1">npx</code> with the full path: <code className="font-mono text-[10px] bg-[var(--bg-3)] px-1">/opt/homebrew/bin/npx</code>
                </div>
              </div>

              {/* ── Test Connection ── */}
              <div className="mt-[40px]">
                <div className="ed-label mb-[8px]">After connecting</div>
                <p className="text-[13px] text-[var(--fg-2)] leading-[1.6] mb-[12px]">
                  Fully quit and relaunch your assistant after saving the config. Then try one of these prompts:
                </p>
                {[
                  `List my recipes from ${APP_NAME} and tell me which ones are highest in protein.`,
                  `You are a chef with a background in nutrition. Get my recipe for [recipe name]. Optimize it to reduce saturated fat while preserving flavor. Show a before/after comparison, then save the updated version back to ${APP_NAME}.`,
                ].map((prompt, i) => (
                  <div key={i} className="border-l-2 border-[var(--accent)] px-[14px] py-[10px] text-[13px] text-[var(--fg-2)] leading-[1.6] italic mb-[8px]">
                    &ldquo;{prompt}&rdquo;
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              05 — DATA
              ════════════════════════════════════════════════════════════════════ */}
          <div id="set-sec-data" style={{ padding: '56px 0' }}>
            <SectionHeader number="05" title="Data" />

            <div>
              <div className="ed-label mb-[8px]">Export</div>
              <p className="text-[13px] text-[var(--fg-2)] leading-[1.6] mb-[16px]" style={{ maxWidth: 480 }}>
                Download a complete backup of your household data — recipes, ingredients, meal plans, and goals — as a single JSON file.
              </p>
              <button
                onClick={handleExport}
                disabled={exportLoading}
                className="ed-btn disabled:opacity-40"
                aria-label="Export household data"
              >
                {exportLoading ? 'Exporting…' : 'Export Data'}
              </button>

              <div className="mt-[40px]">
                <div className="ed-label mb-[8px]">Import</div>
                <p className="text-[13px] text-[var(--fg-2)] leading-[1.6] mb-[16px]" style={{ maxWidth: 480 }}>
                  Restore from a backup file. <strong className="text-[var(--fg)]">This will overwrite all existing household data.</strong>
                </p>
                {/* Drag-drop zone */}
                <label
                  htmlFor="import-file"
                  className="flex flex-col items-center justify-center bg-[var(--bg-2)] border border-dashed border-[var(--rule)] cursor-pointer hover:border-[var(--accent)] transition-colors"
                  style={{ padding: 24, maxWidth: 400 }}
                  aria-label="Drop JSON file or click to browse"
                >
                  <span className="text-[16px] text-[var(--muted)] mb-[4px]">↑</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">
                    {importFile ? importFile.name : 'Drop JSON file or click to browse'}
                  </span>
                </label>
                <input
                  id="import-file"
                  type="file"
                  accept=".json,application/json"
                  className="sr-only"
                  onChange={(e) => {
                    setImportFile(e.target.files?.[0] ?? null);
                    setImportResult(null);
                  }}
                  aria-label="Backup file input"
                />
                {importFile && (
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={handleImport}
                      disabled={importLoading}
                      className="px-4 py-[9px] font-mono text-[9px] uppercase tracking-[0.1em] bg-[var(--accent-btn)] text-white border-0 cursor-pointer disabled:opacity-40 hover:opacity-90 transition-opacity"
                      aria-label="Restore from backup"
                    >
                      {importLoading ? 'Importing…' : 'Restore'}
                    </button>
                    <button
                      onClick={() => { setImportFile(null); setImportResult(null); }}
                      className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--fg)] transition-colors bg-transparent border-0 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {importResult && (
                  <div
                    className={`mt-4 px-4 py-3 font-sans text-[13px] border ${
                      importResult.ok
                        ? 'border-[var(--accent-btn)] text-[var(--accent-btn)] bg-[var(--bg-subtle)]'
                        : 'border-[var(--error,#c0392b)] text-[var(--error,#c0392b)] bg-[var(--bg-subtle)]'
                    }`}
                    role="status"
                  >
                    {importResult.message}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              SIGN OUT — mobile only
              ════════════════════════════════════════════════════════════════════ */}
          <div className="md:hidden" style={{ padding: '40px 0 24px' }}>
            <div className="h-px bg-[var(--rule)] mb-[32px]" />
            <button
              onClick={handleSignOut}
              className="ed-btn danger w-full py-[12px]"
              aria-label="Sign out of your account"
            >
              Sign Out
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

function SettingsPageWrapper() {
  return <SettingsPage />;
}

export default SettingsPageWrapper;
