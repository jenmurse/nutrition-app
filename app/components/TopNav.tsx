"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { usePersonContext } from "./PersonContext";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/ingredients", label: "Ingredients" },
  { href: "/recipes", label: "Recipes" },
  { href: "/meal-plans", label: "Meal Plans" },
  { href: "/settings", label: "Settings" },
];

export default function TopNav() {
  const pathname = usePathname();
  const { persons, selectedPerson, setSelectedPersonId } = usePersonContext();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <nav className="flex items-center h-[48px] border-b border-[var(--rule)] bg-[var(--bg)] px-6 shrink-0" role="navigation" aria-label="Main navigation">
      {/* Brand */}
      <Link href="/" className="font-serif text-[16px] text-[var(--fg)] no-underline mr-8 tracking-[-0.01em]">
        Course
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`font-mono text-[9px] uppercase tracking-[0.1em] px-3 py-[6px] no-underline transition-colors ${
                isActive
                  ? "text-[var(--accent)] bg-[var(--accent-light)]"
                  : "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Right side: person switcher + sign out */}
      <div className="ml-auto flex items-center">
      {/* Person indicator / switcher */}
      {persons.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          {persons.length === 1 ? (
            // Single person — static label, no dropdown affordance
            <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] px-3 py-[6px] text-[var(--muted)] select-none">
              {selectedPerson && (
                <span
                  className="w-[8px] h-[8px] rounded-full shrink-0 bg-[var(--accent)]"
                  aria-hidden="true"
                />
              )}
              {selectedPerson?.name ?? "—"}
            </span>
          ) : (
            // Multiple persons — dropdown switcher, no add flow
            <>
              <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] px-3 py-[6px] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-colors"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label="Switch person"
              >
                {selectedPerson && (
                  <span
                    className="w-[8px] h-[8px] rounded-full shrink-0 bg-[var(--accent)]"
                    aria-hidden="true"
                  />
                )}
                {selectedPerson?.name ?? "—"}
                <span aria-hidden="true">▾</span>
              </button>

              {open && (
                <div
                  className="dropdown-enter absolute right-0 top-full mt-1 min-w-[160px] bg-[var(--bg)] border border-[var(--rule)] z-50"
                  role="listbox"
                  aria-label="Select person"
                >
                  {persons.map((p) => (
                    <button
                      key={p.id}
                      role="option"
                      aria-selected={p.id === selectedPerson?.id}
                      onClick={() => { setSelectedPersonId(p.id); setOpen(false); }}
                      className={`w-full flex items-center gap-2 px-4 py-[9px] font-mono text-[9px] uppercase tracking-[0.1em] text-left transition-colors ${
                        p.id === selectedPerson?.id
                          ? "text-[var(--accent)] bg-[var(--accent-light)]"
                          : "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]"
                      }`}
                    >
                      <span
                        className="w-[8px] h-[8px] rounded-full shrink-0 bg-[var(--accent)]"
                        aria-hidden="true"
                      />
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

        <button
          onClick={handleSignOut}
          className="font-mono text-[9px] uppercase tracking-[0.1em] px-3 py-[6px] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-colors"
          aria-label="Sign out"
        >
          Sign out
        </button>
      </div>{/* end right side */}
    </nav>
  );
}
