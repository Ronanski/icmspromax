import React from 'react';
import {statuses,units,priorities,pmFrequencies,PRIORITY_LABELS} from '@/components/plant/plantUtils';
import ManpowerInput from '@/components/plant/ManpowerInput';
export default function JobFields({value,set,restricted,systems}) {
  const systemOptions=systems&&systems.length?[...new Set(systems.map(s=>s.system_name).filter(Boolean))]:[];
  const input=(key,label,type='text',required=false)=><label className="form-field" key={key}>{label}<input type={type} value={value[key]||''} required={required} onChange={e=>set(key,e.target.value)}/></label>;
  const select=(key,label,options)=><label className="form-field">{label}<select value={value[key]||options[0]} onChange={e=>set(key,e.target.value)}>{options.map(o=><option key={o}>{o}</option>)}</select></label>;
  const duration=value.start_time&&value.completion_time?Math.max(0,Math.round((new Date(value.completion_time)-new Date(value.start_time))/60000)):0;
  const ptwActive=['In-Progress','Completed','Deferred'].includes(value.status);
  const isPM=value.maintenance_type==='PM';
  const isBreakIn=value.job_type==='Break-In';
  return <><section className="form-section"><h3>Job information</h3><fieldset disabled={restricted}>
    <div className="form-grid" style={{gridTemplateColumns:'1fr 1.5fr'}}>
      <label className="form-field">{isBreakIn?'Break-In ID':'Work order number'}<input type="text" required={!isBreakIn} value={value.wo_number||''} placeholder={isBreakIn?'Auto EM-ICMS-###':'WO number'} onChange={e=>set('wo_number',e.target.value)}/></label>
      <label className="form-field">Work description<textarea rows={2} required value={value.description||''} onChange={e=>set('description',e.target.value)}/></label>
    </div>
    <div className="form-grid mt-4">
      {select('maintenance_type','Maintenance type',['CM','PM'])}
      {isPM&&select('pm_frequency','PM frequency',pmFrequencies)}
      {input('equipment_tag','Equipment tag ID')}
      {select('unit','Plant unit',units)}
      {select('system','Plant system / area',systemOptions.length?systemOptions:['Unassigned'])}
      <label className="form-field">Priority<select value={value.shutdown_item?'__shutdown__':(value.priority||'Medium')} onChange={e=>{const v=e.target.value;if(v==='__shutdown__'){set('shutdown_item',true);set('priority','Low');}else{set('shutdown_item',false);set('priority',v);}}}>{['Medium','High','Critical','Low'].map(p=><option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}<option value="__shutdown__">Shutdown (P5)</option></select></label>
      <label className="form-field" style={{flexDirection:'row',alignItems:'center',gap:8,fontWeight:400}}><input type="checkbox" checked={!!value.shutdown_item} onChange={e=>set('shutdown_item',e.target.checked)} style={{width:16}}/> Mark as Shutdown Item (excluded from aging)</label>
      {input('planned_start','Planned start','date')}
      {input('planned_finish','Planned finish','date')}
    </div>
    {isBreakIn&&<label className="form-field mt-4">Associated Follow-up Work Order #<input type="text" placeholder="Link a corrective WO ticket to this break-in" value={value.associated_wo||''} onChange={e=>set('associated_wo',e.target.value)}/></label>}
  </fieldset></section>
  <section className="form-section"><h3>Execution details</h3><div className="form-grid"><label className="form-field">Assigned manpower<ManpowerInput value={value.technician||''} onChange={v=>set('technician',v)}/></label>{input('start_time','Actual start','datetime-local')}{input('completion_time','Completion time','datetime-local')}</div><div className="duration-label">EXECUTION DURATION <strong>{Math.floor(duration/60)}h {duration%60}m</strong></div>{[['action_taken','Action taken'],['as_found','As-found condition'],['as_left','As-left condition']].map(([k,label])=><label key={k} className="form-field mt-4">{label}<textarea rows={2} value={value[k]||''} onChange={e=>set(k,e.target.value)}/></label>)}<label className="form-field mt-4">Work status<select value={value.status||'Open'} onChange={e=>set('status',e.target.value)}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label>{ptwActive&&<label className="form-field mt-4">PTW Number (Permit To Work)<input placeholder="e.g., PTW-2026-001" value={value.ptw_number||''} onChange={e=>set('ptw_number',e.target.value)}/></label>}{value.status==='Deferred'&&<label className="form-field mt-4">Deferred Reason (required)<select required value={value.deferred_reason||''} onChange={e=>set('deferred_reason',e.target.value)}><option value="">Select reason…</option><option>For Shutdown</option><option>For Load Down Activities</option><option>For PR</option></select></label>}{value.status==='Deferred'&&value.deferred_reason==='For PR'&&<label className="form-field mt-4">PR Number (required)<input required value={value.pr_number||''} onChange={e=>set('pr_number',e.target.value)} placeholder="e.g., PR-2026-001"/></label>}</section></>;
}