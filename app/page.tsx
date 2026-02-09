import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-4">
          Welcome to Your Nutrition Tracker
        </h2>
        <p className="text-slate-600 mb-8">
          Track your recipes, ingredients, and meal plans to achieve your
          health goals.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 container">
          <Link href="/ingredients" className="block border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow card">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">📋 Ingredients</h3>
            <p className="text-slate-600">Manage your ingredient database and add nutritional values.</p>
          </Link>

          <Link href="/recipes" className="block border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow card">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">🍳 Recipes</h3>
            <p className="text-slate-600">Create recipes from ingredients or import from Pestle App.</p>
          </Link>

          <Link href="/meal-plans" className="block border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow card">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">📅 Meal Plans</h3>
            <p className="text-slate-600">Plan your weekly meals and track nutritional goals.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
