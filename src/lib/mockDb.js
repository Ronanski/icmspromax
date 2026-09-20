// In-memory mock backend for the I&C Plant Desk.
//
// The app was exported from another platform and used to talk to a hosted
// service. That service is gone. This module reproduces the same interface
// (`db.functions.invoke`, `db.entities.*`, `db.auth.*`) against sample data
// held in memory, so the whole UI and every button works offline.
// Changes are kept for the current browser session only and reset on reload.

import * as XLSX from "xlsx";
import {
  MOCK_USER,
  MOCK_WORKSPACES,
  MOCK_WORK_ORDERS,
  MOCK_SYSTEMS,
  MOCK_ITEMS,
  MOCK_TODOS,
  MOCK_DAILY_LOGS,
} from "./mockData";

const clone = (v) => JSON.parse(JSON.stringify(v));

const store = {
  user: clone(MOCK_USER),
  Workspace: clone(MOCK_WORKSPACES),
  WorkOrder: clone(MOCK_WORK_ORDERS),
  SystemRegistry: clone(MOCK_SYSTEMS),
  ItemMaster: clone(MOCK_ITEMS),
  SupervisorTodo: clone(MOCK_TODOS),
  SupervisorDailyLog: clone(MOCK_DAILY_LOGS),
};

let seq = 0;
const newId = (prefix) => `${prefix}-${Date.now().toString(36)}-${++seq}`;
const nowISO = () => new Date().toISOString();
const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms));

const matches = (row, query = {}) =>
  Object.entries(query).every(([k, v]) => {
    const cell = row[k];
    if (Array.isArray(cell)) return cell.includes(v);
    if (typeof cell === "string" && typeof v === "string")
      return cell.toLowerCase() === v.toLowerCase();
    return cell === v;
  });

const sortRows = (rows, sort) => {
  if (!sort) return rows;
  const desc = sort.startsWith("-");
  const key = desc ? sort.slice(1) : sort;
  return [...rows].sort((a, b) => {
    const x = a[key] ?? "";
    const y = b[key] ?? "";
    return (x > y ? 1 : x < y ? -1 : 0) * (desc ? -1 : 1);
  });
};

const entity = (name) => ({
  async filter(query = {}, sort, limit = 500, offset = 0) {
    await wait(40);
    const rows = sortRows(store[name].filter((r) => matches(r, query)), sort);
    return clone(rows.slice(offset, offset + limit));
  },
  async get(id) {
    await wait(20);
    return clone(store[name].find((r) => r.id === id) || null);
  },
  async create(data) {
    await wait(60);
    const row = { id: newId(name.toLowerCase()), created_date: nowISO(), updated_date: nowISO(), ...data };
    store[name].push(row);
    return clone(row);
  },
  async update(id, data) {
    await wait(60);
    const row = store[name].find((r) => r.id === id);
    if (!row) throw Error("Record not found");
    Object.assign(row, data, { updated_date: nowISO() });
    return clone(row);
  },
  async delete(id) {
    await wait(60);
    store[name] = store[name].filter((r) => r.id !== id);
    return { deleted: true };
  },
  async deleteMany(query = {}) {
    await wait(80);
    const before = store[name].length;
    store[name] = store[name].filter((r) => !matches(r, query));
    return { deletedCount: before - store[name].length };
  },
});

const entities = {
  Workspace: entity("Workspace"),
  WorkOrder: entity("WorkOrder"),
  SystemRegistry: entity("SystemRegistry"),
  ItemMaster: entity("ItemMaster"),
  SupervisorTodo: entity("SupervisorTodo"),
  SupervisorDailyLog: entity("SupervisorDailyLog"),
};

/* ---------------------------------------------------------------- helpers */

const ORDER_FIELDS = [
  "wo_number","equipment_tag","system","unit","description","priority","job_type","maintenance_type",
  "pm_frequency","shutdown_item","status","technician","planned_start","planned_finish","action_taken",
  "as_found","as_left","start_time","completion_time","materials","ptw_number","ex_breakin",
  "associated_wo","deferred_reason","pr_number",
];
const UNITS = ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Common"];
const STATUSES = ["Open", "In-Progress", "Completed", "Deferred"];

const clean = (input = {}) => {
  const out = {};
  for (const key of ORDER_FIELDS) {
    if (input[key] === undefined) continue;
    out[key] =
      key === "materials"
        ? input[key]
        : key === "ex_breakin" || key === "shutdown_item"
          ? Boolean(input[key])
          : String(input[key]).slice(0, 10000);
  }
  if (out.status && !STATUSES.includes(out.status)) throw Error("Invalid status");
  if (out.maintenance_type && !["CM", "PM"].includes(out.maintenance_type)) throw Error("Invalid maintenance type");
  if (out.pm_frequency && !["Weekly","Monthly","Quarterly","Semi-Annual","Annual"].includes(out.pm_frequency)) throw Error("Invalid PM frequency");
  if (out.deferred_reason && !["For Shutdown","For Load Down Activities","For PR"].includes(out.deferred_reason)) throw Error("Invalid deferred reason");
  if (out.priority && !["Critical","High","Medium","Low"].includes(out.priority)) throw Error("Invalid priority");
  if (out.job_type && !["Scheduled","Break-In"].includes(out.job_type)) throw Error("Invalid job type");
  if (out.unit && !UNITS.includes(out.unit)) throw Error("Invalid unit");
  if (out.materials && (!Array.isArray(out.materials) || out.materials.length > 100 || out.materials.some((m) => !Number.isFinite(Number(m.quantity)) || Number(m.quantity) < 0)))
    throw Error("Invalid material quantities");
  if (out.planned_start && out.planned_finish && out.planned_start > out.planned_finish)
    throw Error("Planned finish must follow planned start");
  if (out.start_time && out.completion_time && out.start_time > out.completion_time)
    throw Error("Completion must follow start");
  return out;
};

const nextTicket = (scope, prefix) => {
  const re = new RegExp(`^${prefix}-(\\d+)$`, "i");
  let max = 0;
  for (const o of store.WorkOrder.filter((r) => r.workspace_id === scope.workspace_id)) {
    const m = String(o.wo_number || "").match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
};

const nextPMDate = (freq, base) => {
  const d = new Date(base);
  const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  if (freq === "Weekly") return fmt(new Date(d.getTime() + 7 * 86400000));
  if (freq === "Monthly") return fmt(new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()));
  if (freq === "Quarterly") return fmt(new Date(d.getFullYear(), d.getMonth() + 3, d.getDate()));
  if (freq === "Semi-Annual") return fmt(new Date(d.getFullYear(), d.getMonth() + 6, d.getDate()));
  if (freq === "Annual") return fmt(new Date(d.getFullYear() + 1, d.getMonth(), d.getDate()));
  return "";
};

/* ---------------------------------------------- plantWorkspace mock action */

async function plantWorkspace(payload = {}) {
  const { action, workspace_id, id, data, rows, jobs, ids, status, code, newDate } = payload;
  const user = store.user;

  if (action === "initialize")
    return { user: clone(user), workspaces: clone(store.Workspace) };

  const ws = store.Workspace.find((w) => w.id === workspace_id);
  if (!ws) return { error: "Workspace access denied" };
  const scope = { workspace_id: ws.id, owner_id: ws.owner_id };
  const inScope = (list) => list.filter((r) => r.workspace_id === ws.id);

  switch (action) {
    case "list":
      return { orders: clone(inScope(store.WorkOrder)) };

    case "listSystems":
      return { systems: clone(inScope(store.SystemRegistry)) };

    case "listItems":
      return { items: clone(inScope(store.ItemMaster)) };

    case "itemLookup":
      return {
        items: code
          ? clone(inScope(store.ItemMaster).filter((i) => i.code === String(code).toUpperCase().trim()))
          : [],
      };

    case "settings": {
      if (!data?.name?.trim()) return { error: "Provide a workspace name" };
      Object.assign(ws, {
        name: data.name.trim().slice(0, 100),
        plant: String(data.plant || "").slice(0, 100),
        member_emails: [...new Set((data.member_emails || []).map((e) => String(e).toLowerCase().trim()))],
        designation: String(data.designation || "").slice(0, 100),
        plant_role: String(data.plant_role || "").slice(0, 100),
        shift: String(data.shift || "").slice(0, 50),
      });
      return clone(ws);
    }

    case "profile":
      Object.assign(ws, {
        designation: String(data?.designation || "").slice(0, 100),
        plant_role: String(data?.plant_role || "").slice(0, 100),
        shift: String(data?.shift || "").slice(0, 50),
      });
      return clone(ws);

    case "clearData":
      store.WorkOrder = store.WorkOrder.filter((r) => r.workspace_id !== ws.id);
      return { deleted: true };

    case "bulkReschedule": {
      if (!Array.isArray(ids) || !ids.length || !newDate) throw Error("Provide IDs and a target date");
      let updated = 0;
      for (const wid of ids) {
        const o = store.WorkOrder.find((r) => r.id === wid && r.workspace_id === ws.id && r.status !== "Completed");
        if (o) { o.planned_start = newDate; o.planned_finish = newDate; updated++; }
      }
      return { updated };
    }

    case "massUpdate": {
      if (!Array.isArray(ids) || !ids.length || !STATUSES.includes(status)) throw Error("Provide valid IDs and status");
      let updated = 0;
      for (const wid of ids) {
        const o = store.WorkOrder.find((r) => r.id === wid && r.workspace_id === ws.id);
        if (o) { o.status = status; updated++; }
      }
      return { updated };
    }

    case "massDelete": {
      if (!Array.isArray(ids) || !ids.length) throw Error("Provide IDs to delete");
      const before = store.WorkOrder.length;
      store.WorkOrder = store.WorkOrder.filter((r) => !(ids.includes(r.id) && r.workspace_id === ws.id));
      return { deleted: before - store.WorkOrder.length };
    }

    case "massDeleteItems": {
      if (!Array.isArray(ids) || !ids.length) throw Error("Provide IDs to delete");
      const before = store.ItemMaster.length;
      store.ItemMaster = store.ItemMaster.filter((r) => !(ids.includes(r.id) && r.workspace_id === ws.id));
      return { deleted: before - store.ItemMaster.length };
    }

    case "deleteAllItems": {
      const before = store.ItemMaster.length;
      store.ItemMaster = store.ItemMaster.filter((r) => r.workspace_id !== ws.id);
      return { deleted: true, count: before - store.ItemMaster.length };
    }

    case "saveSystem": {
      const unit = String(data?.unit || "").trim();
      const system_name = String(data?.system_name || "").trim();
      if (!unit || !system_name) throw Error("Unit and system name required");
      if (!UNITS.includes(unit)) throw Error("Invalid unit");
      const sys = { unit, system_name, area: String(data?.area || "").slice(0, 100) };
      if (id) {
        const ex = store.SystemRegistry.find((r) => r.id === id);
        if (!ex) throw Error("System access denied");
        Object.assign(ex, sys);
        return clone(ex);
      }
      const row = { id: newId("sys"), ...scope, ...sys };
      store.SystemRegistry.push(row);
      return clone(row);
    }

    case "deleteSystem":
      store.SystemRegistry = store.SystemRegistry.filter((r) => r.id !== id);
      return { deleted: true };

    case "saveItem": {
      const itemCode = String(data?.code || "").trim().toUpperCase();
      if (!itemCode || !data?.description?.trim()) throw Error("Item code and description required");
      const item = {
        code: itemCode,
        description: String(data.description).trim().slice(0, 500),
        bin_location: String(data.bin_location || "").slice(0, 100),
        stock: Number(data.stock) || 0,
        unit: String(data.unit || "").slice(0, 50),
        category: String(data.category || "").slice(0, 100),
      };
      const target = id
        ? store.ItemMaster.find((r) => r.id === id)
        : inScope(store.ItemMaster).find((r) => r.code === itemCode);
      if (target) { Object.assign(target, item); return clone(target); }
      const row = { id: newId("item"), ...scope, ...item };
      store.ItemMaster.push(row);
      return clone(row);
    }

    case "deleteItem":
      store.ItemMaster = store.ItemMaster.filter((r) => r.id !== id);
      return { deleted: true };

    case "importItems": {
      if (!Array.isArray(rows) || !rows.length) throw Error("Import between 1 and 500 rows");
      let created = 0, updated = 0;
      for (const row of rows) {
        const itemCode = String(row.code || "").trim().toUpperCase();
        if (!itemCode || !String(row.description || "").trim()) continue;
        const item = {
          code: itemCode,
          description: String(row.description).trim().slice(0, 500),
          bin_location: String(row.bin_location || "").slice(0, 100),
          stock: Number(row.stock) || 0,
          unit: String(row.unit || "").slice(0, 50),
          category: String(row.category || "").slice(0, 100),
        };
        const dup = inScope(store.ItemMaster).find((r) => r.code === itemCode);
        if (dup) { Object.assign(dup, item); updated++; }
        else { store.ItemMaster.push({ id: newId("item"), ...scope, ...item }); created++; }
      }
      return { created, updated };
    }

    case "importSystems": {
      if (!Array.isArray(rows) || !rows.length) throw Error("Import between 1 and 500 rows");
      let created = 0, updated = 0;
      for (const row of rows) {
        const unit = String(row.unit || "").trim();
        const system_name = String(row.system_name || "").trim();
        if (!unit || !system_name || !UNITS.includes(unit)) continue;
        const sys = { unit, system_name, area: String(row.area || "").slice(0, 100) };
        const dup = inScope(store.SystemRegistry).find((r) => r.unit === unit && r.system_name === system_name);
        if (dup) { Object.assign(dup, sys); updated++; }
        else { store.SystemRegistry.push({ id: newId("sys"), ...scope, ...sys }); created++; }
      }
      return { created, updated };
    }

    case "import":
    case "importBreakIns":
    case "importPM": {
      if (!Array.isArray(rows) || !rows.length) throw Error("Import between 1 and 500 rows");
      const prepared = rows.map((r) => {
        const v = clean(r);
        if (action === "importBreakIns") v.job_type = "Break-In";
        if (action === "importPM") {
          v.maintenance_type = "PM";
          v.job_type = "Scheduled";
          if (!v.pm_frequency) v.pm_frequency = "Monthly";
        }
        return v;
      });
      if (prepared.some((r) => !r.description?.trim())) throw Error("Every row needs a description");
      let created = 0, updated = 0;
      for (const row of prepared) {
        if (!row.wo_number?.trim())
          row.wo_number = nextTicket(scope, action === "importPM" ? "PM-ICMS" : "EM-ICMS");
        const key = row.wo_number.trim().toUpperCase();
        const dup = inScope(store.WorkOrder).find((r) => String(r.wo_number).toUpperCase() === key);
        if (dup) { Object.assign(dup, row); updated++; }
        else { store.WorkOrder.push({ id: newId("wo"), ...scope, priority: "Medium", status: "Open", job_type: "Scheduled", maintenance_type: "CM", created_date: nowISO(), ...row }); created++; }
      }
      return { created, updated };
    }

    case "breakInBatch": {
      if (!Array.isArray(jobs) || !jobs.length) throw Error("Provide between 1 and 100 break-in jobs");
      let created = 0;
      for (const job of jobs) {
        const values = clean(job);
        if (!values.description?.trim()) continue;
        if (!values.wo_number?.trim()) values.wo_number = nextTicket(scope, "EM-ICMS");
        values.job_type = "Break-In";
        if (!values.priority) values.priority = "Medium";
        if (!values.status) values.status = "Open";
        store.WorkOrder.push({ id: newId("wo"), ...scope, maintenance_type: "CM", created_date: nowISO(), ...values });
        created++;
      }
      return { created };
    }

    case "delete": {
      store.WorkOrder = store.WorkOrder.filter((r) => r.id !== id);
      return { deleted: true };
    }

    case "save": {
      const existing = id ? store.WorkOrder.find((r) => r.id === id) : null;
      if (id && !existing) throw Error("Work order access denied");
      const values = clean(data || {});
      if (values.status === "Deferred" && !values.deferred_reason)
        throw Error("Deferred reason is required when status is Deferred");
      if (values.deferred_reason === "For PR" && !values.pr_number?.trim())
        throw Error("PR Number is required for PR deferrals");
      if (!existing && !values.wo_number?.trim() && values.job_type === "Break-In")
        values.wo_number = nextTicket(scope, "EM-ICMS");
      if (!(values.description ?? existing?.description)?.trim())
        throw Error("Work description is required");
      const number = values.wo_number ?? existing?.wo_number;
      if (inScope(store.WorkOrder).some((r) => r.wo_number === number && r.id !== id))
        throw Error("This WO number already exists");

      const wasPM = existing?.maintenance_type === "PM" || values.maintenance_type === "PM";
      const prevStatus = existing?.status;
      let saved;
      if (existing) { Object.assign(existing, values, { updated_date: nowISO() }); saved = existing; }
      else {
        saved = { id: newId("wo"), ...scope, status: "Open", priority: "Medium", job_type: "Scheduled", maintenance_type: "CM", created_date: nowISO(), ...values };
        store.WorkOrder.push(saved);
      }

      // Auto-populate the item master from materials used
      for (const m of values.materials || []) {
        if (m.code?.trim() && m.description?.trim()) {
          const mCode = m.code.trim().toUpperCase();
          if (!inScope(store.ItemMaster).some((r) => r.code === mCode))
            store.ItemMaster.push({ id: newId("item"), ...scope, code: mCode, description: m.description.trim(), stock: 0 });
        }
      }

      // Auto-generate the next PM instance when a PM job is completed
      if (wasPM && values.status === "Completed" && prevStatus !== "Completed" && saved.pm_frequency) {
        const next = nextPMDate(saved.pm_frequency, saved.completion_time || saved.planned_start || nowISO());
        if (next)
          store.WorkOrder.push({
            id: newId("wo"), ...scope, wo_number: nextTicket(scope, "PM-ICMS"),
            description: saved.description, equipment_tag: saved.equipment_tag, system: saved.system,
            unit: saved.unit, priority: saved.priority || "Medium", job_type: "Scheduled",
            maintenance_type: "PM", pm_frequency: saved.pm_frequency, status: "Open",
            planned_start: next, planned_finish: next, created_date: nowISO(),
          });
      }
      return clone(saved);
    }

    default:
      return { error: "Unknown operation" };
  }
}

/* -------------------------------------------- spreadsheet import (client) */

const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const cleanCell = (v) => (v === null || v === undefined ? "" : String(v).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim());

const convertPriority = (raw) => {
  if (raw === null || raw === undefined || raw === "") return null;
  const s = String(raw).trim().toUpperCase();
  if (["1", "EMERGENCY", "CRITICAL"].includes(s)) return { priority: "Critical", job_type: "Break-In" };
  if (["2", "HIGH"].includes(s)) return { priority: "High", job_type: "Scheduled" };
  if (["3", "MEDIUM", "NORMAL"].includes(s)) return { priority: "Medium", job_type: "Scheduled" };
  if (["4", "LOW"].includes(s)) return { priority: "Low", job_type: "Scheduled" };
  if (["5", "SD", "SHUTDOWN"].includes(s)) return { priority: "Low", job_type: "Scheduled", shutdown_item: true };
  return null;
};

const convertStatus = (raw) => {
  const s = String(raw || "").trim().toUpperCase();
  if (["COMP", "CLOSE", "CLOSED", "COMPLETE", "COMPLETED"].includes(s)) return "Completed";
  if (["WIP", "INPRG", "INPROGRESS", "IN-PROGRESS", "STARTED"].includes(s)) return "In-Progress";
  if (["DEFER", "DEFERRED", "HOLD"].includes(s)) return "Deferred";
  if (["OPEN", "WAPPR", "APPR", "DRAFT", "WSCH", "WMATL", "READY"].includes(s)) return "Open";
  return "";
};

const ALIASES = {
  wo_number: ["wonum", "workorder", "workordernumber", "wonumber", "order", "ordernumber", "aufnr"],
  equipment_tag: ["assetnum", "asset", "equipment", "equipmenttag", "tag", "tagid", "equipmentnumber", "equnr", "location", "functionallocation"],
  description: ["description", "workdescription", "shorttext", "operationtext", "assetdescription", "tagassetdescription"],
  system: ["system", "plantsystem", "area", "plant", "functionalarea"],
  planned_start: ["plannedstart", "plannedstartdate", "schedstart", "scheduledstart", "basicstartdate", "gstrp", "targetstart", "targstartdate", "targetstartdate"],
  planned_finish: ["plannedfinish", "plannedfinishdate", "schedfinish", "scheduledfinish", "basicfinishdate", "gltrp", "targetfinish", "targfinishdate"],
  item_code: ["itemnum", "itemcode", "material", "materialnumber", "matnr"],
  priority: ["priority", "calcpriority", "internalpriority", "wopriority"],
  status: ["status", "wostatus"],
  unit: ["unit", "plantunit", "unitid", "plantunitid"],
  pm_frequency: ["pmfrequency", "frequency", "pmfreq", "interval", "pminterval", "frequencyinterval"],
};

function parsePlantImport({ content }) {
  if (typeof content !== "string") throw Error("Could not read that file");
  const bytes = Uint8Array.from(atob(content), (c) => c.charCodeAt(0));
  const book = XLSX.read(bytes, { type: "array", cellDates: true, sheetRows: 510 });

  let matrix = [], mapping = {}, sheet = "";
  for (const name of book.SheetNames) {
    const grid = XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, defval: "" });
    const index = grid.findIndex((r) => r.some((c) => ALIASES.wo_number.includes(norm(c))));
    if (index >= 0) {
      matrix = grid.slice(index + 1);
      grid[index].forEach((h, i) => {
        for (const [key, names] of Object.entries(ALIASES)) if (names.includes(norm(h))) mapping[key] = i;
      });
      sheet = name;
      break;
    }
  }
  if (mapping.wo_number === undefined || mapping.description === undefined)
    throw Error("Could not detect WO number and description columns. Use Work Order / Description headers.");

  const date = (v) => {
    if (!v) return "";
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === "number") {
      const d = XLSX.SSF.parse_date_code(v);
      return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    throw Error("Ambiguous date: " + s + ". Use real Excel dates or YYYY-MM-DD.");
  };

  const parsed = matrix
    .filter((r) => r.some((v) => String(v || "").trim() !== ""))
    .map((r, i) => {
      const out = {};
      for (const [key, col] of Object.entries(mapping)) {
        if (key === "item_code") {
          if (r[col]) out.materials = [{ code: String(r[col]), description: "", quantity: 0 }];
        } else if (key === "priority") {
          const p = convertPriority(r[col]);
          if (p) { out.priority = p.priority; out.job_type = p.job_type; if (p.shutdown_item) out.shutdown_item = true; }
        } else if (key === "status") {
          const st = convertStatus(r[col]);
          if (st) out.status = st;
        } else if (key === "unit") {
          if (r[col]) out.unit = String(r[col]).trim();
        } else {
          out[key] = key.startsWith("planned_") ? date(r[col]) : cleanCell(r[col]);
        }
      }
      if (!out.wo_number || !out.description) throw Error("Missing WO number or description at data row " + (i + 1));
      return out;
    });

  if (parsed.length > 500) throw Error("Split this file into batches of 500 rows or fewer");

  const seen = new Set();
  const duplicates = [];
  for (const row of parsed) {
    const key = row.wo_number.trim().toUpperCase();
    if (seen.has(key)) duplicates.push(key);
    else seen.add(key);
  }
  return { rows: parsed, sheet, mapped_fields: Object.keys(mapping), duplicates };
}

/* ------------------------------------------------------------ public shim */

const db = {
  auth: {
    isAuthenticated: async () => true,
    me: async () => clone(store.user),
    updateMe: async (data) => {
      Object.assign(store.user, data, data.full_name ? { name: data.full_name } : {});
      return clone(store.user);
    },
    logout: async () => {
      // Sign-out is disabled while the app runs on sample data.
    },
  },
  entities,
  functions: {
    invoke: async (name, payload = {}) => {
      await wait();
      try {
        if (name === "plantWorkspace") return { data: await plantWorkspace(payload) };
        if (name === "parsePlantImport") return { data: parsePlantImport(payload) };
        return { data: { error: `Unknown function: ${name}` } };
      } catch (e) {
        return { data: { error: e.message } };
      }
    },
  },
};

export default db;
