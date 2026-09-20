import React from 'react';
import {Target, CircleCheck, Timer, Zap, ArrowUpRight, Repeat} from 'lucide-react';
export default function KpiCards({orders,onDrill,pmOrders=[]}) {
  const scheduled=orders.filter(j=>j.job_type==='Scheduled'),closed=orders.filter(j=>j.status==='Completed'),progress=orders.filter(j=>j.status==='In-Progress').length,deferred=orders.filter(j=>j.status==='Deferred').length,breakins=orders.filter(j=>j.job_type==='Break-In').length;
  const compliant=scheduled.filter(j=>j.status==='Completed'&&j.completion_time&&j.planned_finish&&j.completion_time.slice(0,10)<=j.planned_finish).length;
  // PM count comes directly from the PM records (cross-workspace), so the CM Analytics Hub
  // ratio is accurate even though `orders` here is CM-only.
  const activeStatuses=['In-Progress','Completed'];
  const pm=pmOrders.filter(j=>activeStatuses.includes(j.status)).length;
  const cm=orders.filter(j=>activeStatuses.includes(j.status)).length;
  const total=pm+cm;
  const pmPct=total?Math.round(pm/total*100):0,cmPct=total?100-pmPct:0;
  const meetsTarget=total>0&&pmPct>=80;
  const items=[{label:'Schedule Compliance',value:scheduled.length?Math.round(compliant/scheduled.length*100)+'%':'—',note:`${compliant} of ${scheduled.length} scheduled jobs on time`,icon:Target,color:'violet',filter:{job_type:'Scheduled'}},{label:'Completed Work Orders',value:closed.length,note:'Completed within selected schedule',icon:CircleCheck,color:'green',filter:{status:'Completed'}},{label:'In Progress / Deferred',value:<>{progress}<span className="kpi-divider">/</span>{deferred}</>,note:'Active execution / pending resolution',icon:Timer,color:'blue',filter:{status:'Active / Deferred'}},{label:'Break-In Ratio',value:orders.length?Math.round(breakins/orders.length*100)+'%':'0%',note:`${breakins} unscheduled of ${orders.length} total jobs`,icon:Zap,color:'amber',filter:{job_type:'Break-In'}},{label:'PM vs CM Ratio',value:total?`${pmPct}% / ${cmPct}%`:'—',note:`Target 80% PM / 20% CM · ${pm} active PM / ${cm} active CM${total?(meetsTarget?' · On target':' · Below target'):''}`,icon:Repeat,color:meetsTarget?'green':'amber',filter:{maintenance_type:'PM'}}];
  return <div className="kpi-grid">{items.map(({label,value,note,icon:Icon,color,filter})=><button key={label} className="kpi-card" onClick={()=>onDrill(filter)}><div className="kpi-top"><span>{label}</span><span className={`kpi-icon ${color}`}><Icon size={17}/></span></div><div className="kpi-value">{value}<ArrowUpRight size={18}/></div><p>{note}</p><div className={`kpi-bottom ${color}`}/></button>)}</div>;
}