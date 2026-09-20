// Spreadsheet import parser (runs in the browser, no backend needed).
import * as XLSX from "xlsx";


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

export default parsePlantImport;
