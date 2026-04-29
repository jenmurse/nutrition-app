"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { dialog } from "@/lib/dialog";

const SECTIONS = [
  { href: "/home",        label: "HOME"     },
  { href: "/meal-plans",  label: "PLANNER"  },
  { href: "/recipes",     label: "RECIPES"  },
  { href: "/ingredients", label: "PANTRY"   },
  { href: "/settings",    label: "SETTINGS" },
];
const HIDDEN: Set<string> = new Set(["/", "/login", "/preview", "/onboarding", "/landing"]);

function isActive(href: string, pathname: string) {
  return href === "/home" ? pathname === "/home" : pathname.startsWith(href);
}

function AddMealStatus() {
  const params = useSearchParams();
  const date = params?.get("date");
  const person = params?.get("person");
  if (!date) return null;
  const d = new Date(date + "T00:00:00");
  const dStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
  return (
    <span className="mob-rail-status">
      {dStr}{person ? ` · ${person.toUpperCase()}` : ""}
    </span>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuOpen]);

  if (!pathname || HIDDEN.has(pathname)) return null;

  const isShopping = pathname === "/shopping";
  const isAddMeal = pathname === "/meal-plans/add-meal";

  const current = SECTIONS.find(s => isActive(s.href, pathname));
  const sectionLabel = !isShopping && !isAddMeal && current ? current.label : null;

  const handleSignOut = async () => {
    const confirmed = await dialog.confirm({
      title: "Sign out?",
      body: "You'll need to sign in again to access your data.",
      confirmLabel: "Sign out",
      danger: false,
    });
    if (!confirmed) return;
    setMenuOpen(false);
    sessionStorage.removeItem("selectedPersonId");
    localStorage.removeItem("theme");
    document.documentElement.removeAttribute("data-theme");
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <>
      <nav className="bottom-nav" aria-label="Main navigation">
        <button
          className="mob-rail-menu"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
        >
          MENU
        </button>

        {isShopping && (
          <button
            type="button"
            className="mob-rail-action"
            onClick={() => window.dispatchEvent(new CustomEvent("shopping:share"))}
            aria-label="Share shopping list"
          >SHARE</button>
        )}

        {isAddMeal && (
          <Suspense fallback={null}>
            <AddMealStatus />
          </Suspense>
        )}

        {sectionLabel && (
          <span className="mob-rail-index" aria-current="page">{sectionLabel}</span>
        )}
      </nav>

      {menuOpen && (
        <div
          className="mob-menu-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          onClick={() => setMenuOpen(false)}
        >
          <div className="mob-menu-inner" onClick={e => e.stopPropagation()}>
            <div className="mob-menu-header">
              <button
                className="mob-menu-close"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                Close
              </button>
            </div>
            <nav className="mob-menu-list" aria-label="Sections">
              {SECTIONS.slice(0, -1).map(s => (
                <Link
                  key={s.href}
                  href={s.href}
                  className={`mob-menu-item${isActive(s.href, pathname) && !isShopping && !isAddMeal ? " mob-menu-item--active" : ""}`}
                  aria-current={isActive(s.href, pathname) && !isShopping && !isAddMeal ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {s.label.charAt(0) + s.label.slice(1).toLowerCase()}
                </Link>
              ))}
              <Link
                href="/shopping"
                className={`mob-menu-item${isShopping ? " mob-menu-item--active" : ""}`}
                aria-current={isShopping ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                Shopping
              </Link>
              {SECTIONS.slice(-1).map(s => (
                <Link
                  key={s.href}
                  href={s.href}
                  className={`mob-menu-item${isActive(s.href, pathname) ? " mob-menu-item--active" : ""}`}
                  aria-current={isActive(s.href, pathname) ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {s.label.charAt(0) + s.label.slice(1).toLowerCase()}
                </Link>
              ))}
            </nav>
            <hr className="mob-menu-divider" />
            <button
              className="mob-menu-signout"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
