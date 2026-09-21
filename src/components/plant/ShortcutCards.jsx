import React, { useState } from 'react';
import { ChartNoAxesCombined, CalendarDays, ListPlus, ClipboardList, Zap, Repeat, AlarmClock, Layers, Plus, Package, Network, SlidersHorizontal } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

// Everything a supervisor can pin to the shortcut card.
export const SHORTCUT_CATALOG = {
  analytics: { icon: ChartNoAxesCombined, title: 'Analytics', sub: 'Schedule compliance and break-in ratio', tab: 'analytics', admin: true },
  calendar: { icon: CalendarDays, title: 'Work Calendar', sub: 'Planned versus completed jobs', tab: 'calendar' },
  logger: { icon: ListPlus, title: 'Fast Break-In Logger', sub: 'Log several backlogged work orders', action: 'logger' },
  orders: { icon: ClipboardList, title: 'Work Order Register', sub: 'Every corrective job in one list', tab: 'orders' },
  breakins: { icon: Zap, title: 'Break-In Hub', sub: 'Unscheduled and emergency work', tab: 'breakins' },
  pm: { icon: Repeat, title: 'Preventive Maintenance', sub: 'Recurring maintenance schedule', tab: 'pm' },
  newwo: { icon: Plus, title: 'New Work Order', sub: 'Raise a job straight away', action: 'create' },
  aged: { icon: AlarmClock, title: 'Past SLA Jobs', sub: 'Work orders beyond their priority target', filter: { status: 'Aged' } },
  backlog: { icon: Layers, title: 'Active Backlog', sub: 'Everything still waiting to be closed', filter: { status: 'Backlog' } },
  items: { icon: Package, title: 'Item Master', sub: 'Spare parts and stock levels', tab: 'items', admin: true },
  systems: { icon: Network, title: 'System Registry', sub: 'Plant systems and areas', tab: 'systems', admin: true },
};

export const DEFAULT_SHORTCUTS = ['analytics', 'calendar', 'logger'];

// Column 2 — shortcut cards the user chooses themselves.
export default function ShortcutCards({ onTab, onLogger, onFilter, onCreate, shortcuts = DEFAULT_SHORTCUTS, onChange, admin = false }) {
  const [editing, setEditing] = useState(false);
  const available = Object.entries(SHORTCUT_CATALOG).filter(([, c]) => admin || !c.admin);
  const keys = (shortcuts && shortcuts.length ? shortcuts : DEFAULT_SHORTCUTS).filter(k => SHORTCUT_CATALOG[k] && (admin || !SHORTCUT_CATALOG[k].admin));

  const run = (card) => {
    if (card.action === 'logger') return onLogger?.();
    if (card.action === 'create') return onCreate?.('Scheduled');
    if (card.filter) return onFilter?.(card.filter);
    if (card.tab) return onTab?.(card.tab);
  };
  const toggle = (key) => {
    if (!onChange) return;
    const next = keys.includes(key) ? keys.filter(k => k !== key) : [...keys, key];
    onChange(next);
  };

  return (
    <div className="panel">
      <div className="panel-heading">
        <h3><span className="section-indicator"/>Shortcuts</h3>
        {onChange
          ? <button type="button" className="shortcut-config" onClick={() => setEditing(true)} aria-label="Customise shortcuts">
              <SlidersHorizontal size={14}/>Customise
            </button>
          : <span className="tiny-label">QUICK ACCESS</span>}
      </div>
      <div className="panel-body">
        <div className="shortcut-stack">
            {keys.length ? keys.map(key => {
              const c = SHORTCUT_CATALOG[key];
              return (
                <button key={key} className="panel nav-card" onClick={() => run(c)}>
                  <c.icon size={22}/>
                  <div className="shortcut-copy">
                    <strong>{c.title}</strong>
                    <span>{c.sub}</span>
                  </div>
                </button>
              );
            }) : <p className="shortcut-empty">No shortcuts pinned yet. Choose Customise to add some.</p>}
        </div>
      </div>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="shortcut-dialog">
          <DialogHeader><DialogTitle>Customise shortcuts</DialogTitle><DialogDescription>Choose the pages, filters, and quick actions shown on Today&apos;s Focus.</DialogDescription></DialogHeader>
          <div className="shortcut-dialog-grid">
            {available.map(([key, c]) => <label key={key} className={`shortcut-dialog-option${keys.includes(key)?' on':''}`}>
              <Checkbox checked={keys.includes(key)} onCheckedChange={() => toggle(key)} aria-label={c.title}/>
              <c.icon size={18}/><span><strong>{c.title}</strong><small>{c.sub}</small></span>
            </label>)}
          </div>
          <DialogFooter><button type="button" className="secondary-button" onClick={() => onChange(DEFAULT_SHORTCUTS)}>Reset defaults</button><button type="button" className="primary-button" onClick={() => setEditing(false)}>Done</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
