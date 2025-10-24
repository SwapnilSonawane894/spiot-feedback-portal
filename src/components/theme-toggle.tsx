"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const prefersDark = media.matches;
    const initialTheme = stored || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    setMounted(true);

    // Listen for OS-level theme changes and apply them automatically only
    // when the user hasn't set an explicit site preference (i.e. nothing in localStorage).
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      try {
        const hasStored = !!localStorage.getItem("theme");
        if (hasStored) return; // user's explicit choice takes precedence
        const newTheme = (e as MediaQueryListEvent).matches ? "dark" : "light";
        setTheme(newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
      } catch (err) {
        // ignore errors accessing localStorage in some environments
      }
    };

    // Prefer modern API but fall back for older browsers
    if (typeof media.addEventListener === "function") {
      // @ts-ignore - lib.dom typings vary between environments
      media.addEventListener("change", handleChange);
    } else if (typeof (media as any).addListener === "function") {
      (media as any).addListener(handleChange);
    }

    return () => {
      if (typeof media.removeEventListener === "function") {
        // @ts-ignore
        media.removeEventListener("change", handleChange);
      } else if (typeof (media as any).removeListener === "function") {
        (media as any).removeListener(handleChange);
      }
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  // Render placeholder on server and until mounted on client
  if (!mounted) {
    return (
      <div className="w-10 h-10" suppressHydrationWarning />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200"
      style={{
        background: "transparent",
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = "var(--hover-overlay)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <Moon size={20} style={{ color: "var(--text-secondary)" }} />
      ) : (
        <Sun size={20} style={{ color: "var(--text-secondary)" }} />
      )}
    </button>
  );
}
