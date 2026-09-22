import React from "react";
import { useTheme } from "../context/ThemeContext";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="theme-select" className="text-sm font-medium text-foreground">
        Theme:
      </label>
      <select
        id="theme-select"
        value={theme}
        onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer text-foreground"
      >
        <option value="light">☀️ Light</option>
        <option value="dark">🌙 Dark</option>
        <option value="system">💻 System</option>
      </select>
    </div>
  );
}
