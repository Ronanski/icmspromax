import db from '@/lib/db';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Check, Loader2, CalendarCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { useToast } from '@/components/ui/use-toast';
import { safeFormatDate } from '@/components/plant/plantUtils';

// Supervisor Daily Accomplishment Log — full CRUD for a single date.
export default function SupervisorDailyLogModal({ workspace, date, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    if (!workspace?.id || !date) return;
    try {
      const r = await db.entities.SupervisorDailyLog.filter({ workspace_id: workspace.id, log_date: date }, '-updated_date', 100);
      setLogs(r);
    } catch (e) { toast({ title: 'Load failed', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [workspace?.id, date]);

  const add = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await db.entities.SupervisorDailyLog.create({ workspace_id: workspace.id, owner_id: workspace.owner_id, log_date: date, activity_description: text.trim() });
      setText('');
      await load();
    } catch (e) { toast({ title: 'Add failed', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  const saveEdit = async () => {
    if (!editText.trim()) return;
    try {
      await db.entities.SupervisorDailyLog.update(editId, { activity_description: editText.trim() });
      setEditId(null); setEditText('');
      await load();
    } catch (e) { toast({ title: 'Update failed', description: e.message, variant: 'destructive' }); }
  };
  const remove = async id => {
    try { await db.entities.SupervisorDailyLog.delete(id); await load(); }
    catch (e) { toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }); }
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="supervisor-log-dialog">
        <DialogTitle className="flex items-center gap-2"><CalendarCheck size={20} className="text-violet-500"/>Supervisor Daily Accomplishment Log</DialogTitle>
        <DialogDescription>{safeFormatDate(date, 'EEEE, dd MMMM yyyy')}</DialogDescription>
        <div className="todo-input-row">
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Log an accomplishment or activity…"/>
          <button onClick={add} disabled={busy || !text.trim()} aria-label="Add log"><Plus size={15}/></button>
        </div>
        <div className="log-list">
          {loading ? <div className="todo-empty"><Loader2 size={16} className="animate-spin"/></div>
            : logs.length ? logs.map(l => (
              <div key={l.id} className="log-item">
                {editId === l.id ? (
                  <div className="todo-edit">
                    <input value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEdit()} autoFocus/>
                    <button onClick={saveEdit} aria-label="Save"><Check size={14}/></button>
                    <button onClick={() => { setEditId(null); setEditText(''); }} aria-label="Cancel"><X size={14}/></button>
                  </div>
                ) : (
                  <>
                    <span className="log-text">{l.activity_description}</span>
                    <button className="todo-edit-btn" onClick={() => { setEditId(l.id); setEditText(l.activity_description); }} aria-label="Edit"><Edit2 size={13}/></button>
                    <button className="todo-del" onClick={() => remove(l.id)} aria-label="Delete"><Trash2 size={13}/></button>
                  </>
                )}
              </div>
            )) : <div className="todo-empty"><p>No accomplishments logged for this date yet.</p></div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}