"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const supabase = createClient();

  // Hide nav on login page
  if (pathname === "/login") return null;

  const handleSignOut = async () => {
    localStorage.removeItem("selectedPersonId");
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <nav className="flex items-center h-[52px] border-b border-[var(--rule)] bg-[var(--bg-nav)] px-5 shrink-0" role="navigation" aria-label="Main navigation">
      {/* Brand */}
      <Link href="/" className="font-serif text-[16px] text-[var(--fg)] no-underline mr-6 tracking-[0.02em]">
        Course
      </Link>

      {/* Nav links */}
      <div className="flex items-center flex-1">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`font-mono text-[10px] uppercase tracking-[0.1em] px-[14px] h-[52px] flex items-center no-underline border-b-2 border-t-2 border-t-transparent box-border transition-[color,border-color] duration-[120ms] ease-in-out whitespace-nowrap ${
                isActive
                  ? "text-[var(--fg)] border-b-[var(--accent)]"
                  : "text-[var(--muted)] border-b-transparent hover:text-[var(--fg)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Right side: person switcher + sign out */}
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

        <button
          onClick={handleSignOut}
          className="font-mono text-[9px] uppercase tracking-[0.1em] px-3 h-[52px] flex items-center text-[var(--muted)] hover:text-[var(--fg)] transition-colors bg-transparent border-0 cursor-pointer"
          aria-label="Sign out"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
