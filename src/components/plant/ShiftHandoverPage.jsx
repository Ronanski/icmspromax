import db from '@/lib/db';

import React, { useState, useEffect } from 'react';
import { Download, Plus, Trash2, Edit2, Loader2, CheckCircle2, ClipboardSignature, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { today, safeFormatDate, SHIFTS, PLANT_STATUSES, exportHandoverCSV } from '@/components/plant/plantUtils';

const blank = () => ({
  log_date: today(), shift: 'Day', plant_status: 'Normal',
  outgoing_supervisor: '', incoming_supervisor: '',
  active_alerts: '', ongoing_work: '', pending_actions: '', remarks: '',
});

// Shift Handover Log — operators pass alerts, ongoing work and plant status to the next shift.
export default function ShiftHandoverPage({ workspace, orders = [], profileName }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    if (!workspace?.id) return;
    setLoading(true);
    try {
      const r = await db.entities.ShiftHandover.filter({ workspace_id: workspace.id }, '-log_date', 200);
      setLogs(r);
    } catch (e) {
      toast({ title: 'Could not load handovers', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [workspace?.id]);

  const openNew = () => {
    const active = orders.filter(j => ['Open', 'In-Progress', 'Pending Parts'].includes(j.status));
    setForm({
      ...blank(),
      outgoing_supervisor: profileName || '',
      shift: workspace?.shift || 'Day',
      ongoing_work: active.slice(0, 20).map(j => `${j.wo_number || 'No WO'} — ${j.description || ''} (${j.status})`).join('\n'),
      active_alerts: active.filter(j => j.priority === 'Critical').map(j => `CRITICAL: ${j.wo_number || ''} ${j.description || ''}`).join('\n'),
    });
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.log_date) { toast({ title: 'Pick a date', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const { id, ...values } = form;
      if (id) await db.entities.ShiftHandover.update(id, values);
      else await db.entities.ShiftHandover.create({ ...values, workspace_id: workspace.id, owner_id: workspace.owner_id });
      toast({ title: id ? 'Handover updated' : 'Handover logged', description: `${values.shift} shift · ${values.log_date}` });
      setForm(null);
      await load();
    } catch (e) { toast({ title: 'Save failed', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const acknowledge = async (log) => {
    try {
      await db.entities.ShiftHandover.update(log.id, { acknowledged: true, acknowledged_at: new Date().toISOString() });
      toast({ title: 'Handover acknowledged', description: `${log.shift} shift · ${log.log_date}` });
      await load();
    } catch (e) { toast({ title: 'Acknowledge failed', description: e.message, variant: 'destructive' }); }
  };

  const remove = async (log) => {
    try {
      await db.entities.ShiftHandover.delete(log.id);
      toast({ title: 'Handover deleted' });
      await load();
    } catch (e) { toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }); }
  };

  const runExport = () => {
    const n = exportHandoverCSV(logs);
    if (n) toast({ title: 'Handover log exported', description: `${n} row${n === 1 ? '' : 's'} downloaded.` });
    else toast({ title: 'Nothing to export', description: 'No handover entries yet.', variant: 'destructive' });
  };

  return <>
    <div className="page-header">
      <div><h1>Shift Handover Log</h1><p>Pass active alerts, ongoing work orders and plant status to the next shift.</p></div>
      <div className="page-actions">
        <button className="secondary-button" onClick={runExport} disabled={!logs.length}><Download size={16}/>Export CSV</button>
        <button className="primary-button" onClick={openNew}><Plus size={16}/>New handover</button>
      </div>
    </div>

    {form && <div className="panel handover-form">
      <div className="panel-heading">
        <h3><span className="section-indicator"/>{form.id ? 'Edit handover' : 'New shift handover'}</h3>
        <button className="icon-button" onClick={() => setForm(null)} aria-label="Close"><X size={16}/></button>
      </div>
      <div className="handover-grid">
        <label className="form-field">Date<input type="date" value={form.log_date} onChange={e => set('log_date', e.target.value)}/></label>
        <label className="form-field">Shift<select value={form.shift} onChange={e => set('shift', e.target.value)}>{SHIFTS.map(s => <option key={s}>{s}</option>)}</select></label>
        <label className="form-field">Plant status<select value={form.plant_status} onChange={e => set('plant_status', e.target.value)}>{PLANT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></label>
        <label className="form-field">Outgoing supervisor<input value={form.outgoing_supervisor} onChange={e => set('outgoing_supervisor', e.target.value)} placeholder="Name"/></label>
        <label className="form-field">Incoming supervisor<input value={form.incoming_supervisor} onChange={e => set('incoming_supervisor', e.target.value)} placeholder="Name"/></label>
      </div>
      <label className="form-field">Active alerts<textarea rows={3} value={form.active_alerts} onChange={e => set('active_alerts', e.target.value)} placeholder="Trips, alarms, abnormal conditions…"/></label>
      <label className="form-field">Ongoing work orders<textarea rows={4} value={form.ongoing_work} onChange={e => set('ongoing_work', e.target.value)}/></label>
      <label className="form-field">Pending actions for next shift<textarea rows={3} value={form.pending_actions} onChange={e => set('pending_actions', e.target.value)}/></label>
      <label className="form-field">Remarks<textarea rows={2} value={form.remarks} onChange={e => set('remarks', e.target.value)}/></label>
      <div className="handover-actions">
        <button className="secondary-button" onClick={() => setForm(null)}>Cancel</button>
        <button className="primary-button" onClick={save} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin"/> : <ClipboardSignature size={16}/>}Save handover</button>
      </div>
    </div>}

    {loading ? <div className="empty-state"><Loader2 size={26} className="animate-spin"/><p>Loading handover log…</p></div>
      : logs.length ? <div className="handover-list">{logs.map(l => (
        <div key={l.id} className={`handover-card${l.acknowledged ? ' is-ack' : ''}`}>
          <div className="handover-card-top">
            <div>
              <strong>{safeFormatDate(l.log_date, 'EEE, dd MMM yyyy')} · {l.shift} shift</strong>
              <span className={`handover-status status-${String(l.plant_status || '').toLowerCase()}`}>{l.plant_status}</span>
            </div>
            <div className="handover-card-actions">
              {!l.acknowledged && <button className="secondary-button" onClick={() => acknowledge(l)}><CheckCircle2 size={14}/>Acknowledge</button>}
              <button className="icon-button" onClick={() => setForm({ ...l })} aria-label="Edit"><Edit2 size={14}/></button>
              <button className="icon-button" onClick={() => remove(l)} aria-label="Delete"><Trash2 size={14}/></button>
            </div>
          </div>
          <p className="handover-people">{l.outgoing_supervisor || '—'} → {l.incoming_supervisor || '—'}{l.acknowledged && <span className="ack-pill">Acknowledged</span>}</p>
          {l.active_alerts && <div className="handover-block alert"><span>Active alerts</span><pre>{l.active_alerts}</pre></div>}
          {l.ongoing_work && <div className="handover-block"><span>Ongoing work</span><pre>{l.ongoing_work}</pre></div>}
          {l.pending_actions && <div className="handover-block"><span>Pending actions</span><pre>{l.pending_actions}</pre></div>}
          {l.remarks && <div className="handover-block"><span>Remarks</span><pre>{l.remarks}</pre></div>}
        </div>
      ))}</div>
      : <div className="empty-state"><ClipboardSignature size={32}/><h3>No handovers logged yet</h3><p>Record the plant state at the end of each shift so the next crew starts informed.</p><button className="primary-button" onClick={openNew}><Plus size={16}/>New handover</button></div>}
  </>;
}
