import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { aged, overdueDays, slaThreshold } from '@/components/plant/plantUtils';

// One-line alert strip: active work orders that are Aged or nearing SLA breach.
export default function SLAAgingStrip({ orders, onView }) {
  const active = orders.filter(j => j.status === 'Open' || j.status === 'In-Progress');
  const agedJobs = active.filter(j => aged(j) > 0);
  const nearing = active.filter(j => {
    if (j.shutdown_item) return false;
    const threshold = slaThreshold(j.priority);
    if (threshold === null || threshold === 0) return false;
    const od = overdueDays(j);
    return od > 0 && (threshold - od) <= 1 && od < threshold;
  });
  const total = agedJobs.length + nearing.length;

  if (!total) return null;
  return <button className="sla-strip warn" onClick={() => onView({ status: 'Aged' })}>
    <AlertTriangle size={16}/>
    <span><strong>{agedJobs.length} aged</strong>{nearing.length > 0 ? ` · ${nearing.length} nearing SLA breach` : ''} — review before they escalate.</span>
  </button>;
}