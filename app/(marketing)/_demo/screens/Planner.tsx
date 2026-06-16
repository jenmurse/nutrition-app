// Scenario 02 states A & D — the REAL planner week grid: meal-type rows × day
// columns with a per-day daily-totals list, the target day highlighted. Between
// "off" and "applied" the target day's meals swap and its totals go red → green.

import { Fragment } from "react";
import { MEAL_TYPES, week } from "../week";

export default function Planner({
  mode,
  focus = false,
}: {
  mode: "off" | "applied";
  focus?: boolean;
}) {
  // Focus mode zooms to the optimized day: a 3-day slice (Mon · Tue · Wed) with
  // the neighbors dimmed, so the single day is the subject but still in context.
  const days = focus ? week(mode).slice(1, 4) : week(mode);

  return (
    <div className={`pl${focus ? " pl--focus" : ""}`}>
      <div className="pl-toolbar">
        <span className="pl-range">Mar 16–22</span>
        <span className="pl-nav">‹ Prev</span>
        <span className="pl-nav">Next ›</span>
        <span className="pl-spacer" />
        <span className="pl-tool">View ▾</span>
        <span className="pl-cta">+ New plan</span>
      </div>

      <div className="pl-grid">
        <div className="pl-corner" />
        {days.map((d) => (
          <div key={d.dow} className={`pl-dayhead${d.target ? " is-target" : ""}`}>
            <span className="pl-dow">{d.dow}</span>
            <span className="pl-date">{d.date}</span>
          </div>
        ))}

        {MEAL_TYPES.map((mt, ri) => (
          <Fragment key={mt}>
            <div className="pl-rowlabel">{mt}</div>
            {days.map((d) => (
              <div key={d.dow + mt} className={`pl-cell${d.target ? " is-target" : ""}`}>
                {d.meals[ri] ? (
                  <span className="pl-meal">
                    {d.meals[ri]}
                    <small>1 serving</small>
                  </span>
                ) : (
                  <span className="pl-add">+ Add</span>
                )}
              </div>
            ))}
          </Fragment>
        ))}

        <div className="pl-rowlabel pl-totlabel">Daily totals</div>
        {days.map((d) => (
          <div key={d.dow + "tot"} className={`pl-totcell${d.target ? " is-target" : ""}`}>
            {d.totals.map((t) => (
              <div key={t.name} className="pl-totrow">
                <span className="pl-totname">{t.name}</span>
                <span className={`pl-totval is-${t.status}`}>
                  {t.value.toLocaleString()}
                  <small>{t.unit}</small>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
