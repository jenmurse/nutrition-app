import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

import "./globals.css";
import NumberInputHandler from "./components/NumberInputHandler";
import NavigationSidebar from "./components/NavigationSidebar";
import { ThemeProvider } from "@/components/theme-provider";

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
            <NavigationSidebar />
            
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
