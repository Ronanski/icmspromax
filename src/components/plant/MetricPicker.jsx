import React,{useState,useEffect,useRef} from 'react';
import {Target,CircleCheck,Timer,Zap,Repeat,Activity,Wrench,Gauge,Layers,SlidersHorizontal,Check,X,ChevronDown} from 'lucide-react';
import {METRIC_LABELS,CORE_METRICS} from '@/components/plant/KpiCards';
import {ratioPeriodLabel,RATIO_PERIODS} from '@/components/plant/plantUtils';

const icons={
  schedule:Target,
  completed:CircleCheck,
  progress:Timer,
  breakin:Zap,
  pmcm:Repeat,
  backlog:Layers,
  mttr:Wrench,
  mtbf:Activity,
  rate:Gauge,
};

const ORDER=['schedule','completed','progress','breakin','pmcm','backlog','mttr','mtbf','rate'];

export default function MetricPicker({metrics,onMetrics,ratioPeriod,onRatioPeriod}) {
  const [open,setOpen]=useState(false);
  const ref=useRef(null);

  useEffect(()=>{
    const handler=(e)=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    if(open){document.addEventListener('mousedown',handler);return()=>document.removeEventListener('mousedown',handler);}
  },[open]);

  const toggle=(key)=>{
    const next=metrics.includes(key)?metrics.filter(k=>k!==key):[...metrics,key];
    onMetrics(next.length?next:CORE_METRICS);
  };

  return <>
    <div className="metric-picker" ref={ref}>
      <button type="button" className="metric-trigger" onClick={()=>setOpen(v=>!v)}>
        Choose metrics ({metrics.length})
        <ChevronDown size={14} className="metric-chevron"/>
      </button>
      {open&&<div className="metric-menu">
        <div className="metric-menu-head">
          <strong>Metrics on show</strong>
          <button type="button" onClick={()=>setOpen(false)} aria-label="Close"><X size={13}/></button>
        </div>
        {ORDER.map(key=>{
          const Icon=icons[key];
          const isOn=metrics.includes(key);
          return <button type="button" key={key} className={`metric-option${isOn?' on':''}`} onClick={()=>toggle(key)}>
            <span className="metric-check">{isOn&&<Check size={12}/>}</span>
            {Icon&&<Icon size={14} className="metric-option-icon"/>}
            <span className="metric-option-label">{METRIC_LABELS[key]}</span>
          </button>;
        })}
        <button type="button" className="metric-reset" onClick={()=>onMetrics(CORE_METRICS)}>Reset to 5 core metrics</button>
      </div>}
    </div>
    {metrics.includes('pmcm')&&<label className="ratio-period">
      PM vs CM period
      <select value={RATIO_PERIODS.includes(ratioPeriod)?ratioPeriod:'This Month'} onChange={e=>onRatioPeriod(e.target.value)}>
        {RATIO_PERIODS.map(p=><option key={p} value={p}>{ratioPeriodLabel(p)}</option>)}
      </select>
      <ChevronDown size={14} className="ratio-chevron"/>
    </label>}
  </>;
}
