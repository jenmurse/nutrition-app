"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePersonContext } from "./PersonContext";
import { createClient } from "@/lib/supabase/client";
import { BrandName } from "./BrandName";

const navItems = [
  { href: "/meal-plans", label: "Meal Plans" },
  { href: "/recipes", label: "Recipes" },
  { href: "/ingredients", label: "Pantry" },
];

export default function TopNav() {
  const pathname = usePathname();
  const { persons, selectedPerson, setSelectedPersonId } = usePersonContext();
  const supabase = createClient();

  // Hide nav on login, preview, and onboarding pages
  if (pathname === "/login" || pathname === "/preview" || pathname === "/onboarding") return null;

  const handleSignOut = async () => {
    localStorage.removeItem("selectedPersonId");
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <nav className="flex items-center h-[52px] bg-[var(--bg-nav)] px-6 shrink-0 relative z-10" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)' }} role="navigation" aria-label="Main navigation">
      {/* Brand */}
      <Link href="/" className="font-serif text-[16px] text-[var(--fg)] no-underline mr-6 tracking-[0.02em]">
        <BrandName />
      </Link>

      {/* Nav links */}
      <div className="flex items-center flex-1 gap-[2px]">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`font-mono text-[10px] uppercase tracking-[0.1em] px-[12px] py-[5px] rounded-[6px] no-underline transition-[color,background] duration-[120ms] ease-in-out whitespace-nowrap ${
                isActive
                  ? "text-[var(--fg)] bg-[var(--accent-light)]"
                  : "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[rgba(0,0,0,0.03)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Right side: settings gear + person switcher + sign out */}
      <div className="ml-auto flex items-center gap-[10px]">
        {/* Person dots */}
        {persons.length > 0 && (
          <div className="flex items-center gap-[10px]">
            {persons.map((p) => {
              const isSelected = p.id === selectedPerson?.id;
              const initial = (p.name || "?").charAt(0).toUpperCase();
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersonId(p.id)}
                  className="w-[28px] h-[28px] rounded-full flex items-center justify-center font-mono text-[10px] font-medium text-white shrink-0 transition-opacity duration-[120ms] ease-in-out cursor-pointer border-0"
                  style={{
                    background: p.color || "var(--accent)",
                    opacity: isSelected ? 1 : 0.4,
                    boxShadow: isSelected ? `0 0 0 2px var(--bg-nav), 0 0 0 4px ${p.color || 'var(--accent)'}` : 'none',
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
          className={`w-[26px] h-[26px] rounded-full flex items-center justify-center no-underline transition-[color,background] duration-[120ms] ease-in-out ${
            pathname?.startsWith("/settings")
              ? "text-[var(--fg)] bg-[var(--accent-light)]"
              : "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[rgba(0,0,0,0.05)]"
          }`}
          aria-label="Settings"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>
        <button
          onClick={handleSignOut}
          className="font-mono text-[9px] uppercase tracking-[0.1em] px-3 py-[5px] flex items-center text-[var(--muted)] hover:text-[var(--fg)] transition-colors bg-transparent border-0 cursor-pointer rounded-[6px] hover:bg-[rgba(0,0,0,0.03)]"
          aria-label="Sign out"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
