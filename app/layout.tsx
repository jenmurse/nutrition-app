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
      <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} font-sans min-h-screen bg-background text-foreground antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <NumberInputHandler />
          <header className="sticky top-0 z-40 bg-muted/60 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-2xl font-semibold">
                Nutrition Tracker
              </Link>
              <div className="flex items-center gap-4">
                <nav className="flex gap-6 text-sm font-medium text-muted-foreground">
                  <Link href="/" className="transition hover:text-foreground">
                    Dashboard
                  </Link>
                  <Link href="/ingredients" className="transition hover:text-foreground">
                    Ingredients
                  </Link>
                  <Link href="/recipes" className="transition hover:text-foreground">
                    Recipes
                  </Link>
                  <Link href="/meal-plans" className="transition hover:text-foreground">
                    Meals
                  </Link>
                  <Link href="/settings" className="transition hover:text-foreground">
                    Settings
                  </Link>
                </nav>
                <ThemeToggle />
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
