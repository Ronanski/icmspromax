import React from 'react';
import {Repeat,CircleCheck,Target,TrendingUp,BarChart3} from 'lucide-react';
import {PieChart,Pie,Cell,ResponsiveContainer,BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip} from 'recharts';
import {pmFrequencies,units,PRIORITY_COLORS,priorities,PRIORITY_LABELS,safeFormatDate} from '@/components/plant/plantUtils';

// PM Analytics — 80/20 PM vs CM ratio, PM completion rate, recurrence compliance.
export default function PMAnalytics({pmOrders,cmOrders,onDrill}) {
  const pm=pmOrders.length,cm=cmOrders.length,total=pm+cm;
  const pmPct=total?Math.round(pm/total*100):0,cmPct=total?100-pmPct:0;
  const meetsTarget=total>0&&pmPct>=80;
  const completed=pmOrders.filter(j=>j.status==='Completed').length;
  const completionRate=pmOrders.length?Math.round(completed/pmOrders.length*100):0;
  const compliant=pmOrders.filter(j=>j.status==='Completed'&&j.completion_time&&j.planned_finish&&j.completion_time.slice(0,10)<=j.planned_finish).length;
  const recurrenceCompliance=completed?Math.round(compliant/completed*100):0;
  const ratioData=[{name:'PM',value:pm,color:'var(--chart-2)'},{name:'CM',value:cm,color:'var(--chart-1)'}];
  const byFreq=pmFrequencies.map(f=>({name:f,value:pmOrders.filter(j=>j.pm_frequency===f).length})).filter(d=>d.value>0);
  const completionByUnit=units.map(u=>({name:u,total:pmOrders.filter(j=>j.unit===u).length,completed:pmOrders.filter(j=>j.unit===u&&j.status==='Completed').length})).filter(d=>d.total>0);
  const kpis=[
    {label:'PM Completion Rate',value:completionRate+'%',note:`${completed} of ${pmOrders.length} PMs completed`,icon:CircleCheck,color:completionRate>=80?'green':'amber'},
    {label:'80/20 PM vs CM Ratio',value:total?`${pmPct}% / ${cmPct}%`:'—',note:`Target 80% PM · ${meetsTarget?'On target':'Below target'}`,icon:Target,color:meetsTarget?'green':'amber'},
    {label:'Recurrence Compliance',value:recurrenceCompliance+'%',note:`${compliant} of ${completed} completed on schedule`,icon:TrendingUp,color:recurrenceCompliance>=80?'green':'amber'},
    {label:'Total PM Jobs',value:pm,note:`${pmOrders.filter(j=>j.status==='Open').length} open · ${pmOrders.filter(j=>j.status==='In-Progress').length} in progress`,icon:Repeat,color:'violet'}
  ];
  return <>
    <div className="kpi-grid">{kpis.map(k=><div key={k.label} className="kpi-card" onClick={()=>onDrill({maintenance_type:'PM'})}><div className="kpi-top"><span>{k.label}</span><span className={`kpi-icon ${k.color}`}><k.icon size={17}/></span></div><div className="kpi-value">{k.value}</div><p>{k.note}</p><div className={`kpi-bottom ${k.color}`}/></div>)}</div>
    <div className="charts-grid">
      <section className="panel chart-panel"><div className="panel-heading"><div><h3>80/20 PM vs CM Ratio</h3><p>Preventive vs corrective distribution</p></div></div><div className="donut-layout"><div className="donut-wrap"><ResponsiveContainer width="100%" height={190}><PieChart><Pie data={total?ratioData:[{name:'No data',value:1,color:'var(--line)'}]} dataKey="value" innerRadius={62} outerRadius={80} paddingAngle={total?4:0} stroke="none">{(total?ratioData:[{color:'var(--line)'}]).map((d,i)=><Cell fill={d.color} key={i}/>)}</Pie></PieChart></ResponsiveContainer><div className="donut-center"><strong>{pmPct}%</strong><span>PM</span></div></div><div className="chart-legend">{ratioData.map(d=><button key={d.name} onClick={()=>onDrill(d.name==='PM'?{maintenance_type:'PM'}:{})}><i style={{background:d.color}}/><span>{d.name}</span><strong>{d.value}</strong><small>{total?Math.round(d.value/total*100):0}%</small></button>)}</div></div></section>
      <section className="panel chart-panel"><div className="panel-heading"><div><h3>PM Volume by Frequency</h3><p>Recurrence distribution</p></div></div>{byFreq.length?<div className="bar-chart"><ResponsiveContainer width="100%" height={190}><BarChart data={byFreq} margin={{top:15,right:8,left:-24,bottom:0}}><CartesianGrid vertical={false} strokeDasharray="3 4" stroke="var(--line)"/><XAxis dataKey="name" tick={{fontSize:10,fill:'var(--muted-ink)'}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{fontSize:10,fill:'var(--muted-ink)'}} axisLine={false} tickLine={false}/><Tooltip cursor={{fill:'var(--hover)'}} contentStyle={{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:8}}/><Bar dataKey="value" name="PM jobs" fill="var(--chart-2)" radius={[4,4,0,0]} maxBarSize={34} cursor="pointer" onClick={d=>onDrill({maintenance_type:'PM'})}/></BarChart></ResponsiveContainer></div>:<div className="chart-empty"><BarChart3 size={30}/><span>No PM jobs yet</span><p>PM volume appears as you add preventive maintenance.</p></div>}</section>
    </div>
    {completionByUnit.length>0&&<section className="panel chart-panel" style={{marginTop:16}}><div className="panel-heading"><div><h3>PM Completion by Unit</h3><p>Completed vs total per unit</p></div></div><div className="bar-chart"><ResponsiveContainer width="100%" height={200}><BarChart data={completionByUnit} margin={{top:15,right:8,left:-24,bottom:0}}><CartesianGrid vertical={false} strokeDasharray="3 4" stroke="var(--line)"/><XAxis dataKey="name" tick={{fontSize:10,fill:'var(--muted-ink)'}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{fontSize:10,fill:'var(--muted-ink)'}} axisLine={false} tickLine={false}/><Tooltip cursor={{fill:'var(--hover)'}} contentStyle={{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:8}}/><Bar dataKey="total" name="Total PM" fill="var(--chart-2)" radius={[4,4,0,0]} maxBarSize={28}/><Bar dataKey="completed" name="Completed" fill="var(--chart-3)" radius={[4,4,0,0]} maxBarSize={28}/></BarChart></ResponsiveContainer></div></section>}
  </>;
}