import React, { useEffect, useState } from 'react';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { api, errorText } from '@/components/plant/plantUtils';

export default function EditableAppTitle({ workspace, admin, onSaved, compact = false }) {
  const appName = workspace?.app_name || 'LPDSI Limay 1';
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(appName);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!editing) setValue(appName); }, [appName, editing]);

  const cancel = () => { setValue(appName); setEditing(false); };
  const save = async () => {
    const next = value.trim();
    if (!next) { toast({ title: 'Enter an application title', variant: 'destructive' }); return; }
    if (next === appName) { setEditing(false); return; }
    setBusy(true);
    try {
      await api('settings', {
        workspace_id: workspace.id,
        data: {
          name: workspace.name,
          app_name: next,
          clock_format: workspace.clock_format || '12',
          plant: workspace.plant || '',
          member_emails: workspace.member_emails || [],
          designation: workspace.designation || '',
          plant_role: workspace.plant_role || '',
          shift: workspace.shift || '',
        },
      });
      await onSaved();
      setEditing(false);
      toast({ title: 'Application title updated' });
    } catch (error) {
      toast({ title: 'Title update failed', description: errorText(error), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  if (!admin) return <strong className="editable-app-title-text">{appName}</strong>;
  if (!editing) return (
    <span className={`editable-app-title${compact ? ' compact' : ''}`}>
      <strong className="editable-app-title-text">{appName}</strong>
      <Button type="button" variant="ghost" size="icon" className="title-edit-button" onClick={() => setEditing(true)} aria-label="Edit application title" title="Edit application title"><Pencil /></Button>
    </span>
  );
  return (
    <span className={`editable-app-title editing${compact ? ' compact' : ''}`}>
      <input autoFocus maxLength={80} value={value} onChange={event => setValue(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') save(); if (event.key === 'Escape') cancel(); }} aria-label="Application title" />
      <Button type="button" variant="ghost" size="icon" className="title-edit-button" onClick={save} disabled={busy} aria-label="Save application title">{busy ? <Loader2 className="animate-spin" /> : <Check />}</Button>
      <Button type="button" variant="ghost" size="icon" className="title-edit-button" onClick={cancel} disabled={busy} aria-label="Cancel title editing"><X /></Button>
    </span>
  );
}