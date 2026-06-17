"use client";

import { useEffect } from "react";

/** Reveal hub entrance animations if CSS animation never completes */
export function HubAnimationFallback() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      document.querySelectorAll(".opacity-0-start").forEach((el) => {
        const node = el as HTMLElement;
        if (window.getComputedStyle(node).opacity === "0") {
          node.style.opacity = "1";
          node.style.transform = "none";
        }
      });
    }, 1500);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
