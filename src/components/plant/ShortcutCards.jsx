import React from 'react';
import { ChartNoAxesCombined, CalendarDays, ListPlus } from 'lucide-react';

// Column 2 — vertical stack of shortcut action cards.
export default function ShortcutCards({ onTab, onLogger }) {
  const cards = [
    { icon: ChartNoAxesCombined, title: 'Analytics', sub: 'Schedule compliance · Break-in ratio', onClick: () => onTab('analytics'), badge: 'TODAY' },
    { icon: CalendarDays, title: 'Work Calendar', sub: 'Planned vs completed jobs', onClick: () => onTab('calendar') },
    { icon: ListPlus, title: 'Fast Break-In Logger', sub: 'Log multiple backlogged WOs', onClick: onLogger }
  ];
  return (
    <div className="panel">
      <div className="panel-heading">
        <h3><span className="section-indicator"/>Shortcuts</h3>
        <span className="tiny-label">QUICK ACCESS</span>
      </div>
      <div className="panel-body">
        <div className="shortcut-stack">
          {cards.map(c => (
            <button key={c.title} className="panel nav-card" onClick={c.onClick}>
              <c.icon size={22}/>
              <div>
                <strong>{c.title}</strong>
                <span>{c.sub}</span>
              </div>
              {c.badge && <span className="today-badge">{c.badge}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}