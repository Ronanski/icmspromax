import React, { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export function ThemeToggle() {
  // 1. Kumuha ng initial theme nang direkta mula sa localStorage
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("app-theme") as Theme) || "system";
    }
    return "system";
  });

  // 2. Patakbuhin ang pagpapalit ng class sa HTML document root nang direkta
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  // 3. Makinig sa system changes kung naka-system mode
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(mediaQuery.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value as Theme;
    setThemeState(newTheme);
    localStorage.setItem("app-theme", newTheme);
  };

  return (
    <div className="flex items-center gap-2" style={{ padding: "4px" }}>
      <label htmlFor="theme-select" className="text-sm font-medium text-foreground">
        Theme:
      </label>
      <select
        id="theme-select"
        value={theme}
        onChange={handleThemeChange}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer text-foreground"
        style={{
          border: "1px solid var(--border, #ccc)",
          background: "var(--background, #fff)",
          color: "var(--foreground, #000)",
          borderRadius: "6px",
          padding: "4px 8px"
        }}
      >
        <option value="light">☀️ Light</option>
        <option value="dark">🌙 Dark</option>
        <option value="system">💻 System</option>
      </select>
    </div>
  );
}
