"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { resolveTheme } from "@/lib/themes";

export interface Person {
  id: number;
  name: string;
  color: string;
  theme: string;
  onboardingComplete?: boolean;
}

interface PersonContextValue {
  persons: Person[];
  selectedPerson: Person | null;
  selectedPersonId: number | null;
  setSelectedPersonId: (id: number) => void;
  refreshPersons: () => Promise<void>;
  onboardingComplete: boolean;
}

const PersonContext = createContext<PersonContextValue>({
  persons: [],
  selectedPerson: null,
  selectedPersonId: null,
  setSelectedPersonId: () => {},
  refreshPersons: async () => {},
  onboardingComplete: true,
});

export function usePersonContext() {
  return useContext(PersonContext);
}

function applyTheme(theme: string) {
  const resolved = resolveTheme(theme || 'sage');
  document.documentElement.dataset.theme = resolved;
  localStorage.setItem('theme', resolved);
}

export function PersonProvider({ children }: { children: ReactNode }) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonIdState] = useState<number | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(true);

  const refreshPersons = async () => {
    const res = await fetch("/api/persons");
    if (res.ok) {
      const { persons: data, currentPersonId, onboardingComplete: onboarded } = await res.json() as {
        persons: Person[];
        currentPersonId: number | null;
        onboardingComplete?: boolean;
      };
      setOnboardingComplete(onboarded ?? true);
      setPersons(data);
      // Restore saved person selection if valid, otherwise default to current user
      const saved = localStorage.getItem("selectedPersonId");
      const savedId = saved ? Number(saved) : null;
      let resolvedId: number | null = null;
      if (savedId && data.some((p) => p.id === savedId)) {
        resolvedId = savedId;
      } else if (currentPersonId && data.some((p) => p.id === currentPersonId)) {
        resolvedId = currentPersonId;
      } else if (data.length > 0) {
        resolvedId = data[0].id;
      }
      if (resolvedId !== null) {
        setSelectedPersonIdState(resolvedId);
        const person = data.find(p => p.id === resolvedId);
        if (person) applyTheme(person.theme);
      }
    }
  };

  useEffect(() => {
    refreshPersons();
  }, []);

  const setSelectedPersonId = (id: number) => {
    setSelectedPersonIdState(id);
    localStorage.setItem("selectedPersonId", String(id));
    const person = persons.find(p => p.id === id);
    if (person) applyTheme(person.theme);
  };

  const selectedPerson = persons.find((p) => p.id === selectedPersonId) ?? null;

  return (
    <PersonContext.Provider
      value={{ persons, selectedPerson, selectedPersonId, setSelectedPersonId, refreshPersons, onboardingComplete }}
    >
      {children}
    </PersonContext.Provider>
  );
}
