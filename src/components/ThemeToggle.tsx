import { useEffect, useState, type CSSProperties } from "react";
import { Check, Moon, Palette, SlidersHorizontal, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type CustomTheme, type ThemePresetKey, THEME_PRESETS, useTheme } from "@/context/ThemeContext";

const DEFAULT_CUSTOM: CustomTheme = { primary: "#38a7f0", background: "#151a20", card: "#1e252d", border: "#35404a", mode: "dark" };

export default function ThemeToggle() {
  const { preference, mode, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [custom, setCustom] = useState<CustomTheme>(typeof preference === "object" ? preference : DEFAULT_CUSTOM);

  useEffect(() => {
    if (typeof preference === "object") setCustom(preference);
  }, [preference]);

  const choosePreset = async (key: ThemePresetKey) => {
    try { await setTheme(key); } catch { /* local preference remains active */ }
  };

  const saveCustom = async () => {
    setSaving(true);
    try { await setTheme(custom); setOpen(false); } finally { setSaving(false); }
  };

  const previewStyle = {
    "--preview-primary": custom.primary,
    "--preview-background": custom.background,
    "--preview-card": custom.card,
    "--preview-border": custom.border,
    "--preview-text": custom.mode === "dark" ? "#edf4f7" : "#17212b",
  } as CSSProperties;

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Choose color theme" title="Choose color theme" className="theme-trigger">
          {mode === "dark" ? <Moon /> : <Sun />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="theme-menu">
        <DropdownMenuLabel className="theme-menu-label"><Palette /> Display theme</DropdownMenuLabel>
        {Object.entries(THEME_PRESETS).map(([key, preset]) => <DropdownMenuItem key={key} onSelect={() => choosePreset(key as ThemePresetKey)} className="theme-option">
          <span className="theme-swatches" aria-hidden="true"><i style={{ backgroundColor: preset.tokens.background }}/><i style={{ backgroundColor: preset.tokens.card }}/><i style={{ backgroundColor: preset.tokens.primary }}/></span>
          <span className="theme-option-copy"><strong>{preset.label}</strong><small>{preset.description}</small></span>
          {preference === key && <Check className="theme-check"/>}
        </DropdownMenuItem>)}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(event) => { event.preventDefault(); setOpen(true); }} className="theme-custom-option"><SlidersHorizontal /> Custom Theme…</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="theme-dialog">
        <DialogHeader><DialogTitle>Custom Theme</DialogTitle><DialogDescription>Build a comfortable color setup for your shift.</DialogDescription></DialogHeader>
        <div className="theme-mode-row"><div><Label htmlFor="theme-mode">Background mode</Label><p>{custom.mode === "dark" ? "Dark surfaces" : "Light surfaces"}</p></div><Switch id="theme-mode" checked={custom.mode === "dark"} onCheckedChange={(checked) => setCustom((value) => ({ ...value, mode: checked ? "dark" : "light" }))}/></div>
        <div className="theme-color-grid">
          {[
            ["primary", "Primary accent color"],
            ["background", "Background base"],
            ["card", "Card surface tone"],
            ["border", "Border tone"],
          ].map(([field, label]) => <Label className="theme-color-field" key={field}><span>{label}</span><span className="theme-color-control"><Input type="color" value={custom[field as keyof CustomTheme] as string} onChange={(event) => setCustom((value) => ({ ...value, [field]: event.target.value }))}/><code>{custom[field as keyof CustomTheme]}</code></span></Label>)}
        </div>
        <div className="theme-preview" style={previewStyle}>
          <span>LIVE PREVIEW</span><div><small>PLANT STATUS</small><h3>Shift overview</h3><p>Work orders and equipment health at a glance.</p><button type="button">Review jobs</button></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={saveCustom} disabled={saving}>{saving ? "Saving…" : "Apply & Save Theme"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}