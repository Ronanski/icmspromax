import React, { useState } from 'react';
import { Zap, ArrowRight, Clock3, CalendarCheck2, AlertTriangle, Plus, ChevronLeft, ChevronRight, CircleDot, Loader, CheckCircle2 } from 'lucide-react';
import StatusBadge from '@/components/plant/StatusBadge';
import { today, aged, effectivePriority, priorityClass, priorityLabel } from '@/components/plant/plantUtils';

const PRIO_ORDER = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3, 'Shutdown Item': 4 };
const PAGE = 2;

export default function FocusCards({ orders, onOpen, onCreate, onView }) {
  const [page, setPage] = useState(0);
  const t = today();
  // ALL work orders scheduled for today (Open, In-Progress, Deferred, Completed), sorted by priority descending
  const jobs = orders
    .filter(j => j.job_type !== 'Break-In' && (j.planned_start === t || (j.status === 'Completed' && j.completion_time?.slice(0, 10) === t)))
    .sort((a, b) => (PRIO_ORDER[effectivePriority(a)] ?? 5) - (PRIO_ORDER[effectivePriority(b)] ?? 5));
  const breakInsToday = orders.filter(j => j.job_type === 'Break-In' && (j.planned_start === t || j.created_date?.slice(0, 10) === t || j.status === 'Open' || j.status === 'In-Progress')).length;
  const overdue = orders.filter(j => aged(j));
  const pageCount = Math.max(1, Math.ceil(jobs.length / PAGE));
  const cur = Math.min(page, pageCount - 1);
  const pageJobs = jobs.slice(cur * PAGE, cur * PAGE + PAGE);
  const showPager = jobs.length > PAGE;
  const metrics = [
    { label: 'Scheduled', icon: CalendarCheck2, count: jobs.length, filter: { today: true } },
    { label: 'Break-Ins', icon: Zap, count: breakInsToday, filter: { today: true, job_type: 'Break-In' } },
    { label: 'In Progress', icon: Loader, count: jobs.filter(j => j.status === 'In-Progress').length, filter: { today: true, status: 'In-Progress' } },
    { label: 'Completed', icon: CheckCircle2, count: jobs.filter(j => j.status === 'Completed').length, filter: { today: true, status: 'Completed' } },
  ];

  return <>
    <div className="focus-section-heading">
      <h2><span className="section-indicator"/>Today's Scheduled Work <span className="count-badge">{jobs.length}</span></h2>
      <div className="focus-heading-actions">
        <button className="text-button" onClick={() => onView({ today: true })}>View all jobs<ArrowRight size={14}/></button>
      </div>
    </div>
    <div className="focus-mini-metrics" aria-label="Today's work metrics">
      {metrics.map(metric => <button key={metric.label} type="button" onClick={() => onView(metric.filter)}><strong>{metric.count}</strong><span><metric.icon size={14}/>{metric.label}</span></button>)}
    </div>
    <div className="focus-grid">
      <div className="scheduled-panel">
      <div className="scheduled-cards">
        {jobs.length ? pageJobs.map(j => (
          <button className="scheduled-card" key={j.id} onClick={() => onOpen(j)}>
            <div className="job-card-top">
              <span className="wo-id">{j.wo_number}</span>
              <span className={`priority priority-${priorityClass(j)}`}><i/>{priorityLabel(j)}</span>
            </div>
            <h3>{j.description}</h3>
            <p>{j.equipment_tag || 'No equipment tag'}<span>•</span>{j.system || 'Unassigned system'}</p>
            <div className="job-card-bottom">
              <StatusBadge status={j.status}/>
              <span><Clock3 size={13}/>{j.technician || 'Unassigned'}</span>
            </div>
          </button>
        )) : (
          <div className="scheduled-empty">
            <span className="empty-icon"><CalendarCheck2 size={26}/></span>
            <h3>A clear view of your shift starts here</h3>
            <p>No open work orders scheduled for today.<br/>Add a job or import your plant's maintenance schedule.</p>
            <button className="text-button" onClick={() => onCreate('Scheduled')}><Plus size={15}/>Create work order<ArrowRight size={14}/></button>
          </div>
        )}
      </div>
        {showPager && (
          <div className="scheduled-pager">
            <div className="page-selector">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={cur === 0} aria-label="Previous page"><ChevronLeft size={14}/></button>
              <span>{cur + 1} of {pageCount}</span>
              <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={cur >= pageCount - 1} aria-label="Next page"><ChevronRight size={14}/></button>
            </div>
          </div>
        )}
      </div>
      <div className="breakin-card">
        <span className="breakin-icon"><Zap size={21}/></span>
        <span className="tiny-label">UNPLANNED. NOT UNTRACKED.</span>
        <h3>Something needs<br/>immediate attention?</h3>
        <p>Capture emergency and break-in work.<br/>No official WO number required.</p>
        <button onClick={() => onCreate('Break-In')}><Plus size={16}/>Add Emergency / Break-In Job</button>
      </div>
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