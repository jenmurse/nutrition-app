import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { DM_Sans, DM_Mono } from "next/font/google";

import "./globals.css";
import NumberInputHandler from "./components/NumberInputHandler";
import NavigationSidebar from "./components/NavigationSidebar";

/* ═══════════════════════════════════════════════════════════════════════════
   QUIET SURFACE DESIGN SYSTEM — Typography Setup
   DM Sans: Headings, labels, UI text (weights: 300, 400, 500, 600)
   DM Mono: Body text, inputs, code (weights: 300, 400, 500)
   ═══════════════════════════════════════════════════════════════════════════ */

const dmSans = DM_Sans({
  weight: ['300', '400', '500', '600'],
  subsets: ["latin"],
  variable: '--font-sans',
  display: 'swap',
});

const dmMono = DM_Mono({
  weight: ['300', '400', '500'],
  subsets: ["latin"],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Nutrition Tracker",
  description: "Track recipes and meal plans with nutritional values. Built with the Quiet Surface design system.",
  keywords: ["nutrition", "meal planning", "recipes", "health", "diet tracker"],
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className={`${dmSans.variable} ${dmMono.variable} font-mono h-screen overflow-hidden`}
        style={{ 
          fontFamily: 'var(--mono)',
          fontWeight: 300,
          lineHeight: 1.6,
        }}
      >
        {/* Skip Link for Accessibility */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        
        <NumberInputHandler />
        <div className="flex h-screen">
          <Suspense>
            <NavigationSidebar />
          </Suspense>

          {/* Main Content Area */}
          <main id="main-content" className="flex-1 overflow-y-auto bg-[var(--bg)] text-[var(--fg)]">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
