# ICMS Promax roadmap

## Done
- Statuses extended (Pending Parts, Cancelled) across badges, filters, charts, validation
- PM recurrence: Daily + Operating Hours, safe date parsing, duplicate-proof next-instance queueing on completion
- Admin-only lockout for Settings / Item Master / System Registry (redirect + explicit restricted panel)
- CSV/XLSX exports return row counts; toast feedback on every export, save and delete
- Reliability metrics: MTTR, MTBF, completion rate KPI cards
- System Registry: expandable per-system breakdown & maintenance history

- Shift Handover Log page (create/edit/acknowledge/delete + CSV export)
- Audit trail page with search, type filter and CSV export; admin actions logged in db.js
- Alert settings + notification banners: overdue PMs, low stock, aged WOs, critical break-ins, idle assignments

## Pending (needs the SQL in supabase-schema.sql run on the Supabase project)
- New tables: shift_handover_logs, audit_logs, alert_settings (grants + RLS included)
- Roles table so admin checks are enforced by RLS, not only workspace ownership

