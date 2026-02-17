import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import NumberInputHandler from "./components/NumberInputHandler";

export const metadata: Metadata = {
  title: "Nutrition Tracking App",
  description: "Track recipes and meal plans with nutritional values",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <NumberInputHandler />
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-2xl font-semibold text-slate-800">Nutrition Tracker</Link>
            <nav className="flex gap-6">
              <Link href="/" className="text-slate-600 hover:text-slate-900 font-medium transition">Dashboard</Link>
              <Link href="/ingredients" className="text-slate-600 hover:text-slate-900 font-medium transition">Ingredients</Link>
              <Link href="/recipes" className="text-slate-600 hover:text-slate-900 font-medium transition">Recipes</Link>
              <Link href="/meal-plans" className="text-slate-600 hover:text-slate-900 font-medium transition">Meals</Link>
              <Link href="/settings" className="text-slate-600 hover:text-slate-900 font-medium transition">Settings</Link>
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
        {/* Load Tailwind from CDN as a temporary fallback so classes work during dev */}
        <script src="https://cdn.tailwindcss.com"></script>
      </body>
    </html>
  );
}
