-- I&C Plant Desk — database schema for Supabase
-- Run this once in your Supabase project: SQL Editor -> New query -> paste -> Run.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------- workspaces
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Plant Workspace',
  app_name text not null default 'LPDSI Limay 1',
  clock_format text not null default '12' check (clock_format in ('12', '24')),
  plant text default '',
  member_emails text[] default '{}',
  designation text default '',
  plant_role text default '',
  shift text default '',
  created_at timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

-- Safe upgrade for workspaces created with an earlier version of this schema.
alter table public.workspaces add column if not exists app_name text not null default 'LPDSI Limay 1';
alter table public.workspaces add column if not exists clock_format text not null default '12';

-- ----------------------------------------------------------- work orders
create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  wo_number text,
  equipment_tag text,
  system text,
  unit text,
  description text,
  priority text default 'Medium',
  job_type text default 'Scheduled',
  maintenance_type text default 'CM',
  pm_frequency text,
  shutdown_item boolean default false,
  status text default 'Open',
  technician text,
  planned_start text,
  planned_finish text,
  action_taken text,
  as_found text,
  as_left text,
  start_time text,
  completion_time text,
  materials jsonb default '[]'::jsonb,
  ptw_number text,
  ex_breakin boolean default false,
  associated_wo text,
  deferred_reason text,
  pr_number text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists work_orders_workspace_idx on public.work_orders(workspace_id);

-- ------------------------------------------------------- system registry
create table if not exists public.system_registry (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  unit text not null,
  system_name text not null,
  area text default '',
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists system_registry_workspace_idx on public.system_registry(workspace_id);

-- ----------------------------------------------------------- item master
create table if not exists public.item_master (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  description text default '',
  bin_location text default '',
  stock numeric default 0,
  unit text default '',
  category text default '',
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create unique index if not exists item_master_code_idx on public.item_master(workspace_id, code);

-- ------------------------------------------------------- supervisor todos
create table if not exists public.supervisor_todos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  completed boolean default false,
  sort_order bigint default 0,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists supervisor_todos_workspace_idx on public.supervisor_todos(workspace_id);

-- -------------------------------------------------- supervisor daily logs
create table if not exists public.supervisor_daily_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  log_date text not null,
  activity_description text not null,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists supervisor_daily_logs_workspace_idx on public.supervisor_daily_logs(workspace_id);

-- ------------------------------------------------------- grants + security
grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.work_orders to authenticated;
grant select, insert, update, delete on public.system_registry to authenticated;
grant select, insert, update, delete on public.item_master to authenticated;
grant select, insert, update, delete on public.supervisor_todos to authenticated;
grant select, insert, update, delete on public.supervisor_daily_logs to authenticated;

grant all on public.workspaces to service_role;
grant all on public.work_orders to service_role;
grant all on public.system_registry to service_role;
grant all on public.item_master to service_role;
grant all on public.supervisor_todos to service_role;
grant all on public.supervisor_daily_logs to service_role;

alter table public.workspaces enable row level security;
alter table public.work_orders enable row level security;
alter table public.system_registry enable row level security;
alter table public.item_master enable row level security;
alter table public.supervisor_todos enable row level security;
alter table public.supervisor_daily_logs enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'workspaces','work_orders','system_registry','item_master','supervisor_todos','supervisor_daily_logs'
  ] loop
    execute format('drop policy if exists "owner_select" on public.%I', t);
    execute format('drop policy if exists "owner_insert" on public.%I', t);
    execute format('drop policy if exists "owner_update" on public.%I', t);
    execute format('drop policy if exists "owner_delete" on public.%I', t);
    execute format('create policy "owner_select" on public.%I for select to authenticated using (auth.uid() = owner_id)', t);
    execute format('create policy "owner_insert" on public.%I for insert to authenticated with check (auth.uid() = owner_id)', t);
    execute format('create policy "owner_update" on public.%I for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id)', t);
    execute format('create policy "owner_delete" on public.%I for delete to authenticated using (auth.uid() = owner_id)', t);
  end loop;
end $$;

-- =====================================================================
-- ICMS Promax — Stage 2 tables: Shift Handover, Audit Trail, Alerts
-- Re-runnable: safe to paste over an existing database.
-- =====================================================================

-- ---------------------------------------------------- shift handover log
create table if not exists public.shift_handover_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  log_date text not null,
  shift text not null default 'Day',
  outgoing_supervisor text default '',
  incoming_supervisor text default '',
  plant_status text default 'Normal',
  active_alerts text default '',
  ongoing_work text default '',
  pending_actions text default '',
  remarks text default '',
  acknowledged boolean not null default false,
  acknowledged_at timestamptz,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists shift_handover_workspace_idx on public.shift_handover_logs(workspace_id, log_date desc);

-- ------------------------------------------------------------ audit trail
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  actor_email text default '',
  action text not null,
  entity text not null,
  entity_ref text default '',
  details text default '',
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists audit_logs_workspace_idx on public.audit_logs(workspace_id, created_date desc);

-- ------------------------------------------------- notification settings
create table if not exists public.alert_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  low_stock_threshold numeric not null default 5,
  overdue_pm_days integer not null default 0,
  notify_assignments boolean not null default true,
  notify_overdue_pm boolean not null default true,
  notify_low_stock boolean not null default true,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create unique index if not exists alert_settings_workspace_idx on public.alert_settings(workspace_id);

-- ------------------------------------------------------ grants + security
grant select, insert, update, delete on public.shift_handover_logs to authenticated;
grant select, insert on public.audit_logs to authenticated;          -- audit rows are append-only
grant select, insert, update, delete on public.alert_settings to authenticated;

grant all on public.shift_handover_logs to service_role;
grant all on public.audit_logs to service_role;
grant all on public.alert_settings to service_role;

alter table public.shift_handover_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.alert_settings enable row level security;

do $$
declare t text;
begin
  foreach t in array array['shift_handover_logs','alert_settings'] loop
    execute format('drop policy if exists "owner_select" on public.%I', t);
    execute format('drop policy if exists "owner_insert" on public.%I', t);
    execute format('drop policy if exists "owner_update" on public.%I', t);
    execute format('drop policy if exists "owner_delete" on public.%I', t);
    execute format('create policy "owner_select" on public.%I for select to authenticated using (auth.uid() = owner_id)', t);
    execute format('create policy "owner_insert" on public.%I for insert to authenticated with check (auth.uid() = owner_id)', t);
    execute format('create policy "owner_update" on public.%I for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id)', t);
    execute format('create policy "owner_delete" on public.%I for delete to authenticated using (auth.uid() = owner_id)', t);
  end loop;
end $$;

-- Audit trail: readable and appendable by the workspace owner, never editable
-- or deletable by anyone through the API.
drop policy if exists "owner_select" on public.audit_logs;
drop policy if exists "owner_insert" on public.audit_logs;
drop policy if exists "owner_update" on public.audit_logs;
drop policy if exists "owner_delete" on public.audit_logs;
create policy "owner_select" on public.audit_logs for select to authenticated using (auth.uid() = owner_id);
create policy "owner_insert" on public.audit_logs for insert to authenticated with check (auth.uid() = owner_id);
