// Real backend for the I&C Plant Desk, backed by Supabase (Postgres + Auth).
//
// It keeps the exact same interface the UI already uses
// (`db.auth.*`, `db.entities.*`, `db.functions.invoke`), so every screen keeps
// working — but every save / delete is now persisted in the database and
// survives a browser refresh.

import supabase from "./supabaseClient";
import parsePlantImport from "./parseImport";

const TABLES = {
  Workspace: "workspaces",
  WorkOrder: "work_orders",
  SystemRegistry: "system_registry",
  ItemMaster: "item_master",
  SupervisorTodo: "supervisor_todos",
  SupervisorDailyLog: "supervisor_daily_logs",
};

const nowISO = () => new Date().toISOString();

const fail = (error) => {
  if (error) throw Error(error.message || "Database request failed");
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
    async filter(query = {}, sort, limit = 500, offset = 0) {
      let q = supabase.from(table).select("*");
      for (const [k, v] of Object.entries(query)) q = q.eq(k, v);
      if (sort) {
        const desc = sort.startsWith("-");
        q = q.order(desc ? sort.slice(1) : sort, { ascending: !desc, nullsFirst: false });
      }
      q = q.range(offset, offset + limit - 1);
      const { data, error } = await q;
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
      const { data, error } = await supabase
        .from(table)
        .insert({ owner_id: user.id, ...values, updated_date: nowISO() })
        .select()
        .single();
      fail(error);
      return data;
    },
    async update(id, values) {
      const { data, error } = await supabase
        .from(table)
        .update({ ...values, updated_date: nowISO() })
        .eq("id", id)
        .select()
        .single();
      fail(error);
      return data;
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

const listOrders = async (workspaceId) => {
  const { data, error } = await supabase
    .from("work_orders")
    .select("*")
    .eq("workspace_id", workspaceId)
    .limit(5000);
  fail(error);
  return data || [];
};

const nextTicket = async (workspaceId, prefix) => {
  const { data, error } = await supabase
    .from("work_orders")
    .select("wo_number")
    .eq("workspace_id", workspaceId)
    .ilike("wo_number", `${prefix}-%`);
  fail(error);
  const re = new RegExp(`^${prefix}-(\\d+)$`, "i");
  let max = 0;
  for (const row of data || []) {
    const m = String(row.wo_number || "").match(re);
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
      const { data: systems, error } = await supabase.from("system_registry").select("*").eq("workspace_id", ws.id).limit(2000);
      fail(error);
      return { systems: systems || [] };
    }

    case "listItems": {
      const { data: items, error } = await supabase.from("item_master").select("*").eq("workspace_id", ws.id).limit(5000);
      fail(error);
      return { items: items || [] };
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

    case "clearData": {
      const { error } = await supabase.from("work_orders").delete().eq("workspace_id", ws.id);
      fail(error);
      return { deleted: true };
    }

    case "bulkReschedule": {
      if (!Array.isArray(ids) || !ids.length || !newDate) throw Error("Provide IDs and a target date");
      const { data: updatedRows, error } = await supabase
        .from("work_orders")
        .update({ planned_start: newDate, planned_finish: newDate, updated_date: nowISO() })
        .eq("workspace_id", ws.id)
        .neq("status", "Completed")
        .in("id", ids)
        .select("id");
      fail(error);
      return { updated: (updatedRows || []).length };
    }

    case "massUpdate": {
      if (!Array.isArray(ids) || !ids.length || !STATUSES.includes(status)) throw Error("Provide valid IDs and status");
      const { data: updatedRows, error } = await supabase
        .from("work_orders")
        .update({ status, updated_date: nowISO() })
        .eq("workspace_id", ws.id)
        .in("id", ids)
        .select("id");
      fail(error);
      return { updated: (updatedRows || []).length };
    }

    case "massDelete": {
      if (!Array.isArray(ids) || !ids.length) throw Error("Provide IDs to delete");
      const { data: removed, error } = await supabase
        .from("work_orders").delete().eq("workspace_id", ws.id).in("id", ids).select("id");
      fail(error);
      return { deleted: (removed || []).length };
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
        if (action === "importBreakIns") v.job_type = "Break-In";
        if (action === "importPM") {
          v.maintenance_type = "PM";
          v.job_type = "Scheduled";
          if (!v.pm_frequency) v.pm_frequency = "Monthly";
        }
        return v;
      });
      if (prepared.some((r) => !r.description?.trim())) throw Error("Every row needs a description");
      const existing = await listOrders(ws.id);
      const byNumber = new Map(existing.map((r) => [String(r.wo_number).toUpperCase(), r.id]));
      let counter = 0;
      const base = await nextTicket(ws.id, action === "importPM" ? "PM-ICMS" : "EM-ICMS");
      const basePrefix = base.replace(/-(\d+)$/, "");
      let baseNum = parseInt(base.match(/-(\d+)$/)?.[1] || "1", 10);
      const inserts = [];
      let created = 0, updated = 0;
      for (const row of prepared) {
        if (!row.wo_number?.trim()) {
          row.wo_number = `${basePrefix}-${String(baseNum + counter).padStart(3, "0")}`;
          counter++;
        }
        const key = row.wo_number.trim().toUpperCase();
        const dupId = byNumber.get(key);
        if (dupId) {
          fail((await supabase.from("work_orders").update({ ...row, updated_date: nowISO() }).eq("id", dupId)).error);
          updated++;
        } else {
          inserts.push({ ...scope, priority: "Medium", status: "Open", job_type: "Scheduled", maintenance_type: "CM", created_date: nowISO(), ...row });
          byNumber.set(key, "pending");
          created++;
        }
      }
      if (inserts.length) fail((await supabase.from("work_orders").insert(inserts)).error);
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
        inserts.push({ ...scope, maintenance_type: "CM", created_date: nowISO(), ...values });
      }
      if (inserts.length) fail((await supabase.from("work_orders").insert(inserts)).error);
      return { created: inserts.length };
    }

    case "delete": {
      const { error } = await supabase.from("work_orders").delete().eq("id", id);
      fail(error);
      return { deleted: true };
    }

    case "save": {
      let existing = null;
      if (id) {
        const { data: found, error } = await supabase.from("work_orders").select("*").eq("id", id).maybeSingle();
        fail(error);
        if (!found) throw Error("Work order access denied");
        existing = found;
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
      if (number) {
        let dupQuery = supabase.from("work_orders").select("id").eq("workspace_id", ws.id).eq("wo_number", number);
        if (id) dupQuery = dupQuery.neq("id", id);
        const { data: dups, error } = await dupQuery;
        fail(error);
        if ((dups || []).length) throw Error("This WO number already exists");
      }

      const wasPM = existing?.maintenance_type === "PM" || values.maintenance_type === "PM";
      const prevStatus = existing?.status;
      let saved;
      if (existing) {
        const { data: row, error } = await supabase
          .from("work_orders").update({ ...values, updated_date: nowISO() }).eq("id", existing.id).select().single();
        fail(error);
        saved = row;
      } else {
        const { data: row, error } = await supabase
          .from("work_orders")
          .insert({ ...scope, status: "Open", priority: "Medium", job_type: "Scheduled", maintenance_type: "CM", created_date: nowISO(), ...values })
          .select()
          .single();
        fail(error);
        saved = row;
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

      // Auto-generate the next PM instance when a PM job is completed
      if (wasPM && saved.status === "Completed" && prevStatus !== "Completed" && saved.pm_frequency) {
        const next = nextPMDate(saved.pm_frequency, saved.completion_time || saved.planned_start || nowISO());
        if (next)
          await supabase.from("work_orders").insert({
            ...scope,
            wo_number: await nextTicket(ws.id, "PM-ICMS"),
            description: saved.description, equipment_tag: saved.equipment_tag, system: saved.system,
            unit: saved.unit, priority: saved.priority || "Medium", job_type: "Scheduled",
            maintenance_type: "PM", pm_frequency: saved.pm_frequency, status: "Open",
            planned_start: next, planned_finish: next, created_date: nowISO(),
          });
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
