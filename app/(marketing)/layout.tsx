import type { Viewport } from "next";
import MarketingScrollFix from "./_components/MarketingScrollFix";

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingScrollFix />
      {children}
    </>
  );
}
