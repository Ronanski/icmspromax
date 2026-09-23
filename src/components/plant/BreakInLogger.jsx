import React,{useState} from 'react';
import {Plus,Trash2,Loader2,Zap,Save} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {api,errorText,units,PRIORITY_LABELS} from '@/components/plant/plantUtils';
import ManpowerInput from '@/components/plant/ManpowerInput';
const empty=()=>({wo_number:'',description:'',technician:'',unit:'Unit 1',priority:'Medium',shutdown_item:false,action_taken:'',as_found:'',as_left:''});
const EXEC_FIELDS=[['action_taken','Action Taken'],['as_found','As Found'],['as_left','As Left']];
export default function BreakInLogger({workspace,onClose,onSaved}) {
  const [rows,setRows]=useState([empty(),empty(),empty()]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const set=(i,key,v)=>setRows(rows.map((r,n)=>n===i?{...r,[key]:v}:r));
  const add=()=>setRows([...rows,empty()]);
  const remove=i=>setRows(rows.filter((_,n)=>n!==i));
  const save=async()=>{const valid=rows.filter(r=>r.description.trim());if(!valid.length){setError('Add at least one break-in job with a description.');return;}setBusy(true);setError('');try{await api('breakInBatch',{workspace_id:workspace.id,jobs:valid});await onSaved();onClose();}catch(e){setError(errorText(e));}finally{setBusy(false);}};
  const validCount=rows.filter(r=>r.description.trim()).length;
  return <Dialog open onOpenChange={v=>!v&&!busy&&onClose()}><DialogContent className="logger-dialog"><DialogTitle className="flex items-center gap-2"><Zap size={22} className="text-amber-500"/>Fast Break-In Logger</DialogTitle><DialogDescription>Rapidly log multiple backlogged break-in WOs. Use TAB to navigate between fields. Each row includes Action Taken, As Found, and As Left textareas that save with the job.</DialogDescription>
    <div className="logger-header"><span>WO NUMBER</span><span>DESCRIPTION</span><span>MANPOWER</span><span>UNIT</span><span>PRIORITY</span><span/></div>
    <div className="logger-matrix">{rows.map((r,i)=><React.Fragment key={i}><div className="logger-row">
      <input placeholder="Auto EM-ICMS-###" value={r.wo_number} onChange={e=>set(i,'wo_number',e.target.value)}/>
      <input placeholder="Description (required)" value={r.description} onChange={e=>set(i,'description',e.target.value)}/>
      <ManpowerInput value={r.technician||''} onChange={v=>set(i,'technician',v)} placeholder="Crew"/>
      <select value={r.unit} onChange={e=>set(i,'unit',e.target.value)}>{units.map(u=><option key={u}>{u}</option>)}</select>
      <select value={r.shutdown_item?'__shutdown__':r.priority} onChange={e=>{const v=e.target.value;if(v==='__shutdown__'){set(i,'shutdown_item',true);set(i,'priority','Low');}else{set(i,'shutdown_item',false);set(i,'priority',v);}}}>{['Critical','High','Medium','Low'].map(p=><option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}<option value="__shutdown__">Shutdown (P5)</option></select>
      <div className="flex gap-1">
        <button type="button" className="icon-button" title="Remove row" onClick={()=>remove(i)}><Trash2 size={15}/></button>
      </div>
    </div>
    <div className="logger-execution">{EXEC_FIELDS.map(([k,label])=><label key={k} className="form-field"><span>{label}</span><textarea rows={2} placeholder={`${label} (optional)`} value={r[k]} onChange={e=>set(i,k,e.target.value)}/></label>)}</div>
    </React.Fragment>)}</div>
    <button type="button" className="logger-add" onClick={add}><Plus size={16}/>Add row</button>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <div className="flex gap-2 mt-4 justify-end"><button className="secondary-button" disabled={busy} onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy||!validCount} onClick={save}>{busy?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>} {busy?'Logging…':`Log ${validCount} break-in job${validCount!==1?'s':''}`}</button></div>
  </DialogContent></Dialog>;
}
