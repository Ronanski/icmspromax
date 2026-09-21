import db from '@/lib/db';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Check, Loader2, CalendarCheck, Square, CheckSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { useToast } from '@/components/ui/use-toast';
import { safeFormatDate } from '@/components/plant/plantUtils';

// Supervisor Daily Accomplishment Log — full CRUD for a single date.
export default function SupervisorDailyLogModal({ workspace, date, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const [todos, setTodos] = useState([]);
  const [todoText, setTodoText] = useState('');

  const loadTodos = async () => {
    if (!workspace?.id || !date) return;
    try {
      const rows = await db.entities.SupervisorTodo.filter({ workspace_id: workspace.id, due_date: date }, 'sort_order', 200);
      setTodos(Array.isArray(rows) ? rows : []);
    } catch { setTodos([]); }
  };
  useEffect(() => { loadTodos(); }, [workspace?.id, date]);

  const addTodo = async () => {
    const value = todoText.trim();
    if (!value || !workspace?.id) return;
    try {
      await db.entities.SupervisorTodo.create({ workspace_id: workspace.id, text: value, completed: false, remarks: '', due_date: date, sort_order: Date.now() });
      setTodoText('');
      await loadTodos();
    } catch (e) { toast({ title: 'Add failed', description: e.message, variant: 'destructive' }); }
  };
  const toggleTodo = async (t) => {
    setTodos(list => list.map(x => x.id === t.id ? { ...x, completed: !x.completed } : x));
    try { await db.entities.SupervisorTodo.update(t.id, { completed: !t.completed }); } catch { loadTodos(); }
  };
  const removeTodo = async (id) => {
    setTodos(list => list.filter(x => x.id !== id));
    try { await db.entities.SupervisorTodo.delete(id); } catch { loadTodos(); }
  };

  const load = async () => {
    if (!workspace?.id || !date) return;
    try {
      const r = await db.entities.SupervisorDailyLog.filter({ workspace_id: workspace.id, log_date: date }, '-updated_date', 100);
      setLogs(r);
    } catch (e) { toast({ title: 'Load failed', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [workspace?.id, date]);

  const add = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await db.entities.SupervisorDailyLog.create({ workspace_id: workspace.id, owner_id: workspace.owner_id, log_date: date, activity_description: text.trim() });
      setText('');
      await load();
    } catch (e) { toast({ title: 'Add failed', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  const saveEdit = async () => {
    if (!editText.trim()) return;
    try {
      await db.entities.SupervisorDailyLog.update(editId, { activity_description: editText.trim() });
      setEditId(null); setEditText('');
      await load();
    } catch (e) { toast({ title: 'Update failed', description: e.message, variant: 'destructive' }); }
  };
  const remove = async id => {
    try { await db.entities.SupervisorDailyLog.delete(id); await load(); }
    catch (e) { toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }); }
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="supervisor-log-dialog">
        <DialogTitle className="flex items-center gap-2"><CalendarCheck size={20} className="text-violet-500"/>Supervisor Daily Accomplishment Log</DialogTitle>
        <DialogDescription>{safeFormatDate(date, 'EEEE, dd MMMM yyyy')}</DialogDescription>
        <div className="todo-input-row">
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Log an accomplishment or activity…"/>
          <button onClick={add} disabled={busy || !text.trim()} aria-label="Add log"><Plus size={15}/></button>
        </div>
        <div className="log-list">
          {loading ? <div className="todo-empty"><Loader2 size={16} className="animate-spin"/></div>
            : logs.length ? logs.map(l => (
              <div key={l.id} className="log-item">
                {editId === l.id ? (
                  <div className="todo-edit">
                    <input value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEdit()} autoFocus/>
                    <button onClick={saveEdit} aria-label="Save"><Check size={14}/></button>
                    <button onClick={() => { setEditId(null); setEditText(''); }} aria-label="Cancel"><X size={14}/></button>
                  </div>
                ) : (
                  <>
                    <span className="log-text">{l.activity_description}</span>
                    <button className="todo-edit-btn" onClick={() => { setEditId(l.id); setEditText(l.activity_description); }} aria-label="Edit"><Edit2 size={13}/></button>
                    <button className="todo-del" onClick={() => remove(l.id)} aria-label="Delete"><Trash2 size={13}/></button>
                  </>
                )}
              </div>
            )) : <div className="todo-empty"><p>No accomplishments logged for this date yet.</p></div>}
        </div>
        <div className="log-todo-section">
          <h4 className="log-todo-title">To-Do for this date</h4>
          <div className="todo-input-row">
            <input value={todoText} onChange={e => setTodoText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTodo()} placeholder="Add a task for this date…"/>
            <button onClick={addTodo} disabled={!todoText.trim()} aria-label="Add task"><Plus size={15}/></button>
          </div>
          <div className="log-list">
            {todos.length ? todos.map(t => (
              <div key={t.id} className={`log-item${t.completed ? ' done' : ''}`}>
                <button className="todo-edit-btn" onClick={() => toggleTodo(t)} aria-label="Toggle task">{t.completed ? <CheckSquare size={14}/> : <Square size={14}/>}</button>
                <span style={{ flex: 1, textDecoration: t.completed ? 'line-through' : 'none' }}>{t.text}</span>
                <button className="todo-del" onClick={() => removeTodo(t.id)} aria-label="Delete task"><Trash2 size={13}/></button>
              </div>
            )) : <div className="todo-empty"><p>No tasks assigned to this date yet.</p></div>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}