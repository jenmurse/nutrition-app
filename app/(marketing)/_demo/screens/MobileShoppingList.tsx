// Mobile shopping list — single-column vertical layout.

const GROUPS = [
  {
    name: "Produce",
    items: [
      { qty: "20",  unit: "oz",     name: "Baby spinach",         done: false },
      { qty: "1",   unit: "head",   name: "Cauliflower, large",   done: false },
      { qty: "12",  unit: "cloves", name: "Garlic",               done: false },
      { qty: "3",   unit: "",       name: "Avocado",              done: true  },
      { qty: "6",   unit: "",       name: "Lemons",               done: false },
    ],
  },
  {
    name: "Meat & Seafood",
    items: [
      { qty: "12",  unit: "oz",     name: "Salmon fillet",        done: false },
      { qty: "3",   unit: "oz",     name: "Salmon, smoked",       done: false },
    ],
  },
  {
    name: "Canned & Legumes",
    items: [
      { qty: "14",  unit: "oz",     name: "Firm tofu",            done: false },
      { qty: "1",   unit: "can",    name: "Chickpeas, no-salt",   done: false },
      { qty: "2",   unit: "cups",   name: "Rolled oats",          done: true  },
    ],
  },
  {
    name: "Condiments & Sauces",
    items: [
      { qty: "6",   unit: "tsp",    name: "White miso paste",     done: false },
      { qty: "¼",   unit: "cup",    name: "Tahini",               done: true  },
      { qty: "3",   unit: "tbsp",   name: "Olive oil",            done: false },
    ],
  },
];

export default function MobileShoppingList() {
  return (
    <div className="msl">
      <div className="msl-date">Mar 23–29</div>
      <div className="msl-toprow">
        <h2 className="msl-headline">A week of meals.</h2>
        <div className="msl-actions">
          <span className="msl-action">Hide checked</span>
          <span className="msl-action">Share →</span>
        </div>
      </div>
      <div className="msl-groups">
        {GROUPS.map((g) => (
          <div key={g.name} className="msl-group">
            <div className="msl-grow">
              <div className="msl-gcheck" />
              <span className="msl-gname">{g.name}</span>
              <span className="msl-gcount">{g.items.length}</span>
            </div>
            <div className="msl-grule" />
            {g.items.map((item) => (
              <div key={item.name} className={`msl-item${item.done ? " is-done" : ""}`}>
                <div className="msl-check">
                  {item.done && <span className="msl-check-tick">✓</span>}
                </div>
                <span className="msl-qty">{item.qty}</span>
                <span className="msl-unit">{item.unit}</span>
                <span className="msl-name">{item.name}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
