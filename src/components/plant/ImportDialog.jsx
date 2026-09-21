import db from '@/lib/db';

import React,{useState} from 'react';
import {UploadCloud,FileSpreadsheet,CheckCircle2,Loader2,ArrowRight,AlertTriangle,Zap} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';

import {api,errorText,PRIORITY_LABELS} from '@/components/plant/plantUtils';
import {toast} from '@/components/ui/use-toast';
export default function ImportDialog({workspace,onClose,onSaved,mode='scheduled'}) {
  const isBreakIn=mode==='breakin';
  const isPM=mode==='pm';
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState(null),[result,setResult]=useState(null),[name,setName]=useState(''),[progress,setProgress]=useState(0);
  const read=async file=>{if(!file)return;setError('');setPreview(null);setResult(null);setProgress(0);if(!/\.(xlsx|csv)$/i.test(file.name)||file.size>4*1024*1024){const msg='Choose an .xlsx or .csv file up to 4 MB.';setError(msg);toast({title:'Import file rejected',description:msg,variant:'destructive'});return;}setBusy(true);setName(file.name);try{const content=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=reject;r.readAsDataURL(file);});const r=await db.functions.invoke('parsePlantImport',{workspace_id:workspace.id,content});if(r.data.error)throw Error(r.data.error);setPreview(r.data);}catch(e){const msg=errorText(e);setError(msg);toast({title:'Import failed',description:msg,variant:'destructive'});}finally{setBusy(false);}};
  const commit=async()=>{setBusy(true);setError('');setProgress(0);try{const chunkSize=25;const rows=preview.rows;let created=0,updated=0;const delay=ms=>new Promise(r=>setTimeout(r,ms));for(let i=0;i<rows.length;i+=chunkSize){const chunk=rows.slice(i,i+chunkSize);const r=await api(isBreakIn?'importBreakIns':isPM?'importPM':'import',{workspace_id:workspace.id,rows:chunk});created+=r.created||0;updated+=r.updated||0;setProgress(Math.round((Math.min(i+chunkSize,rows.length))/rows.length*100));if(i+chunkSize<rows.length)await delay(300);}setResult({created,updated});setPreview(null);await onSaved();toast({title:'Import complete',description:`${created} created · ${updated} updated`});}catch(e){const msg=errorText(e);setError(msg);toast({title:'Import failed',description:msg,variant:'destructive'});}finally{setBusy(false);}};
  const dupWarning=preview?.duplicates?.length>0?(
    <div style={{display:'flex',alignItems:'flex-start',gap:8,background:'#fef3c7',border:'1px solid #fcd34d',borderRadius:8,padding:'10px 14px',marginBottom:10,color:'#92400e',fontSize:12}}>
      <AlertTriangle size={16} style={{flexShrink:0,marginTop:1}}/>
      <span><strong>{preview.duplicates.length} duplicate WO number{preview.duplicates.length>1?'s':''}</strong> detected. The last occurrence takes precedence; existing records will be updated.</span>
    </div>
  ):null;
  return <Dialog open onOpenChange={v=>!v&&!busy&&onClose()}><DialogContent className="import-dialog"><DialogTitle className="flex items-center gap-2">{isBreakIn?<Zap size={22} className="text-amber-500"/>:<FileSpreadsheet size={22} className="text-violet-500"/>}{isBreakIn?'Import Break-In Jobs':isPM?'Import PM Schedule':'Import maintenance schedule'}</DialogTitle><DialogDescription>{isBreakIn?'Upload a raw export of backlogged break-in WOs. All imported jobs are tagged as Break-In.':isPM?'Upload a PM schedule export. Imported jobs are tagged as Preventive Maintenance (PM).':'Upload a raw Maximo or SAP export. Priority columns auto-detected and converted.'}</DialogDescription>
    {result?<div className="import-success"><CheckCircle2 size={42}/><h3>Import complete</h3><p>{result.created} new {isBreakIn?'break-in jobs':isPM?'PM jobs':'work orders'} · {result.updated} updated</p><button className="primary-button" onClick={onClose}>Return to workspace</button></div>:<>
    <label className={`upload-zone ${busy?'busy':''}`} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!busy)read(e.dataTransfer.files[0]);}}><input type="file" accept=".xlsx,.csv" aria-label="Upload export" disabled={busy} onChange={e=>read(e.target.files[0])}/>{busy?<Loader2 size={32} className="animate-spin"/>:<UploadCloud size={32}/>}<strong>{busy?(progress>0?`Importing… ${progress}%`:'Processing…'):name||'Drop your export here, or browse files'}</strong><span>Excel (.xlsx) or CSV · Up to 4 MB · 25 rows per batch</span></label>
    {busy&&progress>0&&<div style={{background:'var(--surface-2)',borderRadius:8,padding:3,marginBottom:12}}><div style={{background:'var(--violet)',height:6,borderRadius:4,width:`${progress}%`,transition:'width .3s'}}/></div>}
    {preview&&<><div className="import-summary"><strong>{preview.rows.length} rows ready for review</strong><span>Sheet: {preview.sheet}</span></div>
    {dupWarning}
    <div className="mapping-tags">{preview.mapped_fields.map(f=><span key={f}><CheckCircle2 size={12}/>{f.replaceAll('_',' ')}</span>)}</div>
    <div className="import-preview"><table className="work-table"><thead><tr><th>WO NUMBER</th><th>DESCRIPTION</th><th>UNIT</th><th>SYSTEM</th><th>PRIORITY</th><th>JOB TYPE</th><th>START</th><th>FINISH</th></tr></thead><tbody>{preview.rows.slice(0,10).map((r,i)=><tr key={i}><td>{r.wo_number}</td><td>{r.description}</td><td>{r.unit||'—'}</td><td>{r.system||'—'}</td><td>{PRIORITY_LABELS[r.priority]||r.priority||'—'}</td><td>{r.job_type||'—'}</td><td>{r.planned_start||'—'}</td><td>{r.planned_finish||'—'}</td></tr>)}</tbody></table></div>
    {preview.rows.length>10&&<p className="muted text-sm" style={{marginBottom:10}}>Showing first 10 of {preview.rows.length} rows.</p>}
    <div className="import-note"><strong>Automatic priority conversion</strong><p>1/Emergency/Critical → Emergency (Break-In) · 2/High → Urgent · 3/Medium/Normal → Normal · 4/Low → Low Priority · 5/SD → Shutdown Item</p><p>Imports run in 25-row batches with a 300 ms pause between calls to avoid rate limits. Existing WO numbers are updated, not duplicated.</p></div>
    <button className="primary-button w-full justify-center" disabled={busy||!preview.rows.length} onClick={commit}>{busy?`Importing… ${progress}%`:`Confirm import · ${preview.rows.length} rows`}<ArrowRight size={16}/></button></>}
    {!preview&&!busy&&<div className="import-note"><strong>Automatic column recognition</strong><p>WO Number · Equipment / Asset · Description · Plant System · Unit · Priority · Material Code · Planned Start / Finish</p><p>Priority columns detected: PRIORITY, CALC_PRIORITY, INTERNALPRIORITY, WOPRIORITY. Use native Excel dates or YYYY-MM-DD.</p></div>}
    </>}
    {error&&<p className="form-error" role="alert">{error}</p>}
  </DialogContent></Dialog>;
}