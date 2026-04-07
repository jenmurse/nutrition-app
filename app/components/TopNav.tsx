"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePersonContext } from "./PersonContext";
import { createClient } from "@/lib/supabase/client";
import { BrandName } from "./BrandName";

const navItems = [
  { href: "/meal-plans", label: "Planner" },
  { href: "/recipes", label: "Recipes" },
  { href: "/ingredients", label: "Pantry" },
];

export default function TopNav() {
  const pathname = usePathname();
  const { persons, selectedPerson, setSelectedPersonId } = usePersonContext();
  const supabase = createClient();

  // Hide nav on login, preview, onboarding, and landing pages
  if (pathname === "/login" || pathname === "/preview" || pathname === "/onboarding" || pathname === "/landing") return null;

  const handleSignOut = async () => {
    localStorage.removeItem("selectedPersonId");
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <nav
      className="top-nav flex items-center h-[var(--nav-h)] bg-[var(--bg)] px-[var(--pad)] shrink-0 relative z-10 border-b border-[var(--rule)]"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Brand */}
      <Link
        href="/"
        className="font-serif text-[13px] text-[var(--fg)] no-underline tracking-[-0.02em] hover:text-[var(--accent)] transition-colors duration-150"
        style={{ marginRight: 36 }}
      >
        <BrandName />
      </Link>

      {/* Nav links — hidden on mobile (bottom nav in Phase 2) */}
      <div className="nav-links-group flex items-center flex-1 gap-6">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link font-mono text-[9px] uppercase tracking-[0.12em] py-[6px] no-underline relative transition-colors duration-150 whitespace-nowrap ${
                isActive
                  ? "text-[var(--fg)]"
                  : "text-[var(--muted)] hover:text-[var(--fg)]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Right side: person switcher + settings + sign out */}
      <div className="ml-auto flex items-center gap-3">
        {/* Person dots */}
        {persons.length > 0 && (
          <div className="flex items-center gap-[8px]">
            {persons.map((p) => {
              const isSelected = p.id === selectedPerson?.id;
              const initial = (p.name || "?").charAt(0).toUpperCase();
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersonId(p.id)}
                  className="nav-person-dot w-[18px] h-[18px] rounded-full flex items-center justify-center font-mono text-[7px] font-semibold text-white shrink-0 transition-transform duration-200 cursor-pointer border-0 hover:scale-[1.15]"
                  style={{
                    background: p.color || "var(--accent)",
                    boxShadow: isSelected ? `0 0 0 2px var(--bg), 0 0 0 3.5px ${p.color || 'var(--accent)'}` : 'none',
                  }}
                  aria-label={`Switch to ${p.name}`}
                  aria-pressed={isSelected}
                >
                  {initial}
                </button>
              );
            })}
          </div>
        )}

        <Link
          href="/settings"
          className={`nav-settings flex items-center justify-center no-underline transition-[color,transform] duration-150 hover:rotate-[30deg] ${
            pathname?.startsWith("/settings")
              ? "text-[var(--accent)]"
              : "text-[var(--muted)] hover:text-[var(--fg)]"
          }`}
          style={{ padding: 4 }}
          aria-label="Settings"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>
        <button
          onClick={handleSignOut}
          className="nav-signout font-mono text-[9px] uppercase tracking-[0.12em] px-0 py-[5px] flex items-center text-[var(--muted)] hover:text-[var(--fg)] transition-colors duration-150 bg-transparent border-0 cursor-pointer"
          aria-label="Sign out"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
