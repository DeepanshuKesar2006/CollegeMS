const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ── MIDDLEWARE: verify token ──────────────────────────
function verifyToken(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── LOGIN ─────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { email, password, role } = req.body;

  console.log('Login attempt:', email, role); // debug log

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email);

  console.log('Users found:', users, 'Error:', error); // debug log

  if (error || !users || users.length === 0) {
    return res.status(401).json({ error: 'User not found. Check your email.' });
  }

  const user = users[0];

  if (user.role !== role) {
    return res.status(401).json({ error: `This account is not a ${role}. It is a ${user.role}.` });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Wrong password.' });
  }

  // Get student_id if role is student
  let studentId = null;
  if (role === 'student') {
    const { data: studentData } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id);
    if (studentData && studentData.length > 0) studentId = studentData[0].id;
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name, studentId },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token, role: user.role, name: user.name, studentId });
});

// ── STUDENTS ──────────────────────────────────────────
app.get('/api/students', async (req, res) => {
  const { data, error } = await supabase
    .from('students')
    .select('*, users(name, email)');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/students', async (req, res) => {
  const { data, error } = await supabase.from('students').insert(req.body).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/students/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('students').update(req.body).eq('id', req.params.id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/students/:id', async (req, res) => {
  const { error } = await supabase.from('students').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Deleted successfully' });
});

// ── ATTENDANCE ────────────────────────────────────────
app.get('/api/attendance/:student_id', async (req, res) => {
  const { data, error } = await supabase
    .from('attendance').select('*').eq('student_id', req.params.student_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/attendance', async (req, res) => {
  const { data, error } = await supabase.from('attendance').insert(req.body).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── RESULTS ───────────────────────────────────────────
app.get('/api/results/:student_id', async (req, res) => {
  const { data, error } = await supabase
    .from('results').select('*').eq('student_id', req.params.student_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/results', async (req, res) => {
  const { data, error } = await supabase.from('results').insert(req.body).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── ANNOUNCEMENTS ─────────────────────────────────────
app.get('/api/announcements', async (req, res) => {
  const { data, error } = await supabase
    .from('announcements').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/announcements', async (req, res) => {
  const { data, error } = await supabase.from('announcements').insert(req.body).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── USERS (admin use) ─────────────────────────────────
app.get('/api/users', async (req, res) => {
  const { data, error } = await supabase
    .from('users').select('id, email, role, name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/users', async (req, res) => {
  const { name, email, password, role } = req.body;
  const hashed = bcrypt.hashSync(password, 10);
  const { data, error } = await supabase
    .from('users').insert({ name, email, password: hashed, role }).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`✅ Server running on http://localhost:${process.env.PORT || 3000}`);
});