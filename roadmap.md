# ICMS Promax roadmap

## Done
- Backlog monitoring: completed work hidden by default, chart and metric table filtering, clear filter, simplified priorities, and overdue dates
- Editable shared app title, clean header navigation, reliable sidebar toggle, PM master-data shortcut, compact table date picker, and self-dismissing edit errors
- Statuses extended (Pending Parts, Cancelled) across badges, filters, charts, validation
- PM recurrence: Daily + Operating Hours, safe date parsing, duplicate-proof next-instance queueing on completion
- Admin-only lockout for Settings / Item Master / System Registry (redirect + explicit restricted panel)
- CSV/XLSX exports return row counts; toast feedback on every export, save and delete
- Reliability metrics: MTTR, MTBF, completion rate KPI cards
- System Registry: expandable per-system breakdown & maintenance history

- Alert settings + notification banners: overdue PMs, low stock, aged WOs, critical break-ins, idle assignments
- Batch 1 cleanup: retired Shift Handover and Audit Trail; added ICMS ProMax branding, compact action toasts and single-row alerts

## Pending (needs the SQL in supabase-schema.sql run on the Supabase project)
- New table: alert_settings (grants + RLS included)
- Roles table so admin checks are enforced by RLS, not only workspace ownership

