import type { Metadata } from "next";
import { Suspense } from "react";
import { APP_NAME } from "@/lib/brand";
import { SEO } from "@/lib/seo";
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
  // ── Core ──────────────────────────────────────────────────────
  metadataBase: new URL(SEO.siteUrl),
  title: {
    default:  SEO.title,
    template: `%s — ${APP_NAME}`,   // inner pages: "Recipes — Good Measure"
  },
  description: SEO.description,
  applicationName: APP_NAME,

  // ── Open Graph ────────────────────────────────────────────────
  openGraph: {
    type:        "website",
    siteName:    SEO.siteName,
    url:         SEO.siteUrl,
    title:       SEO.ogTitle,
    description: SEO.ogDescription,
    images: [{
      url:    SEO.ogImagePath,
      width:  SEO.ogImageWidth,
      height: SEO.ogImageHeight,
      alt:    SEO.siteName,
    }],
  },

  // ── Twitter / X ───────────────────────────────────────────────
  twitter: {
    card:        SEO.twitterCard,
    title:       SEO.ogTitle,
    description: SEO.ogDescription,
    images:      [SEO.ogImagePath],
    ...(SEO.twitterHandle ? { creator: SEO.twitterHandle } : {}),
  },

  // ── Favicon theme colour (Android Chrome, Safari pinned tab) ──
  themeColor: SEO.brandColor,

  // ── Robots ────────────────────────────────────────────────────
  robots: SEO.allowIndexing
    ? { index: true,  follow: true }
    : { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${dmMono.variable} ${bricolage.variable} font-sans h-screen overflow-hidden`} style={{ height: '100dvh' }}>
        {/* FOUC prevention: apply stored theme synchronously before React hydration */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}` }} />
        <PersonProvider>
          <NumberInputHandler />
          <Toaster />
          <ConfirmModal />
          <div className="flex flex-col h-screen" style={{ height: '100dvh' }}>
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
      </body>
    </html>
  );
}
