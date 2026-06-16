// Planner week grid: meal-type rows × day columns with per-day totals.
// Used by scn02 (via PlannerZoom, mode prop) and scn03 (days prop directly).

import { Fragment } from "react";
import { MEAL_TYPES, week, type PlannerDay } from "../week";

export default function Planner({
  mode,
  days: daysProp,
  focus = false,
  dateRange = "Mar 16–22",
}: {
  mode?: "off" | "applied";
  days?: PlannerDay[];
  focus?: boolean;
  dateRange?: string;
}) {
  const rawDays = daysProp ?? week(mode ?? "off");
  const days = focus ? rawDays.slice(1, 4) : rawDays;

  return (
    <div className={`pl${focus ? " pl--focus" : ""}`}>
      <div className="pl-toolbar">
        <span className="pl-range">{dateRange}</span>
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
                {d.meals[ri] === "Eating out" ? (
                  <span className="pl-meal pl-meal--out">Eating out</span>
                ) : d.meals[ri] ? (
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
