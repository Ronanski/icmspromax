import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import supabase from "@/lib/supabaseClient";

export type ThemeMode = "light" | "dark";
export type ThemePresetKey = "light" | "dark" | "midnight" | "emerald" | "amber" | "nordic";
export type CustomTheme = {
  primary: string;
  secondary: string;
  background: string;
  card: string;
  border: string;
  mode: ThemeMode;
  angle: number;
};
export type ThemePreference = ThemePresetKey | CustomTheme;

type ThemeContextValue = {
  /** The saved preference. */
  preference: ThemePreference;
  /** What is currently painted on screen (preview or saved preference). */
  active: ThemePreference;
  mode: ThemeMode;
  setTheme: (preference: ThemePreference) => Promise<void>;
  /** Paint a theme without saving it. Pass null to go back to the saved one. */
  previewTheme: (preference: ThemePreference | null) => void;
};

type ThemeTokens = CustomTheme & {
  foreground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  primaryForeground: string;
  sidebar: string;
  secondary: string;
  angle: number;
};

const STORAGE_KEY = "plant-theme-preference";
const LEGACY_STORAGE_KEY = "plant-theme";

type PresetSeed = Omit<CustomTheme, never> & { label: string; description: string };

const PRESET_SEEDS: Record<ThemePresetKey, PresetSeed> = {
  light: {
    label: "Light",
    description: "Clean slate and crisp contrast",
    mode: "light", primary: "#2477c9", secondary: "#6aa9a0", angle: 135, background: "#f4f7f9", card: "#ffffff", border: "#d9e1e6",
  },
  dark: {
    label: "Dark",
    description: "Deep zinc with soft cyan accents",
    mode: "dark", primary: "#65a8d9", secondary: "#64a594", angle: 135, background: "#151a20", card: "#1e252d", border: "#35404a",
  },
  midnight: {
    label: "Midnight Navy",
    description: "Icy blue for night-shift viewing",
    mode: "dark", primary: "#72b7ff", secondary: "#8d91cf", angle: 140, background: "#0b1329", card: "#111d38", border: "#2b3f63",
  },
  emerald: {
    label: "Emerald Industrial",
    description: "Calm graphite and muted green",
    mode: "dark", primary: "#52c78c", secondary: "#5aa8a8", angle: 135, background: "#101815", card: "#17221d", border: "#30463b",
  },
  amber: {
    label: "Warm Amber Slate",
    description: "Low-blue-light, reduced eye fatigue",
    mode: "dark", primary: "#d9a756", secondary: "#b97859", angle: 140, background: "#191816", card: "#24221e", border: "#494238",
  },
  nordic: {
    label: "Nordic Paper",
    description: "Soft warm paper, easy daytime reading",
    mode: "light", primary: "#3a6f8f", secondary: "#8a7f6a", angle: 130, background: "#f6f3ec", card: "#fffdf8", border: "#e0d9cb",
  },
};

/* ---------- colour maths (contrast-aware, keeps text legible) ---------- */

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const validHex = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

function toRgb(hex: string) {
  const raw = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16)) as [number, number, number];
}

function toHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

function luminance(hex: string) {
  const [r, g, b] = toRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function mixHex(a: string, b: string, amount: number) {
  const [ar, ag, ab] = toRgb(a);
  const [br, bg, bb] = toRgb(b);
  return toHex([ar + (br - ar) * amount, ag + (bg - ag) * amount, ab + (bb - ab) * amount]);
}

/** Nudge `color` toward black or white until it clears `target` contrast on `bg`. */
function ensureContrast(color: string, bg: string, target: number, direction?: string) {
  const towards = direction ?? (luminance(bg) > 0.45 ? "#000000" : "#ffffff");
  let result = color;
  for (let step = 0; step <= 20 && contrast(result, bg) < target; step += 1) {
    result = mixHex(result, towards, 0.05 + step * 0.01);
  }
  return result;
}

function hexToHsl(hex: string) {
  const [r, g, b] = toRgb(hex).map((c) => c / 255) as [number, number, number];
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

/** Derive a full, readable token set from any five base colours. */
export function buildTokens(theme: CustomTheme): ThemeTokens {
  const light = theme.mode === "light";
  const surface = theme.card;
  const inkSeed = light ? "#16202a" : "#eef5f9";
  // Body text: at least 8:1 against the card surface.
  const foreground = ensureContrast(inkSeed, surface, 8);
  const muted = mixHex(surface, theme.background, light ? 0.5 : 0.4);
  // Secondary text: at least 4.5:1 (WCAG AA) against both surfaces.
  const mutedSeed = mixHex(foreground, muted, 0.45);
  const mutedForeground = ensureContrast(ensureContrast(mutedSeed, muted, 4.6), theme.background, 4.5);
  const accent = mixHex(theme.primary, theme.background, light ? 0.86 : 0.76);
  const onPrimary = contrast("#ffffff", theme.primary) >= contrast("#0b1116", theme.primary) ? "#ffffff" : "#0b1116";
  const primaryForeground = ensureContrast(onPrimary, theme.primary, 4.5, onPrimary);
  const border = contrast(theme.border, theme.background) < 1.12 ? mixHex(theme.border, foreground, 0.16) : theme.border;

  return {
    ...theme,
    border,
    secondary: validHex(theme.secondary) ? theme.secondary : theme.primary,
    foreground,
    muted,
    mutedForeground,
    accent,
    primaryForeground,
    sidebar: mixHex(surface, theme.background, 0.2),
  };
}

export const THEME_PRESETS: Record<ThemePresetKey, { label: string; description: string; tokens: ThemeTokens }> =
  Object.fromEntries(
    Object.entries(PRESET_SEEDS).map(([key, { label, description, ...base }]) => [
      key,
      { label, description, tokens: buildTokens(base) },
    ]),
  ) as Record<ThemePresetKey, { label: string; description: string; tokens: ThemeTokens }>;

export function resolveTokens(preference: ThemePreference): ThemeTokens {
  return typeof preference === "string" ? THEME_PRESETS[preference].tokens : buildTokens(preference);
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function normalizePreference(value: unknown): ThemePreference | null {
  if (typeof value === "string" && value in THEME_PRESETS) return value as ThemePresetKey;
  if (!value || typeof value !== "object") return null;
  const custom = value as Partial<CustomTheme>;
  if (!validHex(custom.primary) || !validHex(custom.background) || !validHex(custom.card) || !validHex(custom.border)) return null;
  if (custom.mode !== "light" && custom.mode !== "dark") return null;
  return {
    primary: custom.primary,
    secondary: validHex(custom.secondary) ? custom.secondary : custom.primary,
    background: custom.background,
    card: custom.card,
    border: custom.border,
    mode: custom.mode,
    angle: typeof custom.angle === "number" ? clamp(custom.angle, 0, 180) : 135,
  };
}

export function applyPreference(preference: ThemePreference) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const tokens = resolveTokens(preference);
  root.classList.toggle("dark", tokens.mode === "dark");
  root.dataset["theme"] = typeof preference === "string" ? preference : "custom";
  root.style.colorScheme = tokens.mode;
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
    "--ink": tokens.foreground, "--ink-2": mixHex(tokens.foreground, tokens.mutedForeground, 0.35),
    "--muted-ink": tokens.mutedForeground,
    "--line": tokens.border, "--line-2": mixHex(tokens.border, tokens.foreground, 0.2),
    "--hover": tokens.accent, "--violet": tokens.primary, "--violet-soft": tokens.accent, "--blue": tokens.primary,
    "--theme-secondary": tokens.secondary,
    "--theme-angle": `${tokens.angle}deg`,
    "--theme-gradient": `linear-gradient(${tokens.angle}deg, ${tokens.primary}, ${tokens.secondary})`,
    "--theme-gradient-soft": `linear-gradient(${tokens.angle}deg, ${mixHex(tokens.primary, tokens.background, 0.82)}, ${mixHex(tokens.secondary, tokens.background, 0.9)})`,
  };
  Object.entries(variables).forEach(([name, value]) => root.style.setProperty(name, value));
}

function readLocalPreference(): ThemePreference {
  try {
    const saved = normalizePreference(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
    if (saved) return saved;
    return localStorage.getItem(LEGACY_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>("light");
  const [preview, setPreview] = useState<ThemePreference | null>(null);
  const previewRef = useRef<ThemePreference | null>(null);
  previewRef.current = preview;

  useEffect(() => {
    applyPreference(preview ?? preference);
  }, [preference, preview]);

  useEffect(() => {
    let active = true;
    const local = readLocalPreference();
    setPreference(local);
    applyPreference(local);
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const remote = normalizePreference(data.user?.user_metadata?.["theme_preference"]);
      if (remote) {
        setPreference(remote);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)); } catch { /* offline storage unavailable */ }
      }
    }).catch(() => { /* offline: local preference stays */ });
    return () => { active = false; };
  }, []);

  const previewTheme = useCallback((next: ThemePreference | null) => {
    setPreview(next ? normalizePreference(next) : null);
  }, []);

  const setTheme = useCallback(async (next: ThemePreference) => {
    const valid = normalizePreference(next);
    if (!valid) return;
    setPreview(null);
    setPreference(valid);
    applyPreference(valid);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(valid)); } catch { /* offline storage unavailable */ }
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const { error } = await supabase.auth.updateUser({ data: { theme_preference: valid } });
      if (error) throw error;
    }
  }, []);

  const active = preview ?? preference;

  const value = useMemo<ThemeContextValue>(() => ({
    preference,
    active,
    mode: typeof active === "string" ? THEME_PRESETS[active].tokens.mode : active.mode,
    setTheme,
    previewTheme,
  }), [preference, active, setTheme, previewTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside a ThemeProvider");
  return context;
}
