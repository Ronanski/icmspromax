// Single source of truth for the CM Scheduled Finish (target finish) logic.
//
// Official Plant Priority SLA Matrix — allowable days from Scheduled Start:
//   Critical (P1 Emergency)  +0  (ASAP — target = scheduled start)
//   High     (P2 Urgent)     +4
//   Medium   (P3 Normal)     +15
//   Low      (P4 Low)        +45
//   Shutdown Item (P5)       no fixed target date (excluded from aging alarms)
//
// Kept in its own module so both the UI (plantUtils) and the data layer (db.js)
// can use it without a circular import.

export const SLA_THRESHOLDS = {
  Critical: 0,
  High: 4,
  Medium: 15,
  Low: 45,
  "Shutdown Item": null,
};

export const slaThreshold = (priority) => SLA_THRESHOLDS[priority] ?? null;

// Allowable days for a job, honouring the Shutdown Item override
export const allowableDays = (j) => (j?.shutdown_item ? null : slaThreshold(j?.priority ?? "Medium"));

const day = (v) => {
  if (!v) return "";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return s.slice(0, 10);
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};

// Scheduled Start (YYYY-MM-DD)
export const scheduledStart = (j) => day(j?.planned_start);

// Scheduled Finish = Scheduled Start + allowable days for the priority.
// Returns '' when there is no start date or the job is a Shutdown Item.
export const targetFinish = (j) => {
  const start = scheduledStart(j);
  const days = allowableDays(j);
  if (!start || days === null) return "";
  return day(new Date(new Date(start + "T12:00:00").getTime() + days * 86400000));
};

// True when this record's finish date must be auto-managed (CM / Break-In work).
export const isAutoFinish = (row = {}) => String(row.maintenance_type || "CM").toUpperCase() !== "PM";

/* Apply the target-finish rule to a CM record.
 * `existing` supplies the fields the incoming payload doesn't carry, so an
 * import or edit that only changes the priority still recomputes the finish.
 */
export const applyTargetFinish = (values = {}, existing = null) => {
  const merged = { ...(existing || {}), ...values };
  if (!isAutoFinish(merged)) return values;
  const hasStart = Boolean(scheduledStart(merged));
  if (!hasStart) return values;
  const tf = targetFinish(merged);
  values.planned_finish = tf || null;
  return values;
};
