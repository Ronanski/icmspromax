import db from '@/lib/db';

import React, { useState, useEffect, useMemo } from 'react';
import { Download, Loader2, ShieldCheck, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { safeFormatDate, exportAuditCSV } from '@/components/plant/plantUtils';

// Append-only audit trail of administrative actions.
export default function AuditTrailPage({ workspace }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [entity, setEntity] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    let live = true;
    (async () => {
      if (!workspace?.id) return;
      setLoading(true);
      try {
        const r = await db.entities.AuditLog.filter({ workspace_id: workspace.id }, '-created_date', 500);
        if (live) setLogs(r);
      } catch (e) {
        if (live) toast({ title: 'Could not load audit trail', description: e.message, variant: 'destructive' });
      } finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [workspace?.id]);

  const entities = useMemo(() => [...new Set(logs.map(l => l.entity).filter(Boolean))], [logs]);
  const rows = useMemo(() => logs.filter(l => {
    if (entity && l.entity !== entity) return false;
    if (!q) return true;
    const t = q.toLowerCase();
    return [l.action, l.entity, l.entity_ref, l.details, l.actor_email].some(v => String(v || '').toLowerCase().includes(t));
  }), [logs, q, entity]);

  const runExport = () => {
    const n = exportAuditCSV(rows);
    if (n) toast({ title: 'Audit trail exported', description: `${n} row${n === 1 ? '' : 's'} downloaded.` });
    else toast({ title: 'Nothing to export', description: 'No audit entries match this view.', variant: 'destructive' });
  };

  return <>
    <div className="page-header">
      <div><h1>Audit Trail</h1><p>Every deletion, settings change and administrative action, in order.</p></div>
      <div className="page-actions"><button className="secondary-button" onClick={runExport} disabled={!rows.length}><Download size={16}/>Export CSV</button></div>
    </div>
    <div className="filter-toolbar">
      <div className="filter-selects">
        <Search size={15}/>
        <input aria-label="Search audit trail" value={q} onChange={e => setQ(e.target.value)} placeholder="Search action, user or reference…"/>
        <select aria-label="Filter by record type" value={entity} onChange={e => setEntity(e.target.value)}>
          <option value="">All record types</option>
          {entities.map(e => <option key={e}>{e}</option>)}
        </select>
      </div>
    </div>
    {loading ? <div className="empty-state"><Loader2 size={26} className="animate-spin"/><p>Loading audit trail…</p></div>
      : rows.length ? <div className="panel order-panel">
        <div className="table-scroll"><table className="order-table">
          <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Record type</th><th>Reference</th><th>Details</th></tr></thead>
          <tbody>{rows.map(l => <tr key={l.id}>
            <td>{safeFormatDate(l.created_date, 'dd MMM yyyy, HH:mm')}</td>
            <td>{l.actor_email || '—'}</td>
            <td><strong>{l.action}</strong></td>
            <td>{l.entity}</td>
            <td>{l.entity_ref || '—'}</td>
            <td className="audit-details">{l.details || '—'}</td>
          </tr>)}</tbody>
        </table></div>
      </div>
      : <div className="empty-state"><ShieldCheck size={32}/><h3>No administrative activity recorded</h3><p>Deletions, settings updates and data resets will appear here as they happen.</p></div>}
  </>;
}
