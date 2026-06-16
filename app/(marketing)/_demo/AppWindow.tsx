// The recurring "this is Good Measure" container — a floating app window with
// the real top nav as its chrome (no browser chrome). Holds each scenario's
// real screen, so every beat reads unmistakably as the product.

import type { ReactNode } from "react";

const TABS = ["Planner", "Recipes", "Pantry"];

export default function AppWindow({
  active = "Planner",
  children,
}: {
  active?: string;
  children: ReactNode;
}) {
  return (
    <div className="aw">
      <div className="aw-bar">
        <span className="aw-brand">Good Measure</span>
        <nav className="aw-nav">
          {TABS.map((t) => (
            <span key={t} className={`aw-tab${t === active ? " is-on" : ""}`}>
              {t}
            </span>
          ))}
        </nav>
        <span className="aw-right">
          <i className="aw-avatar" />
          <i className="aw-avatar aw-avatar-2" />
        </span>
      </div>
      <div className="aw-body">{children}</div>
    </div>
  );
}
