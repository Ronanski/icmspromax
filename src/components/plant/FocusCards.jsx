import React from 'react';
import { Zap, ArrowRight, CalendarCheck2, AlertTriangle, Plus, Loader, CheckCircle2 } from 'lucide-react';
import OrderTable from '@/components/plant/OrderTable';
import { today, aged, effectivePriority, isTodayJob } from '@/components/plant/plantUtils';

const PRIO_ORDER = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3, 'Shutdown Item': 4 };
const DONE_STATUSES = ['Completed', 'Done'];
export default function FocusCards({ orders, onOpen, onCreate, onView }) {
  const t = today();
  const isDone = j => DONE_STATUSES.includes(j.status);
  // PlantDesk supplies today's set; keep this guard so this view can never show
  // or count a past/future order if it is reused with an unfiltered list.
  const isBreakIn = j => j._table === 'breakin_orders' || j.job_type === 'Break-In';
  const todays = (orders || []).filter(j => isTodayJob(j, t));
  // Work orders dated today (Open, In-Progress, Deferred, Completed), highest priority first
  const jobs = todays
    .filter(j => !isBreakIn(j))
    .sort((a, b) => (PRIO_ORDER[effectivePriority(a)] ?? 5) - (PRIO_ORDER[effectivePriority(b)] ?? 5));
  const todaysBreakIns = todays.filter(isBreakIn);
  const breakInsToday = todaysBreakIns.length;
  const overdue = (orders || []).filter(j => aged(j));
  const scheduledDoneCount = jobs.filter(isDone).length;
  const breakInsDoneCount = todaysBreakIns.filter(isDone).length;
  const inProgressToday = jobs.filter(j => j.status === 'In-Progress').length
    + todaysBreakIns.filter(j => j.status === 'In-Progress').length;
  const metrics = [
    { label: 'Scheduled', icon: CalendarCheck2, count: jobs.length, filter: { today: true } },
    { label: 'Break-Ins', icon: Zap, count: breakInsToday, filter: { today: true, job_type: 'Break-In' } },
    { label: 'In Progress', icon: Loader, count: inProgressToday, filter: { today: true, status: 'In-Progress' } },
    { label: 'Completed', icon: CheckCircle2, count: scheduledDoneCount + breakInsDoneCount, filter: { today: true, statuses: DONE_STATUSES } },
  ];

  return <>
    <div className="focus-mini-metrics" aria-label="Today's work metrics">
      {metrics.map(metric => <button key={metric.label} type="button" onClick={() => onView(metric.filter)}><strong>{metric.count}</strong><span><metric.icon size={14}/>{metric.label}</span></button>)}
    </div>
    <OrderTable orders={jobs} onOpen={onOpen} title="Today's Corrective Maintenance Execution Queue" limited/>
    {!jobs.length && <button className="focus-empty-action text-button" onClick={() => onCreate('Scheduled')}><Plus size={15}/>Create work order<ArrowRight size={14}/></button>}
    <div className="breakin-card breakin-card-horizontal">
        <span className="breakin-icon"><Zap size={21}/></span>
        <div><span className="tiny-label">UNPLANNED. NOT UNTRACKED.</span><h3>Something needs immediate attention?</h3><p>Capture emergency and break-in work. No official WO number required.</p></div>
        <button onClick={() => onCreate('Break-In')}><Plus size={16}/>Add Emergency / Break-In Job</button>
    </div>
    {overdue.length > 0 && (
      <button className="aged-banner" onClick={() => onView({ status: 'Aged' })}>
        <AlertTriangle size={17}/>
        <strong>{overdue.length} aged work orders require attention</strong>
        <span>Past planned finish date</span>
        <ArrowRight size={16}/>
      </button>
    )}
  </>;
}
