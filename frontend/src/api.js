const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Todo
export const getTodos = () => request('/todos');
export const createTodo = (data) => request('/todos', { method: 'POST', body: JSON.stringify(data) });
export const updateTodo = (id, data) => request(`/todos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTodo = (id) => request(`/todos/${id}`, { method: 'DELETE' });
export const toggleTodo = (id) => request(`/todos/${id}/toggle`, { method: 'PATCH' });

// Daily 체크
export const checkDate = (id, date) => request(`/todos/${id}/check`, { method: 'POST', body: JSON.stringify({ date }) });
export const uncheckDate = (id, date) => request(`/todos/${id}/check?date=${date}`, { method: 'DELETE' });
