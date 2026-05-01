import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { APP_NAME } from "@/lib/brand";
import { SEO } from "@/lib/seo";
import { DM_Sans, DM_Mono, Instrument_Serif } from "next/font/google";

import "./globals.css";
import NumberInputHandler from "./components/NumberInputHandler";
import TopNav from "./components/TopNav";
import MobileTopBar from "./components/MobileTopBar";
import Toaster from "./components/Toaster";
import ConfirmModal from "./components/ConfirmModal";
import CustomCursor from "./components/CustomCursor";
import { PersonProvider } from "./components/PersonContext";

const dmSans = DM_Sans({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["latin"],
  variable: '--font-sans',
});

const dmMono = DM_Mono({
  weight: ['300', '400', '500'],
  subsets: ["latin"],
  variable: '--font-mono',
});

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  style: ['italic'],
  subsets: ["latin"],
  variable: '--serif-display',
});


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",   // required for env(safe-area-inset-*) to work on iOS PWA
};

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
      url:    "/good_measure_OG_image.png",
      width:  1200,
      height: 630,
      alt:    SEO.siteName,
    }],
  },

  // ── Twitter / X ───────────────────────────────────────────────
  twitter: {
    card:        SEO.twitterCard,
    title:       SEO.ogTitle,
    description: SEO.ogDescription,
    images:      ["/good_measure_OG_image.png"],
    ...(SEO.twitterHandle ? { creator: SEO.twitterHandle } : {}),
  },

  // ── Favicon + icons ───────────────────────────────────────────
  icons: {
    icon: "/favicon.svg",
    apple: "/PWA_icon-180x180.png",
  },

  // ── Favicon theme colour (Android Chrome, Safari pinned tab) ──
  themeColor: "#E8E8E8",

  // ── PWA manifest ─────────────────────────────────────────────
  manifest: "/manifest.json",

  // ── Apple PWA ─────────────────────────────────────────────────
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },

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
      <body className={`${dmSans.variable} ${dmMono.variable} ${instrumentSerif.variable} font-sans h-screen overflow-hidden`} style={{ height: '100dvh' }}>
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
            <Suspense>
              <MobileTopBar />
            </Suspense>

            {/* Main Content Area — overflow-hidden so each page manages its own scroll panes */}
            <main className="app-main flex-1 overflow-hidden">
              {children}
            </main>
          </div>
        </PersonProvider>
        <CustomCursor />
      </body>
    </html>
  );
}
