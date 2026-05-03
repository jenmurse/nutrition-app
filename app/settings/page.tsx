'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { APP_NAME } from '@/lib/brand';
import { usePersonContext } from '@/app/components/PersonContext';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';
import { dialog } from '@/lib/dialog';
import { THEMES } from '@/lib/themes';
import type { Nutrient as BaseNutrient } from '@/types';

type Nutrient = BaseNutrient & { orderIndex: number };

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
  forPersonId: number | null;
  inviteSentAt: string | null;
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
      <span className="font-mono text-[13px] font-bold text-[var(--rule)]">{number}</span>
      <span className="section-label">{title}</span>
      <span className="flex-1 h-px bg-[var(--rule)]" />
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

const SettingsPage = () => {
  const { persons, selectedPersonId, refreshPersons } = usePersonContext();
  const supabase = createClient();

  const handleSignOut = async () => {
    sessionStorage.removeItem('selectedPersonId');
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
    if (typeof window === 'undefined') return { enabledStats: [], showGreeting: true };
    const defaults = { enabledStats: [], showGreeting: true };
    try {
      const stored = localStorage.getItem('dashboard-stats');
      if (stored) return JSON.parse(stored);
    } catch {}
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

  // Add member — unified form (name + theme + trackedOnly)
  const [addingPerson, setAddingPerson] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTheme, setNewTheme] = useState<string>('sage');
  const [newTrackedOnly, setNewTrackedOnly] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<number | null>(null);

  // API key
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [editingApiKey, setEditingApiKey] = useState(false);
  const [newApiKeyValue, setNewApiKeyValue] = useState('');
  const [apiSaving, setApiSaving] = useState(false);


  // MCP token
  const [isTouchDevice, setIsTouchDevice] = useState(false);
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

  // Detect touch/tablet (phones + iPads)
  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  // Scroll to section on initial load if a hash is present in the URL
  // e.g. /settings#mcp → scrolls to set-sec-mcp
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const slug = hash.slice(1);
    const sectionId = `set-sec-${slug}`;
    // Delay to let the page finish rendering before attempting scroll
    const t = setTimeout(() => scrollToSection(sectionId), 120);
    return () => clearTimeout(t);
  }, []);

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
    // _configured: true marks that the user has explicitly saved stat preferences.
    // GettingStartedCard requires this flag so auto-written defaults don't count.
    localStorage.setItem('dashboard-stats', JSON.stringify({ ...updated, _configured: true }));
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

  // Copy an existing invite link for a member, marking it as sent.
  const handleCopyMemberInvite = async (invite: Invite) => {
    await navigator.clipboard.writeText(invite.url);
    setCopiedInviteId(invite.id);
    setTimeout(() => setCopiedInviteId(null), 2500);
    // Mark as sent (idempotent on the server). Refresh list so dashboard checklist
    // / convert actions reflect the new state.
    await fetch(`/api/households/invite/${invite.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sent: true }),
    });
    await loadInvites();
  };

  // Generate an invite for a tracked-only person being converted to account-holder.
  const handleInviteToJoin = async (personId: number) => {
    // Flip trackedOnly back to false first
    await fetch(`/api/persons/${personId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackedOnly: false }),
    });
    const res = await fetch('/api/households/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forPersonId: personId }),
    });
    if (!res.ok) {
      toast.error('Failed to create invite');
      return;
    }
    await refreshPersons();
    await loadInvites();
  };

  // Convert an account-holder (with pending invite) back to tracked-only.
  // Revokes the pending invite and flips trackedOnly = true.
  const handleMakeTrackedOnly = async (personId: number, pendingInviteId: number | null) => {
    if (!await dialog.confirm({
      title: 'Convert to tracked-only?',
      body: "Their pending invite will be revoked. They can still have meals tracked, but won\u2019t be able to log in.",
      confirmLabel: 'Convert',
      danger: true,
    })) return;
    if (pendingInviteId !== null) {
      await fetch(`/api/households/invite/${pendingInviteId}`, { method: 'DELETE' });
    }
    await fetch(`/api/persons/${personId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackedOnly: true }),
    });
    await refreshPersons();
    await loadInvites();
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
    if (!await dialog.confirm({ title: 'Revoke this token?', body: 'Any configured MCP servers will stop working until you generate a new one.', confirmLabel: 'Revoke', danger: true })) return;
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
    if (!await dialog.confirm({ title: 'Remove the API key?', body: 'AI analysis will fall back to mock data.', confirmLabel: 'Remove', danger: true })) return;
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
    if (!await dialog.confirm({ title: 'Overwrite household data?', body: "This will permanently replace all household data with the contents of this backup. This can't be undone.", confirmLabel: 'Overwrite', danger: true })) return;
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
        body: JSON.stringify({
          name: newName.trim(),
          theme: newTheme,
          trackedOnly: newTrackedOnly,
        }),
      });
      if (!res.ok) return;
      const newPerson = await res.json();
      // Auto-create an invite for account-holders. Tracked-only members get no invite.
      if (!newTrackedOnly) {
        await fetch('/api/households/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forPersonId: newPerson.id }),
        });
      }
      await refreshPersons();
      await loadInvites();
      setAddingPerson(false);
      setNewName('');
      setNewTheme('sage');
      setNewTrackedOnly(false);
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
        style={{ left: '40px', top: 'calc(var(--nav-h) + 48px)', width: 140, opacity: 0, animation: 'contentEnter 400ms var(--ease-out) both' }}
        aria-label="Settings sections"
      >
        {JUMP_SECTIONS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => scrollToSection(s.id)}
            className={`flex items-baseline gap-[10px] font-mono text-[9px] tracking-[0.14em] uppercase py-[8px] border-0 bg-transparent cursor-pointer transition-colors text-left ${
              i < JUMP_SECTIONS.length - 1 ? 'border-b border-[var(--rule)]' : ''
            } ${
              activeSection === s.id ? 'text-[var(--fg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'
            }`}
            style={i === 0 ? { paddingTop: 0 } : undefined}
            aria-label={`Jump to ${s.label}`}
          >
            <span className={`font-mono text-[9px] font-bold min-w-[16px] transition-colors ${
              activeSection === s.id ? 'text-[var(--fg)]' : 'text-[var(--rule)]'
            }`}>{s.n}</span>
            {s.label}
          </button>
        ))}
      </nav>

      {/* ─── Scrollable content ─── */}
      <div id="settings-scroll-container" className="h-full overflow-y-auto animate-page-enter">
        <div className="detail-content max-w-[1100px] mx-auto" style={{ padding: '0 64px 60px 196px' }}>

          {/* Page header */}
          <div style={{ paddingTop: 48, marginBottom: 40 }}>
            <div className="font-mono text-[9px] tracking-[0.12em] uppercase text-[var(--muted)] mb-[6px]">§ SETTINGS</div>
            <h1 className="form-title">Your preferences.</h1>
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              01 — PEOPLE
              ════════════════════════════════════════════════════════════════════ */}
          <div id="set-sec-people" style={{ paddingTop: 0, paddingBottom: 56 }}>
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
                    className="w-full bg-transparent border-0 border-b border-[var(--rule)] px-0 py-[6px] font-sans text-[13px] text-[var(--fg)] rounded-none focus:outline-none focus:border-[var(--fg)]"
                    aria-label="Household name"
                  />
                </div>
                <button
                  onClick={handleSaveHouseholdName}
                  disabled={householdNameSaving}
                  className="ed-btn disabled:opacity-40"
                >{householdNameSaving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>

            {/* Member list — full width.
                Each row shows invite status when applicable:
                - Owner: OWNER tag, no invite UI
                - Account-holder w/ pending invite: COPY INVITE LINK
                - Account-holder w/ redeemed invite: ✓ JOINED {date}
                - Tracked-only: TRACKED ONLY mono label
                Convert actions (MAKE TRACKED ONLY / INVITE TO JOIN) live as
                small secondary affordances on non-owner rows. */}
            <div>
                {persons.map((person) => {
                  const role = memberRoles[person.id];
                  const isSaving = savingThemeId === person.id;
                  const pendingInvite = invites.find(
                    (i) => i.forPersonId === person.id && !i.usedAt && !i.expired
                  ) ?? null;
                  const redeemedInvite = invites.find(
                    (i) => i.forPersonId === person.id && i.usedAt
                  ) ?? null;
                  const isOwner = role === 'owner';
                  return (
                    <div key={person.id} className="set-person-row flex items-center gap-[12px] py-[12px] border-b border-[var(--rule)]">
                      <span
                        className="w-[10px] h-[10px] rounded-full shrink-0"
                        style={{ background: person.color || 'var(--accent)' }}
                        aria-hidden="true"
                      />
                      <span className="text-[13px] text-[var(--fg)] font-medium">{person.name}</span>

                      {/* Status pill — owner / tracked-only / joined / pending */}
                      {isOwner ? (
                        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] border border-[var(--rule)] px-[6px] py-[2px] rounded-pill">
                          Owner
                        </span>
                      ) : person.trackedOnly ? (
                        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] border border-[var(--rule)] px-[6px] py-[2px] rounded-pill">
                          Tracked Only
                        </span>
                      ) : redeemedInvite ? (
                        <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--muted)]">
                          ✓ Joined {new Date(redeemedInvite.usedAt!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      ) : pendingInvite ? (
                        <button
                          onClick={() => handleCopyMemberInvite(pendingInvite)}
                          className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg)] hover:opacity-70 bg-transparent border-0 cursor-pointer transition-opacity"
                          aria-label={`Copy invite link for ${person.name}`}
                        >
                          {copiedInviteId === pendingInvite.id ? 'Copied!' : 'Copy Invite Link'}
                        </button>
                      ) : null}

                      {/* Convert + Remove actions — non-owner only */}
                      {!isOwner && (
                        <div className="flex items-center gap-[10px] ml-[4px]">
                          {person.trackedOnly ? (
                            <button
                              onClick={() => handleInviteToJoin(person.id)}
                              className="font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--muted)] hover:text-[var(--fg)] bg-transparent border-0 cursor-pointer transition-colors"
                              aria-label={`Invite ${person.name} to join`}
                            >
                              Invite to Join
                            </button>
                          ) : pendingInvite && !redeemedInvite ? (
                            <button
                              onClick={() => handleMakeTrackedOnly(person.id, pendingInvite.id)}
                              className="font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--muted)] hover:text-[var(--fg)] bg-transparent border-0 cursor-pointer transition-colors"
                              aria-label={`Make ${person.name} tracked only`}
                            >
                              Make Tracked Only
                            </button>
                          ) : null}
                          <button
                            onClick={async () => {
                              if (!await dialog.confirm({ title: `Remove "${person.name}"?`, body: "Their meal plans and goals will be deleted. This can't be undone.", confirmLabel: 'REMOVE', danger: true })) return;
                              const res = await fetch(`/api/persons/${person.id}`, { method: 'DELETE' });
                              if (res.ok) { await refreshPersons(); await loadInvites(); } else {
                                const data = await res.json();
                                toast.error(data.error || 'Failed to remove person');
                              }
                            }}
                            className="font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--muted)] hover:text-[var(--fg)] bg-transparent border-0 cursor-pointer transition-colors"
                            aria-label={`Remove ${person.name}`}
                          >
                            Remove
                          </button>
                        </div>
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

                {/* Unified Add Member — name, theme, tracked-only toggle.
                    Default flow creates a Person AND a HouseholdInvite tied to that
                    Person. Tracked-only members skip the invite. */}
                <div className="set-add-member pt-[16px]">
                  {!addingPerson ? (
                    <button
                      onClick={() => setAddingPerson(true)}
                      className="ed-btn"
                      aria-label="Add a household member"
                    >+ Add Member</button>
                  ) : (
                    <div className="flex flex-col gap-[12px] py-[12px] px-[16px] border border-[var(--rule)] bg-[var(--bg-2)]" style={{ maxWidth: 480 }}>
                      <div>
                        <div className="ed-label mb-[6px]">Name</div>
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddPerson();
                            if (e.key === 'Escape') { setAddingPerson(false); setNewName(''); }
                          }}
                          placeholder="Name"
                          autoFocus
                          className="w-full bg-[var(--bg)] border border-[var(--rule)] px-3 py-2 font-sans text-[13px] text-[var(--fg)] focus:outline-none focus:border-[var(--fg)]"
                          aria-label="New member name"
                        />
                      </div>

                      <div>
                        <div className="ed-label mb-[6px]">Theme</div>
                        <div className="flex items-center gap-[6px]" role="radiogroup" aria-label="Theme color">
                          {THEMES.map((t) => {
                            const isActive = newTheme === t.name;
                            return (
                              <button
                                key={t.name}
                                type="button"
                                onClick={() => setNewTheme(t.name)}
                                title={t.label}
                                className="w-[20px] h-[20px] rounded-full border-0 cursor-pointer p-0 transition-transform hover:scale-[1.15] active:scale-95 flex items-center justify-center"
                                style={{
                                  background: t.hex,
                                  boxShadow: isActive ? `0 0 0 2px var(--bg-2), 0 0 0 3.5px ${t.hex}` : 'none',
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

                      <label className="flex items-start gap-[8px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newTrackedOnly}
                          onChange={(e) => setNewTrackedOnly(e.target.checked)}
                          aria-label="Tracked only"
                          className="mt-[2px]"
                        />
                        <div>
                          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg)]">Tracked Only (no login)</div>
                          <div className="text-[11px] text-[var(--muted)] leading-[1.5] mt-[2px]">
                            Use for children or members who won&rsquo;t have their own account.
                          </div>
                        </div>
                      </label>

                      <div className="flex gap-[8px] justify-end">
                        <button
                          onClick={() => {
                            setAddingPerson(false);
                            setNewName('');
                            setNewTheme('sage');
                            setNewTrackedOnly(false);
                          }}
                          className="ed-btn ghost"
                        >Cancel</button>
                        <button
                          onClick={handleAddPerson}
                          disabled={!newName.trim() || addSaving}
                          className="ed-btn primary disabled:opacity-40"
                        >
                          {addSaving ? 'Adding…' : 'Add'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              02 — DAILY GOALS
              ════════════════════════════════════════════════════════════════════ */}
          <div id="set-sec-goals" style={{ padding: '56px 0' }}>
            <SectionHeader number="02" title="Daily Goals" />

            <div>
              {/* Person tabs */}
              <div className="flex items-center gap-[24px] mb-[16px]" role="tablist" aria-label="Select person for goals">
                {persons.map((person) => {
                  const isActive = goalsPersonId === person.id;
                  return (
                    <button
                      key={person.id}
                      onClick={() => setGoalsPersonId(person.id)}
                      role="tab"
                      aria-selected={isActive}
                      className={`set-person-chip${isActive ? " on" : ""}`}
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
                                className="border-0 border-b border-[var(--rule)] px-0 py-[2px] font-mono text-[var(--fg)] bg-transparent text-right rounded-none focus:outline-none focus:border-[var(--fg)] placeholder:text-[var(--placeholder)]"
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
                                className="border-0 border-b border-[var(--rule)] px-0 py-[2px] font-mono text-[var(--fg)] bg-transparent text-right rounded-none focus:outline-none focus:border-[var(--fg)] placeholder:text-[var(--placeholder)]"
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
                      RESET TO DEFAULTS
                    </button>
                    <button
                      onClick={handleSaveGoals}
                      disabled={goalsSaving}
                      className="ed-btn primary disabled:opacity-40"
                      aria-label="Save goals"
                    >
                      {goalsSaving ? 'SAVING...' : 'SAVE GOALS'}
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
              <p className="text-[13px] text-[var(--fg-2)] leading-[1.6] mb-[8px]" style={{ maxWidth: 480 }}>
                Select three nutrition stats to display on your dashboard and meal cards.
              </p>
              <div className={`font-mono text-[9px] uppercase tracking-[0.06em] mb-[16px] ${dashboardStats.enabledStats.length === 3 ? 'text-[var(--ok)]' : 'text-[var(--muted)]'}`}>
                {dashboardStats.enabledStats.length} of 3 selected
              </div>
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

            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              04 — MCP
              ════════════════════════════════════════════════════════════════════ */}
          <div id="set-sec-mcp" style={{ padding: '56px 0' }}>
            <SectionHeader number="04" title="MCP Integration" />

            {isTouchDevice && (
              <p className="text-[13px] text-[var(--muted)] leading-[1.6] bg-[var(--bg-2)] px-3 py-2 mb-[32px]">
                MCP integration requires a desktop AI assistant like Claude or Cursor. You can still generate a token here — connect it from your computer.
              </p>
            )}

            <div className="flex flex-col gap-[48px]">

              {/* ── Step 1 — Generate token ── */}
              <div>
                <div className="flex items-baseline gap-[10px] mb-[16px]">
                  <span className="font-mono text-[9px] text-[var(--muted)] tracking-[0.06em] shrink-0">01</span>
                  <span className="ed-label">Generate a token</span>
                </div>
                <p className="text-[13px] text-[var(--fg-2)] leading-[1.6] mb-[16px]" style={{ maxWidth: 480 }}>
                  Each person in your household needs their own token. Keep it private.
                </p>
                <div className="flex items-center gap-[8px] mb-[16px]">
                  <span className={`w-[8px] h-[8px] rounded-full shrink-0 ${hasMcpToken ? 'bg-[var(--ok)]' : 'bg-[var(--rule)]'}`} aria-hidden="true" />
                  <span className="font-mono text-[9px] text-[var(--muted)] tracking-[0.06em]">
                    {hasMcpToken ? 'Token active' : 'No token'}
                  </span>
                </div>
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
                {newMcpToken && (
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--cta)] mb-[8px]">
                      Copy this token now — it won&apos;t be shown again
                    </div>
                    <div className="flex items-center gap-[10px] bg-[var(--bg-2)] border border-[var(--cta)] px-[16px] py-[12px]">
                      <code className="font-mono text-[11px] text-[var(--fg)] break-all flex-1">{newMcpToken}</code>
                      <button
                        onClick={handleCopyMcpToken}
                        className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--cta)] hover:opacity-70 bg-transparent border-0 cursor-pointer transition-opacity shrink-0"
                        aria-label="Copy MCP token"
                      >
                        {mcpCopied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Step 2 — Connect to your AI assistant ── */}
              <div>
                <div className="flex items-baseline gap-[10px] mb-[16px]">
                  <span className="font-mono text-[9px] text-[var(--muted)] tracking-[0.06em] shrink-0">02</span>
                  <span className="ed-label">Connect to your AI assistant</span>
                </div>
                <p className="text-[13px] text-[var(--fg-2)] leading-[1.6] mb-[20px]">
                  {APP_NAME} works with any MCP-compatible assistant. Open your assistant&apos;s config file at the path below.
                </p>
                <div className="border border-[var(--rule)]">
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
              </div>

              {/* ── Step 3 — Add to config file ── */}
              <div>
                <div className="flex items-baseline gap-[10px] mb-[16px]">
                  <span className="font-mono text-[9px] text-[var(--muted)] tracking-[0.06em] shrink-0">03</span>
                  <span className="ed-label">Add this to your config file&apos;s <code className="font-mono text-[11px] bg-[var(--bg-3)] px-1 normal-case tracking-normal">mcpServers</code> object</span>
                </div>
                <p className="text-[13px] text-[var(--fg-2)] leading-[1.6] mb-[10px]">
                  {newMcpToken
                    ? <><strong className="text-[var(--fg)]">Your token is pre-filled below.</strong> Copy the block and paste it into your config file.</>
                    : 'Generate a token in step 1 to pre-fill your token in the block below.'}
                </p>
                <div className="bg-[var(--bg-2)] rounded-none px-[20px] py-[16px] relative overflow-x-auto">
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] absolute top-[8px] left-[12px]">JSON</span>
                  <button
                    onClick={() => {
                      const origin = typeof window !== 'undefined' ? window.location.origin : '';
                      const token = newMcpToken ?? 'YOUR_TOKEN_HERE';
                      navigator.clipboard.writeText(`"good-measure": {\n  "command": "npx",\n  "args": ["-y", "good-measure-mcp"],\n  "env": {\n    "GOOD_MEASURE_API_URL": "${origin}",\n    "GOOD_MEASURE_API_TOKEN": "${token}"\n  }\n}`);
                      setConfigBlockCopied(true);
                      setTimeout(() => setConfigBlockCopied(false), 2000);
                    }}
                    className="text-[var(--fg)] bg-transparent border-0 cursor-pointer absolute top-[8px] right-[12px] hover:opacity-70 transition-opacity"
                    aria-label="Copy configuration block"
                  >
                    {configBlockCopied ? (
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em]">Copied ✓</span>
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
                <div className="border-l-2 border-[var(--rule)] rounded-none px-[14px] py-[10px] mt-[12px] text-[11px] text-[var(--muted)] leading-[1.6]">
                  <strong className="text-[var(--fg-2)]">Mac + Homebrew?</strong> If the MCP server fails to start, in the command line above, replace <code className="font-mono text-[9px] bg-[var(--bg-3)] px-1">npx</code> with the full path: <code className="font-mono text-[9px] bg-[var(--bg-3)] px-1">/opt/homebrew/bin/npx</code>
                </div>
              </div>

              {/* ── Step 4 — After connecting ── */}
              <div>
                <div className="flex items-baseline gap-[10px] mb-[16px]">
                  <span className="font-mono text-[9px] text-[var(--muted)] tracking-[0.06em] shrink-0">04</span>
                  <span className="ed-label">After connecting</span>
                </div>
                <p className="text-[13px] text-[var(--fg-2)] leading-[1.6] mb-[12px]">
                  Fully quit and relaunch your assistant after saving the config file. Then try one of these prompts:
                </p>
                {[
                  `List my recipes from ${APP_NAME} and tell me which ones are highest in protein.`,
                  `You are a chef with a background in nutrition. Get my recipe for [recipe name]. Optimize it to reduce saturated fat while preserving flavor. Show a before/after comparison, then save the updated version back to ${APP_NAME}.`,
                ].map((prompt, i) => (
                  <div key={i} className="border-l-2 border-[var(--fg)] px-[14px] py-[10px] text-[13px] text-[var(--fg-2)] leading-[1.6] italic mb-[8px]">
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
                {exportLoading ? 'EXPORTING…' : 'EXPORT DATA'}
              </button>

              <div className="mt-[40px]">
                <div className="ed-label mb-[8px]">Import</div>
                <p className="text-[13px] text-[var(--fg-2)] leading-[1.6] mb-[16px]" style={{ maxWidth: 480 }}>
                  Restore from a backup file. <strong className="text-[var(--fg)]">This will overwrite all existing household data.</strong>
                </p>
                {/* Drag-drop zone */}
                <label
                  htmlFor="import-file"
                  className="flex flex-col items-center justify-center bg-[var(--bg-2)] rounded-none border border-dashed border-[var(--rule)] cursor-pointer hover:border-[var(--accent)] transition-colors"
                  style={{ padding: 24, maxWidth: 400 }}
                  aria-label="Drop JSON file or click to browse"
                >
                  <span className="text-[16px] text-[var(--muted)] mb-[4px]">↑</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
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
                      className="px-4 py-[9px] font-mono text-[9px] uppercase tracking-[0.14em] bg-[var(--cta)] text-white border-0 cursor-pointer disabled:opacity-40 hover:opacity-90 transition-opacity"
                      aria-label="Restore from backup"
                    >
                      {importLoading ? 'Importing…' : 'Restore'}
                    </button>
                    <button
                      onClick={() => { setImportFile(null); setImportResult(null); }}
                      className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] hover:text-[var(--fg)] transition-colors bg-transparent border-0 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {importResult && (
                  <div
                    className={`mt-4 px-4 py-3 font-sans text-[13px] border ${
                      importResult.ok
                        ? 'border-[var(--cta)] text-[var(--cta)] bg-[var(--bg-subtle)]'
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

        </div>
      </div>
    </div>
  );
};

function SettingsPageWrapper() {
  return <SettingsPage />;
}

export default SettingsPageWrapper;
