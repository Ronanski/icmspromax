import React, { useState } from 'react';
import { CalendarDays, X, Check } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const iso = (d) => (d ? format(d, 'yyyy-MM-dd') : '');
const toDate = (s) => (s ? new Date(s + 'T12:00:00') : undefined);
const short = (s) => (s ? format(toDate(s), 'dd MMM yyyy') : '');

// Minimalist date button → clean mini-calendar popup.
// Supports an exact date or a date range, plus quick presets.
export default function DateFilterButton({
  value = {},
  onChange,
  label = 'Any date',
  align = 'start',
  presets = true,
  className = '',
  size = 'sm',
  iconOnly = false,
}) {
  const [open, setOpen] = useState(false);
  const hasRange = !!(value.from && value.to && value.from !== value.to);
  const [mode, setMode] = useState(hasRange ? 'range' : 'date');
  const active = !!value.from;

  const apply = (next) => onChange(next);
  const clear = (e) => { e?.stopPropagation(); onChange({}); setOpen(false); };

  const setPreset = (from, to) => { apply({ from, to }); setOpen(false); };
  const now = new Date();
  const presetList = [
    ['Today', () => setPreset(iso(now), iso(now))],
    ['Tomorrow', () => { const d = new Date(now.getTime() + 86400000); setPreset(iso(d), iso(d)); }],
    ['This week', () => setPreset(iso(startOfWeek(now, { weekStartsOn: 0 })), iso(endOfWeek(now, { weekStartsOn: 0 })))],
    ['This month', () => setPreset(iso(startOfMonth(now)), iso(endOfMonth(now)))],
  ];

  const text = !active
    ? label
    : value.from === value.to || !value.to
      ? short(value.from)
      : `${short(value.from)} – ${short(value.to)}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn('date-pick-btn', active && 'is-active', size === 'xs' && 'xs', iconOnly && 'icon-only', className)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Choose a date or date range"
          title={active ? text : label}
        >
          <CalendarDays size={size === 'xs' ? 12 : 14} />
          {!iconOnly && <span>{text}</span>}
          {!iconOnly && active && <span className="date-pick-clear" role="button" aria-label="Clear date filter" onClick={clear}><X size={11} /></span>}
          {iconOnly && active && <span className="date-pick-dot" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="date-pick-pop w-auto p-0 pointer-events-auto" align={align} onClick={(e) => e.stopPropagation()}>
        <div className="date-pick-modes">
          <button type="button" className={mode === 'date' ? 'on' : ''} onClick={() => setMode('date')}>Exact date</button>
          <button type="button" className={mode === 'range' ? 'on' : ''} onClick={() => setMode('range')}>Date range</button>
        </div>
        {mode === 'date' ? (
          <Calendar
            mode="single"
            selected={toDate(value.from)}
            defaultMonth={toDate(value.from) || now}
            onSelect={(d) => { if (d) { apply({ from: iso(d), to: iso(d) }); setOpen(false); } }}
            className="p-3 pointer-events-auto"
          />
        ) : (
          <Calendar
            mode="range"
            numberOfMonths={1}
            defaultMonth={toDate(value.from) || now}
            selected={{ from: toDate(value.from), to: toDate(value.to) }}
            onSelect={(r) => apply({ from: iso(r?.from), to: iso(r?.to || r?.from) })}
            className="p-3 pointer-events-auto"
          />
        )}
        {presets && (
          <div className="date-pick-presets">
            {presetList.map(([l, fn]) => <button type="button" key={l} onClick={fn}>{l}</button>)}
          </div>
        )}
        <div className="date-pick-foot">
          <button type="button" onClick={clear}>Clear</button>
          <button type="button" className="ok" onClick={() => setOpen(false)}><Check size={12} />Done</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
