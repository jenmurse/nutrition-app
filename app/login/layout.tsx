import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#FFFFFF", // white — match the marketing body bg in iOS safe-area
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-register="marketing" style={{ background: 'var(--bg)', height: '100%' }}>
      {children}
    </div>
  );
}
