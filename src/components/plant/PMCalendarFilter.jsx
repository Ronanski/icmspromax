import React,{useState} from 'react';
import {CalendarDays,X} from 'lucide-react';
import {Popover,PopoverTrigger,PopoverContent} from '@/components/ui/popover';
import {Calendar} from '@/components/ui/calendar';
import {format} from 'date-fns';

// Mini calendar popover date-range picker for the PM master table.
export default function PMCalendarFilter({from,to,onChange}) {
  const [open,setOpen]=useState(false);
  const selected={from:from?new Date(from+'T12:00:00'):undefined,to:to?new Date(to+'T12:00:00'):undefined};
  const label=from&&to?`${format(new Date(from+'T12:00:00'),'dd MMM')} – ${format(new Date(to+'T12:00:00'),'dd MMM yyyy')}`:from?format(new Date(from+'T12:00:00'),'dd MMM yyyy'):'All dates';
  const handleSelect=(r)=>{
    if(!r){return;}
    if(r.from){const f=format(r.from,'yyyy-MM-dd');const t=r.to?format(r.to,'yyyy-MM-dd'):f;onChange(f,t);if(r.to)setOpen(false);}
    else{onChange('','');}
  };
  return <div className="filter-selects">
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><button type="button" className="secondary-button" style={{background:'var(--surface)'}}><CalendarDays size={15}/>Target Start: {label}{(from||to)&&<X size={13} onClick={e=>{e.stopPropagation();onChange('','');}} style={{marginLeft:2}}/>}</button></PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={6}>
        <Calendar mode="range" selected={selected} onSelect={handleSelect} numberOfMonths={1} initialFocus/>
        <div className="flex justify-end gap-2 p-2 border-t" style={{borderColor:'var(--line)'}}><button type="button" className="text-button" onClick={()=>{onChange('','');setOpen(false);}}>Clear</button></div>
      </PopoverContent>
    </Popover>
  </div>;
}