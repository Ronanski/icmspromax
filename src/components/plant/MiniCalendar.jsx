import db from '@/lib/mockDb';

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';

import SupervisorDailyLogModal from '@/components/plant/SupervisorDailyLogModal';

// Column 4 — interactive mini calendar. Clicking a date opens the Supervisor Daily Accomplishment Log modal.
export default function MiniCalendar({ workspace }) {
  const [cursor, setCursor] = useState(new Date());
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [cursor]);

  const load = async () => {
    if (!workspace?.id) return;
    try {
      const from = format(gridStart, 'yyyy-MM-dd');
      const to = format(gridEnd, 'yyyy-MM-dd');
      const all = await db.entities.SupervisorDailyLog.filter({ workspace_id: workspace.id }, '-log_date', 500);
      setLogs(all.filter(l => l.log_date >= from && l.log_date <= to));
    } catch { setLogs([]); }
  };
  useEffect(() => { load(); }, [workspace?.id, cursor]);

  const logDates = new Set(logs.map(l => l.log_date));
  const openDate = d => { setSelectedDate(format(d, 'yyyy-MM-dd')); setModalOpen(true); };

  return (
    <div className="panel mini-cal-panel">
      <div className="panel-heading">
        <h3><span className="section-indicator"/>Daily Accomplishment Log</h3>
        <span className="tiny-label">SUPERVISOR</span>
      </div>
      <div className="mini-cal-header">
        <button onClick={() => setCursor(c => subMonths(c, 1))} aria-label="Previous month"><ChevronLeft size={15}/></button>
        <strong>{format(cursor, 'MMMM yyyy')}</strong>
        <button onClick={() => setCursor(c => addMonths(c, 1))} aria-label="Next month"><ChevronRight size={15}/></button>
      </div>
      <div className="mini-cal-weekdays">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="mini-cal-grid">
        {days.map(d => {
          const ds = format(d, 'yyyy-MM-dd');
          const inMonth = isSameMonth(d, cursor);
          const hasLog = logDates.has(ds);
          const todayFlag = isToday(d);
          return (
            <button key={ds} className={`mini-cal-day${!inMonth ? ' outside' : ''}${todayFlag ? ' today' : ''}`} onClick={() => openDate(d)}>
              <span>{format(d, 'd')}</span>
              {hasLog && <i className="mini-cal-dot"/>}
            </button>
          );
        })}
      </div>
      <p className="mini-cal-hint">Click any date to log or review daily accomplishments.</p>
      {modalOpen && <SupervisorDailyLogModal workspace={workspace} date={selectedDate} onClose={() => { setModalOpen(false); load(); }}/>}
    </div>
  );
}