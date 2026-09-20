// Sample (mock) data for the I&C Plant Desk.
// No real backend is connected yet — everything lives in memory for this session.

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shift = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return iso(d);
};

export const MOCK_USER = {
  id: "user-demo-1",
  name: "Michael Turla",
  email: "supervisor@demo.plant",
};

export const MOCK_WORKSPACES = [
  {
    id: "ws-limay-1",
    name: "LPDSI Limay 1",
    owner_id: MOCK_USER.id,
    member_emails: ["tech1@demo.plant", "tech2@demo.plant"],
    plant: "4x150MW CFB",
    designation: "Instrumentation Supervisor",
    plant_role: "I&C Maintenance",
    shift: "Day Shift",
  },
  {
    id: "ws-limay-2",
    name: "LPDSI Limay 2",
    owner_id: MOCK_USER.id,
    member_emails: [],
    plant: "2x150MW CFB",
    designation: "Instrumentation Supervisor",
    plant_role: "I&C Maintenance",
    shift: "Day Shift",
  },
];

const wo = (o) => ({
  workspace_id: "ws-limay-1",
  owner_id: MOCK_USER.id,
  maintenance_type: "CM",
  job_type: "Scheduled",
  status: "Open",
  priority: "Medium",
  shutdown_item: false,
  materials: [],
  created_date: new Date().toISOString(),
  ...o,
});

export const MOCK_WORK_ORDERS = [
  wo({
    id: "wo-1",
    wo_number: "WO-100231",
    description: "Calibrate boiler drum level transmitter",
    equipment_tag: "LT-1101A",
    unit: "Unit 1",
    system: "Boiler",
    priority: "High",
    status: "In-Progress",
    technician: "R. Santos",
    planned_start: shift(-2),
    planned_finish: shift(1),
    ptw_number: "PTW-2211",
    as_found: "Reading drifting by 4%.",
    start_time: `${shift(-2)}T08:00`,
  }),
  wo({
    id: "wo-2",
    wo_number: "WO-100232",
    description: "Replace faulty flame scanner",
    equipment_tag: "BE-1204",
    unit: "Unit 1",
    system: "Boiler",
    priority: "Critical",
    job_type: "Break-In",
    status: "Open",
    technician: "J. Dela Cruz",
    planned_start: shift(0),
    planned_finish: shift(0),
  }),
  wo({
    id: "wo-3",
    wo_number: "WO-100233",
    description: "Turbine vibration probe gap check",
    equipment_tag: "VT-2301",
    unit: "Unit 2",
    system: "Turbine",
    priority: "Medium",
    status: "Completed",
    technician: "A. Reyes",
    planned_start: shift(-6),
    planned_finish: shift(-5),
    completion_time: `${shift(-5)}T16:20`,
    start_time: `${shift(-6)}T09:00`,
    action_taken: "Gap voltage adjusted to -9.8 VDC.",
    as_found: "Gap voltage out of range.",
    as_left: "Within specification, unit normal.",
  }),
  wo({
    id: "wo-4",
    wo_number: "WO-100234",
    description: "Demin water conductivity analyzer troubleshooting",
    equipment_tag: "AIT-3105",
    unit: "Unit 3",
    system: "Water Treatment",
    priority: "Low",
    status: "Deferred",
    deferred_reason: "For Shutdown",
    technician: "M. Bautista",
    planned_start: shift(-20),
    planned_finish: shift(-18),
  }),
  wo({
    id: "wo-5",
    wo_number: "EM-ICMS-001",
    description: "Coal feeder speed sensor no signal",
    equipment_tag: "SE-4402",
    unit: "Unit 4",
    system: "Fuel Handling",
    priority: "Critical",
    job_type: "Break-In",
    status: "Completed",
    technician: "R. Santos",
    planned_start: shift(-1),
    planned_finish: shift(-1),
    start_time: `${shift(-1)}T13:00`,
    completion_time: `${shift(-1)}T15:40`,
    as_found: "Sensor cable cut.",
    action_taken: "Replaced cable and re-terminated.",
    as_left: "Feeder running normal.",
  }),
  wo({
    id: "wo-6",
    wo_number: "WO-100236",
    description: "Ash handling pressure switch replacement",
    equipment_tag: "PS-5510",
    unit: "Common",
    system: "Balance of Plant",
    priority: "Medium",
    status: "Open",
    technician: "J. Dela Cruz",
    planned_start: shift(2),
    planned_finish: shift(3),
  }),
  wo({
    id: "wo-7",
    wo_number: "PM-ICMS-001",
    description: "Quarterly loop check — main steam pressure",
    equipment_tag: "PT-1150",
    unit: "Unit 1",
    system: "Boiler",
    maintenance_type: "PM",
    pm_frequency: "Quarterly",
    status: "Open",
    technician: "A. Reyes",
    planned_start: shift(3),
    planned_finish: shift(3),
  }),
  wo({
    id: "wo-8",
    wo_number: "PM-ICMS-002",
    description: "Monthly DCS cabinet cleaning and filter check",
    equipment_tag: "DCS-CAB-02",
    unit: "Unit 2",
    system: "Turbine",
    maintenance_type: "PM",
    pm_frequency: "Monthly",
    status: "In-Progress",
    technician: "M. Bautista",
    planned_start: shift(0),
    planned_finish: shift(1),
  }),
  wo({
    id: "wo-9",
    wo_number: "PM-ICMS-003",
    description: "Annual safety valve instrumentation verification",
    equipment_tag: "PSV-1000",
    unit: "Common",
    system: "Balance of Plant",
    maintenance_type: "PM",
    pm_frequency: "Annual",
    status: "Completed",
    technician: "R. Santos",
    planned_start: shift(-10),
    planned_finish: shift(-9),
    completion_time: `${shift(-9)}T11:00`,
    action_taken: "Verification completed, records filed.",
  }),
  wo({
    id: "wo-10",
    wo_number: "WO-100240",
    description: "FD fan inlet damper positioner hunting",
    equipment_tag: "ZT-2208",
    unit: "Unit 2",
    system: "Boiler",
    priority: "High",
    status: "Open",
    technician: "",
    planned_start: shift(-8),
    planned_finish: shift(-7),
  }),
];

export const MOCK_SYSTEMS = [
  { id: "sys-1", workspace_id: "ws-limay-1", owner_id: MOCK_USER.id, unit: "Unit 1", system_name: "Boiler", area: "Boiler House" },
  { id: "sys-2", workspace_id: "ws-limay-1", owner_id: MOCK_USER.id, unit: "Unit 2", system_name: "Turbine", area: "Turbine Hall" },
  { id: "sys-3", workspace_id: "ws-limay-1", owner_id: MOCK_USER.id, unit: "Unit 3", system_name: "Water Treatment", area: "WTP" },
  { id: "sys-4", workspace_id: "ws-limay-1", owner_id: MOCK_USER.id, unit: "Unit 4", system_name: "Fuel Handling", area: "Coal Yard" },
  { id: "sys-5", workspace_id: "ws-limay-1", owner_id: MOCK_USER.id, unit: "Common", system_name: "Balance of Plant", area: "Plant Common" },
];

export const MOCK_ITEMS = [
  { id: "item-1", workspace_id: "ws-limay-1", owner_id: MOCK_USER.id, code: "TX-4051", description: "Pressure transmitter 0-100 bar", bin_location: "A-01-03", stock: 6, unit: "pc", category: "Instrument" },
  { id: "item-2", workspace_id: "ws-limay-1", owner_id: MOCK_USER.id, code: "CBL-18AWG", description: "Instrument cable 2C 18AWG shielded", bin_location: "B-04-11", stock: 240, unit: "m", category: "Cable" },
  { id: "item-3", workspace_id: "ws-limay-1", owner_id: MOCK_USER.id, code: "FS-7800", description: "Flame scanner UV type", bin_location: "A-02-07", stock: 2, unit: "pc", category: "Instrument" },
  { id: "item-4", workspace_id: "ws-limay-1", owner_id: MOCK_USER.id, code: "TT-644", description: "Temperature transmitter head mount", bin_location: "A-01-09", stock: 4, unit: "pc", category: "Instrument" },
  { id: "item-5", workspace_id: "ws-limay-1", owner_id: MOCK_USER.id, code: "PSV-KIT", description: "Positioner service kit", bin_location: "C-03-02", stock: 9, unit: "set", category: "Spare Kit" },
];

export const MOCK_TODOS = [
  { id: "todo-1", workspace_id: "ws-limay-1", text: "Follow up PR for flame scanner spare", completed: false, sort_order: 1 },
  { id: "todo-2", workspace_id: "ws-limay-1", text: "Toolbox meeting 07:30 — LOTO refresher", completed: true, sort_order: 2 },
  { id: "todo-3", workspace_id: "ws-limay-1", text: "Prepare PM schedule for next month", completed: false, sort_order: 3 },
];

export const MOCK_DAILY_LOGS = [
  { id: "log-1", workspace_id: "ws-limay-1", owner_id: MOCK_USER.id, log_date: shift(0), activity_description: "Attended morning plant meeting; discussed Unit 1 drum level drift.", updated_date: new Date().toISOString() },
  { id: "log-2", workspace_id: "ws-limay-1", owner_id: MOCK_USER.id, log_date: shift(-1), activity_description: "Supervised coal feeder sensor replacement at Unit 4.", updated_date: new Date().toISOString() },
];
