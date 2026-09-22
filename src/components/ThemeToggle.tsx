import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Check, Moon, Palette, RotateCcw, SlidersHorizontal, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { buildTokens, type CustomTheme, type ThemePresetKey, THEME_PRESETS, useTheme } from "@/context/ThemeContext";

const DEFAULT_CUSTOM: CustomTheme = { primary: "#3b82a6", secondary: "#68a58e", background: "#151a20", card: "#1e252d", border: "#35404a", mode: "dark", angle: 135 };
const COLOR_FIELDS: Array<[keyof Pick<CustomTheme, "primary" | "secondary" | "background" | "card" | "border">, string]> = [
  ["primary", "Primary accent color"],
  ["secondary", "Gradient end color"],
  ["background", "Background base"],
  ["card", "Card surface tone"],
  ["border", "Border tone"],
];

function presetAsCustom(key: ThemePresetKey): CustomTheme {
  const t = THEME_PRESETS[key].tokens;
  return { primary: t.primary, secondary: t.secondary, background: t.background, card: t.card, border: t.border, mode: t.mode, angle: t.angle };
}

export default function ThemeToggle() {
  const { preference, mode, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [basedOn, setBasedOn] = useState<string | null>(null);
  const [seed, setSeed] = useState<CustomTheme>(DEFAULT_CUSTOM);
  const [custom, setCustom] = useState<CustomTheme>(typeof preference === "object" ? preference : DEFAULT_CUSTOM);

  useEffect(() => {
    if (typeof preference === "object") setCustom(preference);
  }, [preference]);

  const openCustom = (seed: CustomTheme, label: string | null) => {
    setCustom(seed);
    setSeed(seed);
    setBasedOn(label);
    setMenuOpen(false);
    setOpen(true);
  };

  const choosePreset = async (key: ThemePresetKey) => {
    try { await setTheme(key); } catch { /* local preference remains active */ }
  };

  const saveCustom = async () => {
    setSaving(true);
    try { await setTheme(custom); } catch { /* local preference remains active */ }
    finally { setSaving(false); setOpen(false); }
  };

  const tokens = useMemo(() => buildTokens(custom), [custom]);

  const previewStyle = {
    "--preview-primary": tokens.primary,
    "--preview-secondary": tokens.secondary,
    "--preview-background": tokens.background,
    "--preview-card": tokens.card,
    "--preview-surface-2": tokens.muted,
    "--preview-border": tokens.border,
    "--preview-text": tokens.foreground,
    "--preview-muted-text": tokens.mutedForeground,
    "--preview-primary-text": tokens.primaryForeground,
    "--preview-angle": `${tokens.angle}deg`,
  } as CSSProperties;

  return <>
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Choose color theme" title="Choose color theme" className="theme-trigger">
          {mode === "dark" ? <Moon /> : <Sun />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="theme-menu">
        <DropdownMenuLabel className="theme-menu-label"><Palette /> Display theme</DropdownMenuLabel>
        {Object.entries(THEME_PRESETS).map(([key, preset]) => <DropdownMenuItem
          key={key}
          onSelect={() => choosePreset(key as ThemePresetKey)}
          className="theme-option"
        >
          <span className="theme-swatches" aria-hidden="true" style={{ "--swatch-a": preset.tokens.primary, "--swatch-b": preset.tokens.secondary } as CSSProperties}><i/><i/><i/></span>
          <span className="theme-option-copy"><strong>{preset.label}</strong><small>{preset.description}</small></span>
          <span className="theme-option-actions">
            {preference === key && <Check className="theme-check"/>}
            <button
              type="button"
              className="theme-edit-btn"
              title={`Customize ${preset.label}`}
              aria-label={`Customize ${preset.label}`}
              onClick={(event) => { event.preventDefault(); event.stopPropagation(); openCustom(presetAsCustom(key as ThemePresetKey), preset.label); }}
            ><SlidersHorizontal /></button>
          </span>
        </DropdownMenuItem>)}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(event) => { event.preventDefault(); openCustom(typeof preference === "object" ? preference : DEFAULT_CUSTOM, null); }} className="theme-custom-option"><SlidersHorizontal /> Custom Theme…</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="theme-dialog">
        <DialogHeader>
          <DialogTitle>{basedOn ? `Customize ${basedOn}` : "Custom Theme"}</DialogTitle>
          <DialogDescription>Changes show in the mini preview below only. Nothing changes on the app until you press Apply theme. Text tones are auto-adjusted to stay readable.</DialogDescription>
        </DialogHeader>
        <div className="theme-mode-row"><div><Label htmlFor="theme-mode">Background mode</Label><p>{custom.mode === "dark" ? "Dark surfaces" : "Light surfaces"}</p></div><Switch id="theme-mode" checked={custom.mode === "dark"} onCheckedChange={(checked) => setCustom((value) => ({ ...value, mode: checked ? "dark" : "light" }))}/></div>
        <div className="theme-color-grid">
          {COLOR_FIELDS.map(([field, label]) => <Label className="theme-color-field" key={field}><span>{label}</span><span className="theme-color-control"><Input type="color" value={custom[field]} onChange={(event) => setCustom((value) => ({ ...value, [field]: event.target.value }))}/><code>{custom[field]}</code></span></Label>)}
        </div>
        <Label className="theme-angle-field"><span>Gradient direction</span><span><Input type="range" min="0" max="180" step="5" value={custom.angle} onChange={(event) => setCustom((value) => ({ ...value, angle: Number(event.target.value) }))}/><code>{custom.angle}°</code></span></Label>
        <div className="theme-preview" style={previewStyle}>
          <span>LIVE PREVIEW</span>
          <div>
            <small>PLANT STATUS</small>
            <h3>Shift overview</h3>
            <p>Work orders and equipment health at a glance.</p>
            <div className="theme-preview-chips"><em>12 open</em><em>3 overdue</em></div>
            <b>Review jobs</b>
          </div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={() => setCustom(seed)}><RotateCcw/>Reset</Button><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={saveCustom} disabled={saving}>{saving ? "Saving…" : "Apply theme"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
