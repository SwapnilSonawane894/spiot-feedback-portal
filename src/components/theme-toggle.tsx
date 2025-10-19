"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = stored || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    setMounted(true);
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
