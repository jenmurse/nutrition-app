import type { Metadata } from "next";
import { Suspense } from "react";
import { DM_Sans, DM_Mono, DM_Serif_Display } from "next/font/google";

import "./globals.css";
import NumberInputHandler from "./components/NumberInputHandler";
import TopNav from "./components/TopNav";
import Toaster from "./components/Toaster";
import ConfirmModal from "./components/ConfirmModal";
import { PersonProvider } from "./components/PersonContext";

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

const dmSerifDisplay = DM_Serif_Display({
  weight: ['400'],
  subsets: ["latin"],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: "Course",
  description: "Plan meals, track nutrition, build better habits.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${dmMono.variable} ${dmSerifDisplay.variable} font-sans h-screen overflow-hidden`}>
        {/* FOUC prevention: apply stored theme synchronously before React hydration */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}` }} />
        <PersonProvider>
          <NumberInputHandler />
          <Toaster />
          <ConfirmModal />
          <div className="flex flex-col h-screen">
            <Suspense>
              <TopNav />
            </Suspense>

            {/* Main Content Area — overflow-hidden so each page manages its own scroll panes */}
            <main className="flex-1 overflow-hidden">
              {children}
            </main>
          </div>
        </PersonProvider>
      </body>
    </html>
  );
}
