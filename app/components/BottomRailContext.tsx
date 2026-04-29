"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface BottomRailCtx {
  rightSlot: ReactNode | null;
  setRightSlot: (slot: ReactNode | null) => void;
}

const Ctx = createContext<BottomRailCtx>({ rightSlot: null, setRightSlot: () => {} });

export function BottomRailProvider({ children }: { children: ReactNode }) {
  const [rightSlot, setRightSlot] = useState<ReactNode | null>(null);
  return <Ctx.Provider value={{ rightSlot, setRightSlot }}>{children}</Ctx.Provider>;
}

export const useBottomRailSlot = () => useContext(Ctx);
