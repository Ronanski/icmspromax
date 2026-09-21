import React from 'react';
import {Activity, AlertTriangle, Zap, CalendarCheck} from 'lucide-react';
import {today, overdueDays, slaThreshold, effectivePriority, priorityClass, priorityLabel} from '@/components/plant/plantUtils';

const PRIO_ORDER = ['Critical', 'High', 'Medium', 'Low', 'Shutdown Item'];
const PRIO_SHORT = { 'Critical': 'Critical', 'High': 'High', 'Medium': 'Medium', 'Low': 'Low', 'Shutdown Item': 'Shutdown' };

export default function ShiftRadar({orders, onOpen, onView, compact=false}) {
  const t = today();
  const todays = orders.filter(j => j.planned_start === t || (j.status === 'Completed' && j.completion_time?.slice(0, 10) === t));
  const todaysActive = todays.filter(j => j.status !== 'Completed');
  const totalToday = todaysActive.length;

  // 1. Priority Breakdown Gauge
  const byPriority = PRIO_ORDER.map(p => ({
    p, label: PRIO_SHORT[p],
    count: todaysActive.filter(j => effectivePriority(j) === p).length
  }));

  // 2. SLA Risk — scheduled today and at/past the SLA aging threshold (within 24h of becoming AGED, or already aged)
  const slaRisk = todaysActive.filter(j => {
    if (j.shutdown_item) return false;
    const threshold = slaThreshold(j.priority);
    if (threshold === null) return false;
    return overdueDays(j) >= threshold;
  });

  // 3. One-Look Shift Action Bar
  const plannedExecution = todays.filter(j => j.job_type !== 'Break-In').length;
  const unscheduledBreakIns = todays.filter(j => j.job_type === 'Break-In').length;

  const segJob = p => ({ priority: p, shutdown_item: p === 'Shutdown Item' });

  return <section className={`panel radar-panel${compact ? ' radar-compact' : ''}`}>
    <div className="panel-heading">
      <h3><span className="section-indicator"/>Shift Operational Health &amp; Focus Radar</h3>
      <span className="tiny-label">ONE-LOOK</span>
    </div>

    {/* One-Look Shift Action Bar */}
    <div className="radar-action-bar">
      <div className="radar-action-tile planned">
        <span className="radar-action-icon"><CalendarCheck size={18}/></span>
        <div><strong>{plannedExecution}</strong><span>Planned Execution</span></div>
      </div>
      <div className="radar-action-divider"/>
      <div className="radar-action-tile breakin">
        <span className="radar-action-icon"><Zap size={18}/></span>
        <div><strong>{unscheduledBreakIns}</strong><span>Unscheduled Break-Ins</span></div>
      </div>
      <div className="radar-action-divider"/>
      <div className="radar-action-tile total">
        <span className="radar-action-icon"><Activity size={18}/></span>
        <div><strong>{totalToday}</strong><span>Total Active Today</span></div>
      </div>
    </div>

    {/* Priority Breakdown Gauge */}
    <div className="radar-section">
      <h4>Priority Breakdown — Today</h4>
      {totalToday > 0 ? <>
        <div className="radar-gauge">
          {byPriority.map(b => b.count > 0 && (
            <div key={b.p} className={`radar-gauge-seg priority-${priorityClass(segJob(b.p))}`} style={{flexGrow: b.count}} title={`${b.label}: ${b.count}`}/>
          ))}
        </div>
        <div className="radar-gauge-legend">
          {byPriority.filter(b => b.count > 0).map(b => (
            <button key={b.p} className="radar-legend-item" onClick={() => onView({priority: b.p})}>
              <i className={`priority-dot priority-${priorityClass(segJob(b.p))}`}/>
              <span>{b.label}</span><strong>{b.count}</strong>
            </button>
          ))}
        </div>
      </> : <p className="muted text-sm" style={{margin:0}}>No active work scheduled for today.</p>}
    </div>

    {/* SLA Risk Warning Banner (hidden in compact one-look mode) */}
    {!compact && slaRisk.length > 0 && <>
      <div className="radar-sla-banner" role="alert">
        <span className="radar-sla-icon"><AlertTriangle size={18}/></span>
        <div>
          <strong>{slaRisk.length} work order{slaRisk.length !== 1 ? 's' : ''} at SLA risk today</strong>
          <span>Scheduled today and at or past the SLA aging threshold — review before they breach.</span>
        </div>
        <button className="radar-sla-link" onClick={() => onView({status: 'Aged'})}>Review all</button>
      </div>
      <div className="radar-sla-list">
        {slaRisk.slice(0, 4).map(j => (
          <button key={j.id} className="radar-sla-item" onClick={() => onOpen(j)}>
            <span className={`priority priority-${priorityClass(j)}`}><i/>{priorityLabel(j)}</span>
            <strong>{j.wo_number}</strong>
            <span className="radar-sla-desc">{j.description}</span>
            <small>{overdueDays(j)}d overdue</small>
          </button>
        ))}
        {slaRisk.length > 4 && <button className="radar-sla-more" onClick={() => onView({status: 'Aged'})}>+{slaRisk.length - 4} more at risk</button>}
      </div>
    </>}
  </section>;
}