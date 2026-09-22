import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import supabase from "@/lib/supabaseClient";

export type ThemeMode = "light" | "dark";
export type ThemePresetKey = "light" | "dark" | "midnight" | "emerald" | "amber";
export type CustomTheme = {
  primary: string;
  background: string;
  card: string;
  border: string;
  mode: ThemeMode;
};
export type ThemePreference = ThemePresetKey | CustomTheme;

type ThemeContextValue = {
  preference: ThemePreference;
  mode: ThemeMode;
  setTheme: (preference: ThemePreference) => Promise<void>;
};

type ThemeTokens = CustomTheme & {
  foreground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  primaryForeground: string;
  sidebar: string;
};

const STORAGE_KEY = "plant-theme-preference";
const LEGACY_STORAGE_KEY = "plant-theme";

export const THEME_PRESETS: Record<ThemePresetKey, { label: string; description: string; tokens: ThemeTokens }> = {
  light: {
    label: "Light",
    description: "Clean slate and crisp contrast",
    tokens: { mode: "light", primary: "#0a6ed1", background: "#f0f2f5", card: "#ffffff", border: "#d9dce1", foreground: "#1a2733", muted: "#ebeef1", mutedForeground: "#667585", accent: "#e8f1fb", primaryForeground: "#ffffff", sidebar: "#ffffff" },
  },
  dark: {
    label: "Dark",
    description: "Deep zinc with soft cyan accents",
    tokens: { mode: "dark", primary: "#38a7f0", background: "#151a20", card: "#1e252d", border: "#35404a", foreground: "#e6edf3", muted: "#272f38", mutedForeground: "#9aa8b4", accent: "#123b59", primaryForeground: "#06131d", sidebar: "#1e252d" },
  },
  midnight: {
    label: "Midnight Navy",
    description: "Icy blue for night-shift viewing",
    tokens: { mode: "dark", primary: "#72b7ff", background: "#0b1329", card: "#111d38", border: "#283a5d", foreground: "#e8f1ff", muted: "#172642", mutedForeground: "#9fb2cc", accent: "#17385f", primaryForeground: "#07101f", sidebar: "#0e1931" },
  },
  emerald: {
    label: "Emerald Industrial",
    description: "Calm graphite and muted green",
    tokens: { mode: "dark", primary: "#52c78c", background: "#101815", card: "#17221d", border: "#30463b", foreground: "#e1eee7", muted: "#202e27", mutedForeground: "#9db2a7", accent: "#0f291e", primaryForeground: "#07130d", sidebar: "#131d19" },
  },
  amber: {
    label: "Warm Amber Slate",
    description: "Low-blue-light, reduced eye fatigue",
    tokens: { mode: "dark", primary: "#e7a83b", background: "#191816", card: "#24221e", border: "#494238", foreground: "#f1eadf", muted: "#302d28", mutedForeground: "#b9ad9b", accent: "#3d301b", primaryForeground: "#1b1205", sidebar: "#201e1b" },
  },
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const validHex = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

function normalizePreference(value: unknown): ThemePreference | null {
  if (typeof value === "string" && value in THEME_PRESETS) return value as ThemePresetKey;
  if (!value || typeof value !== "object") return null;
  const custom = value as Partial<CustomTheme>;
  if (!validHex(custom.primary) || !validHex(custom.background) || !validHex(custom.card) || !validHex(custom.border)) return null;
  if (custom.mode !== "light" && custom.mode !== "dark") return null;
  return { primary: custom.primary, background: custom.background, card: custom.card, border: custom.border, mode: custom.mode };
}

function hexToHsl(hex: string) {
  const raw = hex.slice(1);
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function mixHex(a: string, b: string, amount: number) {
  const channels = [1, 3, 5].map((start) => {
    const av = parseInt(a.slice(start, start + 2), 16);
    const bv = parseInt(b.slice(start, start + 2), 16);
    return Math.round(av + (bv - av) * amount).toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

function customTokens(theme: CustomTheme): ThemeTokens {
  const light = theme.mode === "light";
  const foreground = light ? "#17212b" : "#edf4f7";
  return {
    ...theme,
    foreground,
    muted: mixHex(theme.card, theme.background, light ? 0.45 : 0.35),
    mutedForeground: light ? "#637181" : "#a4b0b8",
    accent: mixHex(theme.primary, theme.background, light ? 0.86 : 0.72),
    primaryForeground: light ? "#ffffff" : "#07110d",
    sidebar: mixHex(theme.card, theme.background, 0.2),
  };
}

function applyPreference(preference: ThemePreference) {
  const root = document.documentElement;
  const preset = typeof preference === "string" ? THEME_PRESETS[preference] : null;
  const tokens = preset?.tokens ?? customTokens(preference as CustomTheme);
  root.classList.toggle("dark", tokens.mode === "dark");
  root.dataset.theme = typeof preference === "string" ? preference : "custom";
  const variables: Record<string, string> = {
    "--background": hexToHsl(tokens.background), "--foreground": hexToHsl(tokens.foreground),
    "--card": hexToHsl(tokens.card), "--card-foreground": hexToHsl(tokens.foreground),
    "--popover": hexToHsl(tokens.card), "--popover-foreground": hexToHsl(tokens.foreground),
    "--primary": hexToHsl(tokens.primary), "--primary-foreground": hexToHsl(tokens.primaryForeground),
    "--secondary": hexToHsl(tokens.muted), "--secondary-foreground": hexToHsl(tokens.foreground),
    "--muted": hexToHsl(tokens.muted), "--muted-foreground": hexToHsl(tokens.mutedForeground),
    "--accent": hexToHsl(tokens.accent), "--accent-foreground": hexToHsl(tokens.foreground),
    "--border": hexToHsl(tokens.border), "--input": hexToHsl(tokens.border), "--ring": hexToHsl(tokens.primary),
    "--sidebar-background": hexToHsl(tokens.sidebar), "--sidebar-foreground": hexToHsl(tokens.foreground),
    "--sidebar-primary": hexToHsl(tokens.primary), "--sidebar-primary-foreground": hexToHsl(tokens.primaryForeground),
    "--sidebar-accent": hexToHsl(tokens.accent), "--sidebar-accent-foreground": hexToHsl(tokens.foreground),
    "--sidebar-border": hexToHsl(tokens.border), "--sidebar-ring": hexToHsl(tokens.primary),
    "--bg": tokens.background, "--surface": tokens.card, "--surface-2": tokens.muted,
    "--ink": tokens.foreground, "--ink-2": tokens.mutedForeground, "--muted-ink": tokens.mutedForeground,
    "--line": tokens.border, "--line-2": mixHex(tokens.border, tokens.foreground, 0.2),
    "--hover": tokens.accent, "--violet": tokens.primary, "--violet-soft": tokens.accent, "--blue": tokens.primary,
  };
  Object.entries(variables).forEach(([name, value]) => root.style.setProperty(name, value));
}

function readLocalPreference(): ThemePreference {
  try {
    const saved = normalizePreference(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
    if (saved) return saved;
    return localStorage.getItem(LEGACY_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "light";
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(() => readLocalPreference());

  useEffect(() => { applyPreference(preference); }, [preference]);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const remote = normalizePreference(data.user?.user_metadata?.theme_preference);
      if (remote) {
        setPreference(remote);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)); } catch { /* offline storage unavailable */ }
      }
    });
    return () => { active = false; };
  }, []);

  const setTheme = useCallback(async (next: ThemePreference) => {
    const valid = normalizePreference(next);
    if (!valid) return;
    setPreference(valid);
    applyPreference(valid);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(valid)); } catch { /* offline storage unavailable */ }
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const { error } = await supabase.auth.updateUser({ data: { theme_preference: valid } });
      if (error) throw error;
    }
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    preference,
    mode: typeof preference === "string" ? THEME_PRESETS[preference].tokens.mode : preference.mode,
    setTheme,
  }), [preference, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}