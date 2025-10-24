"use client";

import { useEffect } from "react";

/**
 * A tiny global client component that ensures the site follows OS theme
 * changes when the user hasn't explicitly chosen a site theme. We mount
 * this at the application root so listeners are active even when the
 * sidebar (where ThemeToggle lives) isn't rendered.
 */
export default function SystemThemeListener() {
  useEffect(() => {
    try {
      const media = window.matchMedia("(prefers-color-scheme: dark)");

      const applyThemeFromPref = (matches: boolean) => {
        const hasStored = !!localStorage.getItem("theme");
        if (hasStored) return; // explicit user choice wins
        document.documentElement.classList.toggle("dark", matches);
      };

      // Initial apply (only when user hasn't stored a preference)
      applyThemeFromPref(media.matches);

      const handler = (e: MediaQueryListEvent | MediaQueryList) => {
        try {
          applyThemeFromPref((e as MediaQueryListEvent).matches ?? (e as MediaQueryList).matches);
        } catch (err) {
          // ignore
        }
      };

      if (typeof media.addEventListener === "function") {
        // modern
        // @ts-ignore - lib.dom lib versions differ
        media.addEventListener("change", handler);
      } else if (typeof (media as any).addListener === "function") {
        (media as any).addListener(handler);
      }

      return () => {
        if (typeof media.removeEventListener === "function") {
          // @ts-ignore
          media.removeEventListener("change", handler);
        } else if (typeof (media as any).removeListener === "function") {
          (media as any).removeListener(handler);
        }
      };
    } catch (err) {
      // ignore in non-browser environments
    }
  }, []);

  return null;
}
