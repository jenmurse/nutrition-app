import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#F5F4EF", // cream — match the editorial body bg in iOS safe-area
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-register="editorial" style={{ background: 'var(--bg)', height: '100%' }}>
      {children}
    </div>
  );
}
