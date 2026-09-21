import { useState, useEffect, useCallback } from 'react';
import { api } from '@/components/plant/plantUtils';

// Web app preferences. Saved on the workspace record so a supervisor's setup
// (shortcuts, analytics metrics, default views) follows them to any device,
// with a local copy so the UI stays instant and still works offline.
export const DEFAULT_PREFS = {
  shortcuts: ['analytics', 'calendar', 'logger'],
  workVolumeDefault: 'system',
  supervisorMode: false,
  analyticsMetrics: ['schedule', 'completed', 'progress', 'breakin', 'pmcm'],
  ratioPeriod: 'This Month',
  backlogView: 'category',
};

const storeKey = (id) => `plant-prefs-${id || 'default'}`;

export default function usePrefs(workspace) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  useEffect(() => {
    if (!workspace?.id) return;
    let local = {};
    try { local = JSON.parse(localStorage.getItem(storeKey(workspace.id)) || '{}'); } catch { local = {}; }
    const remote = workspace.prefs && typeof workspace.prefs === 'object' ? workspace.prefs : null;
    setPrefs({ ...DEFAULT_PREFS, ...local, ...(remote || {}) });
  }, [workspace?.id, workspace?.prefs]);

  const update = useCallback((patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(storeKey(workspace?.id), JSON.stringify(next)); } catch { /* private mode */ }
      if (workspace?.id) api('prefs', { workspace_id: workspace.id, data: next }).catch(() => {});
      return next;
    });
  }, [workspace?.id]);

  return [prefs, update];
}
