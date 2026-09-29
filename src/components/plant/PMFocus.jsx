import React from 'react';
import {Repeat,Timer,Loader2,CircleCheck,CalendarClock,AlertTriangle,Plus} from 'lucide-react';
import OrderTable from '@/components/plant/OrderTable';
import {today,aged,safeFormatDate} from '@/components/plant/plantUtils';

// PM Today's Focus — shift snapshot, today's PM execution queue, due-today list.
export default function PMFocus({pmOrders,onOpen,onCreate}) {
  const t=today();
  const dueToday=pmOrders.filter(j=>j.planned_start===t&&j.status!=='Completed');
  const overdue=pmOrders.filter(j=>aged(j)>0);
  const inProgress=pmOrders.filter(j=>j.status==='In-Progress').length;
  const completed=pmOrders.filter(j=>j.status==='Completed').length;
  const openCount=pmOrders.filter(j=>j.status==='Open').length;
  const tiles=[
    {label:'Due Today',count:dueToday.length,icon:CalendarClock,color:'violet'},
    {label:'Open PM',count:openCount,icon:Timer,color:'blue'},
    {label:'In Progress',count:inProgress,icon:Loader2,color:'amber'},
    {label:'Completed',count:completed,icon:CircleCheck,color:'green'}
  ];
  return <>
    <div className="kpi-grid">{tiles.map(k=><div key={k.label} className="kpi-card"><div className="kpi-top"><span>{k.label}</span><span className={`kpi-icon ${k.color}`}><k.icon size={17}/></span></div><div className="kpi-value">{k.count}</div><div className={`kpi-bottom ${k.color}`}/></div>)}</div>
    {overdue.length>0&&<div className="aged-banner" role="alert"><AlertTriangle size={17}/><strong>{overdue.length} aged PM work order{overdue.length!==1?'s':''}</strong><span>Past target start date — review SLA compliance</span></div>}
    <OrderTable orders={dueToday} onOpen={onOpen} title="Today's PM Execution Queue" limited/>
    <section className="panel" style={{marginTop:16}}>
      <div className="panel-heading"><div><h3>PMs Due Today</h3><p>Full descriptions — no truncation</p></div><span className="tiny-label">{safeFormatDate(t,'EEEE')}</span></div>
      {dueToday.length?<div style={{display:'flex',flexDirection:'column',gap:8}}>{dueToday.map(j=><button key={j.id} className="scheduled-card" style={{borderLeftColor:'var(--chart-2)'}} onClick={()=>onOpen(j)}><div className="job-card-top"><span className="wo-id">{j.wo_number}</span><span className="muted text-sm">{j.pm_frequency||'PM'}</span></div><h3 style={{whiteSpace:'normal'}}>{j.description}</h3><p>{j.equipment_tag||'No equipment tag'}<span>•</span>{j.system||'Unassigned'}<span>•</span>{j.unit||'—'}</p></button>)}</div>:<div className="scheduled-empty"><CalendarClock size={26}/><h3>No PMs due today</h3><p>Schedule a new preventive maintenance job to populate the queue.</p><button className="text-button" onClick={()=>onCreate()}><Plus size={15}/>Add PM job</button></div>}
    </section>
  </>;
}