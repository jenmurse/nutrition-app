import type { Metadata } from "next";
import { Suspense } from "react";
import { DM_Sans, DM_Mono } from "next/font/google";

import "./globals.css";
import NumberInputHandler from "./components/NumberInputHandler";
import NavigationSidebar from "./components/NavigationSidebar";

const dmSans = DM_Sans({
  weight: ['300', '400', '500', '600'],
  subsets: ["latin"],
  variable: '--font-sans',
});

const dmMono = DM_Mono({
  weight: ['300', '400', '500'],
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
    <html lang="en">
      <body className={`${dmSans.variable} ${dmMono.variable} font-mono h-screen overflow-hidden`}>
        <NumberInputHandler />
        <div className="flex h-screen">
          <Suspense>
            <NavigationSidebar />
          </Suspense>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
