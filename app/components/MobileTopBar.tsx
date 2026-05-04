"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { dialog } from "@/lib/dialog";
import { BrandName } from "./BrandName";
import PersonPulldown from "./PersonPulldown";

const SECTIONS = [
  { href: "/home",        label: "Home"     },
  { href: "/meal-plans",  label: "Planner"  },
  { href: "/recipes",     label: "Recipes"  },
  { href: "/ingredients", label: "Pantry"   },
  { href: "/shopping",    label: "Shopping" },
  { href: "/settings",    label: "Settings" },
];

const HIDDEN = new Set(["/", "/login", "/preview", "/onboarding", "/landing", "/waitlist", "/waitlist-success", "/invite", "/privacy", "/admin/waitlist"]);

function isActive(href: string, pathname: string) {
  if (href === "/home") return pathname === "/home";
  if (href === "/shopping") return pathname === "/shopping";
  return pathname.startsWith(href);
}

function isBackPage(pathname: string) {
  return (
    pathname === "/recipes/new" ||
    pathname === "/ingredients/new" ||
    pathname === "/meal-plans/add-meal" ||
    /^\/recipes\/[^/]+\/edit$/.test(pathname) ||
    /^\/ingredients\/[^/]+\/edit$/.test(pathname)
  );
}

function AddMealRightSlot() {
  const params = useSearchParams();
  const date = params?.get("date");
  const person = params?.get("person");
  if (!date) return null;
  const d = new Date(date + "T00:00:00");
  const dStr = d
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase();
  return (
    <span className="mob-topbar-status">
      {dStr}{person ? ` · ${person.toUpperCase()}` : ""}
    </span>
  );
}

export default function MobileTopBar() {
  const pathname = usePathname();
  const router = useRouter();
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

  const isBack = isBackPage(pathname);
  const isAddMeal = pathname === "/meal-plans/add-meal";

  const handleSignOut = async () => {
    const confirmed = await dialog.confirm({
      title: "Sign out?",
      body: "You'll need to sign in again to access your data.",
      confirmLabel: "SIGN OUT",
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
      <header className="mob-topbar">
        <div className="mob-topbar-left">
          {isBack ? (
            <button
              className="mob-topbar-back"
              onClick={() => router.back()}
              aria-label="Go back"
            >
              ← BACK
            </button>
          ) : (
            <Link href="/home" className="mob-topbar-wordmark">
              <BrandName />
            </Link>
          )}
        </div>
        <div className="mob-topbar-right">
          {isAddMeal ? (
            <Suspense fallback={null}>
              <AddMealRightSlot />
            </Suspense>
          ) : (
            <>
              {pathname === "/home" && <PersonPulldown />}
              <button
                className="mob-topbar-trigger"
                onClick={() => setMenuOpen(true)}
                aria-expanded={menuOpen}
                aria-haspopup="dialog"
                aria-label="Open menu"
              >
                <svg viewBox="0 0 18 12" width="18" height="12" aria-hidden="true">
                  <line x1="0" y1="1"  x2="18" y2="1"  stroke="currentColor" strokeWidth="1"/>
                  <line x1="0" y1="6"  x2="18" y2="6"  stroke="currentColor" strokeWidth="1"/>
                  <line x1="0" y1="11" x2="18" y2="11" stroke="currentColor" strokeWidth="1"/>
                </svg>
              </button>
            </>
          )}
        </div>
      </header>

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
              {SECTIONS.map(s => (
                <Link
                  key={s.href}
                  href={s.href}
                  className={`mob-menu-item${isActive(s.href, pathname) ? " mob-menu-item--active" : ""}`}
                  aria-current={isActive(s.href, pathname) ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {s.label}
                </Link>
              ))}
            </nav>
            <button className="mob-menu-signout" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
