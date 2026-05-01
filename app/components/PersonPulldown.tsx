"use client";

import { useState, useEffect, useRef } from "react";
import { usePersonContext } from "./PersonContext";

export default function PersonPulldown() {
  const { persons, selectedPerson, selectedPersonId, setSelectedPersonId } = usePersonContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!persons.length || !selectedPerson) return null;

  const displayName = persons.length <= 3 ? selectedPerson.name : selectedPerson.name[0];

  if (persons.length === 1) {
    return (
      <div className="person-chip-static" aria-label={selectedPerson.name}>
        <span className="person-chip-dot" style={{ background: selectedPerson.color || "var(--accent)" }} />
        <span>{displayName}</span>
      </div>
    );
  }

  return (
    <div className="person-pulldown" ref={ref}>
      <button
        className="person-pulldown-btn"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Current person: ${selectedPerson.name}. Switch person`}
      >
        <span className="person-chip-dot" style={{ background: selectedPerson.color || "var(--accent)" }} />
        <span>{displayName}</span>
        <span className="person-pulldown-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="person-pulldown-menu" role="listbox">
          {persons.map(p => (
            <button
              key={p.id}
              role="option"
              aria-selected={selectedPersonId === p.id}
              className={`person-pulldown-item${selectedPersonId === p.id ? " on" : ""}`}
              onClick={() => { setSelectedPersonId(p.id); setOpen(false); }}
            >
              <span className="person-chip-dot" style={{ background: p.color || "var(--accent)" }} />
              {persons.length <= 3 ? p.name : p.name[0]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
