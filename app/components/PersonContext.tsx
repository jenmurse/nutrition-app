"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { resolveTheme } from "@/lib/themes";

export interface Person {
  id: number;
  name: string;
  color: string;
  theme: string;
  onboardingComplete?: boolean;
  dismissedTips: string[]; // parsed from JSON string in DB
}

interface PersonContextValue {
  persons: Person[];
  selectedPerson: Person | null;
  selectedPersonId: number | null;
  setSelectedPersonId: (id: number) => void;
  refreshPersons: () => Promise<void>;
  onboardingComplete: boolean;
  dismissTip: (tipId: string) => Promise<void>;
}

const PersonContext = createContext<PersonContextValue>({
  persons: [],
  selectedPerson: null,
  selectedPersonId: null,
  setSelectedPersonId: () => {},
  refreshPersons: async () => {},
  onboardingComplete: true,
  dismissTip: async () => {},
});

export function usePersonContext() {
  return useContext(PersonContext);
}

function applyTheme(theme: string) {
  const resolved = resolveTheme(theme || 'sage');
  document.documentElement.dataset.theme = resolved;
  localStorage.setItem('theme', resolved);
}

function parsePerson(p: Record<string, unknown>): Person {
  let dismissedTips: string[] = [];
  try {
    const raw = p.dismissedTips as string | undefined;
    if (raw) dismissedTips = JSON.parse(raw);
  } catch {}
  return { ...(p as unknown as Person), dismissedTips };
}

export function PersonProvider({ children }: { children: ReactNode }) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonIdState] = useState<number | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(true);

  const refreshPersons = async () => {
    const res = await fetch("/api/persons");
    if (res.ok) {
      const { persons: data, currentPersonId, onboardingComplete: onboarded } = await res.json() as {
        persons: Record<string, unknown>[];
        currentPersonId: number | null;
        onboardingComplete?: boolean;
      };
      setOnboardingComplete(onboarded ?? true);
      const parsed = data.map(parsePerson);
      setPersons(parsed);
      // Restore saved person selection if valid, otherwise default to current user.
      // sessionStorage (not localStorage) so it clears when the browser is closed —
      // logging out and back in, or opening a new browser session, always lands on your own profile.
      const saved = sessionStorage.getItem("selectedPersonId");
      const savedId = saved ? Number(saved) : null;
      let resolvedId: number | null = null;
      if (savedId && parsed.some((p) => p.id === savedId)) {
        resolvedId = savedId;
      } else if (currentPersonId && parsed.some((p) => p.id === currentPersonId)) {
        resolvedId = currentPersonId;
      } else if (parsed.length > 0) {
        resolvedId = parsed[0].id;
      }
      if (resolvedId !== null) {
        setSelectedPersonIdState(resolvedId);
        const person = parsed.find(p => p.id === resolvedId);
        if (person) applyTheme(person.theme);
      }
    }
  };

  useEffect(() => {
    refreshPersons();
  }, []);

  const setSelectedPersonId = (id: number) => {
    setSelectedPersonIdState(id);
    sessionStorage.setItem("selectedPersonId", String(id));
    const person = persons.find(p => p.id === id);
    if (person) applyTheme(person.theme);
  };

  const dismissTip = async (tipId: string) => {
    if (!selectedPersonId) return;
    const person = persons.find(p => p.id === selectedPersonId);
    if (!person) return;
    if (person.dismissedTips.includes(tipId)) return;
    const updated = [...person.dismissedTips, tipId];
    // Optimistically update local state
    setPersons(prev => prev.map(p =>
      p.id === selectedPersonId ? { ...p, dismissedTips: updated } : p
    ));
    await fetch(`/api/persons/${selectedPersonId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dismissedTips: updated }),
    });
  };

  const selectedPerson = persons.find((p) => p.id === selectedPersonId) ?? null;

  return (
    <PersonContext.Provider
      value={{ persons, selectedPerson, selectedPersonId, setSelectedPersonId, refreshPersons, onboardingComplete, dismissTip }}
    >
      {children}
    </PersonContext.Provider>
  );
}
