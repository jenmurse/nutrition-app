import Link from "next/link";

export default function Home() {
  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-4xl">
        <div className="bg-background border p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-3">
            Nutrition Tracker
          </h2>
          <p className="text-sm text-muted-foreground mb-2">
            Track your recipes, ingredients, and meal plans to achieve your health goals.
          </p>
          <p className="text-xs text-muted-foreground">
            Start by creating ingredients, building recipes, planning your meals, and setting nutrition goals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Link href="/ingredients" className="block border p-5 hover:bg-muted/40 transition-all">
            <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
              <span>🥕</span> Ingredients
            </h3>
            <p className="text-muted-foreground text-xs">Manage your ingredient database and add nutritional values.</p>
          </Link>

          <Link href="/recipes" className="block border p-5 hover:bg-muted/40 transition-all">
            <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
              <span>📝</span> Recipes
            </h3>
            <p className="text-muted-foreground text-xs">Create recipes from ingredients or import from Pestle App.</p>
          </Link>

          <Link href="/meal-plans" className="block border p-5 hover:bg-muted/40 transition-all">
            <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
              <span>📅</span> Meal Plans
            </h3>
            <p className="text-muted-foreground text-xs">Plan your weekly meals and track nutritional goals.</p>
          </Link>

          <Link href="/settings" className="block border p-5 hover:bg-muted/40 transition-all">
            <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
              <span>⚙️</span> Settings
            </h3>
            <p className="text-muted-foreground text-xs">Set your daily nutrition goals and preferences.</p>
          </Link>
        </div>

        <div className="bg-muted/40 border p-5">
          <h3 className="font-semibold text-sm mb-3">Getting Started</h3>
          <ul className="text-xs text-muted-foreground space-y-2">
            <li>✓ <strong className="text-foreground">Create ingredients:</strong> Add individual foods with their nutritional values</li>
            <li>✓ <strong className="text-foreground">Build recipes:</strong> Combine ingredients to create your favorite dishes</li>
            <li>✓ <strong className="text-foreground">Plan meals:</strong> Organize your week by adding recipes to daily meal slots</li>
            <li>✓ <strong className="text-foreground">Set goals:</strong> Define daily nutrition targets and track your progress</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
