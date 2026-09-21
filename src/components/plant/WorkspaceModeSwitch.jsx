import React, { useState, useRef, useEffect } from 'react';
import { Wrench, CalendarClock, ChevronDown, Check } from 'lucide-react';

// Custom CM / PM workspace selector dropdown for the sidebar.
export default function WorkspaceModeSwitch({ mode, onSwitch }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const options = [
    { key: 'cm', label: 'Corrective Maintenance', icon: Wrench, badge: 'cm' },
    { key: 'pm', label: 'Preventive Maintenance', icon: CalendarClock, badge: 'pm' }
  ];
  const cur = options.find(o => o.key === mode) || options[0];
  return (
    <div className="ws-mode-dropdown" ref={ref}>
      <button className="ws-mode-trigger" onClick={() => setOpen(o => !o)} aria-label="Switch workspace mode">
        <span className={`ws-mode-badge ${cur.badge}`}><cur.icon size={15}/></span>
        <span className="ws-mode-label">{cur.label}</span>
        <ChevronDown size={14} className={`ws-mode-chevron ${open ? 'open' : ''}`}/>
      </button>
      {open && (
        <div className="ws-mode-menu">
          {options.map(o => (
            <button key={o.key} className={`ws-mode-option ${o.key === mode ? 'selected' : ''}`} onClick={() => { onSwitch(o.key); setOpen(false); }}>
              <span className={`ws-mode-badge ${o.badge}`}><o.icon size={15}/></span>
              <span className="ws-mode-label">{o.label}</span>
              {o.key === mode && <Check size={14} className="ws-mode-check"/>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}