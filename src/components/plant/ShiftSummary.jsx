import React,{useState,useMemo} from 'react';
import {FileText,Copy,Check,CalendarDays,Download} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {formatShiftSummary,today} from '@/components/plant/plantUtils';
export default function ShiftSummary({orders,workspace,onClose,defaultDate,scope='cm'}) {
  const scopeLabel=scope==='pm'?'Preventive Maintenance':scope==='breakin'?'Break-In':'Corrective Maintenance';
  const scopeSlug=scope==='pm'?'PM':scope==='breakin'?'BreakIn':'CM';
  const [copied,setCopied]=useState(false);
  const [shiftDate,setShiftDate]=useState(defaultDate||today());
  const text=useMemo(()=>formatShiftSummary(orders,workspace,shiftDate,scope),[orders,workspace,shiftDate,scope]);
  const copy=async()=>{try{await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{}};
  const download=()=>{const blob=new Blob([text],{type:'text/plain'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`ICMS-${scopeSlug}-Daily-Report-${shiftDate}.txt`;a.click();URL.revokeObjectURL(url);};
  return <Dialog open onOpenChange={onClose}><DialogContent className="summary-dialog"><DialogTitle className="flex items-center gap-2"><FileText size={22}/>{scopeLabel} Shift Report</DialogTitle><DialogDescription>{`Select a date to generate the ${scopeLabel.toLowerCase()} accomplishment report. Only ${scopeLabel.toLowerCase()} jobs are included.`}</DialogDescription>
    <div className="flex items-center gap-2 mb-3"><CalendarDays size={16} className="muted"/><label className="form-field" style={{flex:1,margin:0}}>Report Date<input type="date" value={shiftDate} onChange={e=>setShiftDate(e.target.value)}/></label></div>
    <div className="summary-output">{text}</div>
    <div className="flex gap-2 justify-end"><button className="secondary-button" onClick={onClose}>Close</button><button className="secondary-button" onClick={copy}>{copied?<><Check size={16}/>Copied!</>:<><Copy size={16}/>Copy to Clipboard</>}</button><button className="primary-button" onClick={download}><Download size={16}/>Download .TXT</button></div>
  </DialogContent></Dialog>;
}