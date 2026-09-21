import React,{useState,useEffect} from 'react';
import {BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,PieChart,Pie,Cell} from 'recharts';
import {ArrowUpRight,BarChart3,AlertCircle,Layers,Pin,PinOff} from 'lucide-react';
import {statuses,units,aged,isBacklog,PRIORITY_COLORS,priorities,PRIORITY_LABELS,BACKLOG_CATEGORIES,backlogCategory,backlogStats} from '@/components/plant/plantUtils';

const colors=['#818cf8','#38bdf8','#f97316','#34b99a','#f7bb53','#94a3b8'];
export const VOLUME_METRICS=[
  {key:'system',label:'Volume by System'},
  {key:'unit',label:'Volume by Unit'},
  {key:'priority',label:'Volume by Priority'},
  {key:'status',label:'Volume by Status'},
  {key:'backlog',label:'Backlog by Unit'},
];

export default function Charts({orders,onDrill,compact=false,defaultMetric='system',onDefaultMetric,supervisorMode=false}) {
  const [metric,setMetric]=useState(defaultMetric);
  useEffect(()=>{setMetric(defaultMetric||'system');},[defaultMetric]);

  const getGroups=()=>{
    if(metric==='system')return [...new Set(orders.map(j=>j.system||'Unassigned'))];
    if(metric==='unit'||metric==='backlog')return units;
    if(metric==='priority')return priorities;
    return statuses;
  };
  const groups=getGroups();
  const fieldValue=(j)=>metric==='system'?(j.system||'Unassigned'):metric==='unit'?j.unit:metric==='priority'?(j.shutdown_item?'Shutdown Item':j.priority):metric==='backlog'?j.unit:j.status;
  const volume=groups.map(name=>({name,value:orders.filter(j=>(metric==='backlog'?isBacklog(j):true)&&fieldValue(j)===name).length})).filter(d=>d.value>0);
  const statusData=statuses.map((name,i)=>({name,value:orders.filter(j=>j.status===name).length,color:colors[i]}));
  const agedOrders=orders.filter(j=>aged(j)>0);
  const agedByUnit=units.map(u=>({name:u,value:orders.filter(j=>j.unit===u&&aged(j)>0).length})).filter(d=>d.value>0);
  const priorityColors=volume.map(d=>PRIORITY_COLORS[d.name]||'#7772e8');

  // Backlog: four waiting-time categories, plus the extra factors a supervisor
  // weighs before deciding what to push into the next shift.
  const stats=backlogStats(orders);
  const backlogData=stats.byCategory.map(c=>({...c,name:c.label}));
  const backlogDrill=(key)=>onDrill({status:'Backlog',backlog:key});
  const volumeDrill=(name)=>{
    if(metric==='backlog')return onDrill({status:'Backlog',unit:name});
    if(metric==='priority')return onDrill(name==='Shutdown Item'?{status:'Backlog'}:{priority:name});
    return onDrill({[metric]:name});
  };

  const factors=[
    ['Average wait',`${stats.avgAge} d`],
    ['Oldest job',`${stats.oldest} d`],
    ['Past SLA',stats.aged],
    ['Emergency',stats.critical],
    ['Waiting on parts',stats.pendingParts],
    ['Unassigned',stats.unassigned],
    ['Break-ins',stats.breakIns],
    ['Shutdown items',stats.shutdown],
  ];

  return <>
    <div className={`charts-grid ${compact?'compact':''}`}>
      <section className="panel chart-panel">
        <div className="panel-heading">
          <div><h3>Work Volume</h3><p>Maintenance distribution</p></div>
          <div className="metric-selector">
            <select aria-label="Work volume view" value={metric} onChange={e=>setMetric(e.target.value)}>
              {VOLUME_METRICS.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            {onDefaultMetric&&<button type="button" className="pin-default" title={metric===defaultMetric?'This is your default view':'Make this my default view'} aria-label="Set default work volume view" aria-pressed={metric===defaultMetric} onClick={()=>onDefaultMetric(metric)}>
              {metric===defaultMetric?<Pin size={16}/>:<PinOff size={16}/>}
            </button>}
          </div>
        </div>
        {volume.length?<div className="bar-chart"><ResponsiveContainer width="100%" height={218}><BarChart data={volume} margin={{top:15,right:8,left:-24,bottom:0}}><CartesianGrid vertical={false} strokeDasharray="3 4" stroke="var(--line)"/><XAxis dataKey="name" tick={{fontSize:10,fill:'var(--muted-ink)'}} axisLine={false} tickLine={false} tickFormatter={n=>PRIORITY_LABELS[n]||n}/><YAxis allowDecimals={false} tick={{fontSize:10,fill:'var(--muted-ink)'}} axisLine={false} tickLine={false}/><Tooltip cursor={{fill:'var(--hover)'}} contentStyle={{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:8}}/><Bar dataKey="value" name="Work orders" radius={[4,4,0,0]} maxBarSize={34} cursor="pointer" onClick={d=>volumeDrill(d.name)}>{metric==='priority'?volume.map((d,i)=><Cell key={i} fill={priorityColors[i]}/>):<Cell fill="#7772e8"/>}</Bar></BarChart></ResponsiveContainer></div>:<div className="chart-empty"><BarChart3 size={30}/><span>Your plant data, in perspective</span><p>Work volume appears as you add work orders.</p></div>}
      </section>
      <section className="panel chart-panel">
        <div className="panel-heading"><div><h3>Status Breakdown</h3><p>Current execution overview</p></div><ArrowUpRight size={17} className="muted"/></div>
        <div className="donut-layout">
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={190}><PieChart><Pie data={orders.length?statusData.filter(d=>d.value):[{name:'No data',value:1,color:'var(--line)'}]} dataKey="value" innerRadius={62} outerRadius={80} paddingAngle={orders.length?4:0} stroke="none" onClick={d=>orders.length&&onDrill({status:d.name})} cursor="pointer">{(orders.length?statusData.filter(d=>d.value):[{color:'var(--line)'}]).map((d,i)=><Cell fill={d.color} key={i}/>)}</Pie></PieChart></ResponsiveContainer>
            <div className="donut-center"><strong>{orders.length}</strong><span>Total jobs</span></div>
          </div>
          <div className="chart-legend">{statusData.map(d=><button onClick={()=>onDrill({status:d.name})} key={d.name}><i style={{background:d.color}}/><span>{d.name.replace('-',' ')}</span><strong>{d.value}</strong><small>{orders.length?Math.round(d.value/orders.length*100):0}%</small></button>)}</div>
        </div>
      </section>
    </div>

    <section className="panel chart-panel" style={{marginTop:16}}>
      <div className="panel-heading"><div><h3>Total Backlog</h3><p>Open, in-progress and waiting-on-parts work · {stats.total} total</p></div><Layers size={17} className="muted"/></div>
      {stats.total?<>
        <div className="backlog-factors">{factors.map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
        <div className="bar-chart"><ResponsiveContainer width="100%" height={200}><BarChart data={backlogData} layout="vertical" margin={{top:5,right:20,left:20,bottom:5}}><CartesianGrid horizontal={false} strokeDasharray="3 4" stroke="var(--line)"/><XAxis type="number" allowDecimals={false} tick={{fontSize:10,fill:'var(--muted-ink)'}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="name" tick={{fontSize:11,fill:'var(--muted-ink)'}} axisLine={false} tickLine={false} width={80}/><Tooltip cursor={{fill:'var(--hover)'}} contentStyle={{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:8}}/><Bar dataKey="value" name="Backlog" radius={[0,4,4,0]} maxBarSize={28} cursor="pointer" onClick={d=>backlogDrill(d.key)}>{backlogData.map(d=><Cell key={d.key} fill={d.color}/>)}</Bar></BarChart></ResponsiveContainer></div>
        <div className="backlog-legend">{backlogData.map(c=><button key={c.key} onClick={()=>backlogDrill(c.key)}><i style={{background:c.color}}/><span>{c.label}</span><small>{c.range}</small><strong>{c.value}</strong></button>)}</div>
      </>:<div className="chart-empty"><Layers size={30}/><span>No active backlog</span><p>All work orders are completed or deferred.</p></div>}
    </section>

    {!supervisorMode&&agedOrders.length>0&&<section className="panel chart-panel" style={{marginTop:16}}>
      <div className="panel-heading"><div><h3>Aged Work Orders</h3><p>Past the priority SLA, by unit · {agedOrders.length} total</p></div><AlertCircle size={17} className="muted"/></div>
      <div className="bar-chart"><ResponsiveContainer width="100%" height={200}><BarChart data={agedByUnit} layout="vertical" margin={{top:5,right:20,left:20,bottom:5}}><CartesianGrid horizontal={false} strokeDasharray="3 4" stroke="var(--line)"/><XAxis type="number" allowDecimals={false} tick={{fontSize:10,fill:'var(--muted-ink)'}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="name" tick={{fontSize:11,fill:'var(--muted-ink)'}} axisLine={false} tickLine={false} width={70}/><Tooltip cursor={{fill:'var(--hover)'}} contentStyle={{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:8}}/><Bar dataKey="value" name="Aged" fill="#f7bb53" radius={[0,4,4,0]} maxBarSize={28} cursor="pointer" onClick={d=>onDrill({unit:d.name,status:'Aged'})}/></BarChart></ResponsiveContainer></div>
    </section>}
  </>;
}
