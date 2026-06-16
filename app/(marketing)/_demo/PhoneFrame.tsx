import type { ReactNode } from "react";

export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="pf">
      <div className="pf-bar">
        <span className="pf-brand">Good Measure</span>
        <span className="pf-person"><span className="pf-dot" />JEN</span>
        <span className="pf-menu">≡</span>
      </div>
      <div className="pf-screen">{children}</div>
    </div>
  );
}
