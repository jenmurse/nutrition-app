"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface Person {
  id: number;
  name: string;
  color: string;
}

interface PersonContextValue {
  persons: Person[];
  selectedPerson: Person | null;
  selectedPersonId: number | null;
  setSelectedPersonId: (id: number) => void;
  refreshPersons: () => Promise<void>;
}

const PersonContext = createContext<PersonContextValue>({
  persons: [],
  selectedPerson: null,
  selectedPersonId: null,
  setSelectedPersonId: () => {},
  refreshPersons: async () => {},
});

export function usePersonContext() {
  return useContext(PersonContext);
}

export function PersonProvider({ children }: { children: ReactNode }) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonIdState] = useState<number | null>(null);

  const refreshPersons = async () => {
    const res = await fetch("/api/persons");
    if (res.ok) {
      const { persons: data, currentPersonId } = await res.json() as {
        persons: Person[];
        currentPersonId: number | null;
      };
      setPersons(data);
      // Restore saved person selection if valid, otherwise default to current user
      const saved = localStorage.getItem("selectedPersonId");
      const savedId = saved ? Number(saved) : null;
      if (savedId && data.some((p) => p.id === savedId)) {
        setSelectedPersonIdState(savedId);
      } else if (currentPersonId && data.some((p) => p.id === currentPersonId)) {
        setSelectedPersonIdState(currentPersonId);
      } else if (data.length > 0) {
        setSelectedPersonIdState(data[0].id);
      }
    }
  };

  useEffect(() => {
    refreshPersons();
  }, []);

  const setSelectedPersonId = (id: number) => {
    setSelectedPersonIdState(id);
    localStorage.setItem("selectedPersonId", String(id));
  };

  const selectedPerson = persons.find((p) => p.id === selectedPersonId) ?? null;

  return (
    <PersonContext.Provider
      value={{ persons, selectedPerson, selectedPersonId, setSelectedPersonId, refreshPersons }}
    >
      {children}
    </PersonContext.Provider>
  );
}
