import db from '@/lib/db';

import { format, differenceInCalendarDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export const today = () => format(new Date(), 'yyyy-MM-dd');

// Official Plant Priority SLA Matrix — aged days threshold per priority
export const SLA_THRESHOLDS = { 'Critical': 0, 'High': 4, 'Medium': 15, 'Low': 45, 'Shutdown Item': null };

export const slaThreshold = (priority) => SLA_THRESHOLDS[priority] ?? null;

// Days a job has been overdue, based on earliest planned date (start/finish)
export const overdueDays = (j) => {
  if (j.status !== 'Open' && j.status !== 'In-Progress') return 0;
  const t = today();
  const dates = [j.planned_start, j.planned_finish].filter(Boolean).map(d => { const m = String(d).match(/\d{4}-\d{2}-\d{2}/); return m ? m[0] : ''; }).filter(Boolean).sort();
  if (!dates.length || dates[0] >= t) return 0;
  return differenceInCalendarDays(new Date(t + 'T12:00:00'), new Date(dates[0] + 'T12:00:00'));
};

// Aged only when overdue days exceed the priority's SLA threshold (Shutdown excluded)
export const aged = (j) => {
  if (j.shutdown_item) return 0; // Shutdown Item — never ages
  const threshold = slaThreshold(j.priority);
  if (threshold === null) return 0;
  const od = overdueDays(j);
  return od > threshold ? od : 0;
};

// Effective priority label (Shutdown Item overrides stored priority)
export const effectivePriority = (j) => j.shutdown_item ? 'Shutdown Item' : (j.priority || 'Medium');

// CSS class suffix for a priority badge
export const priorityClass = (j) => {
  const p = effectivePriority(j);
  if (p === 'Shutdown Item') return 'shutdown';
  return (p || 'medium').toLowerCase();
};

// Plant category display names for each internal priority value
export const PRIORITY_LABELS = { 'Critical': 'Emergency', 'High': 'Urgent', 'Medium': 'Normal', 'Low': 'Low Priority', 'Shutdown Item': 'Shutdown (P5)' };
export const priorityLabel = (j) => PRIORITY_LABELS[effectivePriority(j)] || effectivePriority(j);

export const isAged = (j) => aged(j) > 0;

// Next PM date from a frequency + base date
export const nextPMDate = (frequency, fromDate = new Date()) => {
  const base = typeof fromDate === 'string' ? new Date(fromDate + 'T12:00:00') : new Date(fromDate);
  switch (frequency) {
    case 'Weekly': return format(new Date(base.getTime() + 7 * 86400000), 'yyyy-MM-dd');
    case 'Monthly': return format(new Date(base.getFullYear(), base.getMonth() + 1, base.getDate()), 'yyyy-MM-dd');
    case 'Quarterly': return format(new Date(base.getFullYear(), base.getMonth() + 3, base.getDate()), 'yyyy-MM-dd');
    case 'Semi-Annual': return format(new Date(base.getFullYear(), base.getMonth() + 6, base.getDate()), 'yyyy-MM-dd');
    case 'Annual': return format(new Date(base.getFullYear() + 1, base.getMonth(), base.getDate()), 'yyyy-MM-dd');
    default: return '';
  }
};

export const pmFrequencies = ['Weekly', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual'];
export const priorities = ['Critical', 'High', 'Medium', 'Low', 'Shutdown Item'];
export const systems = ['Boiler', 'Turbine', 'Water Treatment', 'Fuel Handling', 'Balance of Plant'];
export const statuses = ['Open', 'In-Progress', 'Completed', 'Deferred'];
export const units = ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Common'];

export const convertPriority = (raw) => {
  if (raw === null || raw === undefined || raw === '') return null;
  const s = String(raw).trim().toUpperCase();
  if (s === '1' || s === 'EMERGENCY' || s === 'CRITICAL') return { priority: 'Critical', job_type: 'Break-In' };
  if (s === '2' || s === 'HIGH') return { priority: 'High', job_type: 'Scheduled' };
  if (s === '3' || s === 'MEDIUM' || s === 'NORMAL') return { priority: 'Medium', job_type: 'Scheduled' };
  if (s === '4' || s === 'LOW') return { priority: 'Low', job_type: 'Scheduled' };
  if (s === '5' || s === 'SD' || s === 'SHUTDOWN') return { priority: 'Low', job_type: 'Scheduled', shutdown_item: true };
  return null;
};

export const api = async (action, payload = {}) => {
  const r = await db.functions.invoke('plantWorkspace', { action, ...payload });
  if (r.data.error) throw Error(r.data.error);
  return r.data;
};

export const rangeFor = period => {
  const d = new Date();
  return period === 'Today' ? [today(), today()]
    : period === 'This Week' ? [format(startOfWeek(d, { weekStartsOn: 0 }), 'yyyy-MM-dd'), format(endOfWeek(d, { weekStartsOn: 0 }), 'yyyy-MM-dd')]
    : [format(startOfMonth(d), 'yyyy-MM-dd'), format(endOfMonth(d), 'yyyy-MM-dd')];
};

export const inRange = (j, range) => {
  const d = j.planned_start || j.created_date?.slice(0, 10);
  return d >= range[0] && d <= range[1];
};

export const errorText = e => e.response?.data?.error || e.message || 'Unable to complete this action.';

export const lookupItem = async (workspace_id, code) => {
  if (!code || !code.trim()) return null;
  try {
    const r = await api('itemLookup', { workspace_id, code: code.trim().toUpperCase() });
    return r.items?.[0] || null;
  } catch {
    return null;
  }
};

export const fetchSystems = async (workspace_id) => {
  try { const r = await api('listSystems', { workspace_id }); return r.systems || []; } catch { return []; }
};
export const fetchItems = async (workspace_id) => {
  try { const r = await api('listItems', { workspace_id }); return r.items || []; } catch { return []; }
};
export const greeting = () => {
  const h = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', hour12: false }));
  return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
};
export const exportBreakInsCSV = (orders) => {
  const breakIns = orders.filter(j => j.job_type === 'Break-In');
  if (!breakIns.length) return;
  const headers = ['WO Number','Description','Equipment Tag','Unit','System','Priority','Status','Technician','Planned Start','Action Taken','As Found','As Left'];
  const rows = breakIns.map(j => [j.wo_number,j.description,j.equipment_tag,j.unit,j.system,j.priority,j.status,j.technician,j.planned_start,j.action_taken,j.as_found,j.as_left]);
  const csv = [headers,...rows].map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `break-ins-${today()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportAllWorkOrdersCSV = (orders) => {
  if (!orders.length) return;
  const headers = ['WO Number','Description','Equipment Tag','Unit','System','Priority','Job Type','Status','Assigned Manpower','Planned Start','Planned Finish','PTW Number','Deferred Reason','PR Number','Action Taken','As Found','As Left'];
  const rows = orders.map(j => [j.wo_number,j.description,j.equipment_tag,j.unit,j.system,j.priority,j.job_type,j.status,j.technician,j.planned_start,j.planned_finish,j.ptw_number,j.deferred_reason,j.pr_number,j.action_taken,j.as_found,j.as_left]);
  const csv = [headers,...rows].map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `work-orders-${today()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const parseLine = (line) => {
    const cells = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (c === ',' && !inQ) { cells.push(cur); cur = ''; }
      else cur += c;
    }
    cells.push(cur);
    return cells;
  };
  const headers = parseLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/^location$/, 'bin_location'));
  return lines.slice(1).map(l => {
    const cells = parseLine(l);
    const row = {};
    headers.forEach((h, i) => { row[h] = (cells[i] || '').trim(); });
    return row;
  });
};

const downloadCSV = (filename, headers, rows) => {
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportItemsCSV = (items) => {
  if (!items.length) return;
  downloadCSV(`item-master-${today()}.csv`, ['Code', 'Description', 'Bin Location', 'Stock', 'Unit', 'Category'], items.map(i => [i.code, i.description, i.bin_location, i.stock, i.unit, i.category]));
};

export const exportSystemsCSV = (systems) => {
  if (!systems.length) return;
  downloadCSV(`system-registry-${today()}.csv`, ['Unit', 'System Name', 'Area'], systems.map(s => [s.unit, s.system_name, s.area]));
};

export const exportPMCSV = (orders) => {
  const pms = orders.filter(j => j.maintenance_type === 'PM');
  if (!pms.length) return;
  downloadCSV(`pm-schedule-${today()}.csv`, ['WO Number','Description','Equipment Tag','Unit','System','Priority','PM Frequency','Status','Assigned Manpower','Planned Start','Planned Finish','Action Taken','As Found','As Left'], pms.map(j => [j.wo_number,j.description,j.equipment_tag,j.unit,j.system,j.priority,j.pm_frequency,j.status,j.technician,j.planned_start,j.planned_finish,j.action_taken,j.as_found,j.as_left]));
};

// Active backlog = Open + In-Progress (not yet completed/deferred)
export const isBacklog = (j) => j.status === 'Open' || j.status === 'In-Progress';

// Standard plant priority color palette (hex) for charts/legends
export const PRIORITY_COLORS = { 'Critical': '#dc2626', 'High': '#ea580c', 'Medium': '#ca8a04', 'Low': '#3b82f6', 'Shutdown Item': '#9333ea' };

export const safeFormatDate = (value, fmt = 'EEEE, dd MMMM yyyy') => {
  try {
    if (!value) return '';
    const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T12:00:00') : new Date(value);
    if (isNaN(d.getTime())) return '';
    return format(d, fmt);
  } catch {
    return '';
  }
};

const normDate = v => {
  if (!v) return '';
  const m = String(v).match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : '';
};

const val = (v, fb) => { const s = (v === null || v === undefined) ? '' : String(v).trim(); return s && s !== 'null' && s !== 'undefined' ? s : fb; };

export const formatShiftSummary = (orders, workspace, shiftDate) => {
  const target = normDate(shiftDate) || today();
  const date = safeFormatDate(target, 'MMMM dd, yyyy');
  const executedStatuses = ['In-Progress', 'Completed', 'Deferred'];
  const localDateStr = v => {
    if (!v) return '';
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    try { const d = new Date(s); if (!isNaN(d.getTime())) return d.toLocaleString('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }); } catch {}
    return normDate(s);
  };
  // Match by ACTUAL FINISH / COMPLETED DATE (completion_time) for completed jobs,
  // and by actual start (start_time) or planned start for in-progress/deferred jobs.
  // Never match by planned_finish.
  const matchDate = j => {
    if (j.status === 'Completed' && j.completion_time) return localDateStr(j.completion_time) === target;
    if (j.completion_time && localDateStr(j.completion_time) === target) return true;
    if (j.start_time && localDateStr(j.start_time) === target) return true;
    return localDateStr(j.planned_start) === target;
  };
  let shiftOrders = orders.filter(matchDate);
  shiftOrders = shiftOrders.filter(j => executedStatuses.includes(j.status));
  shiftOrders = shiftOrders.map(j => ({
    ...j,
    wo_number: j.wo_number || j.break_in_id || j.wonum || 'BREAK-IN',
    description: j.description || j.equipment_name || '',
    as_found: j.as_found || j.findings || '',
    action_taken: j.action_taken || j.work_done || j.rectification || '',
    as_left: j.as_left || j.status_left || '',
    unit: j.unit || 'Unit 1',
  }));
  const inProgress = shiftOrders.filter(j => j.status === 'In-Progress').length;
  const completed = shiftOrders.filter(j => j.status === 'Completed').length;
  const deferred = shiftOrders.filter(j => j.status === 'Deferred').length;
  const breakIns = shiftOrders.filter(j => j.job_type === 'Break-In').length;
  const lines = [];
  lines.push('--------------------------------------------------');
  lines.push('ICMS DAILY ACCOMPLISHMENT REPORT');
  lines.push(`Date: ${date}`);
  lines.push('Plant: I&C Maintenance');
  lines.push('--------------------------------------------------');
  lines.push(`TOTAL EXECUTED JOBS: ${shiftOrders.length}`);
  lines.push(`    • In Progress: ${inProgress}`);
  lines.push(`    • Completed  : ${completed}`);
  lines.push(`    • Deferred   : ${deferred}`);
  lines.push(`    • Break-Ins  : ${breakIns}`);
  lines.push('--------------------------------------------------');
  lines.push('');
  const unitOrder = ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Common'];
  let printed = false;
  for (const unit of unitOrder) {
    const unitOrders = shiftOrders.filter(j => j.unit === unit);
    if (!unitOrders.length) continue;
    printed = true;
    lines.push(`[${unit.toUpperCase()}]`);
    lines.push('');
    for (const j of unitOrders) {
      const defFb = j.status === 'Deferred' ? 'Deferred - Pending Reschedule / Details' : '';
      lines.push(`WO/BREAK-IN #: ${val(j.wo_number, 'N/A')} | ${val(j.description, 'No Description')}`);
      lines.push(`PTW #: ${val(j.ptw_number, 'N/A')}`);
      lines.push(`MANPOWER: ${val(j.technician, 'Unassigned')}`);
      lines.push('');
      lines.push('FINDINGS / AS FOUND:');
      lines.push(val(j.as_found, defFb || 'Routine check / troubleshooting in progress.'));
      lines.push('');
      lines.push('WORK DONE:');
      lines.push(val(j.action_taken, defFb || 'Rectification / action in progress.'));
      lines.push('');
      lines.push('AS LEFT:');
      lines.push(val(j.as_left, defFb || 'System normalized / standby for testing.'));
      lines.push('');
      lines.push(`STATUS: ${val(j.status, 'N/A')}`);
      lines.push('--------------------------------------------------');
    }
  }
  if (!printed) {
    lines.push('No work orders found for the selected date.');
    lines.push('--------------------------------------------------');
  }
  return lines.join('\n');
};