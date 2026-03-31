require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:3000'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// DB 연결 풀
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'todo_app',
  waitForConnections: true,
  connectionLimit: 10,
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ── Todo CRUD ──────────────────────────────────────────────

// 모든 할일 조회 (체크된 날짜 포함)
app.get('/api/todos', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, GROUP_CONCAT(dc.check_date ORDER BY dc.check_date) AS checked_dates
       FROM todos t
       LEFT JOIN daily_checks dc ON dc.todo_id = t.id
       GROUP BY t.id
       ORDER BY t.created_at DESC`
    );
    const todos = rows.map(row => ({
      ...row,
      checked_dates: row.checked_dates ? row.checked_dates.split(',') : [],
    }));
    res.json(todos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 할일 생성
app.post('/api/todos', async (req, res) => {
  const { title, type, category, content, dueDate, periodStart, periodEnd } = req.body;
  if (!title || !type) {
    return res.status(400).json({ error: 'title과 type은 필수입니다.' });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO todos (title, type, category, content, due_date, period_start, period_end)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, type, category || '기타', content || null, dueDate || null, periodStart || null, periodEnd || null]
    );
    const [rows] = await pool.query('SELECT * FROM todos WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 할일 수정
app.put('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { title, type, category, content, dueDate, periodStart, periodEnd } = req.body;
  try {
    await pool.query(
      `UPDATE todos SET title = ?, type = ?, category = ?, content = ?, due_date = ?, period_start = ?, period_end = ?
       WHERE id = ?`,
      [title, type, category || '기타', content || null, dueDate || null, periodStart || null, periodEnd || null, id]
    );
    const [rows] = await pool.query('SELECT * FROM todos WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: '할일을 찾을 수 없습니다.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 할일 삭제
app.delete('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM todos WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: '할일을 찾을 수 없습니다.' });
    res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 완료 토글
app.patch('/api/todos/:id/toggle', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      'UPDATE todos SET completed = NOT completed WHERE id = ?',
      [id]
    );
    const [rows] = await pool.query('SELECT * FROM todos WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: '할일을 찾을 수 없습니다.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Daily 체크 ─────────────────────────────────────────────

// 날짜 체크
app.post('/api/todos/:id/check', async (req, res) => {
  const { id } = req.params;
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'date는 필수입니다.' });
  try {
    await pool.query(
      `INSERT IGNORE INTO daily_checks (todo_id, check_date) VALUES (?, ?)`,
      [id, date]
    );
    res.status(201).json({ message: '체크되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 날짜 체크 해제
app.delete('/api/todos/:id/check', async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date 쿼리 파라미터가 필요합니다.' });
  try {
    await pool.query(
      'DELETE FROM daily_checks WHERE todo_id = ? AND check_date = ?',
      [id, date]
    );
    res.json({ message: '체크가 해제되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
