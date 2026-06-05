import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#F5F4EF", // cream — match the editorial body bg in iOS safe-area
};

/**
 * Editorial layout wrapper — mirrors the /login layout pattern.
 * The `data-register="editorial"` + explicit cream background on this
 * div mean the cream palette is applied at SSR (no JS race), so iOS
 * Safari's status-bar / notch zone matches from first paint.
 */
export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-register="editorial" style={{ background: 'var(--bg)', height: '100%' }}>
      {children}
    </div>
  );
}
