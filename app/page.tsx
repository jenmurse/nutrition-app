import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-4">
          Welcome to Your Nutrition Tracker
        </h2>
        <p className="text-slate-600 mb-2">
          Track your recipes, ingredients, and meal plans to achieve your health goals.
        </p>
        <p className="text-sm text-slate-500">
          Start by creating ingredients, building recipes, planning your meals, and setting nutrition goals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/ingredients" className="block border border-slate-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-300 transition-all card">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">📋 Ingredients</h3>
          <p className="text-slate-600 text-sm">Manage your ingredient database and add nutritional values.</p>
        </Link>

        <Link href="/recipes" className="block border border-slate-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-300 transition-all card">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">🍳 Recipes</h3>
          <p className="text-slate-600 text-sm">Create recipes from ingredients or import from Pestle App.</p>
        </Link>

        <Link href="/meal-plans" className="block border border-slate-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-300 transition-all card">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">📅 Meal Plans</h3>
          <p className="text-slate-600 text-sm">Plan your weekly meals and track nutritional goals.</p>
        </Link>

        <Link href="/settings" className="block border border-slate-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-300 transition-all card">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">⚙️ Settings</h3>
          <p className="text-slate-600 text-sm">Set your daily nutrition goals and preferences.</p>
        </Link>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Getting Started</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>✓ <strong>Create ingredients:</strong> Add individual foods with their nutritional values</li>
          <li>✓ <strong>Build recipes:</strong> Combine ingredients to create your favorite dishes</li>
          <li>✓ <strong>Plan meals:</strong> Organize your week by adding recipes to daily meal slots</li>
          <li>✓ <strong>Set goals:</strong> Define daily nutrition targets and track your progress</li>
        </ul>
      </div>
    </div>
  );
}
