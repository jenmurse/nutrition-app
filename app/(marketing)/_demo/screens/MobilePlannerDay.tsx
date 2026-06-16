// Mobile day view of the planner — week strip + meal rows + totals card.
// Matches the real app layout: stacked meal rows (type / name / serving + ×),
// NEED MORE? row, and TUE TOTALS footer with large values.

const DAYS_02 = [
  { dow: "Sun", date: 16 }, { dow: "Mon", date: 17 },
  { dow: "Tue", date: 18, target: true }, { dow: "Wed", date: 19 },
  { dow: "Thu", date: 20 }, { dow: "Fri", date: 21 }, { dow: "Sat", date: 22 },
];
const DAYS_03_EMPTY = [
  { dow: "Sun", date: 23 }, { dow: "Mon", date: 24 }, { dow: "Tue", date: 25 },
  { dow: "Wed", date: 26, target: true }, { dow: "Thu", date: 27 },
  { dow: "Fri", date: 28 }, { dow: "Sat", date: 29 },
];

const MEALS_OFF = [
  { type: "Breakfast", name: "Morning Shake – Chocolate Almond Butter" },
  { type: "Lunch",     name: "Lunch Salad w/Salmon" },
  { type: "Dinner",    name: "One-pan Fish & Chickpeas" },
  { type: "Snack",     name: "Black Bean Avocado Brownies" },
  { type: "Dessert",   name: "Tahini Chocolate Chip Cookies" },
];
const MEALS_APPLIED = [
  { type: "Breakfast", name: "Morning Shake – Chocolate Almond Butter" },
  { type: "Lunch",     name: "Lunch Salad w/Salmon" },
  { type: "Dinner",    name: "Rigatoni with Tomato Sauce" },
  { type: "Snack",     name: "Chickpea Chocolate Chip Blondies" },
  { type: "Dessert",   name: "Tahini Chocolate Chip Cookies" },
];
const EMPTY_SLOTS = [
  { type: "Breakfast", removable: false },
  { type: "Lunch",     removable: false },
  { type: "Dinner",    removable: false },
  { type: "Snack",     removable: true  },
  { type: "Dessert",   removable: true  },
];

const MEALS_TEMPLATE = [
  { type: "Breakfast", name: "Weekend Eggs & Avocado" },
  { type: "Lunch",     name: "Lunch Salad w/Salmon" },
  { type: "Dinner",    name: "Sesame Miso Cannellini Beans" },
  { type: "Snack",     name: "Apple & Almond Butter" },
  { type: "Dessert",   name: "Lemon Bars" },
];

type TotalRow = { name: string; value: string; unit: string; status: "ok" | "off" | "neutral" };

const TOTALS_OFF: TotalRow[] = [
  { name: "CAL",   value: "1,564", unit: "",    status: "neutral" },
  { name: "FAT",   value: "80",    unit: "g",   status: "ok"      },
  { name: "SAT F", value: "12",    unit: "g",   status: "neutral" },
  { name: "NA",    value: "1,771", unit: "mg",  status: "neutral" },
  { name: "CARB",  value: "87",    unit: "g",   status: "neutral" },
  { name: "SUGAR", value: "26",    unit: "g",   status: "neutral" },
  { name: "ADD S", value: "2",     unit: "g",   status: "neutral" },
  { name: "PROT",  value: "119",   unit: "g",   status: "ok"      },
  { name: "FIBER", value: "33",    unit: "g",   status: "ok"      },
];
const TOTALS_APPLIED: TotalRow[] = [
  { name: "CAL",   value: "1,820", unit: "",    status: "ok"      },
  { name: "FAT",   value: "68",    unit: "g",   status: "neutral" },
  { name: "SAT F", value: "11",    unit: "g",   status: "neutral" },
  { name: "NA",    value: "960",   unit: "mg",  status: "ok"      },
  { name: "CARB",  value: "94",    unit: "g",   status: "neutral" },
  { name: "SUGAR", value: "22",    unit: "g",   status: "neutral" },
  { name: "ADD S", value: "1",     unit: "g",   status: "neutral" },
  { name: "PROT",  value: "128",   unit: "g",   status: "ok"      },
  { name: "FIBER", value: "38",    unit: "g",   status: "ok"      },
];
const TOTALS_CLEAN: TotalRow[] = [
  { name: "CAL",   value: "1,840", unit: "",    status: "ok"      },
  { name: "FAT",   value: "72",    unit: "g",   status: "neutral" },
  { name: "SAT F", value: "14",    unit: "g",   status: "neutral" },
  { name: "NA",    value: "1,480", unit: "mg",  status: "ok"      },
  { name: "CARB",  value: "122",   unit: "g",   status: "neutral" },
  { name: "SUGAR", value: "26",    unit: "g",   status: "neutral" },
  { name: "ADD S", value: "4",     unit: "g",   status: "neutral" },
  { name: "PROT",  value: "118",   unit: "g",   status: "ok"      },
  { name: "FIBER", value: "32",    unit: "g",   status: "ok"      },
];
const TOTALS_EMPTY: TotalRow[] = [
  { name: "CAL",   value: "—",  unit: "",   status: "neutral" },
  { name: "FAT",   value: "—",  unit: "",   status: "neutral" },
  { name: "SAT F", value: "—",  unit: "",   status: "neutral" },
  { name: "NA",    value: "—",  unit: "",   status: "neutral" },
  { name: "CARB",  value: "—",  unit: "",   status: "neutral" },
  { name: "SUGAR", value: "—",  unit: "",   status: "neutral" },
  { name: "ADD S", value: "—",  unit: "",   status: "neutral" },
  { name: "PROT",  value: "—",  unit: "",   status: "neutral" },
  { name: "FIBER", value: "—",  unit: "",   status: "neutral" },
];

export default function MobilePlannerDay({ mode = "off" }: { mode?: "off" | "applied" | "clean" | "empty" | "template-applied" }) {
  const days = mode === "empty" || mode === "template-applied" ? DAYS_03_EMPTY : DAYS_02;
  const meals = mode === "applied" ? MEALS_APPLIED
    : mode === "clean" || mode === "template-applied" ? MEALS_TEMPLATE
    : mode === "empty" ? []
    : MEALS_OFF;
  const totals = mode === "applied" ? TOTALS_APPLIED
    : mode === "clean" || mode === "template-applied" ? TOTALS_CLEAN
    : mode === "empty" ? TOTALS_EMPTY
    : TOTALS_OFF;
  const targetDay = days.find((d) => d.target);
  const dateRange = mode === "empty" || mode === "template-applied" ? "6/23 – 6/29" : "6/16 – 6/22";
  const totalsLabel = targetDay ? `${targetDay.dow} totals` : "Day totals";

  return (
    <div className="mpl">
      <div className="mpl-toolbar">
        <span className="mpl-range">{dateRange}</span>
        <span className="mpl-nav">‹</span>
        <span className="mpl-nav">›</span>
        <span className="mpl-spacer" />
        <span className="mpl-tool">VIEW</span>
        <span className="mpl-tool">⋯</span>
        <span className="mpl-cta">+ NEW</span>
      </div>

      <div className="mpl-strip">
        {days.map((d) => (
          <div key={d.dow} className={`mpl-day${d.target ? " is-target" : ""}`}>
            <span className="mpl-dow">{d.dow}</span>
            <span className="mpl-date">{d.date}</span>
            <span className="mpl-dot" />
          </div>
        ))}
      </div>

      <div className="mpl-meals">
        {meals.length === 0 ? (
          EMPTY_SLOTS.map((slot) => (
            <div key={slot.type} className="mpl-meal mpl-meal--empty">
              <div className="mpl-meal-body">
                <span className="mpl-mt">{slot.type}</span>
                <span className="mpl-add">+ ADD</span>
              </div>
              {slot.removable && <span className="mpl-remove">×</span>}
            </div>
          ))
        ) : (
          meals.map((m) => (
            <div key={m.type} className="mpl-meal">
              <div className="mpl-meal-body">
                <span className="mpl-mt">{m.type}</span>
                <span className="mpl-mn">{m.name}</span>
                <span className="mpl-serving">1 SERVING</span>
              </div>
              <span className="mpl-remove">×</span>
            </div>
          ))
        )}
        <div className="mpl-more">
          <span className="mpl-more-label">Need more?</span>
          <span className="mpl-more-btn">+ SIDE</span>
          <span className="mpl-more-btn">+ BEVERAGE</span>
        </div>
      </div>

      <div className="mpl-totcard">
        <span className="mpl-tothdr">{totalsLabel}</span>
        <div className="mpl-totgrid">
          {totals.map((t) => (
            <div key={t.name} className="mpl-totcell">
              <span className="mpl-totname">{t.name}</span>
              <span className={`mpl-totval is-${t.status}`}>
                {t.value}{t.unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
