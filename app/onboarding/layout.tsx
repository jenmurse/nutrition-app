import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#F5F4EF",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-register="editorial" style={{ height: '100%' }}>
      {children}
    </div>
  );
}
