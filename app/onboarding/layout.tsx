import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: '100%' }}>
      {children}
    </div>
  );
}
