"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const SECTIONS = [
  { href: "/home",        label: "Home",     idx: 1 },
  { href: "/meal-plans",  label: "Planner",  idx: 2 },
  { href: "/recipes",     label: "Recipes",  idx: 3 },
  { href: "/ingredients", label: "Pantry",   idx: 4 },
  { href: "/settings",    label: "Settings", idx: null },
];
const TOTAL = 4;
const HIDDEN: Set<string> = new Set(["/", "/login", "/preview", "/onboarding", "/landing"]);

function isActive(href: string, pathname: string) {
  return href === "/home" ? pathname === "/home" : pathname.startsWith(href);
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

  const current = SECTIONS.find(s => isActive(s.href, pathname));
  const indexLabel = current?.idx != null
    ? `${String(current.idx).padStart(2, "0")}/${String(TOTAL).padStart(2, "0")} — ${current.label}`
    : null;

  return (
    <>
      <nav className="bottom-nav" aria-label="Main navigation">
        <button
          className="mob-rail-menu"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
        >
          Menu
        </button>
        {indexLabel && (
          <span className="mob-rail-index" aria-current="page">{indexLabel}</span>
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
                  className={`mob-menu-item${isActive(s.href, pathname) ? " mob-menu-item--active" : ""}`}
                  aria-current={isActive(s.href, pathname) ? "page" : undefined}
                >
                  {s.label}
                </Link>
              ))}
              <Link
                href="/meal-plans?openSheet=shopping"
                className="mob-menu-item"
                onClick={() => setMenuOpen(false)}
              >
                Shopping
              </Link>
              <Link
                href="/meal-plans?openSheet=nutrition"
                className="mob-menu-item mob-menu-item--nutrition"
                onClick={() => setMenuOpen(false)}
              >
                Nutrition
              </Link>
              {SECTIONS.slice(-1).map(s => (
                <Link
                  key={s.href}
                  href={s.href}
                  className={`mob-menu-item${isActive(s.href, pathname) ? " mob-menu-item--active" : ""}`}
                  aria-current={isActive(s.href, pathname) ? "page" : undefined}
                >
                  {s.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
