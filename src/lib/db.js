// Persistent data layer for ICMS ProMax.
//
// It keeps the exact same interface the UI already uses
// (`db.auth.*`, `db.entities.*`, `db.functions.invoke`), so every screen keeps
// working — but every save / delete is now persisted in the database and
// survives a browser refresh.

import supabase from "./supabaseClient";
import parsePlantImport from "./parseImport";

const TABLES = {
  Workspace: "workspaces",
  SystemRegistry: "system_registry",
  ItemMaster: "item_master",
  SupervisorTodo: "supervisor_todos",
  SupervisorDailyLog: "supervisor_daily_logs",
  AlertSetting: "alert_settings",
};

/* ---------------------------------------------- split order tables (PM / CM / Break-In)
 * Work orders now live in three physical tables. Everything above the data layer keeps
 * using one merged `orders` list, so each row carries `_table` telling us where it came
 * from and every write is routed back to the right table.
 */
const ORDER_TABLE = { PM: "pm_orders", CM: "cm_orders", BREAKIN: "breakin_orders" };
const ORDER_TABLE_LIST = [ORDER_TABLE.PM, ORDER_TABLE.CM, ORDER_TABLE.BREAKIN];

const COMMON_ORDER_COLS = [
  "wo_number","equipment_tag","system","unit","description","priority","job_type","maintenance_type",
  "shutdown_item","status","technician","planned_start","planned_finish","start_time","completion_time",
  "materials","ptw_number","associated_wo","deferred_reason","pr_number",
];
const TABLE_COLS = {
  pm_orders: [...COMMON_ORDER_COLS, "pm_frequency"],
  cm_orders: [...COMMON_ORDER_COLS, "action_taken", "as_found", "as_left"],
  breakin_orders: [...COMMON_ORDER_COLS, "action_taken", "as_found", "as_left", "ex_breakin"],
};

// Decide which physical table a row belongs to, from its job / maintenance type.
const kindOf = (row = {}) => {
  const job = String(row.job_type || "").trim().toLowerCase();
  const maint = String(row.maintenance_type || "").trim().toLowerCase();
  if (job === "break-in" || job === "breakin" || maint === "break-in") return "BREAKIN";
  if (maint === "pm" || job === "pm" || row.pm_frequency) return "PM";
  return "CM";
};
const tableOf = (row) => ORDER_TABLE[kindOf(row)];

// Keep only the columns the destination table actually has.
const forTable = (table, values = {}) => {
  const allowed = TABLE_COLS[table] || COMMON_ORDER_COLS;
  const out = {};
  for (const [k, v] of Object.entries(values)) if (allowed.includes(k)) out[k] = v;
  if (table === ORDER_TABLE.PM) {
    out.maintenance_type = "PM";
    out.job_type = "Scheduled";
  } else if (table === ORDER_TABLE.BREAKIN) {
    out.maintenance_type = "CM";
    out.job_type = "Break-In";
  } else {
    out.maintenance_type = "CM";
    out.job_type = "Scheduled";
  }
  return out;
};

// Normalise rows coming out of the three tables so the UI sees one consistent shape.
const tagRow = (row, table) => ({
  ...row,
  _table: table,
  job_type: table === ORDER_TABLE.BREAKIN ? "Break-In" : "Scheduled",
  maintenance_type: table === ORDER_TABLE.PM ? "PM" : "CM",
  ex_breakin: table === ORDER_TABLE.BREAKIN ? true : Boolean(row.ex_breakin),
});


const nowISO = () => new Date().toISOString();

const fail = (error) => {
  if (error) throw Error(error.message || "Database request failed");
};

/* --------------------------------------------------------------- paging
 * The database returns at most 1,000 rows per request. Any list that can grow
 * past that (work orders, item master, system registry) must be read page by
 * page until a short page comes back, otherwise YTD data silently truncates.
 */
const PAGE_SIZE = 1000;

const fetchAllRows = async (buildQuery) => {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    fail(error);
    const page = data || [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
    if (rows.length > 500000) return rows; // hard safety stop
  }
};


// A database that has not been upgraded to the newest schema yet rejects the
// whole write when it sees a column it does not know. Drop that single field
// and retry so older projects keep saving everything else.
const unknownColumn = (error) => {
  const msg = String(error?.message || "");
  const m = msg.match(/'([a-z_]+)' column/i) || msg.match(/column "?([a-z_]+)"?.*does not exist/i);
  return m ? m[1] : null;
};

const tolerantWrite = async (values, run) => {
  const payload = { ...values };
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await run(payload);
    if (!error) return data;
    const col = unknownColumn(error);
    if (!col || !(col in payload)) fail(error);
    delete payload[col];
  }
  throw Error("This record could not be saved. Please refresh and try again.");
};

async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw Error("You are signed out. Please log in again.");
  const u = data.user;
  return {
    id: u.id,
    email: u.email,
    name: u.user_metadata?.full_name || u.email?.split("@")[0] || "Supervisor",
    full_name: u.user_metadata?.full_name || "",
  };
}

/* ------------------------------------------------------------- entities */

const entity = (name) => {
  const table = TABLES[name];
  return {
    async filter(query = {}, sort, limit, offset = 0) {
      const build = () => {
        let q = supabase.from(table).select("*");
        for (const [k, v] of Object.entries(query)) q = q.eq(k, v);
        if (sort) {
          const desc = sort.startsWith("-");
          q = q.order(desc ? sort.slice(1) : sort, { ascending: !desc, nullsFirst: false });
        } else {
          q = q.order("id", { ascending: true });
        }
        return q;
      };
      // No explicit limit -> read every page so nothing is cut off at 1,000 rows.
      if (limit == null) {
        const rows = await fetchAllRows(build);
        return offset ? rows.slice(offset) : rows;
      }
      const { data, error } = await build().range(offset, offset + limit - 1);
      fail(error);
      return data || [];
    },

    async get(id) {
      const { data, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
      fail(error);
      return data;
    },
    async create(values) {
      const user = await currentUser();
      return tolerantWrite({ owner_id: user.id, ...values, updated_date: nowISO() }, (payload) =>
        supabase.from(table).insert(payload).select().single(),
      );
    },
    async update(id, values) {
      return tolerantWrite({ ...values, updated_date: nowISO() }, (payload) =>
        supabase.from(table).update(payload).eq("id", id).select().single(),
      );
    },
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      fail(error);
      return { deleted: true };
    },
    async deleteMany(query = {}) {
      let q = supabase.from(table).delete();
      for (const [k, v] of Object.entries(query)) q = q.eq(k, v);
      const { error } = await q;
      fail(error);
      return { deleted: true };
    },
  };
};

const entities = Object.fromEntries(Object.keys(TABLES).map((k) => [k, entity(k)]));

/* -------------------------------------------------------------- helpers */

const ORDER_FIELDS = [
  "wo_number","equipment_tag","system","unit","description","priority","job_type","maintenance_type",
  "pm_frequency","shutdown_item","status","technician","planned_start","planned_finish","action_taken",
  "as_found","as_left","start_time","completion_time","materials","ptw_number","ex_breakin",
  "associated_wo","deferred_reason","pr_number",
];
const UNITS = ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Common", "MH", "WT", "COMP", "Phase 1", "Phase 2"];
const STATUSES = ["Open", "In-Progress", "Pending Parts", "Completed", "Deferred", "Cancelled"];
const PM_FREQUENCIES = ["Daily", "Weekly", "Monthly", "Quarterly", "Semi-Annual", "Annual", "Operating Hours"];

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
  if (out.maintenance_type && !["CM", "PM", "Break-In"].includes(out.maintenance_type)) throw Error("Invalid maintenance type");
  if (out.pm_frequency && !PM_FREQUENCIES.includes(out.pm_frequency)) throw Error("Invalid PM frequency");
  if (out.deferred_reason && !["For Shutdown","For Load Down Activities","For PR","Equipment Unavailability"].includes(out.deferred_reason)) throw Error("Invalid deferred reason");
  if (out.priority && !["Critical","High","Medium","Low"].includes(out.priority)) throw Error("Invalid priority");
  if (out.job_type && !["Scheduled","Break-In","PM","CM"].includes(out.job_type)) throw Error("Invalid job type");
  if (out.unit && !UNITS.includes(out.unit)) throw Error("Invalid unit");
  if (out.materials && (!Array.isArray(out.materials) || out.materials.length > 100 || out.materials.some((m) => !Number.isFinite(Number(m.quantity)) || Number(m.quantity) < 0)))
    throw Error("Invalid material quantities");
  if (out.planned_start && out.planned_finish && out.planned_start > out.planned_finish)
    throw Error("Planned finish must follow planned start");
  if (out.start_time && out.completion_time && out.start_time > out.completion_time)
    throw Error("Completion must follow start");
  return out;
};

const listOrders = async (workspaceId) => {
  // Pull the three order tables at once and merge them into one list.
  // Each table is read page by page so workspaces with well over 1,000 rows
  // (full year-to-date PM / CM / Break-In history) come back complete.
  const results = await Promise.all(
    ORDER_TABLE_LIST.map((table) =>
      fetchAllRows(() =>
        supabase
          .from(table)
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("id", { ascending: true }),
      ),
    ),
  );
  const merged = [];
  results.forEach((rows, i) => {
    for (const row of rows) merged.push(tagRow(row, ORDER_TABLE_LIST[i]));
  });
  return merged;
};


// Find which of the three tables holds a given order id.
const findOrder = async (workspaceId, id) => {
  const results = await Promise.all(
    ORDER_TABLE_LIST.map((table) =>
      supabase.from(table).select("*").eq("workspace_id", workspaceId).eq("id", id).maybeSingle(),
    ),
  );
  for (let i = 0; i < results.length; i++) {
    if (results[i].data) return { table: ORDER_TABLE_LIST[i], row: tagRow(results[i].data, ORDER_TABLE_LIST[i]) };
  }
  return null;
};

const nextTicket = async (workspaceId, prefix) => {
  const results = await Promise.all(
    ORDER_TABLE_LIST.map((table) =>
      fetchAllRows(() =>
        supabase
          .from(table)
          .select("wo_number")
          .eq("workspace_id", workspaceId)
          .ilike("wo_number", `${prefix}-%`)
          .order("id", { ascending: true }),
      ),
    ),
  );
  const re = new RegExp(`^${prefix}-(\\d+)$`, "i");
  let max = 0;
  for (const rows of results) {
    for (const row of rows) {
      const m = String(row.wo_number || "").match(re);
      if (m) max = Math.max(max, parseInt(m[1], 10));

    }
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
};

// A WO number must stay unique across all three tables.
const woNumberTaken = async (workspaceId, number, skipId) => {
  const results = await Promise.all(
    ORDER_TABLE_LIST.map((table) => {
      let q = supabase.from(table).select("id").eq("workspace_id", workspaceId).eq("wo_number", number);
      if (skipId) q = q.neq("id", skipId);
      return q;
    }),
  );
  for (const res of results) {
    fail(res.error);
    if ((res.data || []).length) return true;
  }
  return false;
};

const nextPMDate = (freq, base) => {
  const raw = String(base || "");
  const d = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00`) : new Date(base || Date.now());
  if (isNaN(d.getTime())) return "";
  const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  if (freq === "Daily") return fmt(new Date(d.getTime() + 86400000));
  if (freq === "Weekly") return fmt(new Date(d.getTime() + 7 * 86400000));
  if (freq === "Monthly") return fmt(new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()));
  if (freq === "Quarterly") return fmt(new Date(d.getFullYear(), d.getMonth() + 3, d.getDate()));
  if (freq === "Semi-Annual") return fmt(new Date(d.getFullYear(), d.getMonth() + 6, d.getDate()));
  if (freq === "Annual") return fmt(new Date(d.getFullYear() + 1, d.getMonth(), d.getDate()));
  // Operating-hours PMs have no calendar rule; queue a 30-day inspection window
  // so the job stays visible until runtime data says otherwise.
  if (freq === "Operating Hours") return fmt(new Date(d.getTime() + 30 * 86400000));
  return "";
};

/* ------------------------------------------------- workspace operations */


async function plantWorkspace(payload = {}) {
  const { action, workspace_id, id, data, rows, jobs, ids, status, code, newDate } = payload;
  const user = await currentUser();

  if (action === "initialize") {
    const { data: list, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });
    fail(error);
    let workspaces = list || [];
    if (!workspaces.length) {
      const { data: created, error: createError } = await supabase
        .from("workspaces")
        .insert({ owner_id: user.id, name: "My Plant Workspace", plant: "", member_emails: [] })
        .select()
        .single();
      fail(createError);
      workspaces = [created];
    }
    return { user, workspaces };
  }

  const { data: ws, error: wsError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspace_id)
    .maybeSingle();
  fail(wsError);
  if (!ws) return { error: "Workspace access denied" };
  const scope = { workspace_id: ws.id, owner_id: ws.owner_id };

  switch (action) {
    case "list":
      return { orders: await listOrders(ws.id) };

    case "listSystems": {
      const systems = await fetchAllRows(() =>
        supabase
          .from("system_registry")
          .select("*")
          .eq("workspace_id", ws.id)
          .order("id", { ascending: true }),
      );
      return { systems };
    }

    case "listItems": {
      const items = await fetchAllRows(() =>
        supabase
          .from("item_master")
          .select("*")
          .eq("workspace_id", ws.id)
          .order("id", { ascending: true }),
      );
      return { items };
    }


    case "itemLookup": {
      if (!code) return { items: [] };
      const { data: items, error } = await supabase
        .from("item_master")
        .select("*")
        .eq("workspace_id", ws.id)
        .eq("code", String(code).toUpperCase().trim());
      fail(error);
      return { items: items || [] };
    }

    case "settings": {
      if (!data?.name?.trim()) return { error: "Provide a workspace name" };
      const { data: saved, error } = await supabase
        .from("workspaces")
        .update({
          name: data.name.trim().slice(0, 100),
          app_name: String(data.app_name || "LPDSI Limay 1").trim().slice(0, 80),
          clock_format: data.clock_format === "24" ? "24" : "12",
          plant: String(data.plant || "").slice(0, 100),
          member_emails: [...new Set((data.member_emails || []).map((e) => String(e).toLowerCase().trim()))],
          designation: String(data.designation || "").slice(0, 100),
          plant_role: String(data.plant_role || "").slice(0, 100),
          shift: String(data.shift || "").slice(0, 50),
        })
        .eq("id", ws.id)
        .select()
        .single();
      fail(error);
      return saved;
    }


    case "profile": {
      const { data: saved, error } = await supabase
        .from("workspaces")
        .update({
          designation: String(data?.designation || "").slice(0, 100),
          plant_role: String(data?.plant_role || "").slice(0, 100),
          shift: String(data?.shift || "").slice(0, 50),
        })
        .eq("id", ws.id)
        .select()
        .single();
      fail(error);
      return saved;
    }

    // Per-user web app preferences (shortcuts, analytics metrics, default
    // views). Stored on the workspace so they follow the user to any device.
    case "prefs": {
      const prefs = data && typeof data === "object" ? data : {};
      const { data: saved, error } = await supabase
        .from("workspaces").update({ prefs }).eq("id", ws.id).select().single();
      if (error) return { prefs, unsupported: true };
      return saved;
    }

    case "clearData": {
      const results = await Promise.all(
        ORDER_TABLE_LIST.map((table) => supabase.from(table).delete().eq("workspace_id", ws.id)),
      );
      results.forEach((r) => fail(r.error));
      return { deleted: true };
    }


    case "bulkReschedule": {
      if (!Array.isArray(ids) || !ids.length || !newDate) throw Error("Provide IDs and a target date");
      const results = await Promise.all(
        ORDER_TABLE_LIST.map((table) =>
          supabase
            .from(table)
            .update({ planned_start: newDate, planned_finish: newDate, updated_date: nowISO() })
            .eq("workspace_id", ws.id)
            .neq("status", "Completed")
            .in("id", ids)
            .select("id"),
        ),
      );
      let updated = 0;
      for (const r of results) { fail(r.error); updated += (r.data || []).length; }
      return { updated };
    }

    case "massUpdate": {
      if (!Array.isArray(ids) || !ids.length || !STATUSES.includes(status)) throw Error("Provide valid IDs and status");
      const results = await Promise.all(
        ORDER_TABLE_LIST.map((table) =>
          supabase
            .from(table)
            .update({ status, updated_date: nowISO() })
            .eq("workspace_id", ws.id)
            .in("id", ids)
            .select("id"),
        ),
      );
      let updated = 0;
      for (const r of results) { fail(r.error); updated += (r.data || []).length; }
      return { updated };
    }

    case "massDelete": {
      if (!Array.isArray(ids) || !ids.length) throw Error("Provide IDs to delete");
      const results = await Promise.all(
        ORDER_TABLE_LIST.map((table) =>
          supabase.from(table).delete().eq("workspace_id", ws.id).in("id", ids).select("id"),
        ),
      );
      let deleted = 0;
      for (const r of results) { fail(r.error); deleted += (r.data || []).length; }
      return { deleted };
    }

    case "massDeleteItems": {
      if (!Array.isArray(ids) || !ids.length) throw Error("Provide IDs to delete");
      const { data: removed, error } = await supabase
        .from("item_master").delete().eq("workspace_id", ws.id).in("id", ids).select("id");
      fail(error);
      return { deleted: (removed || []).length };
    }

    case "deleteAllItems": {
      const { data: removed, error } = await supabase
        .from("item_master").delete().eq("workspace_id", ws.id).select("id");
      fail(error);
      return { deleted: true, count: (removed || []).length };
    }


    case "saveSystem": {
      const unit = String(data?.unit || "").trim();
      const system_name = String(data?.system_name || "").trim();
      if (!unit || !system_name) throw Error("Unit and system name required");
      if (!UNITS.includes(unit)) throw Error("Invalid unit");
      const sys = { unit, system_name, area: String(data?.area || "").slice(0, 100) };
      if (id) {
        const { data: saved, error } = await supabase.from("system_registry").update(sys).eq("id", id).select().single();
        fail(error);
        return saved;
      }
      const { data: saved, error } = await supabase.from("system_registry").insert({ ...scope, ...sys }).select().single();
      fail(error);
      return saved;
    }

    case "deleteSystem": {
      const { error } = await supabase.from("system_registry").delete().eq("id", id);
      fail(error);
      return { deleted: true };
    }


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
      let targetId = id;
      if (!targetId) {
        const { data: dup } = await supabase
          .from("item_master").select("id").eq("workspace_id", ws.id).eq("code", itemCode).maybeSingle();
        targetId = dup?.id;
      }
      if (targetId) {
        const { data: saved, error } = await supabase.from("item_master").update(item).eq("id", targetId).select().single();
        fail(error);
        return saved;
      }
      const { data: saved, error } = await supabase.from("item_master").insert({ ...scope, ...item }).select().single();
      fail(error);
      return saved;
    }

    case "deleteItem": {
      const { error } = await supabase.from("item_master").delete().eq("id", id);
      fail(error);
      return { deleted: true };
    }


    case "importItems": {
      if (!Array.isArray(rows) || !rows.length) throw Error("Import between 1 and 500 rows");
      const { data: existing } = await supabase.from("item_master").select("id, code").eq("workspace_id", ws.id);
      const byCode = new Map((existing || []).map((r) => [r.code, r.id]));
      const inserts = [];
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
        if (byCode.has(itemCode)) {
          const { error } = await supabase.from("item_master").update(item).eq("id", byCode.get(itemCode));
          fail(error);
          updated++;
        } else {
          inserts.push({ ...scope, ...item });
          byCode.set(itemCode, "pending");
          created++;
        }
      }
      if (inserts.length) fail((await supabase.from("item_master").insert(inserts)).error);
      return { created, updated };
    }

    case "importSystems": {
      if (!Array.isArray(rows) || !rows.length) throw Error("Import between 1 and 500 rows");
      const { data: existing } = await supabase.from("system_registry").select("id, unit, system_name").eq("workspace_id", ws.id);
      const key = (u, s) => `${u}||${s}`;
      const byKey = new Map((existing || []).map((r) => [key(r.unit, r.system_name), r.id]));
      const inserts = [];
      let created = 0, updated = 0;
      for (const row of rows) {
        const unit = String(row.unit || "").trim();
        const system_name = String(row.system_name || "").trim();
        if (!unit || !system_name || !UNITS.includes(unit)) continue;
        const sys = { unit, system_name, area: String(row.area || "").slice(0, 100) };
        const found = byKey.get(key(unit, system_name));
        if (found && found !== "pending") {
          fail((await supabase.from("system_registry").update(sys).eq("id", found)).error);
          updated++;
        } else if (!found) {
          inserts.push({ ...scope, ...sys });
          byKey.set(key(unit, system_name), "pending");
          created++;
        }
      }
      if (inserts.length) fail((await supabase.from("system_registry").insert(inserts)).error);
      return { created, updated };
    }

    case "import":
    case "importBreakIns":
    case "importPM": {
      if (!Array.isArray(rows) || !rows.length) throw Error("Import between 1 and 500 rows");
      const prepared = rows.map((r) => {
        const v = clean(r);
        if (action === "importBreakIns") {
          v.job_type = "Break-In";
          v.maintenance_type = "CM";
        } else if (action === "importPM") {
          v.maintenance_type = "PM";
          v.job_type = "Scheduled";
          if (!v.pm_frequency) v.pm_frequency = "Monthly";
        } else {
          // Generic import: honour whatever the spreadsheet says per row.
          const kind = kindOf({ ...r, ...v });
          if (kind === "PM") {
            v.maintenance_type = "PM";
            v.job_type = "Scheduled";
            if (!v.pm_frequency) v.pm_frequency = "Monthly";
          } else if (kind === "BREAKIN") {
            v.job_type = "Break-In";
            v.maintenance_type = "CM";
          } else {
            v.maintenance_type = "CM";
            v.job_type = "Scheduled";
          }
        }
        return v;
      });
      if (prepared.some((r) => !r.description?.trim())) throw Error("Every row needs a description");
      const existing = await listOrders(ws.id);
      const byNumber = new Map(existing.map((r) => [String(r.wo_number).toUpperCase(), r]));
      let counter = 0;
      const base = await nextTicket(ws.id, action === "importPM" ? "PM-ICMS" : "EM-ICMS");
      const basePrefix = base.replace(/-(\d+)$/, "");
      let baseNum = parseInt(base.match(/-(\d+)$/)?.[1] || "1", 10);
      const inserts = { pm_orders: [], cm_orders: [], breakin_orders: [] };
      let created = 0, updated = 0;
      for (const row of prepared) {
        if (!row.wo_number?.trim()) {
          row.wo_number = `${basePrefix}-${String(baseNum + counter).padStart(3, "0")}`;
          counter++;
        }
        const key = row.wo_number.trim().toUpperCase();
        const table = tableOf(row);
        const dup = byNumber.get(key);
        if (dup && dup !== "pending") {
          if (dup._table === table) {
            fail((await supabase.from(table).update({ ...forTable(table, row), updated_date: nowISO() }).eq("id", dup.id)).error);
          } else {
            // The row changed category — move it to the correct table.
            fail((await supabase.from(dup._table).delete().eq("id", dup.id)).error);
            fail((await supabase.from(table).insert({
              ...scope, id: dup.id, priority: "Medium", status: "Open",
              created_date: dup.created_date || nowISO(), ...forTable(table, row), updated_date: nowISO(),
            })).error);
          }
          updated++;
        } else if (!dup) {
          inserts[table].push({ ...scope, priority: "Medium", status: "Open", created_date: nowISO(), ...forTable(table, row) });
          byNumber.set(key, "pending");
          created++;
        }
      }
      for (const [table, batch] of Object.entries(inserts)) {
        if (batch.length) fail((await supabase.from(table).insert(batch)).error);
      }
      return { created, updated };
    }

    case "breakInBatch": {
      if (!Array.isArray(jobs) || !jobs.length) throw Error("Provide between 1 and 100 break-in jobs");
      const base = await nextTicket(ws.id, "EM-ICMS");
      const basePrefix = base.replace(/-(\d+)$/, "");
      let baseNum = parseInt(base.match(/-(\d+)$/)?.[1] || "1", 10);
      let counter = 0;
      const inserts = [];
      for (const job of jobs) {
        const values = clean(job);
        if (!values.description?.trim()) continue;
        if (!values.wo_number?.trim()) {
          values.wo_number = `${basePrefix}-${String(baseNum + counter).padStart(3, "0")}`;
          counter++;
        }
        values.job_type = "Break-In";
        if (!values.priority) values.priority = "Medium";
        if (!values.status) values.status = "Open";
        inserts.push({ ...scope, created_date: nowISO(), ...forTable(ORDER_TABLE.BREAKIN, values) });
      }
      if (inserts.length) fail((await supabase.from(ORDER_TABLE.BREAKIN).insert(inserts)).error);
      return { created: inserts.length };
    }

    case "delete": {
      const found = await findOrder(ws.id, id);
      if (!found) throw Error("Work order not found");
      const { error } = await supabase.from(found.table).delete().eq("id", id);
      fail(error);
      return { deleted: true };
    }


    case "save": {
      let existing = null;
      let existingTable = null;
      if (id) {
        const found = await findOrder(ws.id, id);
        if (!found) throw Error("Work order access denied");
        existing = found.row;
        existingTable = found.table;
      }
      const values = clean(data || {});
      if (values.status === "Deferred" && !values.deferred_reason)
        throw Error("Deferred reason is required when status is Deferred");
      if (values.deferred_reason === "For PR" && !values.pr_number?.trim())
        throw Error("PR Number is required for PR deferrals");
      if (!existing && !values.wo_number?.trim() && values.job_type === "Break-In")
        values.wo_number = await nextTicket(ws.id, "EM-ICMS");
      if (!(values.description ?? existing?.description)?.trim())
        throw Error("Work description is required");
      const number = values.wo_number ?? existing?.wo_number;
      if (number && (await woNumberTaken(ws.id, number, id))) throw Error("This WO number already exists");

      const wasPM = existing?.maintenance_type === "PM" || values.maintenance_type === "PM";
      const prevStatus = existing?.status;
      // Where this record belongs after the edit (job type may have changed).
      const targetTable = tableOf({ ...existing, ...values });
      let saved;
      if (existing && existingTable === targetTable) {
        const { data: row, error } = await supabase
          .from(targetTable)
          .update({ ...forTable(targetTable, values), updated_date: nowISO() })
          .eq("id", existing.id)
          .select()
          .single();
        fail(error);
        saved = tagRow(row, targetTable);
      } else if (existing) {
        // Category changed: move the record to its new table, keeping the same id.
        const merged = { ...existing, ...values };
        delete merged._table;
        const { data: row, error } = await supabase
          .from(targetTable)
          .insert({
            ...scope,
            id: existing.id,
            status: existing.status || "Open",
            priority: existing.priority || "Medium",
            created_date: existing.created_date || nowISO(),
            ...forTable(targetTable, merged),
            updated_date: nowISO(),
          })
          .select()
          .single();
        fail(error);
        fail((await supabase.from(existingTable).delete().eq("id", existing.id)).error);
        saved = tagRow(row, targetTable);
      } else {
        const { data: row, error } = await supabase
          .from(targetTable)
          .insert({ ...scope, status: "Open", priority: "Medium", created_date: nowISO(), ...forTable(targetTable, values) })
          .select()
          .single();
        fail(error);
        saved = tagRow(row, targetTable);
      }

      // Auto-populate the item master from materials used
      for (const m of values.materials || []) {
        if (m.code?.trim() && m.description?.trim()) {
          const mCode = m.code.trim().toUpperCase();
          const { data: dup } = await supabase
            .from("item_master").select("id").eq("workspace_id", ws.id).eq("code", mCode).maybeSingle();
          if (!dup)
            await supabase.from("item_master").insert({ ...scope, code: mCode, description: m.description.trim(), stock: 0 });
        }
      }

      // Auto-generate the next PM instance when a PM job is completed.
      const completedNow =
        wasPM &&
        saved.maintenance_type === "PM" &&
        saved.status === "Completed" &&
        prevStatus !== "Completed" &&
        saved.pm_frequency;
      if (completedNow) {
        const next = nextPMDate(saved.pm_frequency, saved.completion_time || saved.planned_start || nowISO());
        if (next) {
          // Never queue a duplicate: an open instance of the same routine on the
          // same date already covers this cycle.
          const { data: already } = await supabase
            .from(ORDER_TABLE.PM)
            .select("id")
            .eq("workspace_id", ws.id)
            .eq("planned_start", next)
            .eq("description", saved.description || "")
            .neq("status", "Completed")
            .limit(1);
          if (!already?.length) {
            const { data: queued, error: queueError } = await supabase
              .from(ORDER_TABLE.PM)
              .insert({
                ...scope,
                wo_number: await nextTicket(ws.id, "PM-ICMS"),
                description: saved.description, equipment_tag: saved.equipment_tag, system: saved.system,
                unit: saved.unit, priority: saved.priority || "Medium", job_type: "Scheduled",
                maintenance_type: "PM", pm_frequency: saved.pm_frequency, status: "Open",
                technician: saved.technician, ptw_number: null,
                planned_start: next, planned_finish: next, created_date: nowISO(),
              })
              .select("wo_number, planned_start")
              .single();
            fail(queueError);
            if (queued) saved = { ...saved, next_pm: queued };
          }
        }
      }
      return saved;
    }


    default:
      return { error: "Unknown operation" };
  }
}

/* --------------------------------------------------------- public shim */

const db = {
  auth: {
    isAuthenticated: async () => {
      const { data } = await supabase.auth.getSession();
      return Boolean(data?.session);
    },
    me: currentUser,
    async updateMe(values) {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: values.full_name ?? values.name ?? "" },
      });
      fail(error);
      return currentUser();
    },
    async logout() {
      await supabase.auth.signOut();
      if (typeof window !== "undefined") window.location.reload();
    },
  },
  entities,
  functions: {
    invoke: async (name, payload = {}) => {
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
