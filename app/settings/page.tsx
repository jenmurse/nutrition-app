'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePersonContext } from '@/app/components/PersonContext';
import { toast } from '@/lib/toast';
import { dialog } from '@/lib/dialog';

interface Nutrient {
  id: number;
  name: string;
  displayName: string;
  unit: string;
  orderIndex: number;
}

interface UsageData {
  totalInputTokens: number;
  totalOutputTokens: number;
  callCount: number;
  estimatedCostUsd: number;
}

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

// ─── Household section ──────────────────────────────────────────────────────

interface PersonRowProps {
  person: { id: number; name: string; color: string };
  role?: string;
  nutrients: Nutrient[];
  isExpanded: boolean;
  onToggle: () => void;
  onSaved: () => void;
  canDelete: boolean;
}

function PersonRow({ person, role, nutrients, isExpanded, onToggle, onSaved, canDelete }: PersonRowProps) {
  const [name, setName] = useState(person.name);
  const [goals, setGoals] = useState<Record<number, { lowGoal?: number; highGoal?: number }>>({});
  const [goalsLoaded, setGoalsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load goals when expanded
  useEffect(() => {
    if (!isExpanded || goalsLoaded) return;
    fetch(`/api/nutrition-goals?personId=${person.id}`)
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
  }, [isExpanded, goalsLoaded, person.id, nutrients]);

  // Reset local state when person changes
  useEffect(() => {
    setName(person.name);
    setGoalsLoaded(false);
  }, [person.id, person.name]);

  const handleGoalChange = (nutrientId: number, field: 'lowGoal' | 'highGoal', value: string) => {
    setGoals((prev) => ({
      ...prev,
      [nutrientId]: {
        ...prev[nutrientId],
        [field]: value === '' ? undefined : parseFloat(value),
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update name if changed
      if (name.trim() && name.trim() !== person.name) {
        await fetch(`/api/persons/${person.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        });
      }
      // Save goals
      await fetch('/api/nutrition-goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals, personId: person.id }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!await dialog.confirm(`Remove ${person.name} from the household? Their meal plans and goals will be deleted.`, { confirmLabel: 'Remove', danger: true })) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/persons/${person.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to remove person');
      } else {
        onSaved();
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="border-b border-[var(--rule)]">
      {/* Row header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-7 py-[11px] transition-colors bg-transparent border-0 cursor-pointer text-left ${isExpanded ? 'bg-[var(--bg-subtle)]' : 'hover:bg-[var(--bg-subtle)]'}`}
        aria-expanded={isExpanded}
        aria-label={`${person.name} — click to ${isExpanded ? 'collapse' : 'expand'}`}
      >
        <div className="flex items-center gap-[10px]">
          <span
            className="w-2 h-2 rounded-full shrink-0 bg-[var(--accent)]"
            aria-hidden="true"
          />
          <span className="font-sans text-[13px] text-[var(--fg)]">{person.name}</span>
          {role && (
            <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--muted)] border border-[var(--rule)] px-[5px] py-[1px] rounded-sm">
              {role}
            </span>
          )}
        </div>
        <span className="text-[var(--muted)] text-[10px] select-none" aria-hidden="true">
          {isExpanded ? '▾' : '▸'}
        </span>
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="border-t border-[var(--rule)] bg-[var(--bg-subtle)]">

          {/* Name + actions on one row */}
          <div className="px-7 py-[10px] flex items-center gap-4 border-b border-[var(--rule)]">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] shrink-0">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-0 border-b border-[var(--rule)] px-0 py-[2px] font-sans text-[13px] bg-transparent text-[var(--fg)] w-[160px] focus:outline-none focus:border-[var(--accent)]"
                aria-label="Member name"
              />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="px-3 py-[5px] font-mono text-[9px] uppercase tracking-[0.1em] bg-[var(--accent)] text-white border-0 cursor-pointer disabled:opacity-40 hover:bg-[var(--accent-hover)] transition-colors"
                aria-label="Save changes"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={onToggle}
                className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--fg)] transition-colors bg-transparent border-0 cursor-pointer"
                aria-label="Cancel"
              >
                Cancel
              </button>
              {canDelete && (
                <>
                  <span className="text-[var(--rule-strong)]" aria-hidden="true">·</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--error)] transition-colors bg-transparent border-0 cursor-pointer"
                    aria-label={`Remove ${person.name}`}
                  >
                    {deleting ? 'Removing…' : 'Remove'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Goals — tight per-row layout */}
          <div className="px-7 pt-3 pb-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-2">
              Daily Goals
            </div>
            {!goalsLoaded ? (
              <div className="text-[11px] text-[var(--muted)] py-2">Loading…</div>
            ) : (
              nutrients.map((nutrient) => (
                <div
                  key={nutrient.id}
                  className="flex items-center gap-4 py-[7px] border-b border-[var(--rule)] last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-sans text-[12px] text-[var(--fg)]">{nutrient.displayName}</span>
                    <span className="font-mono text-[10px] text-[var(--muted)] ml-[5px]">{nutrient.unit}</span>
                  </div>
                  <div className="flex items-baseline gap-[5px]">
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">Min</span>
                    <input
                      type="number"
                      placeholder="—"
                      value={goals[nutrient.id]?.lowGoal ?? ''}
                      onChange={(e) => handleGoalChange(nutrient.id, 'lowGoal', e.target.value)}
                      step="0.1"
                      className="w-[52px] border-0 border-b border-[var(--rule)] px-0 py-[2px] font-mono text-[11px] text-[var(--fg)] bg-transparent text-right focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--placeholder)]"
                      aria-label={`${nutrient.displayName} minimum`}
                    />
                  </div>
                  <div className="flex items-baseline gap-[5px]">
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">Max</span>
                    <input
                      type="number"
                      placeholder="—"
                      value={goals[nutrient.id]?.highGoal ?? ''}
                      onChange={(e) => handleGoalChange(nutrient.id, 'highGoal', e.target.value)}
                      step="0.1"
                      className="w-[52px] border-0 border-b border-[var(--rule)] px-0 py-[2px] font-mono text-[11px] text-[var(--fg)] bg-transparent text-right focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--placeholder)]"
                      aria-label={`${nutrient.displayName} maximum`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

const SettingsPage = () => {
  const { persons, refreshPersons } = usePersonContext();

  const [nutrients, setNutrients] = useState<Nutrient[]>([]);
  const [expandedPersonId, setExpandedPersonId] = useState<number | null>(null);
  const [settingsTab, setSettingsTab] = useState<'household' | 'ai' | 'mcp' | 'data'>('household');

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

  // Usage
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);

  // MCP token
  const [hasMcpToken, setHasMcpToken] = useState(false);
  const [newMcpToken, setNewMcpToken] = useState<string | null>(null);
  const [mcpTokenLoading, setMcpTokenLoading] = useState(false);
  const [revokingMcpToken, setRevokingMcpToken] = useState(false);
  const [mcpCopied, setMcpCopied] = useState(false);

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

  const loadInvites = async () => {
    const r = await fetch('/api/households/invite');
    if (r.ok) setInvites(await r.json());
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

  // Load API settings when on API tab
  const loadApiSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) return;
      const data = await res.json();
      setHasApiKey(data.hasKey);
      setMaskedKey(data.maskedKey);
    } catch {}
  }, []);

  const loadUsage = useCallback(async () => {
    setUsageLoading(true);
    try {
      const res = await fetch('/api/settings/usage');
      if (!res.ok) return;
      const data = await res.json();
      setUsage(data);
    } catch {} finally {
      setUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApiSettings();
    loadUsage();
    loadMcpToken();
  }, [loadApiSettings, loadUsage, loadMcpToken]);

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

  const handleClearLogs = async () => {
    if (!await dialog.confirm('Clear all usage logs?', { confirmLabel: 'Clear', danger: true })) return;
    setClearingLogs(true);
    try {
      await fetch('/api/settings/usage', { method: 'DELETE' });
      await loadUsage();
    } finally {
      setClearingLogs(false);
    }
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
      setImportResult({ ok: false, message: 'Could not read file — make sure it is a valid Course backup.' });
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

  const handlePersonSaved = async () => {
    await refreshPersons();
    setExpandedPersonId(null);
  };

  const settingsTabs: { key: typeof settingsTab; label: string }[] = [
    { key: 'household', label: 'Household' },
    { key: 'ai', label: 'AI API' },
    { key: 'mcp', label: 'MCP' },
    { key: 'data', label: 'Data' },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-[var(--rule)] shrink-0 bg-[var(--bg)]" style={{ padding: '0 32px' }}>
        {settingsTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSettingsTab(tab.key)}
            style={{ borderRadius: 0 }}
            className={`px-[14px] h-[44px] font-mono text-[9px] tracking-[0.1em] uppercase border-b-2 transition-colors flex items-center ${
              settingsTab === tab.key
                ? 'text-[var(--fg)] border-[var(--accent)]'
                : 'text-[var(--muted)] border-transparent hover:text-[var(--fg)]'
            }`}
            aria-label={`${tab.label} tab`}
            aria-selected={settingsTab === tab.key}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scrollable tab content */}
      <div className="flex-1 overflow-y-auto bg-[var(--bg)]">
        <div style={{ maxWidth: 640, padding: '28px 32px' }}>

        {/* ── HOUSEHOLD TAB ── */}
        {settingsTab === 'household' && (
        <>
        {/* Household name + members */}
        <div className="mb-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] mb-[14px] pb-2 border-b border-[var(--rule)]">Household members</div>

          {/* Household name row */}
          <div className="flex items-center justify-between py-[10px] border-b border-[var(--rule)]">
            <div>
              <div className="text-[12px] text-[var(--fg)] font-medium">Household name</div>
            </div>
            {editingHouseholdName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={householdNameDraft}
                  onChange={(e) => setHouseholdNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveHouseholdName();
                    if (e.key === 'Escape') setEditingHouseholdName(false);
                  }}
                  autoFocus
                  className="bg-[var(--bg-subtle)] border border-[var(--rule)] px-3 py-2 font-mono text-[11px] text-[var(--fg)] max-w-[200px] focus:outline-none focus:border-[var(--accent)]"
                  aria-label="Household name"
                />
                <button
                  onClick={handleSaveHouseholdName}
                  disabled={householdNameSaving || !householdNameDraft.trim()}
                  className="px-3 py-[5px] font-mono text-[9px] uppercase tracking-[0.08em] bg-[var(--accent)] text-[var(--accent-text)] border-0 cursor-pointer disabled:opacity-40 hover:bg-[var(--accent-hover)] transition-colors"
                >
                  {householdNameSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditingHouseholdName(false)}
                  className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--muted)] hover:text-[var(--fg)] transition-colors bg-transparent border-0 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-[var(--fg)]">{householdName || '…'}</span>
                <button
                  onClick={() => { setHouseholdNameDraft(householdName); setEditingHouseholdName(true); }}
                  className="px-[11px] py-[5px] font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--muted)] border border-[var(--rule)] bg-transparent hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] cursor-pointer transition-colors"
                  aria-label="Edit household name"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Member rows with avatars */}
          {persons.map((person, idx) => {
            const initial = (person.name || '?').charAt(0).toUpperCase();
            const role = memberRoles[person.id];
            return (
              <div key={person.id} className="flex items-center gap-3 py-[10px] border-b border-[var(--rule)]">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-[11px] font-medium text-white shrink-0"
                  style={{ background: person.color || 'var(--accent)' }}
                  aria-hidden="true"
                >
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-[var(--fg)] font-medium">{person.name}</div>
                  <div className="font-mono text-[10px] text-[var(--muted)] capitalize">{role || 'Member'}</div>
                </div>
                {role === 'owner' ? (
                  <span className="px-[11px] py-[5px] font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--muted)] border border-[var(--rule)]">Owner</span>
                ) : (
                  <button
                    onClick={() => {/* remove handled by PersonRow */}}
                    className="px-[11px] py-[5px] font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--muted)] border border-[var(--rule)] bg-transparent hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] cursor-pointer transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}

          {/* Add / Invite member */}
          <div className="mt-[14px] flex gap-2">
            {!addingPerson ? (
              <button
                onClick={() => setAddingPerson(true)}
                className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.08em] bg-[var(--bg-subtle)] text-[var(--mid)] border border-[var(--rule)] hover:bg-[var(--bg-selected)] cursor-pointer transition-colors"
                aria-label="Add a household member"
              >
                + Add member
              </button>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
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
                  className="bg-[var(--bg-subtle)] border border-[var(--rule)] px-3 py-2 font-mono text-[11px] text-[var(--fg)] w-[160px] focus:outline-none focus:border-[var(--accent)]"
                  aria-label="New member name"
                />
                <button
                  onClick={handleAddPerson}
                  disabled={!newName.trim() || addSaving}
                  className="px-4 py-2 font-mono text-[9px] uppercase tracking-[0.08em] bg-[var(--accent)] text-[var(--accent-text)] border-0 cursor-pointer disabled:opacity-40 hover:bg-[var(--accent-hover)] transition-colors"
                >
                  {addSaving ? 'Adding…' : 'Add'}
                </button>
                <button
                  onClick={() => { setAddingPerson(false); setNewName(''); }}
                  className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--muted)] hover:text-[var(--fg)] transition-colors bg-transparent border-0 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
            <button
              onClick={handleInvite}
              disabled={inviting}
              className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.08em] bg-[var(--bg-subtle)] text-[var(--mid)] border border-[var(--rule)] hover:bg-[var(--bg-selected)] cursor-pointer transition-colors disabled:opacity-40"
              aria-label="Generate invite link"
            >
              {inviting ? 'Generating…' : 'Invite member'}
            </button>
          </div>
        </div>

        {/* ── PERSONS & GOALS ── */}
        <div className="mb-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] mb-[14px] pb-2 border-b border-[var(--rule)]">Persons &amp; goals</div>
          {persons.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              role={memberRoles[person.id]}
              nutrients={nutrients}
              isExpanded={expandedPersonId === person.id}
              onToggle={() => setExpandedPersonId(expandedPersonId === person.id ? null : person.id)}
              onSaved={handlePersonSaved}
              canDelete={persons.length > 1}
            />
          ))}
        </div>

        {/* ── INVITES ── */}
        {invites.length > 0 && (
        <div className="mb-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] mb-[14px] pb-2 border-b border-[var(--rule)]">Invites</div>
            {(
              <div className="border border-[var(--rule)]">
                {/* Header */}
                <div className="grid grid-cols-[1fr_80px_90px_90px] bg-[var(--bg-subtle)] px-4 py-2 border-b border-[var(--rule)]">
                  {['Invite URL', 'Status', 'Created', 'Redeemed'].map((h) => (
                    <span key={h} className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted)]">{h}</span>
                  ))}
                </div>
                {invites.map((inv) => {
                  const status = inv.usedAt ? 'redeemed' : inv.expired ? 'expired' : 'active';
                  const statusColor = status === 'redeemed' ? 'text-[var(--muted)]' : status === 'expired' ? 'text-[var(--error)]' : 'text-[var(--accent)]';
                  return (
                    <div key={inv.id} className="grid grid-cols-[1fr_80px_90px_90px] px-4 py-[10px] bg-[var(--bg)] border-b border-[var(--rule)] last:border-b-0 items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-[10px] text-[var(--fg)] truncate" title={inv.url}>
                          {inv.url.replace(/^https?:\/\//, '')}
                        </span>
                        {status === 'active' && (
                          <button
                            onClick={() => handleCopyInvite(inv.url, inv.token)}
                            className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--fg)] transition-colors bg-transparent border-0 cursor-pointer shrink-0"
                            aria-label="Copy invite link"
                          >
                            {copiedToken === inv.token ? 'Copied!' : 'Copy'}
                          </button>
                        )}
                      </div>
                      <div>
                        <span className={`font-mono text-[9px] uppercase tracking-[0.05em] ${statusColor}`}>{status}</span>
                        {inv.usedByName && (
                          <div className="font-sans text-[10px] text-[var(--muted)] mt-[1px]">{inv.usedByName}</div>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-[var(--muted)]">
                        {new Date(inv.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--muted)]">
                        {inv.usedAt ? new Date(inv.usedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
        )}

        </>
        )}

        {/* ── AI API TAB ── */}
        {settingsTab === 'ai' && (
        <div className="mb-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] mb-[14px] pb-2 border-b border-[var(--rule)]">AI API</div>
          <div className="space-y-6">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-4">AI API Key</div>
              {!editingApiKey ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-[7px] border border-[var(--rule)] bg-[var(--bg-subtle)] min-w-[220px]">
                    {hasApiKey ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" aria-hidden="true" />
                        <span className="font-mono text-[11px] text-[var(--fg)] tracking-[0.1em]">{maskedKey}</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[var(--muted)] shrink-0" aria-hidden="true" />
                        <span className="font-mono text-[11px] text-[var(--muted)]">Not configured</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditingApiKey(true); setNewApiKeyValue(''); }}
                      className="px-3 py-[7px] font-mono text-[9px] uppercase tracking-[0.1em] border border-[var(--rule)] text-[var(--fg)] hover:border-[var(--rule-strong)] bg-transparent cursor-pointer transition-colors"
                      aria-label={hasApiKey ? 'Change API key' : 'Add API key'}
                    >
                      {hasApiKey ? 'Change' : 'Add Key'}
                    </button>
                    {hasApiKey && (
                      <button
                        onClick={handleRemoveApiKey}
                        className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--error)] transition-colors bg-transparent border-0 cursor-pointer"
                        aria-label="Remove API key"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <input
                    type="password"
                    value={newApiKeyValue}
                    onChange={(e) => setNewApiKeyValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newApiKeyValue.trim()) handleSaveApiKey();
                      if (e.key === 'Escape') { setEditingApiKey(false); setNewApiKeyValue(''); }
                    }}
                    placeholder="sk-ant-…"
                    autoFocus
                    className="bg-[var(--bg)] border border-[var(--rule)] px-3 py-[9px] font-mono text-[12px] text-[var(--fg)] w-full max-w-[400px] focus:outline-none focus:border-[var(--accent)]"
                    aria-label="AI API key"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSaveApiKey}
                      disabled={!newApiKeyValue.trim() || apiSaving}
                      className="px-4 py-[7px] font-mono text-[9px] uppercase tracking-[0.1em] bg-[var(--accent)] text-white border-0 cursor-pointer disabled:opacity-40 hover:bg-[var(--accent-hover)] transition-colors"
                    >
                      {apiSaving ? 'Saving…' : 'Save Key'}
                    </button>
                    <button
                      onClick={() => { setEditingApiKey(false); setNewApiKeyValue(''); }}
                      className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--fg)] transition-colors bg-transparent border-0 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[var(--rule)]" />

            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">API Usage</div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={loadUsage}
                    className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--fg)] transition-colors bg-transparent border-0 cursor-pointer"
                    aria-label="Refresh usage stats"
                  >
                    Refresh
                  </button>
                  {usage && usage.callCount > 0 && (
                    <button
                      onClick={handleClearLogs}
                      disabled={clearingLogs}
                      className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--error)] transition-colors bg-transparent border-0 cursor-pointer"
                      aria-label="Clear usage logs"
                    >
                      {clearingLogs ? 'Clearing…' : 'Clear logs'}
                    </button>
                  )}
                </div>
              </div>
              {usageLoading ? (
                <div className="text-[11px] text-[var(--muted)]">Loading…</div>
              ) : !usage || usage.callCount === 0 ? (
                <div className="text-[11px] text-[var(--muted)] italic">No usage recorded yet.</div>
              ) : (
                <div className="grid grid-cols-2 gap-[1px] border border-[var(--rule)] bg-[var(--rule)] max-w-[380px]">
                  {[
                    { label: 'API calls', value: usage.callCount.toLocaleString() },
                    { label: 'Est. cost', value: `$${usage.estimatedCostUsd.toFixed(4)}` },
                    { label: 'Input tokens', value: usage.totalInputTokens.toLocaleString() },
                    { label: 'Output tokens', value: usage.totalOutputTokens.toLocaleString() },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-[var(--bg)] px-4 py-3">
                      <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted)] mb-[3px]">{label}</div>
                      <div className="font-mono text-[15px] text-[var(--fg)]">{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* ── MCP TAB ── */}
        {settingsTab === 'mcp' && (
        <div className="mb-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] mb-[14px] pb-2 border-b border-[var(--rule)]">MCP</div>
          <div className="space-y-6">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-3">API Token</div>
              <p className="font-mono text-[11px] text-[var(--muted)] mb-4 leading-relaxed">
                Connect any MCP-compatible AI assistant to your recipe collection. Ask your AI to save, search, or list recipes directly.
              </p>
              {newMcpToken ? (
                <div className="space-y-3">
                  <div className="border border-[var(--accent)] bg-[var(--bg-subtle)] px-4 py-3">
                    <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--accent)] mb-2">
                      Copy this token now — it won't be shown again
                    </div>
                    <div className="flex items-center gap-3">
                      <code className="font-mono text-[11px] text-[var(--fg)] break-all flex-1">{newMcpToken}</code>
                      <button
                        onClick={handleCopyMcpToken}
                        className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--fg)] transition-colors bg-transparent border-0 cursor-pointer shrink-0"
                        aria-label="Copy MCP token"
                      >
                        {mcpCopied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setNewMcpToken(null)}
                    className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--fg)] transition-colors bg-transparent border-0 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 px-4 py-[7px] border border-[var(--rule)] bg-[var(--bg-subtle)] min-w-[220px]">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${hasMcpToken ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]'}`} aria-hidden="true" />
                    <span className="font-mono text-[11px] text-[var(--muted)]">
                      {hasMcpToken ? 'Token active' : 'No token'}
                    </span>
                  </div>
                  <button
                    onClick={handleGenerateMcpToken}
                    disabled={mcpTokenLoading}
                    className="px-3 py-[7px] font-mono text-[9px] uppercase tracking-[0.1em] border border-[var(--rule)] text-[var(--fg)] hover:border-[var(--rule-strong)] bg-transparent cursor-pointer transition-colors disabled:opacity-40"
                    aria-label={hasMcpToken ? 'Regenerate MCP token' : 'Generate MCP token'}
                  >
                    {mcpTokenLoading ? 'Generating…' : hasMcpToken ? 'Regenerate' : 'Generate token'}
                  </button>
                  {hasMcpToken && (
                    <button
                      onClick={handleRevokeMcpToken}
                      disabled={revokingMcpToken}
                      className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--error)] transition-colors bg-transparent border-0 cursor-pointer"
                      aria-label="Revoke MCP token"
                    >
                      {revokingMcpToken ? 'Revoking…' : 'Revoke'}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-[var(--rule)]" />

            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-5">How to set up</div>
              <div className="space-y-5">
                <div className="grid grid-cols-[20px_1fr] gap-3">
                  <span className="font-mono text-[9px] text-[var(--muted)] pt-px">1.</span>
                  <div className="space-y-2">
                    <p className="font-mono text-[11px] text-[var(--fg)]">
                      Build the MCP server from the <code className="bg-[var(--bg-subtle)] px-1">mcp/</code> folder:
                    </p>
                    <div className="border border-[var(--rule)] bg-[var(--bg-subtle)] px-3 py-2">
                      <pre className="font-mono text-[10px] text-[var(--fg)]">cd mcp && npm install && npm run build</pre>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-[20px_1fr] gap-3">
                  <span className="font-mono text-[9px] text-[var(--muted)] pt-px">2.</span>
                  <div className="space-y-2">
                    <p className="font-mono text-[11px] text-[var(--fg)]">
                      Add to your AI assistant's MCP config (e.g. Claude Desktop):
                    </p>
                    <div className="font-mono text-[10px] text-[var(--muted)] space-y-[2px]">
                      <div><span className="text-[var(--fg)]">Mac</span> — ~/Library/Application Support/Claude/claude_desktop_config.json</div>
                      <div><span className="text-[var(--fg)]">Win</span> — %APPDATA%\Claude\claude_desktop_config.json</div>
                    </div>
                    <div className="border border-[var(--rule)] bg-[var(--bg-subtle)] px-3 py-2">
                      <pre className="font-mono text-[10px] text-[var(--fg)] whitespace-pre-wrap leading-relaxed">{`{
  "mcpServers": {
    "course": {
      "command": "node",
      "args": ["/absolute/path/to/mcp/dist/index.js"],
      "env": {
        "COURSE_API_URL": "${typeof window !== 'undefined' ? window.location.origin : ''}",
        "COURSE_API_TOKEN": "<your token>"
      }
    }
  }
}`}</pre>
                    </div>
                    <p className="font-mono text-[10px] text-[var(--muted)]">
                      Replace <code className="bg-[var(--bg-subtle)] px-1">/absolute/path/to/mcp/dist/index.js</code> with the actual path and paste your token.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-[20px_1fr] gap-3">
                  <span className="font-mono text-[9px] text-[var(--muted)] pt-px">3.</span>
                  <div className="space-y-2">
                    <p className="font-mono text-[11px] text-[var(--fg)]">
                      Restart your AI assistant and test it:
                    </p>
                    <div className="border border-[var(--rule)] bg-[var(--bg-subtle)] px-3 py-2">
                      <p className="font-mono text-[10px] text-[var(--muted)] italic">"Save this recipe to Course: Avocado Toast — 2 slices sourdough, 1 avocado, salt, red pepper flakes. 2 servings."</p>
                    </div>
                  </div>
                </div>
                <p className="font-mono text-[10px] text-[var(--muted)] leading-relaxed pl-[32px]">
                  Works with any MCP-compatible assistant — Claude, Cursor, Windsurf, and others.
                </p>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* ── DATA TAB ── */}
        {settingsTab === 'data' && (
        <div className="mb-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] mb-[14px] pb-2 border-b border-[var(--rule)]">Data</div>
          <div className="space-y-6">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-2">Export</div>
              <p className="font-sans text-[13px] text-[var(--muted)] mb-4 leading-relaxed">
                Download a complete backup of your household data — ingredients, recipes, meal plans, and nutrition goals — as a JSON file.
              </p>
              <button
                onClick={handleExport}
                disabled={exportLoading}
                className="px-4 py-[9px] font-mono text-[9px] uppercase tracking-[0.1em] border border-[var(--rule)] text-[var(--fg)] hover:border-[var(--rule-strong)] bg-transparent cursor-pointer transition-colors disabled:opacity-40"
                aria-label="Export household data"
              >
                {exportLoading ? 'Exporting…' : 'Export data'}
              </button>
            </div>

            <div className="border-t border-[var(--rule)]" />

            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-2">Import</div>
              <p className="font-sans text-[13px] text-[var(--muted)] mb-4 leading-relaxed">
                Restore from a backup file. <strong className="text-[var(--fg)] font-medium">This will overwrite all existing household data</strong> and cannot be undone.
              </p>
              <label
                htmlFor="import-file"
                className="inline-flex items-center gap-3 px-4 py-[9px] font-mono text-[9px] uppercase tracking-[0.1em] border border-[var(--rule)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--rule-strong)] cursor-pointer transition-colors"
                aria-label="Select backup file"
              >
                {importFile ? importFile.name : 'Choose backup file'}
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
                    className="px-4 py-[9px] font-mono text-[9px] uppercase tracking-[0.1em] bg-[var(--accent)] text-white border-0 cursor-pointer disabled:opacity-40 hover:bg-[var(--accent-hover)] transition-colors"
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
                  className={`mt-4 px-4 py-3 font-sans text-[12px] border ${
                    importResult.ok
                      ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-subtle)]'
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
        )}

        </div>{/* end settings-layout */}
      </div>
    </div>
  );
};

function SettingsPageWrapper() {
  return <SettingsPage />;
}

export default SettingsPageWrapper;
