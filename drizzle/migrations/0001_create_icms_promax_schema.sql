create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Plant Workspace',
  plant text default '',
  member_emails text[] default '{}',
  designation text default '',
  plant_role text default '',
  shift text default '',
  created_at timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

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

create index if not exists notifications_owner_unread_idx
  on public.notifications (owner_id, is_read);

create table if not exists public.pm_orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  wo_number text,
  equipment_tag text,
  system text,
  unit text,
  description text,
  priority text default 'Medium',
  job_type text default 'PM',
  maintenance_type text default 'PM',
  pm_frequency text,
  shutdown_item boolean default false,
  status text default 'Open',
  technician text,
  planned_start text,
  planned_finish text,
  start_time text,
  completion_time text,
  materials jsonb default '[]'::jsonb,
  ptw_number text,
  associated_wo text,
  deferred_reason text,
  pr_number text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists pm_orders_workspace_idx on public.pm_orders(workspace_id);

create table if not exists public.cm_orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  wo_number text,
  equipment_tag text,
  system text,
  unit text,
  description text,
  priority text default 'Medium',
  job_type text default 'CM',
  maintenance_type text default 'CM',
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
  associated_wo text,
  deferred_reason text,
  pr_number text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists cm_orders_workspace_idx on public.cm_orders(workspace_id);

create table if not exists public.breakin_orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  wo_number text,
  equipment_tag text,
  system text,
  unit text,
  description text,
  priority text default 'High',
  job_type text default 'Break-In',
  maintenance_type text default 'Break-In',
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
  ex_breakin boolean default true,
  associated_wo text,
  deferred_reason text,
  pr_number text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists breakin_orders_workspace_idx on public.breakin_orders(workspace_id);

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

create table if not exists public.alert_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  settings jsonb default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists alert_settings_workspace_idx on public.alert_settings(workspace_id);

grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.pm_orders to authenticated;
grant select, insert, update, delete on public.cm_orders to authenticated;
grant select, insert, update, delete on public.breakin_orders to authenticated;
grant select, insert, update, delete on public.system_registry to authenticated;
grant select, insert, update, delete on public.item_master to authenticated;
grant select, insert, update, delete on public.supervisor_todos to authenticated;
grant select, insert, update, delete on public.supervisor_daily_logs to authenticated;
grant select, insert, update, delete on public.alert_settings to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;

grant all on public.workspaces to service_role;
grant all on public.pm_orders to service_role;
grant all on public.cm_orders to service_role;
grant all on public.breakin_orders to service_role;
grant all on public.system_registry to service_role;
grant all on public.item_master to service_role;
grant all on public.supervisor_todos to service_role;
grant all on public.supervisor_daily_logs to service_role;
grant all on public.alert_settings to service_role;
grant all on public.notifications to service_role;

alter table public.workspaces enable row level security;
alter table public.pm_orders enable row level security;
alter table public.cm_orders enable row level security;
alter table public.breakin_orders enable row level security;
alter table public.system_registry enable row level security;
alter table public.item_master enable row level security;
alter table public.supervisor_todos enable row level security;
alter table public.supervisor_daily_logs enable row level security;
alter table public.alert_settings enable row level security;
alter table public.notifications enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'workspaces','pm_orders','cm_orders','breakin_orders','system_registry','item_master','supervisor_todos','supervisor_daily_logs','alert_settings'
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

drop policy if exists "Users read own notifications" on public.notifications;
drop policy if exists "Users create own notifications" on public.notifications;
drop policy if exists "Users update own notifications" on public.notifications;
drop policy if exists "Users delete own notifications" on public.notifications;

create policy "Users read own notifications" on public.notifications
  for select to authenticated using (auth.uid() = owner_id);
create policy "Users create own notifications" on public.notifications
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "Users update own notifications" on public.notifications
  for update to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Users delete own notifications" on public.notifications
  for delete to authenticated using (auth.uid() = owner_id);