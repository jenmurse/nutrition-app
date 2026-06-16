// Scenario 03 beat E — shopping list for Mar 23–29. Realistic density: 8 groups,
// 35 items drawn from the week's recipes. Some checked to show shop-as-you-go.

const GROUPS = [
  {
    name: "Produce",
    items: [
      { qty: "20",   unit: "oz",     name: "Baby spinach",         done: false },
      { qty: "1",    unit: "head",   name: "Cauliflower, large",   done: false },
      { qty: "12",   unit: "cloves", name: "Garlic",               done: false },
      { qty: "6",    unit: "",       name: "Lemons",               done: false },
      { qty: "3",    unit: "",       name: "Avocado",              done: true  },
      { qty: "4",    unit: "",       name: "Apple",                done: false },
      { qty: "215",  unit: "g",      name: "Romaine lettuce",      done: true  },
    ],
  },
  {
    name: "Meat & Seafood",
    items: [
      { qty: "12",   unit: "oz",     name: "Salmon fillet",        done: false },
      { qty: "3",    unit: "oz",     name: "Salmon, smoked",       done: false },
    ],
  },
  {
    name: "Dairy & Eggs",
    items: [
      { qty: "9",    unit: "",       name: "Eggs",                 done: false },
      { qty: "2",    unit: "cups",   name: "Greek yogurt",         done: true  },
      { qty: "480",  unit: "ml",     name: "Milk, 2%",             done: false },
      { qty: "1",    unit: "tbsp",   name: "Butter",               done: true  },
    ],
  },
  {
    name: "Canned & Legumes",
    items: [
      { qty: "14",   unit: "oz",     name: "Firm tofu",            done: false },
      { qty: "1",    unit: "can",    name: "Chickpeas, no-salt",   done: false },
      { qty: "2",    unit: "cups",   name: "Rolled oats",          done: true  },
    ],
  },
  {
    name: "Nuts & Seeds",
    items: [
      { qty: "¼",    unit: "cup",    name: "Peanut butter",        done: false },
      { qty: "3",    unit: "tbsp",   name: "Almond butter",        done: false },
      { qty: "3",    unit: "tbsp",   name: "Sesame seeds",         done: false },
      { qty: "¼",    unit: "cup",    name: "Tahini",               done: true  },
    ],
  },
  {
    name: "Condiments & Sauces",
    items: [
      { qty: "6",    unit: "tsp",    name: "White miso paste",     done: false },
      { qty: "2",    unit: "tbsp",   name: "Rice vinegar",         done: false },
      { qty: "0.25", unit: "tsp",    name: "Gochugaru",            done: false },
      { qty: "34",   unit: "g",      name: "Maple syrup",          done: true  },
      { qty: "1",    unit: "tbsp",   name: "Soy sauce, low sodium", done: false },
    ],
  },
  {
    name: "Oils & Fats",
    items: [
      { qty: "3",    unit: "tbsp",   name: "Olive oil",            done: false },
      { qty: "1",    unit: "tbsp",   name: "Sesame oil",           done: false },
      { qty: "1",    unit: "tbsp",   name: "Coconut oil",          done: true  },
    ],
  },
  {
    name: "Baking",
    items: [
      { qty: "¼",    unit: "cup",    name: "Almond flour",         done: false },
      { qty: "0.5",  unit: "tsp",    name: "Vanilla extract",      done: false },
      { qty: "0.25", unit: "tsp",    name: "Baking soda",          done: false },
      { qty: "32",   unit: "g",      name: "Protein powder",       done: true  },
    ],
  },
];

export default function ShoppingList() {
  return (
    <div className="sl">
      <div className="sl-date">Mar 23–29</div>
      <div className="sl-toprow">
        <h2 className="sl-headline">A week of meals.</h2>
        <div className="sl-actions">
          <span className="sl-action">Hide checked</span>
          <span className="sl-action">Share →</span>
        </div>
      </div>
      <div className="sl-cols">
        {GROUPS.map((g) => (
          <div key={g.name} className="sl-group">
            <div className="sl-grow">
              <div className="sl-gcheck" />
              <span className="sl-gname">{g.name}</span>
              <span className="sl-gcount">{g.items.length}</span>
            </div>
            <div className="sl-grule" />
            {g.items.map((item) => (
              <div key={item.name} className={`sl-item${item.done ? " is-done" : ""}`}>
                <div className="sl-check">
                  {item.done && <span className="sl-check-tick">✓</span>}
                </div>
                <span className="sl-qty">{item.qty}</span>
                <span className="sl-unit">{item.unit}</span>
                <span className="sl-name">{item.name}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
