import React,{useState} from 'react';
import {Plus,Repeat,FileText,Loader2,CalendarPlus,Check,Search} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {safeFormatDate,api,errorText} from '@/components/plant/plantUtils';
import StatusBadge from '@/components/plant/StatusBadge';
export default function CalendarDatePanel({date,orders,workspace,onClose,onAddNew,onOpen,onGenerateReport,onRescheduled}) {
  const [mode,setMode]=useState('list');
  const [selected,setSelected]=useState(new Set());
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [done,setDone]=useState('');
  const [query,setQuery]=useState('');
  const dayJobs=orders.filter(j=>j.planned_start===date||(j.status==='Completed'&&j.completion_time?.slice(0,10)===date));
  // Exclude Completed AND Break-In jobs from reschedule pool; apply real-time search
  const reschedulePool=orders.filter(j=>j.status!=='Completed'&&j.job_type!=='Break-In'&&j.planned_start!==date);
  const rescheduleOptions=reschedulePool.filter(j=>!query||j.wo_number?.toLowerCase().includes(query.toLowerCase())||j.description?.toLowerCase().includes(query.toLowerCase())||j.equipment_tag?.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>(a.wo_number||'').localeCompare(b.wo_number||''));
  const toggle=id=>setSelected(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const doBulkMove=async()=>{
    if(!selected.size){setError('Select at least one work order to move.');return;}
    setBusy(true);setError('');setDone('');
    try{const r=await api('bulkReschedule',{workspace_id:workspace.id,ids:[...selected],newDate:date});setDone(`${r.updated} work order${r.updated!==1?'s':''} moved to ${safeFormatDate(date,'dd MMM yyyy')}. Planned finish synced.`);setSelected(new Set());await onRescheduled();}catch(e){setError(errorText(e));}finally{setBusy(false);}
  };
  return <Dialog open onOpenChange={onClose}><DialogContent className="cal-list-dialog">
    <DialogTitle className="flex items-center gap-2"><CalendarPlus size={20}/> {safeFormatDate(date,'EEEE, dd MMM yyyy')}</DialogTitle>
    <DialogDescription>{dayJobs.length} work order{dayJobs.length!==1?'s':''} on this date. Add new, reschedule, or generate a shift report.</DialogDescription>
    <div className="cal-panel-actions">
      <button className="primary-button" onClick={()=>onAddNew(date)}><Plus size={16}/>Create New Work Order</button>
      <button className="secondary-button" onClick={()=>setMode(mode==='reschedule'?'list':'reschedule')}><Repeat size={16}/>Reschedule Existing</button>
      <button className="secondary-button" onClick={()=>onGenerateReport(date)}><FileText size={16}/>Generate Shift Report</button>
    </div>
    {mode==='reschedule'&&<div className="cal-panel-section"><div className="cal-reschedule">
      <p className="muted text-sm" style={{marginBottom:6}}>Completed and Break-In jobs are excluded. Select multiple jobs to move them all to <strong>{safeFormatDate(date,'dd MMM yyyy')}</strong>. Planned finish auto-syncs to the new start date.</p>
      <label className="filter-search" style={{marginBottom:8}}><Search size={15}/><input placeholder="Search by WO number, description or equipment..." value={query} onChange={e=>setQuery(e.target.value)}/></label>
      <div style={{maxHeight:220,overflowY:'auto',display:'flex',flexDirection:'column',gap:4,marginBottom:8}}>
        {rescheduleOptions.length?rescheduleOptions.map(j=><label key={j.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',background:'var(--surface-2)',borderRadius:6,cursor:'pointer'}}><input type="checkbox" checked={selected.has(j.id)} onChange={()=>toggle(j.id)} style={{accentColor:'var(--violet)'}}/><span style={{flex:1,minWidth:0}}><strong style={{fontFamily:'monospace',fontSize:12}}>{j.wo_number}</strong> <span style={{fontSize:11,color:'var(--muted-ink)'}}>{j.description}</span></span><small style={{color:'var(--muted-ink)'}}>{j.planned_start||'no date'}</small></label>):<p className="muted text-sm">{query?'No matching work orders.':'No movable work orders available.'}</p>}
      </div>
      <button className="primary-button" onClick={doBulkMove} disabled={busy||!selected.size}>{busy?<Loader2 size={16} className="animate-spin"/>:<Repeat size={16}/>}Move {selected.size||''} to this date</button>
      {done&&<p style={{color:'var(--green)',fontSize:12,marginTop:6,display:'flex',alignItems:'center',gap:4}}><Check size={14}/>{done}</p>}
      {error&&<p className="form-error" role="alert">{error}</p>}
    </div></div>}
    <div className="cal-panel-section"><h4>Work Orders on This Date</h4><div className="cal-list-body">{dayJobs.length?dayJobs.map(j=><button key={j.id} className="cal-list-item" onClick={()=>onOpen(j)}><div className="cal-list-item-top"><strong>{j.wo_number}</strong><StatusBadge status={j.status}/></div><span>{j.description}</span><small>{j.equipment_tag||'No equipment'} · {j.system||'Unassigned'} · {j.technician?.trim()||'Unassigned'}{j.maintenance_type==='PM'?' · PM':''}</small></button>):<p className="muted text-sm">No work orders on this date yet.</p>}</div></div>
  </DialogContent></Dialog>;
}