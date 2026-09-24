import React from 'react';
import {Target, CircleCheck, Timer, Zap, ArrowUpRight, Repeat, Activity, Wrench, Gauge, Layers, AlarmClock} from 'lucide-react';
import {mttrHours, mtbfHours, completionRate, formatHours, backlogStats, ratioPeriodLabel, agedBacklog} from '@/components/plant/plantUtils';

// The core metrics a supervisor sees by default.
export const CORE_METRICS = ['schedule','completed','progress','aged','breakin','pmcm'];
// Trimmed set shown in Supervisor Mode — essentials only.
export const ESSENTIAL_METRICS = ['schedule','completed','backlog','aged'];

export const METRIC_LABELS = {
  schedule:'Schedule Compliance',
  completed:'Completed Work Orders',
  progress:'In Progress / Deferred',
  breakin:'Break-In Ratio',
  pmcm:'PM vs CM Ratio',
  backlog:'Active Backlog',
  aged:'Aged / Backlog (Overdue)',
  mttr:'MTTR',
  mtbf:'MTBF',
  rate:'Completion Rate',
};

export default function KpiCards({orders,onDrill,pmOrders=[],metrics=CORE_METRICS,supervisorMode=false,ratioPeriod='This Month'}) {
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
  const mttr=mttrHours(orders),mtbf=mtbfHours(orders),rate=completionRate(orders);
  const backlog=backlogStats(orders);
  // Aged / Backlog = past scheduled finish, no action taken, and not exempt
  // (Deferred / Shutdown Item / Spare Parts Not Available / Completed / Closed).
  const agedCount=agedBacklog(orders).length;

  const all={
    schedule:{label:METRIC_LABELS.schedule,value:scheduled.length?Math.round(compliant/scheduled.length*100)+'%':'—',note:`${compliant} of ${scheduled.length} scheduled jobs on time`,icon:Target,color:'violet',filter:{job_type:'Scheduled'}},
    completed:{label:METRIC_LABELS.completed,value:closed.length,note:'Completed within selected schedule',icon:CircleCheck,color:'green',filter:{status:'Completed'}},
    progress:{label:METRIC_LABELS.progress,value:<>{progress}<span className="kpi-divider">/</span>{deferred}</>,note:'Active execution / pending resolution',icon:Timer,color:'blue',filter:{status:'Active / Deferred'}},
    breakin:{label:METRIC_LABELS.breakin,value:orders.length?Math.round(breakins/orders.length*100)+'%':'0%',note:`${breakins} unscheduled of ${orders.length} total jobs`,icon:Zap,color:'amber',filter:{job_type:'Break-In'}},
    pmcm:{label:METRIC_LABELS.pmcm,value:total?`${pmPct}% / ${cmPct}%`:'—',note:`${ratioPeriodLabel(ratioPeriod)} view · Target 80% PM / 20% CM · ${pm} active PM / ${cm} active CM${total?(meetsTarget?' · On target':' · Below target'):''}`,icon:Repeat,color:meetsTarget?'green':'amber',filter:{maintenance_type:'PM'},ratio:true},
    backlog:{label:METRIC_LABELS.backlog,value:backlog.total,note:`Avg wait ${backlog.avgAge}d · oldest ${backlog.oldest}d · ${backlog.critical} emergency`,icon:Layers,color:backlog.chronic?'amber':'blue',filter:{status:'Backlog'}},
    aged:{label:METRIC_LABELS.aged,value:agedCount,note:`Past scheduled finish with no action taken · excludes deferred, shutdown, parts-pending and closed jobs`,icon:AlarmClock,color:agedCount?'amber':'green',filter:{status:'Aged'}},
    mttr:{label:METRIC_LABELS.mttr,value:formatHours(mttr),note:mttr===null?'Needs actual start and completion times':'Mean time to repair on completed jobs',icon:Wrench,color:'blue',filter:{status:'Completed'}},
    mtbf:{label:METRIC_LABELS.mtbf,value:formatHours(mtbf),note:mtbf===null?'Needs at least two breakdowns per asset':'Mean uptime between breakdowns per asset',icon:Activity,color:'violet',filter:{job_type:'Break-In'}},
    rate:{label:METRIC_LABELS.rate,value:rate===null?'—':rate+'%',note:'Completed share of all live work orders',icon:Gauge,color:rate!==null&&rate>=80?'green':'amber',filter:{status:'Completed'}},
  };

  const keys=supervisorMode?ESSENTIAL_METRICS:(metrics&&metrics.length?metrics:CORE_METRICS);
  const shown=keys.filter(k=>all[k]).map(k=>({key:k,...all[k]}));

  return <div className="kpi-grid">{shown.map(({key,label,value,note,icon:Icon,color,filter})=><button key={key} className="kpi-card" onClick={()=>onDrill(filter)}><div className="kpi-top"><span>{label}</span><span className={`kpi-icon ${color}`}><Icon size={17}/></span></div><div className="kpi-value">{value}<ArrowUpRight size={18}/></div><p>{note}</p><div className={`kpi-bottom ${color}`}/></button>)}</div>;
}
