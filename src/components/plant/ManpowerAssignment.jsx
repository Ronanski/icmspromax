import React, { useMemo } from 'react';
import { Users } from 'lucide-react';
import { today } from '@/components/plant/plantUtils';

// Column 3 — active technicians on shift and their assigned work orders (derived from today's jobs).
export default function ManpowerAssignment({ orders, onOpen }) {
  const t = today();
  const techs = useMemo(() => {
    const map = new Map();
    for (const j of orders) {
      if (j.planned_start !== t) continue;
      const name = (j.technician || '').trim();
      if (!name) continue;
      if (!map.has(name)) map.set(name, { name, jobs: [] });
      map.get(name).jobs.push(j);
    }
    return [...map.values()];
  }, [orders, t]);

  return (
    <div className="panel">
      <div className="panel-heading">
        <h3><span className="section-indicator"/>Manpower & Assignments</h3>
        <span className="count-badge">{techs.length}</span>
      </div>
      <div className="panel-body">
        {techs.length ? (
          <div className="manpower-list">
            {techs.map(tc => (
              <div key={tc.name} className="manpower-row">
                <div className="manpower-row-top">
                  <span className="manpower-avatar">{tc.name.slice(0, 2).toUpperCase()}</span>
                  <span className="manpower-name">{tc.name}</span>
                  <span className="manpower-status">ON SHIFT</span>
                </div>
                <div className="manpower-wo-list">
                  {tc.jobs.map(j => (
                    <button key={j.id} className="manpower-wo" onClick={() => onOpen(j)} title={j.description}>{j.wo_number}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mini-empty">
            <Users size={22}/>
            <h4>No technicians assigned</h4>
            <p>Assign manpower to today's work orders to see the shift crew here.</p>
          </div>
        )}
      </div>
    </div>
  );
}