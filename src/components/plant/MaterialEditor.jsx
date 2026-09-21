import React,{useState,useRef} from 'react';
import {Plus,Trash2,Loader2} from 'lucide-react';
import {lookupItem} from '@/components/plant/plantUtils';
export default function MaterialEditor({value=[],onChange,workspace}) {
  const [lookingUp,setLookingUp]=useState({});
  const timers=useRef({});
  const set=(i,key,v)=>onChange(value.map((m,n)=>n===i?{...m,[key]:v}:m));
  const handleCode=(i,code)=>{
    set(i,'code',code);
    clearTimeout(timers.current[i]);
    if(code.trim().length>=3&&workspace){
      timers.current[i]=setTimeout(async()=>{
        setLookingUp(p=>({...p,[i]:true}));
        const item=await lookupItem(workspace.id,code);
        setLookingUp(p=>({...p,[i]:false}));
        if(item&&!value[i]?.description) set(i,'description',item.description);
      },400);
    }
  };
  return <section className="form-section"><div className="section-row"><h3>Materials consumed</h3><button type="button" className="text-button" onClick={()=>onChange([...value,{code:'',description:'',quantity:0}])}><Plus size={14}/>Add material</button></div>{!value.length&&<p className="muted text-sm">No materials recorded. Item codes auto-fill descriptions from the Item Master.</p>}{value.map((m,i)=><div className="material-row" key={i}><input aria-label={`Item code ${i+1}`} placeholder="Item code" value={m.code} onChange={e=>handleCode(i,e.target.value)}/><input aria-label={`Item description ${i+1}`} placeholder="Description" value={m.description} onChange={e=>set(i,'description',e.target.value)}/><input aria-label={`Quantity ${i+1}`} type="number" min="0" step="any" value={m.quantity} onChange={e=>set(i,'quantity',Number(e.target.value))}/><button type="button" className="icon-button" aria-label={`Remove material ${i+1}`} onClick={()=>onChange(value.filter((_,n)=>n!==i))}>{lookingUp[i]?<Loader2 size={15} className="animate-spin"/>:<Trash2 size={15}/>}</button></div>)}</section>;
}