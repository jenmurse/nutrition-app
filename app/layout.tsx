import type { Metadata } from "next";
import { Suspense } from "react";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { DM_Sans, DM_Mono, Bricolage_Grotesque } from "next/font/google";

import "./globals.css";
import NumberInputHandler from "./components/NumberInputHandler";
import TopNav from "./components/TopNav";
import BottomNav from "./components/BottomNav";
import Toaster from "./components/Toaster";
import ConfirmModal from "./components/ConfirmModal";
import CustomCursor from "./components/CustomCursor";
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

const bricolage = Bricolage_Grotesque({
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  subsets: ["latin"],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: `${APP_TAGLINE} Build better habits.`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${dmMono.variable} ${bricolage.variable} font-sans h-screen overflow-hidden`}>
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

            <Suspense>
              <BottomNav />
            </Suspense>
          </div>
        </PersonProvider>
        <CustomCursor />
        {/* Grain overlay — subtle texture, always on top */}
        <div
          className="fixed inset-0 pointer-events-none z-[9999]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundSize: '200px',
            opacity: 0.022,
            mixBlendMode: 'overlay',
          }}
          aria-hidden="true"
        />
      </body>
    </html>
  );
}
