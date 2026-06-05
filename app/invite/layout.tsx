import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#F5F4EF", // cream — match the editorial body bg in iOS safe-area
};

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
