import db from '@/lib/db';

import { format, differenceInCalendarDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export const today = () => format(new Date(), 'yyyy-MM-dd');

// Official Plant Priority SLA Matrix — aged days threshold per priority
export const SLA_THRESHOLDS = { 'Critical': 0, 'High': 4, 'Medium': 15, 'Low': 45, 'Shutdown Item': null };

export const slaThreshold = (priority) => SLA_THRESHOLDS[priority] ?? null;

// Days a job has been overdue, based on earliest planned date (start/finish)
export const overdueDays = (j) => {
  if (!['Open', 'In-Progress', 'Pending Parts'].includes(j.status)) return 0;
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
    case 'Daily': return format(new Date(base.getTime() + 86400000), 'yyyy-MM-dd');
    case 'Weekly': return format(new Date(base.getTime() + 7 * 86400000), 'yyyy-MM-dd');
    case 'Monthly': return format(new Date(base.getFullYear(), base.getMonth() + 1, base.getDate()), 'yyyy-MM-dd');
    case 'Quarterly': return format(new Date(base.getFullYear(), base.getMonth() + 3, base.getDate()), 'yyyy-MM-dd');
    case 'Semi-Annual': return format(new Date(base.getFullYear(), base.getMonth() + 6, base.getDate()), 'yyyy-MM-dd');
    case 'Annual': return format(new Date(base.getFullYear() + 1, base.getMonth(), base.getDate()), 'yyyy-MM-dd');
    default: return '';
  }
};

export const pmFrequencies = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Operating Hours'];
export const priorities = ['Critical', 'High', 'Medium', 'Low', 'Shutdown Item'];
export const systems = ['Boiler', 'Turbine', 'Water Treatment', 'Fuel Handling', 'Balance of Plant'];
export const statuses = ['Open', 'In-Progress', 'Pending Parts', 'Completed', 'Deferred', 'Cancelled'];
export const units = ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Common', 'MH', 'WT', 'COMP', 'Phase 1', 'Phase 2'];
export const deferReasons = ['For Shutdown', 'For Load Down Activities', 'For PR', 'Equipment Unavailability'];

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

// Reporting periods available in the analytics range picker
export const PERIODS = ['Today', 'This Week', 'This Month', 'This Quarter', 'This Year', 'Custom'];

export const rangeFor = period => {
  const d = new Date();
  const f = x => format(x, 'yyyy-MM-dd');
  if (period === 'Today') return [today(), today()];
  if (period === 'This Week') return [f(startOfWeek(d, { weekStartsOn: 0 })), f(endOfWeek(d, { weekStartsOn: 0 }))];
  if (period === 'This Quarter') {
    const q = Math.floor(d.getMonth() / 3);
    return [f(new Date(d.getFullYear(), q * 3, 1)), f(new Date(d.getFullYear(), q * 3 + 3, 0))];
  }
  if (period === 'This Year') return [`${d.getFullYear()}-01-01`, `${d.getFullYear()}-12-31`];
  return [f(startOfMonth(d)), f(endOfMonth(d))];
};

// The 80/20 PM vs CM ratio is only meaningful over a month or a year.
export const RATIO_PERIODS = ['This Month', 'This Year'];
export const ratioPeriodLabel = period => (period === 'This Year' ? 'Yearly' : 'Monthly');
export const supportsRatio = (period, range) => {
  if (RATIO_PERIODS.includes(period)) return true;
  if (period === 'Custom' && range?.[0] && range?.[1]) {
    return differenceInCalendarDays(new Date(range[1] + 'T12:00:00'), new Date(range[0] + 'T12:00:00')) >= 27;
  }
  return false;
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
// Materials as one readable cell that the importer can read back verbatim.
const materialsCell = (list) => (Array.isArray(list) ? list : [])
  .filter(Boolean)
  .map(m => `${m.code || ''}${m.description ? ` (${m.description})` : ''} x${m.quantity ?? 0}`)
  .join(' | ');

const yesNo = (v) => (v ? 'Yes' : 'No');

// Every job order detail, in a column order the importer recognises, so an
// export → import round trip never loses a field.
export const FULL_ORDER_COLUMNS = [
  ['WO Number', j => j.wo_number],
  ['Description', j => j.description],
  ['Equipment Tag', j => j.equipment_tag],
  ['Unit', j => j.unit],
  ['System', j => j.system],
  ['Priority', j => j.priority],
  ['Priority Category', j => priorityLabel(j)],
  ['Job Type', j => j.job_type],
  ['Maintenance Type', j => j.maintenance_type || 'CM'],
  ['PM Frequency', j => j.pm_frequency],
  ['Shutdown Item', j => yesNo(j.shutdown_item)],
  ['Status', j => j.status],
  ['Assigned Manpower', j => j.technician],
  ['Planned Start', j => j.planned_start],
  ['Planned Finish', j => j.planned_finish],
  ['Actual Start', j => j.start_time],
  ['Completion Time', j => j.completion_time],
  ['PTW Number', j => j.ptw_number],
  ['Ex-BreakIn', j => yesNo(j.ex_breakin)],
  ['Associated WO', j => j.associated_wo],
  ['Deferred Reason', j => j.deferred_reason],
  ['PR Number', j => j.pr_number],
  ['Action Taken', j => j.action_taken],
  ['As Found', j => j.as_found],
  ['As Left', j => j.as_left],
  ['Materials', j => materialsCell(j.materials)],
  ['Overdue Days', j => overdueDays(j) || ''],
  ['Created Date', j => (j.created_date || '').slice(0, 10)],
];

const fullRows = (orders) => (orders || []).filter(Boolean).map(j => FULL_ORDER_COLUMNS.map(([, read]) => {
  try { const v = read(j); return v === null || v === undefined ? '' : v; } catch { return ''; }
}));
const fullHeaders = () => FULL_ORDER_COLUMNS.map(([label]) => label);

export const exportBreakInsCSV = (orders) => {
  const breakIns = (orders || []).filter(j => j && j.job_type === 'Break-In');
  if (!breakIns.length) return 0;
  return downloadCSV(`break-ins-${today()}.csv`, fullHeaders(), fullRows(breakIns));
};

export const exportAllWorkOrdersCSV = (orders) =>
  downloadCSV(`work-orders-${today()}.csv`, fullHeaders(), fullRows(orders));

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

// Writes a CSV download. Always returns the number of data rows exported (0 = nothing written),
// so callers can show accurate feedback instead of silently doing nothing.
const downloadCSV = (filename, headers, rows) => {
  const safeRows = (rows || []).filter(Boolean);
  if (!safeRows.length) return 0;
  const csv = [headers, ...safeRows].map(r => (r || []).map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return safeRows.length;
};

export const exportItemsCSV = (items) => downloadCSV(
  `item-master-${today()}.csv`,
  ['Code', 'Description', 'Bin Location', 'Stock', 'Unit', 'Category'],
  (items || []).filter(Boolean).map(i => [i.code, i.description, i.bin_location, i.stock, i.unit, i.category]),
);

export const exportSystemsCSV = (systems) => downloadCSV(
  `system-registry-${today()}.csv`,
  ['Unit', 'System Name', 'Area'],
  (systems || []).filter(Boolean).map(s => [s.unit, s.system_name, s.area]),
);

export const exportPMCSV = (orders) => downloadCSV(
  `pm-schedule-${today()}.csv`,
  fullHeaders(),
  fullRows((orders || []).filter(j => j && j.maintenance_type === 'PM')),
);

// Active backlog = Open + In-Progress + Pending Parts (not yet completed/deferred/cancelled)
export const isBacklog = (j) => ['Open', 'In-Progress', 'Pending Parts'].includes(j.status);

/* ------------------------------------------------ backlog classification */

// Four-category backlog classification, by how long the job has been waiting.
export const BACKLOG_CATEGORIES = [
  { key: 'fresh', label: 'Fresh', range: '0–7 days', color: '#34b99a', min: 0, max: 7 },
  { key: 'watch', label: 'Watchlist', range: '8–30 days', color: '#f7bb53', min: 8, max: 30 },
  { key: 'aged', label: 'Aged', range: '31–90 days', color: '#f97316', min: 31, max: 90 },
  { key: 'chronic', label: 'Chronic', range: 'over 90 days', color: '#dc2626', min: 91, max: Infinity },
];

// Days a backlog job has been waiting, counted from the planned start (or the
// day it was raised when no schedule exists).
export const backlogAge = (j) => {
  const raw = String(j.planned_start || j.created_date || '');
  const m = raw.match(/\d{4}-\d{2}-\d{2}/);
  if (!m) return 0;
  const days = differenceInCalendarDays(new Date(today() + 'T12:00:00'), new Date(m[0] + 'T12:00:00'));
  return days > 0 ? days : 0;
};

export const backlogCategory = (j) => {
  const age = backlogAge(j);
  return (BACKLOG_CATEGORIES.find(c => age >= c.min && age <= c.max) || BACKLOG_CATEGORIES[0]).key;
};

export const backlogCategoryMeta = (key) => BACKLOG_CATEGORIES.find(c => c.key === key) || BACKLOG_CATEGORIES[0];

// Extra decision factors a supervisor needs beside the raw backlog count.
export const backlogStats = (orders) => {
  const rows = (orders || []).filter(isBacklog);
  const ages = rows.map(backlogAge);
  const oldest = ages.length ? Math.max(...ages) : 0;
  const avg = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
  return {
    total: rows.length,
    avgAge: avg,
    oldest,
    critical: rows.filter(j => effectivePriority(j) === 'Critical').length,
    shutdown: rows.filter(j => j.shutdown_item).length,
    unassigned: rows.filter(j => !String(j.technician || '').trim()).length,
    pendingParts: rows.filter(j => j.status === 'Pending Parts').length,
    breakIns: rows.filter(j => j.job_type === 'Break-In').length,
    aged: rows.filter(j => aged(j) > 0).length,
    byCategory: BACKLOG_CATEGORIES.map(c => ({ ...c, value: rows.filter(j => backlogCategory(j) === c.key).length })),
  };
};

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
  // Keep the familiar plant order, then append every configured/custom unit
  // present in the result set. The summary must never drop a work order just
  // because its unit code is outside the original fixed Unit 1–4 list.
  const preferredUnitOrder = [...units];
  const resultUnits = [...new Set(shiftOrders.map(j => j.unit))];
  const unitOrder = [
    ...preferredUnitOrder.filter(unit => resultUnits.includes(unit)),
    ...resultUnits.filter(unit => !preferredUnitOrder.includes(unit)).sort((a, b) => a.localeCompare(b)),
  ];
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
/* ------------------------------------------------------ backlog analysis */

// Wide backlog pool: anything not yet completed (Open, In-Progress, Deferred).
export const isBacklogWide = (j) => j.status !== 'Completed' && j.status !== 'Cancelled';

// Backlog categories and backlogCategory() are defined once, above.

export const backlogCategoryLabel = (key) => BACKLOG_CATEGORIES.find(c => c.key === key)?.label || key;

// Operational parameters supervisors can slice Total Backlog by.
export const BACKLOG_PARAMETERS = [
  { key: 'category', label: 'Backlog category' },
  { key: 'unit', label: 'Plant unit' },
  { key: 'system', label: 'Plant system' },
  { key: 'priority', label: 'Priority' },
  { key: 'technician', label: 'Assigned manpower' },
  { key: 'job_type', label: 'Job type (scheduled vs break-in)' },
  { key: 'age_bucket', label: 'Age bucket (days overdue)' },
];

export const ageBucket = (j) => {
  const od = overdueDays(j);
  if (od <= 0) return 'On schedule';
  if (od <= 7) return '1–7 days';
  if (od <= 30) return '8–30 days';
  if (od <= 90) return '31–90 days';
  return '90+ days';
};
export const AGE_BUCKETS = ['On schedule', '1–7 days', '8–30 days', '31–90 days', '90+ days'];

export const backlogParamValue = (j, param) => {
  if (param === 'category') return backlogCategoryLabel(backlogCategory(j));
  if (param === 'unit') return j.unit || 'Unassigned';
  if (param === 'system') return j.system || 'Unassigned';
  if (param === 'priority') return priorityLabel(j);
  if (param === 'technician') return (j.technician || '').trim() || 'Unassigned';
  if (param === 'job_type') return j.job_type === 'Break-In' ? 'Break-In' : 'Scheduled';
  if (param === 'age_bucket') return ageBucket(j);
  return 'Unassigned';
};

// Turns a clicked chart segment into work-order table filters.
export const backlogDrillFilter = (param, name) => {
  if (param === 'category') {
    const cat = BACKLOG_CATEGORIES.find(c => c.label === name);
    return { backlog_category: cat?.key || undefined };
  }
  if (param === 'priority') {
    const entry = Object.entries(PRIORITY_LABELS).find(([, label]) => label === name);
    if (entry?.[0] === 'Shutdown Item') return { backlog: true, shutdown_item: true };
    return { backlog: true, priority: entry?.[0] || name };
  }
  if (param === 'age_bucket') return { backlog: true, age_bucket: name };
  if (param === 'technician') return { backlog: true, technician: name === 'Unassigned' ? '__none__' : name };
  if (param === 'job_type') return { backlog: true, job_type: name };
  return { backlog: true, [param]: name === 'Unassigned' ? '__none__' : name };
};

/* --------------------------------------------- full-fidelity export/import */

// Every field carried by a work order, with the header used in exports.
// These headers are also recognised on import, so an export round-trips.
export const EXPORT_COLUMNS = [
  ['wo_number', 'WO Number'],
  ['description', 'Description'],
  ['equipment_tag', 'Equipment Tag'],
  ['unit', 'Unit'],
  ['system', 'System'],
  ['priority', 'Priority'],
  ['shutdown_item', 'Shutdown Item'],
  ['job_type', 'Job Type'],
  ['maintenance_type', 'Maintenance Type'],
  ['pm_frequency', 'PM Frequency'],
  ['status', 'Status'],
  ['technician', 'Assigned Manpower'],
  ['planned_start', 'Target Start'],
  ['planned_finish', 'Target Finish'],
  ['start_time', 'Actual Start'],
  ['completion_time', 'Completion Time'],
  ['ptw_number', 'PTW Number'],
  ['associated_wo', 'Associated WO'],
  ['deferred_reason', 'Deferred Reason'],
  ['pr_number', 'PR Number'],
  ['action_taken', 'Action Taken'],
  ['as_found', 'As Found'],
  ['as_left', 'As Left'],
  ['ex_breakin', 'Ex Break-In'],
  ['materials', 'Materials'],
  ['created_date', 'Created Date'],
];

export const materialsToText = (materials) => Array.isArray(materials)
  ? materials.filter(Boolean).map(m => `${m.code || ''}${m.description ? ` (${m.description})` : ''} x${m.quantity ?? 0}`).join(' | ')
  : '';

const exportCell = (j, key) => {
  if (key === 'materials') return materialsToText(j.materials);
  if (key === 'shutdown_item' || key === 'ex_breakin') return j[key] ? 'Yes' : 'No';
  if (key === 'created_date') return j.created_date ? String(j.created_date).slice(0, 10) : '';
  return j[key] ?? '';
};

export const workOrderRows = (orders) => orders.map(j => EXPORT_COLUMNS.map(([key]) => exportCell(j, key)));
export const workOrderHeaders = EXPORT_COLUMNS.map(([, label]) => label);

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const exportWorkOrdersCSV = (orders, filename) => {
  if (!orders?.length) return 0;
  const csv = [workOrderHeaders, ...workOrderRows(orders)]
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  saveBlob(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), filename || `work-orders-${today()}.csv`);
  return orders.length;
};

export const exportWorkOrdersXLSX = async (orders, filename) => {
  if (!orders?.length) return 0;
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet([workOrderHeaders, ...workOrderRows(orders)]);
  sheet['!cols'] = workOrderHeaders.map(h => ({ wch: Math.min(40, Math.max(12, h.length + 4)) }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Work Orders');
  const out = XLSX.write(book, { bookType: 'xlsx', type: 'array' });
  saveBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename || `work-orders-${today()}.xlsx`);
  return orders.length;
};

/* ---------------------------------------------- reliability metrics */

const hoursBetween = (a, b) => {
  const start = new Date(a).getTime(), end = new Date(b).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return null;
  return (end - start) / 3600000;
};

// Hands-on repair time for one job: actual start -> completion.
export const repairHours = (job) => hoursBetween(job?.start_time, job?.completion_time);

// Mean Time To Repair across completed corrective jobs that have both timestamps.
export const mttrHours = (orders = []) => {
  const spans = orders
    .filter(j => j?.status === 'Completed')
    .map(repairHours)
    .filter(h => h !== null);
  if (!spans.length) return null;
  return spans.reduce((a, b) => a + b, 0) / spans.length;
};

// Mean Time Between Failures: uptime between consecutive breakdowns, per asset.
export const mtbfHours = (orders = []) => {
  const failures = orders.filter(j => j?.maintenance_type === 'CM' || j?.job_type === 'Break-In');
  const byAsset = {};
  failures.forEach(j => {
    const key = j.equipment_tag || j.system || 'Unassigned';
    const at = j.start_time || j.completion_time || j.created_date || j.planned_start;
    if (!at || isNaN(new Date(at).getTime())) return;
    (byAsset[key] ||= []).push(new Date(at).getTime());
  });
  const gaps = [];
  Object.values(byAsset).forEach(times => {
    times.sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) gaps.push((times[i] - times[i - 1]) / 3600000);
  });
  if (!gaps.length) return null;
  return gaps.reduce((a, b) => a + b, 0) / gaps.length;
};

// Share of work orders closed out, ignoring cancelled jobs.
export const completionRate = (orders = []) => {
  const live = orders.filter(j => j?.status !== 'Cancelled');
  if (!live.length) return null;
  return Math.round(live.filter(j => j.status === 'Completed').length / live.length * 100);
};

export const formatHours = (h) => {
  if (h === null || h === undefined || isNaN(h)) return '—';
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
};

// Breakdown (corrective / break-in) history for a single system, newest first.
export const breakdownHistory = (orders = [], systemName) => orders
  .filter(j => (j?.system || '') === systemName && (j?.maintenance_type === 'CM' || j?.job_type === 'Break-In'))
  .sort((a, b) => String(b.start_time || b.created_date || b.planned_start || '')
    .localeCompare(String(a.start_time || a.created_date || a.planned_start || '')));

/* ------------------------------------------------ operational alerts */

// Items at or below the configured re-order threshold.
export const lowStockItems = (items = [], threshold = 5) =>
  (items || []).filter(i => i && Number(i.stock ?? 0) <= Number(threshold));

// PM jobs whose planned start has already passed and are not closed out.
export const overduePMs = (orders = []) => {
  const t = today();
  return (orders || []).filter(j =>
    j && j.maintenance_type === 'PM' && !['Completed', 'Cancelled'].includes(j.status) && j.planned_start && j.planned_start < t);
};

// Jobs assigned to manpower that are still open — used for assignment alerts.
export const newAssignments = (orders = []) =>
  (orders || []).filter(j => j && j.technician?.trim() && j.status === 'Open');
