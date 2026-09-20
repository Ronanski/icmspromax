import React from 'react';
import {CalendarDays} from 'lucide-react';
import {rangeFor} from '@/components/plant/plantUtils';
export default function RangePicker({period,setPeriod,range,setRange}) {
 return <div className="range-picker"><CalendarDays size={15}/><select aria-label="Reporting period" value={period} onChange={e=>{setPeriod(e.target.value);if(e.target.value!=='Custom')setRange(rangeFor(e.target.value));}}>{['Today','This Week','This Month','Custom'].map(p=><option key={p}>{p}</option>)}</select>{period==='Custom'&&<div className="custom-dates"><input aria-label="Range start" type="date" value={range[0]} max={range[1]} onChange={e=>setRange([e.target.value,range[1]])}/><span>–</span><input aria-label="Range end" type="date" value={range[1]} min={range[0]} onChange={e=>setRange([range[0],e.target.value])}/></div>}</div>;
}