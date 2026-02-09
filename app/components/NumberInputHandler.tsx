"use client";

import { useEffect } from "react";

/**
 * Prevents scroll wheel from changing number input values
 * This is a global handler that runs on mount
 */
export default function NumberInputHandler() {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Check if the target is a number input
      if ((e.target as HTMLElement).tagName === "INPUT") {
        const input = e.target as HTMLInputElement;
        if (input.type === "number") {
          e.preventDefault();
        }
      }
    };

    // Use capture phase to intercept the event early
    document.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      document.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return null;
}
