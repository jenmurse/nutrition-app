import Link from "next/link";

const cards = [
  { href: "/ingredients", title: "Ingredients", desc: "Foods with nutritional values per 100g." },
  { href: "/recipes", title: "Recipes", desc: "Build dishes from ingredients or import from Pestle." },
  { href: "/meal-plans", title: "Meal Plans", desc: "Weekly planning with daily nutrition analysis." },
  { href: "/settings", title: "Settings", desc: "Daily min/max targets for each nutrient." },
];

const steps = [
  { label: "Create ingredients", desc: "add foods with per-100g nutrient values" },
  { label: "Build recipes", desc: "combine ingredients into dishes with servings" },
  { label: "Plan meals", desc: "assign recipes to days across a week" },
  { label: "Set goals", desc: "define daily min/max targets per nutrient" },
];

export default function Home() {
  return (
    <div className="flex flex-col h-full">
      {/* Page head */}
      <div className="flex items-baseline justify-between gap-4 px-7 pt-6 pb-5 border-b border-[var(--rule)]" style={{ flexShrink: 0 }}>
        <div className="font-sans text-[16px] font-normal tracking-[-0.01em]">
          Nutrition Tracker
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-7">
          {/* Card grid */}
          <div className="grid grid-cols-2 border border-[var(--rule)] mb-6">
            {cards.map((c, i) => (
              <Link
                key={c.href}
                href={c.href}
                className={`p-5 cursor-pointer hover:bg-[#fafafa] transition-colors no-underline text-inherit ${
                  i < 2 ? 'border-b border-[var(--rule)]' : ''
                } ${i % 2 === 0 ? 'border-r border-[var(--rule)]' : ''}`}
              >
                <div className="text-[9px] text-[var(--muted)] tracking-[0.1em] mb-[10px]">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="font-sans text-[12px] font-medium mb-1">{c.title}</div>
                <div className="text-[10px] text-[var(--muted)] leading-[1.5]">{c.desc}</div>
              </Link>
            ))}
          </div>

          {/* Getting started steps */}
          <div className="border-t border-[var(--rule)]">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`flex items-baseline gap-[14px] py-[9px] text-[11px] text-[var(--muted)] ${
                  i < steps.length - 1 ? 'border-b border-[var(--rule)]' : ''
                }`}
              >
                <span className="text-[9px] tracking-[0.08em] text-[var(--muted)]" style={{ minWidth: 18 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>
                  <strong className="font-normal text-[var(--fg)]">{step.label}</strong> — {step.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
