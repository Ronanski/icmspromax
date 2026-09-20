import React from 'react';
import { Clock, TrendingUp } from 'lucide-react';
import { today } from '@/components/plant/plantUtils';

// Compact gauge: Shift Hours Elapsed vs Planned WO Completion %.
export default function ShiftProgressTracker({ orders }) {
  const t = today();
  const todays = orders.filter(j => j.planned_start === t || (j.status === 'Completed' && j.completion_time?.slice(0, 10) === t));
  const completed = todays.filter(j => j.status === 'Completed').length;
  const completionPct = todays.length ? Math.round((completed / todays.length) * 100) : 0;

  // Standard 8-hour shift, 08:00–16:00 local
  const now = new Date();
  const shiftStart = new Date(now); shiftStart.setHours(8, 0, 0, 0);
  const shiftEnd = new Date(now); shiftEnd.setHours(16, 0, 0, 0);
  let elapsedPct;
  if (now <= shiftStart) elapsedPct = 0;
  else if (now >= shiftEnd) elapsedPct = 100;
  else elapsedPct = Math.round(((now - shiftStart) / (shiftEnd - shiftStart)) * 100);

  return <div className="panel progress-tracker">
    <div className="panel-heading">
      <h3>Shift Progress Tracker</h3>
      <span className="tiny-label">TODAY</span>
    </div>
    <div className="progress-rows">
      <div className="progress-row">
        <div className="progress-row-top"><span><Clock size={13}/> Shift Hours Elapsed</span><strong>{elapsedPct}%</strong></div>
        <div className="progress-bar"><div style={{ width: `${elapsedPct}%` }}/></div>
      </div>
      <div className="progress-row">
        <div className="progress-row-top"><span><TrendingUp size={13}/> Planned WO Completion</span><strong>{completionPct}% · {completed}/{todays.length}</strong></div>
        <div className="progress-bar"><div style={{ width: `${completionPct}%`, background: 'var(--green)' }}/></div>
      </div>
    </div>
  </div>;
}