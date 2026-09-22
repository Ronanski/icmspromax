import React, { useState, useMemo } from 'react';
import { Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import StatusBadge from '@/components/plant/StatusBadge';
import { today, priorityClass, priorityLabel, effectivePriority } from '@/components/plant/plantUtils';

const PAGE = 3;
const PRIO_ORDER = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3, 'Shutdown Item': 4 };

// Column 1 — active break-in jobs for today, priority-sorted with pagination.
export default function TodayBreakInList({ orders, onOpen }) {
  const [page, setPage] = useState(0);
  const t = today();
  const jobs = useMemo(() => orders
    .filter(j => j.job_type === 'Break-In' && (j.planned_start === t || j.status === 'Open' || j.status === 'In-Progress'))
    .sort((a, b) => (PRIO_ORDER[effectivePriority(a)] ?? 5) - (PRIO_ORDER[effectivePriority(b)] ?? 5)),
    [orders, t]);
  const pageCount = Math.max(1, Math.ceil(jobs.length / PAGE));
  const cur = Math.min(page, pageCount - 1);
  const pageJobs = jobs.slice(cur * PAGE, cur * PAGE + PAGE);
  const showPager = jobs.length > PAGE;

  return (
    <div className="panel">
      <div className="panel-heading">
        <h3><span className="section-indicator"/>Today's Break-Ins</h3>
        <span className="count-badge">{jobs.length}</span>
      </div>
      <div className="panel-body">
        {jobs.length ? (
          <div className="mini-list">
            {pageJobs.map(j => (
              <button key={j.id} className="mini-list-item flex flex-col gap-1 px-3 py-2" onClick={() => onOpen(j)}>
                <div className="mini-top">
                  <strong>{j.wo_number}</strong>
                  <span className={`priority priority-${priorityClass(j)}`}><i/>{priorityLabel(j)}</span>
                </div>
                <span className="mini-desc text-xs font-normal leading-normal tracking-normal text-muted-foreground align-baseline">{j.description}</span>
                <div className="mt-1 leading-none"><StatusBadge status={j.status}/></div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mini-empty">
            <Zap size={22}/>
            <h4>No break-ins today</h4>
            <p>No emergency or unscheduled jobs active for this shift.</p>
          </div>
        )}
        {showPager && (
          <div className="mini-pager">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={cur === 0} aria-label="Previous page"><ChevronLeft size={14}/></button>
            <span className="muted text-sm">Page {cur + 1} of {pageCount}</span>
            <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={cur >= pageCount - 1} aria-label="Next page"><ChevronRight size={14}/></button>
          </div>
        )}
      </div>
    </div>
  );
}