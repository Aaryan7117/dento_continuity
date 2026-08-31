"use client";

import { Moon, Sun } from "lucide-react";

/**
 * Stateless on purpose. The blocking script in layout.tsx has already put the
 * `dark` class on <html> before first paint, and the icon swap is CSS driven
 * off that class — so there's nothing for React to hydrate and no wrong-icon
 * flash on load.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full no-press ${className}`}
      data-no-press
      style={{
        color: "var(--ink-muted)",
        border: "1px solid var(--line)",
        transition: "color 200ms var(--ease-out), border-color 200ms var(--ease-out)",
      }}
    >
      {/* Both icons stay mounted so the button never resizes; opacity swaps them. */}
      <span className="relative block h-4 w-4">
        <Sun className="theme-icon-sun absolute inset-0 h-4 w-4" />
        <Moon className="theme-icon-moon absolute inset-0 h-4 w-4" />
      </span>
    </button>
  );
}
