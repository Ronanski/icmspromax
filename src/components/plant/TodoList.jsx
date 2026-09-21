import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Check, X, Pencil, Trash2, StickyNote } from 'lucide-react';
import db from '@/lib/db';

// Column 4 — supervisor To-Do List with quick notes and "Accomplished" marking.
export default function TodoList({ workspace }) {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [draft, setDraft] = useState({ text: '', remarks: '', due_date: '' });

  const load = async () => {
    if (!workspace?.id) return;
    try {
      const rows = await db.entities.SupervisorTodo.filter({ workspace_id: workspace.id }, 'sort_order', 200);
      setTodos(Array.isArray(rows) ? rows : []);
    } catch { setTodos([]); }
  };
  useEffect(() => { load(); }, [workspace?.id]);

  const add = async (e) => {
    e?.preventDefault?.();
    const value = text.trim();
    if (!value || !workspace?.id || busy) return;
    setBusy(true);
    try {
      await db.entities.SupervisorTodo.create({
        workspace_id: workspace.id, text: value, completed: false,
        remarks: '', due_date: '', sort_order: Date.now(),
      });
      setText('');
      await load();
    } catch { /* keep the list as-is on failure */ }
    setBusy(false);
  };

  const toggle = async (t) => {
    setTodos(list => list.map(x => x.id === t.id ? { ...x, completed: !x.completed } : x));
    try { await db.entities.SupervisorTodo.update(t.id, { completed: !t.completed }); } catch { load(); }
  };

  const remove = async (id) => {
    setTodos(list => list.filter(x => x.id !== id));
    try { await db.entities.SupervisorTodo.delete(id); } catch { load(); }
  };

  const openEditor = (t) => {
    setOpenId(t.id);
    setDraft({ text: t.text || '', remarks: t.remarks || '', due_date: t.due_date || '' });
  };

  const saveEditor = async () => {
    if (!openId) return;
    const patch = { text: draft.text.trim() || 'Untitled task', remarks: draft.remarks, due_date: draft.due_date };
    setTodos(list => list.map(x => x.id === openId ? { ...x, ...patch } : x));
    const id = openId;
    setOpenId(null);
    try { await db.entities.SupervisorTodo.update(id, patch); } catch { load(); }
  };

  const { open, done } = useMemo(() => ({
    open: todos.filter(t => !t.completed),
    done: todos.filter(t => t.completed),
  }), [todos]);

  return (
    <div className="panel todo-panel">
      <div className="panel-heading">
        <h3><span className="section-indicator" />To-Do List</h3>
        <span className="tiny-label">{open.length} OPEN</span>
      </div>

      <form className="todo-add" onSubmit={add}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Add a task…" />
        <button type="submit" className="primary-button" disabled={busy || !text.trim()} aria-label="Add task"><Plus size={15} /></button>
      </form>

      <ul className="todo-items">
        {todos.length === 0 && <li className="todo-empty">No tasks yet. Add your first one above.</li>}
        {[...open, ...done].map(t => (
          <li key={t.id} className={`todo-item${t.completed ? ' completed' : ''}`}>
            <button className="todo-check" onClick={() => toggle(t)} aria-label={t.completed ? 'Mark as not done' : 'Mark as accomplished'}>
              {t.completed ? <Check size={13} /> : null}
            </button>
            <div className="todo-body" onClick={() => openEditor(t)}>
              <span className="todo-text">{t.text}</span>
              <span className="todo-meta">
                {t.due_date ? <em>{t.due_date}</em> : null}
                {t.remarks ? <em><StickyNote size={11} /> {t.remarks}</em> : null}
                {t.completed ? <em className="todo-done-tag">Accomplished</em> : null}
              </span>
            </div>
            <button className="todo-icon" onClick={() => openEditor(t)} aria-label="Edit task"><Pencil size={13} /></button>
            <button className="todo-icon danger" onClick={() => remove(t.id)} aria-label="Delete task"><Trash2 size={13} /></button>
          </li>
        ))}
      </ul>

      {openId && (
        <div className="todo-modal-backdrop" onClick={() => setOpenId(null)}>
          <div className="todo-modal" onClick={e => e.stopPropagation()}>
            <div className="todo-modal-head">
              <h4>Task details</h4>
              <button className="todo-icon" onClick={() => setOpenId(null)} aria-label="Close"><X size={15} /></button>
            </div>
            <label>Task
              <input value={draft.text} onChange={e => setDraft(d => ({ ...d, text: e.target.value }))} />
            </label>
            <label>Target date
              <input type="date" value={draft.due_date} onChange={e => setDraft(d => ({ ...d, due_date: e.target.value }))} />
            </label>
            <label>Notes / remarks
              <textarea rows={3} value={draft.remarks} onChange={e => setDraft(d => ({ ...d, remarks: e.target.value }))} placeholder="Quick note…" />
            </label>
            <div className="todo-modal-actions">
              <button className="secondary-button" onClick={() => setOpenId(null)}>Cancel</button>
              <button className="primary-button" onClick={saveEditor}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
