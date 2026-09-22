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
-- Web app preferences (shortcut cards, analytics metrics, default views) so a
-- user's setup follows them across sessions and devices.
alter table public.workspaces add column if not exists prefs jsonb not null default '{}'::jsonb;

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
-- Date-scoped to-do entries with quick remarks.
alter table public.supervisor_todos add column if not exists due_date text default '';
alter table public.supervisor_todos add column if not exists remarks text default '';

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
-- ICMS ProMax — operational alert settings
-- The retired handover and audit modules are removed when this script runs.
-- =====================================================================

drop table if exists public.shift_handover_logs cascade;
drop table if exists public.audit_logs cascade;

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
grant select, insert, update, delete on public.alert_settings to authenticated;

grant all on public.alert_settings to service_role;

alter table public.alert_settings enable row level security;

do $$
declare t text;
begin
  foreach t in array array['alert_settings'] loop
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


-- ---------------------------------------------------------- notifications
-- Alerts shown in the Notification Center. Read / unread lives in `is_read`
-- so acknowledgements persist per account across devices and browsers.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_key text not null,
  category text not null default 'corrective' check (category in ('corrective','preventive')),
  type text not null default 'aged',
  title text not null default '',
  detail text not null default '',
  event_at timestamptz not null default now(),
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, source_key)
);

alter table public.notifications add column if not exists is_read boolean not null default false;
alter table public.notifications add column if not exists read_at timestamptz;

create index if not exists notifications_owner_unread_idx
  on public.notifications (owner_id, is_read);

grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;

alter table public.notifications enable row level security;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications
  for select to authenticated using (auth.uid() = owner_id);

drop policy if exists "Users create own notifications" on public.notifications;
create policy "Users create own notifications" on public.notifications
  for insert to authenticated with check (auth.uid() = owner_id);

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "Users delete own notifications" on public.notifications;
create policy "Users delete own notifications" on public.notifications
  for delete to authenticated using (auth.uid() = owner_id);
