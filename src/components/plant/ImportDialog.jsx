import db from '@/lib/db';

import React,{useState} from 'react';
import {UploadCloud,FileSpreadsheet,CheckCircle2,Loader2,ArrowRight,AlertTriangle,Zap,Repeat} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';

import {api,errorText,PRIORITY_LABELS} from '@/components/plant/plantUtils';
import {toast} from '@/components/ui/use-toast';

// One section = one table. 'scheduled' is the corrective (CM) register.
const SECTION={breakin:{key:'breakin',label:'Break-In',action:'importBreakIns',title:'Import Break-In Jobs',blurb:'Upload a Maximo export of break-in work. Only rows with Work Type Break-In / EM are accepted — they are saved to the Break-In register.',noun:'break-in jobs'},pm:{key:'pm',label:'PM',action:'importPM',title:'Import PM Schedule',blurb:'Upload a Maximo export of preventive work. Only rows with Work Type PM are accepted — they are saved to the PM schedule.',noun:'PM jobs'},cm:{key:'cm',label:'CM',action:'importCM',title:'Import Corrective (CM) Work Orders',blurb:'Upload a Maximo export of corrective work. Only rows with Work Type CM are accepted — they are saved to the Work Order Register.',noun:'work orders'}};

export default function ImportDialog({workspace,onClose,onSaved,mode='scheduled'}) {
  const section=SECTION[mode]||SECTION.cm;
  const isBreakIn=section.key==='breakin',isPM=section.key==='pm';
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState(null),[result,setResult]=useState(null),[name,setName]=useState(''),[progress,setProgress]=useState(0);
  const read=async file=>{if(!file)return;setError('');setPreview(null);setResult(null);setProgress(0);if(!/\.(xlsx|csv)$/i.test(file.name)||file.size>4*1024*1024){const msg='Choose an .xlsx or .csv file up to 4 MB.';setError(msg);toast({title:'Import file rejected',description:msg,variant:'destructive'});return;}setBusy(true);setName(file.name);try{const content=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=reject;r.readAsDataURL(file);});const r=await db.functions.invoke('parsePlantImport',{workspace_id:workspace.id,content,section:section.key});if(r.data.error)throw Error(r.data.error);setPreview(r.data);}catch(e){const msg=errorText(e);setError(msg);toast({title:`${section.label} import blocked`,description:msg,variant:'destructive'});}finally{setBusy(false);}};
  const commit=async()=>{setBusy(true);setError('');setProgress(0);try{const chunkSize=25;const rows=preview.rows;let created=0,updated=0,recomputed=0;const delay=ms=>new Promise(r=>setTimeout(r,ms));for(let i=0;i<rows.length;i+=chunkSize){const chunk=rows.slice(i,i+chunkSize);const r=await api(section.action,{workspace_id:workspace.id,rows:chunk});created+=r.created||0;updated+=r.updated||0;recomputed+=r.recomputed||0;setProgress(Math.round((Math.min(i+chunkSize,rows.length))/rows.length*100));if(i+chunkSize<rows.length)await delay(300);}setResult({created,updated,recomputed});setPreview(null);await onSaved();toast({title:`${section.label} import complete`,description:`${created} created · ${updated} updated${recomputed?` · ${recomputed} target finish dates refreshed`:''}`});}catch(e){const msg=errorText(e);setError(msg);toast({title:`${section.label} import blocked`,description:msg,variant:'destructive'});}finally{setBusy(false);}};
  const dupWarning=preview?.duplicates?.length>0?(
    <div style={{display:'flex',alignItems:'flex-start',gap:8,background:'#fef3c7',border:'1px solid #fcd34d',borderRadius:8,padding:'10px 14px',marginBottom:10,color:'#92400e',fontSize:12}}>
      <AlertTriangle size={16} style={{flexShrink:0,marginTop:1}}/>
      <span><strong>{preview.duplicates.length} duplicate WO number{preview.duplicates.length>1?'s':''}</strong> detected. The last occurrence takes precedence; existing records will be updated.</span>
    </div>
  ):null;
  return <Dialog open onOpenChange={v=>!v&&!busy&&onClose()}><DialogContent className="import-dialog"><DialogTitle className="flex items-center gap-2">{isBreakIn?<Zap size={22} className="text-amber-500"/>:isPM?<Repeat size={22} className="text-violet-500"/>:<FileSpreadsheet size={22} className="text-violet-500"/>}{section.title}</DialogTitle><DialogDescription>{section.blurb}</DialogDescription>
    {result?<div className="import-success"><CheckCircle2 size={42}/><h3>Import complete</h3><p>{result.created} new {section.noun} · {result.updated} updated{result.recomputed?` · ${result.recomputed} existing target finish dates refreshed`:''}</p><button className="primary-button" onClick={onClose}>Return to workspace</button></div>:<>
    <label className={`upload-zone ${busy?'busy':''}`} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!busy)read(e.dataTransfer.files[0]);}}><input type="file" accept=".xlsx,.csv" aria-label="Upload export" disabled={busy} onChange={e=>read(e.target.files[0])}/>{busy?<Loader2 size={32} className="animate-spin"/>:<UploadCloud size={32}/>}<strong>{busy?(progress>0?`Importing… ${progress}%`:'Processing…'):name||'Drop your export here, or browse files'}</strong><span>Excel (.xlsx) or CSV · Up to 4 MB · 25 rows per batch</span></label>
    {busy&&progress>0&&<div style={{background:'var(--surface-2)',borderRadius:8,padding:3,marginBottom:12}}><div style={{background:'var(--violet)',height:6,borderRadius:4,width:`${progress}%`,transition:'width .3s'}}/></div>}
    {preview&&<><div className="import-summary"><strong>{preview.rows.length} {section.label} rows ready for review</strong><span>Sheet: {preview.sheet}</span></div>
    {dupWarning}
    <div className="mapping-tags">{preview.mapped_fields.map(f=><span key={f}><CheckCircle2 size={12}/>{f==='system'?'Location/Tag':f.replaceAll('_',' ')}</span>)}</div>
    {preview.dropped_headers?.length>0&&<p className="muted text-sm" style={{marginBottom:10}}>Ignored columns: {preview.dropped_headers.join(' · ')}</p>}
    <div className="import-preview"><table className="work-table"><thead><tr><th>WORK ORDER</th><th>DESCRIPTION</th><th>UNIT</th><th>LOCATION/TAG</th><th>PRIORITY</th><th>WORK TYPE</th><th>STATUS</th><th>START</th><th>FINISH</th></tr></thead><tbody>{preview.rows.slice(0,10).map((r,i)=><tr key={i}><td>{r.wo_number}</td><td>{r.description}</td><td>{r.unit||'—'}</td><td>{r.system||'—'}</td><td>{PRIORITY_LABELS[r.priority]||r.priority||'—'}</td><td>{r.work_type||'—'}</td><td>{r.status||'Open'}</td><td>{r.planned_start||'—'}</td><td>{r.planned_finish||'—'}</td></tr>)}</tbody></table></div>
    {preview.rows.length>10&&<p className="muted text-sm" style={{marginBottom:10}}>Showing first 10 of {preview.rows.length} rows.</p>}
    <div className="import-note"><strong>Maximo conversion rules</strong><p>Priority: 1 → 1-Critical · 2 → 2-High Priority · 3 → 3-Normal · 4 → 4-Low Priority · 5 → 5-Shutdown Item</p><p>Status: CLOSE → Completed · DEFER / APPR → Deferred · INPRG → In Progress · SUBMIT → Open · RESCH → Rescheduled</p><p>Scheduled Finish is always computed as Scheduled Start + allowable days (P1 +0 · P2 +4 · P3 +15 · P4 +45 · P5 no target) — for imported and existing corrective work orders alike. Asset, Service Group, Reported Date and Site are ignored.</p><p>Imports run in 25-row batches with a 300 ms pause between calls. Existing WO numbers are updated, not duplicated.</p></div>
    <button className="primary-button w-full justify-center" disabled={busy||!preview.rows.length} onClick={commit}>{busy?`Importing… ${progress}%`:`Confirm ${section.label} import · ${preview.rows.length} rows`}<ArrowRight size={16}/></button></>}
    {!preview&&!busy&&<div className="import-note"><strong>Columns read from the Maximo export</strong><p>Work Order · Description · Unit · Location (Location/Tag) · Work Type · Scheduled Start · Priority · Status</p><p>Asset, Service Group, Reported Date and Site are ignored. This section only accepts Work Type <strong>{section.label}</strong> — any other rows block the import.</p></div>}
    </>}
    {error&&<p className="form-error" role="alert">{error}</p>}
  </DialogContent></Dialog>;
}
