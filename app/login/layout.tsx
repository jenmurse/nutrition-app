import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', height: '100%' }}>
      {children}
    </div>
  );
}
