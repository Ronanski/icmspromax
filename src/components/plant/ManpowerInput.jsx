import React,{useState} from 'react';
import {X} from 'lucide-react';
export default function ManpowerInput({value,onChange,placeholder='Type a name and press Enter'}) {
  const tags=value?String(value).split(',').map(t=>t.trim()).filter(Boolean):[];
  const [input,setInput]=useState('');
  const add=()=>{const v=input.trim();if(v&&!tags.includes(v)){onChange([...tags,v].join(', '));}setInput('');};
  const remove=t=>onChange(tags.filter(x=>x!==t).join(', '));
  const onKey=e=>{if(e.key==='Enter'||e.key===','){e.preventDefault();add();}else if(e.key==='Backspace'&&!input&&tags.length){remove(tags[tags.length-1]);}};
  return <div className="manpower-input">
    {tags.map(t=><span key={t} className="manpower-tag">{t}<button type="button" aria-label={`Remove ${t}`} onClick={()=>remove(t)}><X size={11}/></button></span>)}
    <input type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={onKey} onBlur={add} placeholder={tags.length?'':placeholder}/>
  </div>;
}