import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

import "./globals.css";
import NumberInputHandler from "./components/NumberInputHandler";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

const ibmPlexSans = IBM_Plex_Sans({ 
  weight: ['400', '500', '600'],
  subsets: ["latin"],
  variable: '--font-sans',
});

const ibmPlexMono = IBM_Plex_Mono({ 
  weight: ['400', '500'],
  subsets: ["latin"],
  variable: '--font-mono',
});

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} font-sans h-screen overflow-hidden bg-background text-foreground antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <NumberInputHandler />
          <div className="flex h-screen">
            {/* Left Sidebar - Navigation */}
            <aside className="flex w-48 flex-col border-r bg-muted/20">
              {/* Logo/Brand */}
              <div className="flex h-14 items-center border-b px-4">
                <Link href="/" className="text-sm font-semibold tracking-tight">
                  Nutrition Tracker
                </Link>
              </div>
              
              {/* Navigation Links */}
              <nav className="flex-1 space-y-1 p-3">
                <Link 
                  href="/ingredients" 
                  className="flex items-center gap-3 rounded px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <span className="text-base">🥕</span>
                  Ingredients
                </Link>
                <Link 
                  href="/recipes" 
                  className="flex items-center gap-3 rounded px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <span className="text-base">📝</span>
                  Recipes
                </Link>
                <Link 
                  href="/meal-plans" 
                  className="flex items-center gap-3 rounded px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <span className="text-base">📅</span>
                  Meal Plans
                </Link>
              </nav>

              {/* Bottom Actions */}
              <div className="border-t p-3 space-y-1">
                <Link 
                  href="/settings" 
                  className="flex items-center gap-3 rounded px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <span className="text-base">⚙️</span>
                  Settings
                </Link>
                <div className="px-3 py-2">
                  <ThemeToggle />
                </div>
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
