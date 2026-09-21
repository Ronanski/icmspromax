import { useState, useEffect } from 'react';
import db from '@/lib/db';

const DEFAULTS = { low_stock_threshold: 5, overdue_pm_days: 0, notify_assignments: true, notify_overdue_pm: true, notify_low_stock: true };

// Per-workspace notification thresholds. Falls back to sensible defaults when
// the alert_settings table has no row yet (or is not created).
export default function useAlertSettings(workspace) {
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!workspace?.id) return;
      try {
        const rows = await db.entities.AlertSetting.filter({ workspace_id: workspace.id }, '-updated_date', 1);
        if (live && rows?.length) setSettings({ ...DEFAULTS, ...rows[0] });
      } catch {
        /* keep defaults */
      }
    })();
    return () => { live = false; };
  }, [workspace?.id]);

  const save = async (values) => {
    const next = { ...settings, ...values };
    setSettings(next);
    const { id, created_date, updated_date, workspace_id, owner_id, ...payload } = next;
    if (id) await db.entities.AlertSetting.update(id, payload);
    else {
      const created = await db.entities.AlertSetting.create({ ...payload, workspace_id: workspace.id, owner_id: workspace.owner_id });
      setSettings({ ...next, id: created.id });
    }
  };

  return { settings, save };
}
