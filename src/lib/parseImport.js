// Spreadsheet import parser (runs in the browser, no backend needed).
//
// Primary source of truth = the Maximo export layout:
//
//   Work Order      -> wo_number
//   Description     -> description
//   Unit            -> unit
//   Location        -> system            (shown as "Location/Tag")
//   Work Type       -> work type         (PM / CM / Break-In)
//   Scheduled Start -> planned_start AND planned_finish
//   Priority        -> 1..5 priority levels
//   Status          -> CLOSE / DEFER / APPR / INPRG / SUBMIT / RESCH
//
// Dropped on purpose: Asset, Service Group, Reported Date, Site.
//
// Files produced by this app's own "Export to Excel" are still recognised, so an
// export -> import round-trip keeps every field.
import * as XLSX from "xlsx";

const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const cleanCell = (v) => (v === null || v === undefined ? "" : String(v).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim());

/* ------------------------------------------------------------ Maximo columns
 * Columns that must never reach the database, whatever the sheet contains.
 */
export const DROPPED_HEADERS = ["Asset", "Service Group", "Reported Date", "Site"];
const DROPPED = new Set([
  "asset", "assetnum", "assetnumber", "assetdescription",
  "servicegroup", "servicegroupname",
  "reporteddate", "datereported", "reportdate",
  "site", "siteid", "sitename",
]);

/* ------------------------------------------------------------------ priority
 * Maximo sends 1..5. Each maps to one stored priority level plus the label the
 * app shows on screen.
 */
export const PRIORITY_FROM_MAXIMO = {
  1: "Critical",        // 1-Critical
  2: "High",            // 2-High Priority
  3: "Medium",          // 3-Normal
  4: "Low",             // 4-Low Priority
  5: "Shutdown Item",   // 5-Shutdown Item
};

const PRIORITY_WORDS = {
  critical: 1, emergency: 1,
  high: 2, highpriority: 2, urgent: 2,
  normal: 3, medium: 3,
  low: 4, lowpriority: 4,
  shutdown: 5, shutdownitem: 5, sd: 5,
};

const convertPriority = (raw) => {
  if (raw === null || raw === undefined || raw === "") return null;
  const s = String(raw).trim();
  const digit = s.match(/^([1-5])\b/) || s.match(/^([1-5])\s*-/);
  const level = digit ? Number(digit[1]) : PRIORITY_WORDS[norm(s)];
  if (!level) return null;
  const priority = PRIORITY_FROM_MAXIMO[level];
  return { priority, shutdown_item: level === 5 };
};

/* -------------------------------------------------------------------- status
 * CLOSE = Completed · DEFER / APPR = Deferred · INPRG = In Progress
 * SUBMIT / RESCH = Open
 */
const STATUS_FROM_MAXIMO = {
  CLOSE: "Completed", CLOSED: "Completed", COMP: "Completed", COMPLETE: "Completed", COMPLETED: "Completed", DONE: "Completed",
  DEFER: "Deferred", DEFERRED: "Deferred", APPR: "Deferred", APPROVED: "Deferred", HOLD: "Deferred", ONHOLD: "Deferred",
  INPRG: "In-Progress", INPROGRESS: "In-Progress", ONGOING: "In-Progress", STARTED: "In-Progress", WIP: "In-Progress",
  SUBMIT: "Open", SUBMITTED: "Open", RESCH: "Open", RESCHEDULED: "Open", OPEN: "Open", WAPPR: "Open", NEW: "Open", DRAFT: "Open",
};
const convertStatus = (raw) => STATUS_FROM_MAXIMO[String(raw || "").trim().toUpperCase().replace(/[\s_-]/g, "")] || "";

/* ----------------------------------------------------------------- work type
 * Every import lands in exactly one table, so the work type has to be
 * recognised unambiguously: PM, CM or Break-In (Maximo also sends EM).
 */
export const WORK_TYPES = ["PM", "CM", "Break-In"];
const convertWorkType = (raw) => {
  const s = norm(raw);
  if (!s) return "";
  if (/^(bi|em|breakin|emergency|breakinem|unscheduled|unsched)/.test(s)) return "Break-In";
  if (/^(pm|pmo|preventive|preventative|planned)/.test(s)) return "PM";
  if (/^(cm|corrective|cmo|repair)/.test(s)) return "CM";
  if (s === "scheduled") return "CM";
  return "";
};

// Which work types each section accepts.
export const SECTION_WORK_TYPES = {
  pm: ["PM"],
  cm: ["CM"],
  breakin: ["Break-In"],
};
const SECTION_LABEL = { pm: "PM", cm: "CM", breakin: "Break-In" };

const YES = ["y", "yes", "true", "1", "x"];
const bool = (raw) => YES.includes(String(raw || "").trim().toLowerCase());

const UNITS = ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Common", "MH", "WT", "COMP", "Phase 1", "Phase 2"];
const convertUnit = (raw) => {
  const s = cleanCell(raw);
  if (!s) return "";
  const hit = UNITS.find((u) => norm(u) === norm(s));
  if (hit) return hit;
  const m = s.match(/(\d)/);
  if (m && UNITS.includes(`Unit ${m[1]}`)) return `Unit ${m[1]}`;
  if (/common|bop|balance/i.test(s)) return "Common";
  return "";
};

const FREQS = ["Weekly", "Monthly", "Quarterly", "Semi-Annual", "Annual"];
const convertFrequency = (raw) => {
  const s = cleanCell(raw);
  if (!s) return "";
  const hit = FREQS.find((f) => norm(f) === norm(s));
  if (hit) return hit;
  if (/week|7\s*d/i.test(s)) return "Weekly";
  if (/quarter|90\s*d|3\s*month/i.test(s)) return "Quarterly";
  if (/semi|6\s*month|180/i.test(s)) return "Semi-Annual";
  if (/annual|year|365/i.test(s)) return "Annual";
  if (/month|30\s*d/i.test(s)) return "Monthly";
  return "";
};

const DEFER_REASONS = ["For Shutdown", "For Load Down Activities", "For PR", "Equipment Unavailability"];
const convertDeferReason = (raw) => {
  const s = cleanCell(raw);
  if (!s) return "";
  const hit = DEFER_REASONS.find((r) => norm(r) === norm(s));
  if (hit) return hit;
  if (/shutdown/i.test(s)) return "For Shutdown";
  if (/load/i.test(s)) return "For Load Down Activities";
  if (/\bpr\b|purchase/i.test(s)) return "For PR";
  if (/equipment.*unavail|unavail.*equipment/i.test(s)) return "Equipment Unavailability";
  return "";
};

const parseMaterials = (raw) => {
  const s = cleanCell(raw);
  if (!s) return [];
  return s.split(/\||;/).map((part) => {
    const t = part.trim();
    if (!t) return null;
    const qty = t.match(/x\s*([\d.]+)\s*$/i);
    const head = qty ? t.slice(0, qty.index).trim() : t;
    const desc = head.match(/\(([^)]*)\)\s*$/);
    const code = desc ? head.slice(0, desc.index).trim() : head;
    return { code, description: desc ? desc[1].trim() : "", quantity: qty ? Number(qty[1]) || 0 : 0 };
  }).filter(Boolean);
};

const ALIASES = {
  wo_number: ["workorder", "wonum", "wonumber", "workordernumber", "order", "ordernumber", "aufnr", "breakinid", "jobid", "ticket"],
  // Location is the Maximo source for the plant system (displayed as Location/Tag).
  system: ["location", "locationtag", "system", "plantsystem", "systemarea", "plantsystemarea", "functionalarea"],
  equipment_tag: ["equipment", "equipmenttag", "equipmenttagid", "tag", "tagid", "equipmentnumber", "functionallocation"],
  description: ["description", "workdescription", "jobdescription", "shorttext", "operationtext", "scopeofwork"],
  unit: ["unit", "plantunit", "unitid", "plantunitid"],
  // Scheduled Start feeds both planned dates.
  scheduled_start: ["scheduledstart", "schedstart", "scheduledstartdate"],
  planned_start: ["plannedstart", "plannedstartdate", "basicstartdate", "targetstart", "targstartdate", "targetstartdate", "startdate", "targetdate"],
  planned_finish: ["plannedfinish", "plannedfinishdate", "schedfinish", "scheduledfinish", "basicfinishdate", "targetfinish", "targfinishdate", "targetfinishdate", "duedate", "finishdate"],
  start_time: ["actualstart", "actualstartdate", "actualstarttime", "starttime", "executionstart"],
  completion_time: ["completiontime", "completiondate", "actualfinish", "actualfinishdate", "actualcompletion", "closeddate", "datecompleted"],
  item_code: ["itemnum", "itemcode", "material", "materialnumber", "matnr", "sparepart", "partnumber"],
  materials: ["materials", "materialsconsumed", "materialsused", "sparepartsused"],
  priority: ["priority", "calcpriority", "internalpriority", "wopriority", "prioritylevel"],
  status: ["status", "wostatus", "workstatus", "jobstatus"],
  work_type: ["worktype", "jobtype", "wotype", "typeofwork", "maintenancetype", "mainttype", "pmcm", "cmpm", "maintenancecategory"],
  pm_frequency: ["pmfrequency", "frequency", "pmfreq", "interval", "pminterval", "frequencyinterval"],
  technician: ["technician", "assignedmanpower", "manpower", "assignedto", "assignee", "leadcraft", "crew", "personnel"],
  ptw_number: ["ptwnumber", "ptw", "permitnumber", "permittowork", "permit"],
  associated_wo: ["associatedwo", "associatedwonumber", "followupwo", "parentwo", "relatedwo", "linkedwo"],
  deferred_reason: ["deferredreason", "deferralreason", "reasondeferred", "holdreason"],
  pr_number: ["prnumber", "pr", "purchaserequisition", "purchaserequest", "prno"],
  action_taken: ["actiontaken", "action", "worklog", "remarks", "workperformed", "longdescription", "findings"],
  as_found: ["asfound", "asfoundcondition", "beforecondition", "initialcondition"],
  as_left: ["asleft", "asleftcondition", "aftercondition", "finalcondition"],
  shutdown_item: ["shutdownitem", "sditem"],
  ex_breakin: ["exbreakin", "exbreak", "formerbreakin"],
};

const DATE_KEYS = ["planned_start", "planned_finish", "scheduled_start"];
const DATETIME_KEYS = ["start_time", "completion_time"];

const excelDate = (v) => {
  const d = XLSX.SSF.parse_date_code(v);
  if (!d) return null;
  return { y: d.y, m: d.m, d: d.d, H: d.H || 0, M: d.M || 0 };
};

const pad = (n) => String(n).padStart(2, "0");

// Tolerant date reader — returns "" when a cell simply has no usable date,
// so one odd cell never aborts an entire import.
const readDate = (v, withTime = false) => {
  if (v === null || v === undefined || v === "") return "";
  let y, m, d, H = 0, Min = 0;
  if (v instanceof Date && !isNaN(v)) {
    y = v.getFullYear(); m = v.getMonth() + 1; d = v.getDate(); H = v.getHours(); Min = v.getMinutes();
  } else if (typeof v === "number") {
    const p = excelDate(v);
    if (!p) return "";
    y = p.y; m = p.m; d = p.d; H = p.H; Min = p.M;
  } else {
    const s = String(v).trim();
    let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2}))?/);
    if (match) { y = +match[1]; m = +match[2]; d = +match[3]; H = +(match[4] || 0); Min = +(match[5] || 0); }
    else {
      // dd/mm/yyyy or mm/dd/yyyy — disambiguated by which part exceeds 12
      match = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:[T ,]+(\d{1,2}):(\d{2}))?/);
      if (match) {
        let a = +match[1], b = +match[2];
        y = +match[3] < 100 ? 2000 + +match[3] : +match[3];
        if (a > 12) { d = a; m = b; } else { m = a; d = b; }
        H = +(match[4] || 0); Min = +(match[5] || 0);
      } else {
        const parsed = new Date(s);
        if (isNaN(parsed)) return "";
        y = parsed.getFullYear(); m = parsed.getMonth() + 1; d = parsed.getDate(); H = parsed.getHours(); Min = parsed.getMinutes();
      }
    }
  }
  if (!y || !m || !d) return "";
  const date = `${y}-${pad(m)}-${pad(d)}`;
  return withTime ? `${date}T${pad(H)}:${pad(Min)}` : date;
};

// Translate the recognised work type into the fields the app stores.
const applyWorkType = (out, workType) => {
  out.work_type = workType;
  if (workType === "Break-In") { out.job_type = "Break-In"; out.maintenance_type = "CM"; }
  else if (workType === "PM") { out.job_type = "Scheduled"; out.maintenance_type = "PM"; }
  else { out.job_type = "Scheduled"; out.maintenance_type = "CM"; }
};

/**
 * @param {object} args
 * @param {string} args.content  base64 spreadsheet
 * @param {'pm'|'cm'|'breakin'} args.section  which section is importing
 */
function parsePlantImport({ content, section }) {
  if (typeof content !== "string") throw Error("Could not read that file");
  const allowed = SECTION_WORK_TYPES[section];
  if (!allowed) throw Error("Open the PM, CM or Break-In section to import work orders.");
  const sectionLabel = SECTION_LABEL[section];

  const bytes = Uint8Array.from(atob(content), (c) => c.charCodeAt(0));
  const book = XLSX.read(bytes, { type: "array", cellDates: true });

  let matrix = [], mapping = {}, sheet = "", headerRow = [];
  for (const name of book.SheetNames) {
    const grid = XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, defval: "", blankrows: false });
    // Header row = the first row that matches at least a WO number or a description column.
    const index = grid.findIndex((r) => r.some((c) => ALIASES.wo_number.includes(norm(c))) || r.some((c) => ALIASES.description.includes(norm(c))));
    if (index >= 0) {
      matrix = grid.slice(index + 1);
      headerRow = grid[index];
      mapping = {};
      headerRow.forEach((h, i) => {
        if (DROPPED.has(norm(h))) return; // Asset · Service Group · Reported Date · Site
        for (const [key, names] of Object.entries(ALIASES)) {
          if (names.includes(norm(h)) && mapping[key] === undefined) mapping[key] = i;
        }
      });
      sheet = name;
      break;
    }
  }
  if (mapping.description === undefined)
    throw Error("Could not find a Description column. Make sure the sheet has a header row with Work Order / Description columns.");
  if (mapping.work_type === undefined)
    throw Error(`Could not find a Work Type column. ${sectionLabel} imports need Work Type so each row can be checked.`);

  const skipped = [];
  const rejected = [];   // rows whose work type belongs to another section
  const parsed = [];

  matrix.filter((r) => r.some((v) => String(v ?? "").trim() !== "")).forEach((r, i) => {
    const rowNo = i + 2;
    const out = {};
    let workType = "";
    for (const [key, col] of Object.entries(mapping)) {
      const raw = r[col];
      if (key === "work_type") {
        workType = convertWorkType(raw);
        if (!workType) rejected.push({ row: rowNo, wo_number: cleanCell(r[mapping.wo_number]), found: cleanCell(raw) || "(blank)" });
      } else if (key === "item_code") {
        if (cleanCell(raw)) out.materials = [...(out.materials || []), { code: cleanCell(raw), description: "", quantity: 0 }];
      } else if (key === "materials") {
        const list = parseMaterials(raw);
        if (list.length) out.materials = [...(out.materials || []), ...list];
      } else if (key === "priority") {
        const p = convertPriority(raw);
        if (p) { out.priority = p.priority; if (p.shutdown_item) out.shutdown_item = true; }
      } else if (key === "status") {
        const st = convertStatus(raw);
        if (st) out.status = st;
      } else if (key === "unit") {
        const u = convertUnit(raw);
        if (u) out.unit = u;
      } else if (key === "pm_frequency") {
        const f = convertFrequency(raw);
        if (f) out.pm_frequency = f;
      } else if (key === "deferred_reason") {
        const d = convertDeferReason(raw);
        if (d) out.deferred_reason = d;
      } else if (key === "shutdown_item" || key === "ex_breakin") {
        if (cleanCell(raw)) out[key] = bool(raw);
      } else if (DATE_KEYS.includes(key)) {
        const d = readDate(raw);
        if (d) out[key] = d;
      } else if (DATETIME_KEYS.includes(key)) {
        const d = readDate(raw, true);
        if (d) out[key] = d;
      } else {
        const c = cleanCell(raw);
        if (c) out[key] = c;
      }
    }

    // Scheduled Start fills both planned dates.
    if (out.scheduled_start) {
      out.planned_start = out.scheduled_start;
      out.planned_finish = out.scheduled_start;
      delete out.scheduled_start;
    }

    if (!out.description) { skipped.push({ row: rowNo, reason: "No work description" }); return; }

    if (workType && !allowed.includes(workType)) {
      rejected.push({ row: rowNo, wo_number: out.wo_number || "", found: workType });
      return;
    }
    if (!workType) return; // already recorded as rejected above

    applyWorkType(out, workType);

    // Don't let contradictory dates block the whole file.
    if (out.planned_start && out.planned_finish && out.planned_start > out.planned_finish) out.planned_finish = out.planned_start;
    if (out.start_time && out.completion_time && out.start_time > out.completion_time) out.completion_time = out.start_time;
    if (out.deferred_reason && out.status !== "Deferred") out.status = out.status || "Deferred";
    parsed.push(out);
  });

  // Strict section separation: one wrong work type blocks the whole file.
  if (rejected.length) {
    const found = [...new Set(rejected.map((x) => x.found))].join(", ");
    const rows = rejected.slice(0, 5).map((x) => x.wo_number || `row ${x.row}`).join(", ");
    throw Error(
      `${sectionLabel} import blocked: ${rejected.length} row${rejected.length > 1 ? "s" : ""} have Work Type "${found}". ` +
      `Only ${sectionLabel} rows can be imported here (${rows}${rejected.length > 5 ? ", …" : ""}). ` +
      `Import those rows from their own section instead.`
    );
  }

  if (!parsed.length) throw Error(`No usable ${sectionLabel} rows found in this file.`);
  if (parsed.length > 2000) throw Error("Split this file into batches of 2000 rows or fewer");

  const seen = new Set();
  const duplicates = [];
  for (const row of parsed) {
    const key = String(row.wo_number || "").trim().toUpperCase();
    if (!key) continue;
    if (seen.has(key)) duplicates.push(key);
    else seen.add(key);
  }
  return {
    rows: parsed,
    sheet,
    section,
    work_type: sectionLabel,
    mapped_fields: Object.keys(mapping).filter((k) => k !== "scheduled_start"),
    unmapped_headers: headerRow
      .map(cleanCell)
      .filter((h) => h && !DROPPED.has(norm(h)) && !Object.values(ALIASES).some((names) => names.includes(norm(h)))),
    dropped_headers: headerRow.map(cleanCell).filter((h) => h && DROPPED.has(norm(h))),
    skipped,
    duplicates,
  };
}

export default parsePlantImport;
