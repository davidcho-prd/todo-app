import React, { useEffect, useState } from 'react';
import './todo-app.css';
import { getTodos, createTodo, updateTodo, deleteTodo, toggleTodo, checkDate, uncheckDate } from './api';

function getDatesInRange(start, end) {
  if (!start || !end) return [];
  const dates = [];
  let current = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  while (current <= endDate) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function formatDate(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

function getProgress(todo) {
  if (todo.type === 'single') return todo.completed ? 100 : 0;
  const dates = getDatesInRange(todo.period_start, todo.period_end);
  if (dates.length === 0) return 0;
  return Math.round(((todo.checked_dates || []).length / dates.length) * 100);
}

const EMPTY_FORM = { title: '', content: '', type: 'single', category: '기타', dueDate: '', periodStart: '', periodEnd: '' };

export default function TodoApp() {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingTodo, setEditingTodo] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setTodos(await getTodos()); }
    catch (e) { setError(e.message); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      await createTodo(form);
      await load();
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch (e) { setError(e.message); }
  }

  function openEdit(todo) {
    setEditingTodo(todo);
    setEditForm({
      title: todo.title,
      content: todo.content || '',
      type: todo.type,
      category: todo.category || '기타',
      dueDate: todo.due_date || '',
      periodStart: todo.period_start || '',
      periodEnd: todo.period_end || '',
    });
  }

  async function handleUpdate(e) {
    e.preventDefault();
    try {
      await updateTodo(editingTodo.id, editForm);
      await load();
      setEditingTodo(null);
    } catch (e) { setError(e.message); }
  }

  async function handleToggle(id) {
    try {
      const updated = await toggleTodo(id);
      setTodos(todos.map(t => t.id === id ? { ...updated, checked_dates: t.checked_dates } : t));
    } catch (e) { setError(e.message); }
  }

  async function handleDelete(id) {
    try {
      await deleteTodo(id);
      setTodos(todos.filter(t => t.id !== id));
    } catch (e) { setError(e.message); }
  }

  async function handleDayCheck(todo, date, isChecked) {
    try {
      if (isChecked) {
        await checkDate(todo.id, date);
        setTodos(todos.map(t => t.id === todo.id
          ? { ...t, checked_dates: [...(t.checked_dates || []), date] }
          : t));
      } else {
        await uncheckDate(todo.id, date);
        setTodos(todos.map(t => t.id === todo.id
          ? { ...t, checked_dates: (t.checked_dates || []).filter(d => d !== date) }
          : t));
      }
    } catch (e) { setError(e.message); }
  }

  const filtered = todos.filter(t => {
    if (filter === 'single') return t.type === 'single';
    if (filter === 'daily') return t.type === 'daily';
    return true;
  });

  const TaskForm = ({ values, setValues, onSubmit, onCancel, submitLabel }) => (
    <form onSubmit={onSubmit}>
      <select value={values.type} onChange={e => setValues({ ...values, type: e.target.value })}>
        <option value="single">ONE-TIME</option>
        <option value="daily">DAILY</option>
      </select>
      <input
        type="text"
        placeholder="Task title"
        value={values.title}
        onChange={e => setValues({ ...values, title: e.target.value })}
        required
      />
      <textarea
        placeholder="내용 (선택사항)"
        value={values.content}
        onChange={e => setValues({ ...values, content: e.target.value })}
        rows={3}
      />
      <select value={values.category} onChange={e => setValues({ ...values, category: e.target.value })}>
        <option value="업무">업무</option>
        <option value="개인">개인</option>
        <option value="의약">의약</option>
        <option value="취미">취미</option>
        <option value="스터디">스터디</option>
        <option value="기타">기타</option>
      </select>
      {values.type === 'single' && (
        <input type="date" value={values.dueDate} onChange={e => setValues({ ...values, dueDate: e.target.value })} />
      )}
      {values.type === 'daily' && (
        <>
          <input type="date" value={values.periodStart} onChange={e => setValues({ ...values, periodStart: e.target.value })} />
          <input type="date" value={values.periodEnd} onChange={e => setValues({ ...values, periodEnd: e.target.value })} />
        </>
      )}
      <div className="modal-actions">
        <button type="submit" className="btn-primary">{submitLabel}</button>
        <button type="button" className="btn-cancel" onClick={onCancel}>CANCEL</button>
      </div>
    </form>
  );

  return (
    <div className="app">
      <header className="header">
        <h1>Daily Rituals</h1>
        <p className="subtitle">Build Habits, Track Progress</p>
      </header>

      {error && (
        <div className="error">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div className="filter-tabs">
        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>↗ ALL TASKS</button>
        <button className={`tab ${filter === 'single' ? 'active' : ''}`} onClick={() => setFilter('single')}>✓ ONE-TIME</button>
        <button className={`tab ${filter === 'daily' ? 'active' : ''}`} onClick={() => setFilter('daily')}>⊞ DAILY HABITS</button>
      </div>

      <button className="add-btn" onClick={() => setShowForm(true)}>+ ADD NEW TASK</button>

      <ul className="todo-list">
        {filtered.map(todo => {
          const progress = getProgress(todo);
          const dates = getDatesInRange(todo.period_start, todo.period_end);
          const checkedSet = new Set(todo.checked_dates || []);

          return (
            <li key={todo.id} className="todo-card">
              <div className="card-top">
                <input type="checkbox" className="todo-checkbox" checked={!!todo.completed} onChange={() => handleToggle(todo.id)} />
                <span className={`badge badge-${todo.type}`}>{todo.type === 'single' ? 'ONE-TIME' : 'DAILY'}</span>
                <button className="edit-btn" onClick={() => openEdit(todo)}>✎</button>
                <button className="delete-btn" onClick={() => handleDelete(todo.id)}>🗑</button>
              </div>

              <span className={`cat-badge cat-${todo.category}`}>{todo.category || '기타'}</span>
              <div className={`todo-title ${todo.completed ? 'completed' : ''}`}>{todo.title}</div>
              {todo.content && <p className="todo-content">{todo.content}</p>}

              {todo.type === 'daily' && todo.period_start && (
                <div className="date-range">{formatDate(todo.period_start)} - {todo.period_end ? formatDate(todo.period_end) : ''}</div>
              )}

              <div className="progress-row">
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                <span className="progress-pct">{progress}%</span>
              </div>

              {todo.type === 'daily' && dates.length > 0 && (
                <div className="date-chips">
                  {dates.map(date => (
                    <button key={date} className={`date-chip ${checkedSet.has(date) ? 'checked' : ''}`} onClick={() => handleDayCheck(todo, date, !checkedSet.has(date))}>
                      {checkedSet.has(date) && <span className="chip-check">✓</span>}
                      <span>{formatDate(date)}</span>
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* 추가 모달 */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>NEW TASK</h2>
            <TaskForm values={form} setValues={setForm} onSubmit={handleCreate} onCancel={() => setShowForm(false)} submitLabel="ADD TASK" />
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {editingTodo && (
        <div className="modal-overlay" onClick={() => setEditingTodo(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>EDIT TASK</h2>
            <TaskForm values={editForm} setValues={setEditForm} onSubmit={handleUpdate} onCancel={() => setEditingTodo(null)} submitLabel="SAVE" />
          </div>
        </div>
      )}
    </div>
  );
}
