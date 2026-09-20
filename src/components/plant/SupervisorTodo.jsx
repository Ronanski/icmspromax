import db from '@/lib/mockDb';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Edit2, X, Loader2 } from 'lucide-react';

import { useToast } from '@/components/ui/use-toast';

// Minimalist Supervisor To-Do list with full CRUD (personal, workspace-scoped).
export default function SupervisorTodo({ workspace }) {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');
  const { toast } = useToast();

  const load = async () => {
    if (!workspace?.id) return;
    try {
      const r = await db.entities.SupervisorTodo.filter({ workspace_id: workspace.id }, 'sort_order', 100);
      setTodos(r);
    } catch (e) {
      toast({ title: 'Load failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [workspace?.id]);

  const add = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await db.entities.SupervisorTodo.create({ workspace_id: workspace.id, text: text.trim(), completed: false, sort_order: Date.now() });
      setText('');
      await load();
    } catch (e) {
      toast({ title: 'Add failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (t) => {
    try {
      await db.entities.SupervisorTodo.update(t.id, { completed: !t.completed });
      await load();
    } catch (e) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  };

  const saveEdit = async () => {
    if (!editText.trim()) return;
    try {
      await db.entities.SupervisorTodo.update(editId, { text: editText.trim() });
      setEditId(null); setEditText('');
      await load();
    } catch (e) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  };

  const remove = async (id) => {
    try {
      await db.entities.SupervisorTodo.delete(id);
      await load();
    } catch (e) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  return <div className="panel todo-panel">
    <div className="panel-heading">
      <h3>Supervisor To-Do</h3>
      <span className="tiny-label">PERSONAL</span>
    </div>
    <div className="todo-input-row">
      <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Add a shift task or reminder…"/>
      <button onClick={add} disabled={busy || !text.trim()} aria-label="Add task"><Plus size={15}/></button>
    </div>
    <div className="todo-list">
      {loading ? <div className="todo-empty"><Loader2 size={16} className="animate-spin"/></div>
        : todos.length ? todos.map(t => (
          <div key={t.id} className={`todo-item${t.completed ? ' done' : ''}`}>
            <button className="todo-check" onClick={() => toggle(t)} aria-label="Toggle complete">{t.completed && <Check size={13}/>}</button>
            {editId === t.id ? (
              <div className="todo-edit">
                <input value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEdit()} autoFocus/>
                <button onClick={saveEdit} aria-label="Save"><Check size={14}/></button>
                <button onClick={() => { setEditId(null); setEditText(''); }} aria-label="Cancel"><X size={14}/></button>
              </div>
            ) : (
              <>
                <span className="todo-text" onDoubleClick={() => { setEditId(t.id); setEditText(t.text); }}>{t.text}</span>
                <button className="todo-edit-btn" onClick={() => { setEditId(t.id); setEditText(t.text); }} aria-label="Edit task"><Edit2 size={13}/></button>
                <button className="todo-del" onClick={() => remove(t.id)} aria-label="Delete task"><Trash2 size={13}/></button>
              </>
            )}
          </div>
        )) : <div className="todo-empty"><p>No tasks yet — add your first shift reminder above.</p></div>}
    </div>
  </div>;
}