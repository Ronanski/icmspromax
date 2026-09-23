alter table public.alert_settings add column if not exists low_stock_threshold numeric default 5;
alter table public.alert_settings add column if not exists overdue_pm_days numeric default 0;
alter table public.alert_settings add column if not exists notify_assignments boolean default true;
alter table public.alert_settings add column if not exists notify_overdue_pm boolean default true;
alter table public.alert_settings add column if not exists notify_low_stock boolean default true;
comment on column public.alert_settings.settings is 'DEPRECATED: replaced by the individual alert threshold columns';