/**
 * The curated starter pantry — used both by:
 *   - scripts/seed-global-ingredients.ts (one-time bootstrap of GlobalIngredient)
 *   - lib/pantry-seed.ts (copy into household Ingredient on signup)
 *
 * Each entry has a `name` (the user-facing label saved on Ingredient.name and
 * looked up against GlobalIngredient.name) and a `category` (Ingredient.category).
 */

export type StarterItem = {
  name: string;
  category: string;
};

export const STARTER_PANTRY: StarterItem[] = [
  // ── Proteins ──────────────────────────────────────────────────
  { name: "Chicken breast, raw", category: "Meat & Seafood" },
  { name: "Chicken thigh, raw", category: "Meat & Seafood" },
  { name: "Eggs, whole, large", category: "Dairy & Eggs" },
  { name: "Ground beef, 85% lean", category: "Meat & Seafood" },
  { name: "Pork tenderloin, raw", category: "Meat & Seafood" },
  { name: "Tuna, canned in water", category: "Pantry & Canned" },
  { name: "Shrimp, raw", category: "Meat & Seafood" },
  { name: "Tofu, firm", category: "Pantry & Canned" },
  { name: "Bacon, raw", category: "Meat & Seafood" },

  // ── Dairy ─────────────────────────────────────────────────────
  { name: "Butter, unsalted", category: "Dairy & Eggs" },
  { name: "Milk, 2%", category: "Dairy & Eggs" },
  { name: "Greek yogurt, plain, whole milk", category: "Dairy & Eggs" },
  { name: "Mozzarella cheese", category: "Dairy & Eggs" },
  { name: "Cottage cheese", category: "Dairy & Eggs" },
  { name: "Parmesan", category: "Dairy & Eggs" },

  // ── Grains & starches ─────────────────────────────────────────
  { name: "Brown rice, long-grain, raw", category: "Grains & Pasta" },
  { name: "White rice, long-grain, raw", category: "Grains & Pasta" },
  { name: "Quinoa, raw", category: "Grains & Pasta" },
  { name: "Rolled oats, raw", category: "Grains & Pasta" },
  { name: "Pasta, dry, spaghetti", category: "Grains & Pasta" },
  { name: "All-purpose flour", category: "Baking" },
  { name: "Almond flour", category: "Baking" },

  // ── Bread & wraps ─────────────────────────────────────────────
  { name: "Bread, whole wheat", category: "Bread & Wraps" },
  { name: "Tortilla, flour", category: "Bread & Wraps" },
  { name: "Tortilla, corn", category: "Bread & Wraps" },

  // ── Legumes ───────────────────────────────────────────────────
  { name: "Black beans, dried", category: "Legumes" },
  { name: "Chickpeas, dried", category: "Legumes" },
  { name: "Lentils, brown, dried", category: "Legumes" },
  { name: "Kidney beans, dried", category: "Legumes" },
  { name: "Peanut butter", category: "Pantry & Canned" },
  { name: "Almond butter", category: "Pantry & Canned" },

  // ── Aromatic vegetables ───────────────────────────────────────
  { name: "Yellow onion", category: "Produce" },
  { name: "Garlic", category: "Produce" },
  { name: "Carrot", category: "Produce" },
  { name: "Celery", category: "Produce" },
  { name: "Bell pepper, red", category: "Produce" },
  { name: "Bell pepper, green", category: "Produce" },
  { name: "Onions, spring or scallions, raw", category: "Produce" },
  { name: "Ginger", category: "Produce" },

  // ── Vegetables ────────────────────────────────────────────────
  { name: "Spinach, raw", category: "Produce" },
  { name: "Broccoli, raw", category: "Produce" },
  { name: "Cauliflower, raw", category: "Produce" },
  { name: "Kale, raw", category: "Produce" },
  { name: "Zucchini, raw", category: "Produce" },
  { name: "Mushrooms, white", category: "Produce" },
  { name: "Cucumber", category: "Produce" },
  { name: "Romaine lettuce", category: "Produce" },
  { name: "Tomatoes", category: "Produce" },
  { name: "Sweet potato", category: "Produce" },
  { name: "Russet potato", category: "Produce" },
  { name: "Radish", category: "Produce" },
  { name: "Peas, frozen", category: "Frozen" },
  { name: "Corn, frozen", category: "Frozen" },

  // ── Fruits ────────────────────────────────────────────────────
  { name: "Apple", category: "Produce" },
  { name: "Banana", category: "Produce" },
  { name: "Lemon", category: "Produce" },
  { name: "Lime", category: "Produce" },
  { name: "Orange", category: "Produce" },
  { name: "Avocado", category: "Produce" },
  { name: "Blueberries", category: "Produce" },
  { name: "Strawberries", category: "Produce" },
  { name: "Pear", category: "Produce" },

  // ── Oils & vinegars ───────────────────────────────────────────
  { name: "Olive oil, extra virgin", category: "Oils & Fats" },
  { name: "Canola oil", category: "Oils & Fats" },
  { name: "Coconut oil", category: "Oils & Fats" },
  { name: "Sesame oil", category: "Oils & Fats" },
  { name: "Balsamic vinegar", category: "Pantry & Canned" },
  { name: "Apple cider vinegar", category: "Pantry & Canned" },
  { name: "Rice vinegar", category: "Pantry & Canned" },

  // ── Pantry shelf ──────────────────────────────────────────────
  { name: "Soy sauce", category: "Pantry & Canned" },
  { name: "Tomato paste", category: "Pantry & Canned" },
  { name: "Canned diced tomatoes", category: "Pantry & Canned" },
  { name: "Chicken stock", category: "Pantry & Canned" },
  { name: "Vegetable broth", category: "Pantry & Canned" },
  { name: "Coconut milk, canned", category: "Pantry & Canned" },
  { name: "Dijon mustard", category: "Pantry & Canned" },
  { name: "Mayonnaise", category: "Pantry & Canned" },
  { name: "Tahini", category: "Pantry & Canned" },
  { name: "Ketchup", category: "Pantry & Canned" },
  { name: "Honey", category: "Pantry & Canned" },
  { name: "Maple syrup", category: "Pantry & Canned" },

  // ── Baking ────────────────────────────────────────────────────
  { name: "Sugar, granulated", category: "Baking" },
  { name: "Brown sugar", category: "Baking" },
  { name: "Baking powder", category: "Baking" },
  { name: "Baking soda", category: "Baking" },
  { name: "Vanilla extract", category: "Baking" },
  { name: "Cornstarch", category: "Baking" },
  { name: "Cocoa powder, unsweetened", category: "Baking" },
  { name: "Chocolate chips, semi-sweet", category: "Baking" },

  // ── Nuts & seeds ──────────────────────────────────────────────
  { name: "Almonds, raw", category: "Nuts & Seeds" },
  { name: "Walnuts, raw", category: "Nuts & Seeds" },
  { name: "Peanuts, raw", category: "Nuts & Seeds" },
  { name: "Chia seeds", category: "Nuts & Seeds" },
  { name: "Sesame seeds", category: "Nuts & Seeds" },

  // ── Spices ────────────────────────────────────────────────────
  { name: "Salt, table", category: "Spices & Seasonings" },
  { name: "Black pepper, ground", category: "Spices & Seasonings" },
  { name: "Garlic powder", category: "Spices & Seasonings" },
  { name: "Onion powder", category: "Spices & Seasonings" },
  { name: "Paprika", category: "Spices & Seasonings" },
  { name: "Smoked paprika", category: "Spices & Seasonings" },
  { name: "Cinnamon, ground", category: "Spices & Seasonings" },
  { name: "Cumin", category: "Spices & Seasonings" },
  { name: "Oregano, dried", category: "Spices & Seasonings" },
  { name: "Basil, dried", category: "Spices & Seasonings" },
  { name: "Bay leaves", category: "Spices & Seasonings" },
  { name: "Chili powder", category: "Spices & Seasonings" },
  { name: "Red pepper flakes", category: "Spices & Seasonings" },
  { name: "Turmeric", category: "Spices & Seasonings" },
];
