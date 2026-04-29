"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface BottomRailCtx {
  rightSlot: ReactNode | null;
  setRightSlot: (slot: ReactNode | null) => void;
  overlayClose: (() => void) | null;
  setOverlayClose: (fn: (() => void) | null) => void;
}

const Ctx = createContext<BottomRailCtx>({
  rightSlot: null, setRightSlot: () => {},
  overlayClose: null, setOverlayClose: () => {},
});

export function BottomRailProvider({ children }: { children: ReactNode }) {
  const [rightSlot, setRightSlot] = useState<ReactNode | null>(null);
  const [overlayClose, setOverlayClose] = useState<(() => void) | null>(null);
  return (
    <Ctx.Provider value={{ rightSlot, setRightSlot, overlayClose, setOverlayClose }}>
      {children}
    </Ctx.Provider>
  );
}

export const useBottomRailSlot = () => useContext(Ctx);
