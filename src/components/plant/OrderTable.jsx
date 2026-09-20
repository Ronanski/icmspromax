import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, ArrowUpRight, ChevronLeft, ChevronRight, ClipboardList, Trash2, X } from 'lucide-react';
import StatusBadge from '@/components/plant/StatusBadge';
import { aged, api, statuses, errorText, safeFormatDate, effectivePriority, priorityClass, priorityLabel } from '@/components/plant/plantUtils';
import { useToast } from '@/components/ui/use-toast';

const PRI_ORDER = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3, 'Shutdown Item': 4 };

export default function OrderTable({ orders, onOpen, title = 'Work Order Register', limited = false, workspace, admin, onRefresh }) {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState({ key: 'created', dir: 'desc' });
  const [selected, setSelected] = useState(new Set());
  const [massAction, setMassAction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const { toast } = useToast();
  const size = limited ? 5 : 10;

  const sortVal = (j) => {
    const k = sort.key;
    if (k === 'created') return j.created_date || '';
    if (k === 'wonum') return (j.wo_number || '').toLowerCase();
    if (k === 'description') return (j.description || '').toLowerCase();
    if (k === 'unit') return j.unit || '';
    if (k === 'system') return j.system || '';
    if (k === 'priority') return PRI_ORDER[effectivePriority(j)] ?? 5;
    if (k === 'status') return j.status || '';
    if (k === 'target') return j.planned_finish || j.planned_start || '';
    if (k === 'manpower') return (j.technician || '').toLowerCase();
    return '';
  };

  const sorted = [...orders].sort((a, b) => {
    const av = sortVal(a), bv = sortVal(b);
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sort.dir === 'asc' ? cmp : -cmp;
  });
  const dateFiltered = dateFilter
    ? sorted.filter(j => (j.planned_start || '').slice(0, 10) === dateFilter || (j.planned_finish || '').slice(0, 10) === dateFilter)
    : sorted;
  const total = dateFiltered.length;
  const current = Math.min(page, Math.max(0, Math.ceil(total / size) - 1));
  const rows = dateFiltered.slice(current * size, current * size + size);

  const toggleSort = (k) => setSort(p => p.key === k ? { key: k, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' });
  const toggle = id => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => {
    const ids = rows.map(r => r.id);
    if (ids.every(id => selected.has(id))) setSelected(new Set([...selected].filter(id => !ids.includes(id))));
    else setSelected(new Set([...selected, ...ids]));
  };
  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.id));

  const doMassStatus = async () => {
    if (!massAction) return;
    setBusy(true); setError('');
    try {
      await api('massUpdate', { workspace_id: workspace.id, ids: [...selected], status: massAction });
      setSelected(new Set()); setMassAction(''); await onRefresh();
    } catch (e) { const msg = errorText(e); setError(msg); toast({ title: 'Update failed', description: msg, variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  const doMassDelete = async () => {
    if (!confirm(`Delete ${selected.size} work orders? This cannot be undone.`)) return;
    setBusy(true); setError('');
    try {
      await api('massDelete', { workspace_id: workspace.id, ids: [...selected] });
      setSelected(new Set()); await onRefresh();
    } catch (e) { const msg = errorText(e); setError(msg); toast({ title: 'Delete failed', description: msg, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const Th = ({ k, label }) => (
    <th>
      <button onClick={() => toggleSort(k)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'inherit', fontSize: '10px', letterSpacing: '.5px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
        {label}{sort.key === k ? (sort.dir === 'asc' ? <ArrowUp size={11}/> : <ArrowDown size={11}/>) : <ArrowUpDown size={11} style={{ opacity: .4 }}/>}
      </button>
    </th>
  );

  return (
    <section className="panel order-panel">
      <div className="panel-heading">
        <div className="flex items-center gap-2"><h3>{title}</h3><span className="count-badge">{orders.length}</span></div>
        <span className="tiny-label">LIVE WORKSPACE DATA</span>
      </div>
      {admin && selected.size > 0 && (
        <div className="mass-toolbar">
          <span>{selected.size} selected</span>
          <select value={massAction} onChange={e => setMassAction(e.target.value)}><option value="">Change status…</option>{statuses.map(s => <option key={s}>{s}</option>)}</select>
          <button onClick={doMassStatus} disabled={!massAction || busy}>Apply</button>
          <button className="danger" onClick={doMassDelete} disabled={busy}><Trash2 size={14}/>Delete</button>
          <button onClick={() => setSelected(new Set())}><X size={14}/>Clear</button>
          {error && <span style={{ color: 'var(--red)', fontSize: '12px' }}>{error}</span>}
        </div>
      )}
      <div className="table-scroll">
        <table className="work-table">
          <thead>
            <tr>
              {admin && <th className="check-col"><input type="checkbox" className="header-checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all"/></th>}
              <Th k="wonum" label="WONUM"/>
              <Th k="description" label="DESCRIPTION / EQUIPMENT"/>
              <Th k="unit" label="UNIT"/>
              <Th k="system" label="SYSTEM"/>
              <Th k="priority" label="PRIORITY"/>
              <Th k="status" label="STATUS"/>
              <th>
                <button onClick={() => toggleSort('target')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'inherit', fontSize: '10px', letterSpacing: '.5px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                  TARGET DATE{sort.key === 'target' ? (sort.dir === 'asc' ? <ArrowUp size={11}/> : <ArrowDown size={11}/>) : <ArrowUpDown size={11} style={{ opacity: .4 }}/>}
                </button>
                <input type="date" className="col-date-picker" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(0); }} aria-label="Filter by target date"/>
              </th>
              <Th k="manpower" label="MANPOWER"/>
              <th/>
            </tr>
          </thead>
          <tbody>
            {rows.map(j => (
              <tr key={j.id} className={selected.has(j.id) ? 'selected' : ''} onClick={() => onOpen(j)}>
                {admin && <td className="check-col" onClick={e => e.stopPropagation()}><input type="checkbox" className="row-checkbox" checked={selected.has(j.id)} onChange={() => toggle(j.id)} aria-label={`Select ${j.wo_number}`}/></td>}
                <td><button className="wo-id" onClick={e => { e.stopPropagation(); onOpen(j); }}>{j.wo_number}</button>{j.ex_breakin && <span className="ex-breakin-pill">⚡ Ex-BreakIn</span>}<small className="table-jobtype">{j.job_type === 'Break-In' ? 'Unscheduled break-in' : 'Scheduled corrective'}</small></td>
                <td><span className="table-description">{j.description}</span><small>{j.equipment_tag || '—'}</small></td>
                <td>{j.unit ? <span className={`unit-tag ${j.unit === 'Common' ? 'common' : ''}`}>{j.unit}</span> : <small>—</small>}</td>
                <td><span className="system-tag">{j.system || 'Unassigned'}</span></td>
                <td><span className={`priority priority-${priorityClass(j)}`}><i/>{priorityLabel(j)}</span></td>
                <td><StatusBadge status={j.status}/>{j.status === 'Deferred' && j.deferred_reason && <div className="deferred-reason">{j.deferred_reason}{j.pr_number ? ` · PR: ${j.pr_number}` : ''}</div>}</td>
                <td>{j.planned_finish ? (safeFormatDate(j.planned_finish, 'dd MMM yyyy') || '—') : '—'}{aged(j) > 0 && <small className="aged-label">AGED ({aged(j)}d)</small>}</td>
                <td><span className="technician-cell">{j.technician && <i>{String(j.technician).split(',')[0].trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2)}</i>}{j.technician || 'Unassigned'}</span></td>
                <td><ArrowUpRight size={14}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!total && <div className="table-empty"><ClipboardList size={28}/><h3>No work orders to display</h3><p>Add a work order, import a schedule, or adjust your filters.</p></div>}
      <div className="table-footer">
        <span>{total ? `Showing ${current * size + 1}–${Math.min((current + 1) * size, total)} of ${total} work orders${dateFilter ? ' (date-filtered)' : ''}` : '0 work orders'}</span>
        <div>
          <button aria-label="Previous page" disabled={!current} onClick={() => setPage(current - 1)}><ChevronLeft size={14}/></button>
          <span>Page {current + 1}</span>
          <button aria-label="Next page" disabled={(current + 1) * size >= total} onClick={() => setPage(current + 1)}><ChevronRight size={14}/></button>
        </div>
      </div>
    </section>
  );
}