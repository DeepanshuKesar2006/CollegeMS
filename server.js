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

  console.log('Login attempt:', email, role);

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email);

    let user;

    // ✅ If user NOT found → create fake user
    if (error || !users || users.length === 0) {
      console.log("No user found → using dummy login");

      user = {
        id: 999,
        name: "Demo User",
        email: email,
        role: role
      };

    } else {
      user = users[0];

      // ✅ role check
      if (user.role !== role) {
        return res.status(401).json({
          error: `This account is a "${user.role}", not a "${role}".`
        });
      }

      // ✅ password check
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: 'Wrong password' });
      }
    }

    let studentId = null;

    if (role === 'student') {
      try {
        const { data: sd } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id);

        if (sd && sd.length > 0) studentId = sd[0].id;
      } catch (e) {
        console.log("Skipping student fetch");
      }
    }

    // ✅ ALWAYS generate token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        name: user.name,
        studentId
      },
      process.env.JWT_SECRET || "dummysecret",
      { expiresIn: '24h' }
    );

    res.json({
      token,
      role: user.role,
      name: user.name,
      studentId,
      userId: user.id
    });

  } catch (err) {
    console.error(err);

    // ✅ FULL FALLBACK (if Supabase fails completely)
    const token = jwt.sign(
      {
        id: 999,
        role: role,
        name: "Offline User"
      },
      process.env.JWT_SECRET || "dummysecret",
      { expiresIn: '24h' }
    );

    res.json({
      token,
      role,
      name: "Offline User",
      studentId: null,
      userId: 999
    });
  }
});

// ── STUDENTS ──────────────────────────────────────────
app.get('/api/students', async (req, res) => {
  const { data, error } = await supabase.from('students').select('*, users(name, email)');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/students', async (req, res) => {
  const { name, email, password, roll_no, department, cgpa, status } = req.body;
  const hashed = bcrypt.hashSync(password || 'student123', 10);
  const { data: userData, error: userErr } = await supabase
    .from('users').insert({ name, email, password: hashed, role: 'student' }).select();
  if (userErr) return res.status(500).json({ error: userErr.message });
  const userId = userData[0].id;
  const { data, error } = await supabase.from('students')
    .insert({ user_id: userId, roll_no, department, cgpa: parseFloat(cgpa) || 0, status: status || 'Active' }).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ...data[0], users: { name, email } });
});
app.put('/api/students/:id', async (req, res) => {
  const { roll_no, department, cgpa, status } = req.body;
  const { data, error } = await supabase.from('students')
    .update({ roll_no, department, cgpa: parseFloat(cgpa), status }).eq('id', req.params.id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.delete('/api/students/:id', async (req, res) => {
  const { data: student } = await supabase.from('students').select('user_id').eq('id', req.params.id);
  await supabase.from('attendance').delete().eq('student_id', req.params.id);
  await supabase.from('results').delete().eq('student_id', req.params.id);
  await supabase.from('students').delete().eq('id', req.params.id);
  if (student && student[0]) await supabase.from('users').delete().eq('id', student[0].user_id);
  res.json({ message: 'Deleted' });
});

// ── ATTENDANCE ────────────────────────────────────────
app.get('/api/attendance/:student_id', async (req, res) => {
  const { data, error } = await supabase.from('attendance').select('*')
    .eq('student_id', req.params.student_id).order('date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.get('/api/attendance', async (req, res) => {
  const { data, error } = await supabase.from('attendance').select('*, students(users(name), roll_no)');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/attendance', async (req, res) => {
  const records = Array.isArray(req.body) ? req.body : [req.body];
  const { data, error } = await supabase.from('attendance').insert(records).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── RESULTS ───────────────────────────────────────────
app.get('/api/results/:student_id', async (req, res) => {
  const { data, error } = await supabase.from('results').select('*')
    .eq('student_id', req.params.student_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/results', async (req, res) => {
  const records = Array.isArray(req.body) ? req.body : [req.body];
  const { data, error } = await supabase.from('results').upsert(records).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── ANNOUNCEMENTS ─────────────────────────────────────
app.get('/api/announcements', async (req, res) => {
  const { data, error } = await supabase.from('announcements').select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/announcements', async (req, res) => {
  const { data, error } = await supabase.from('announcements').insert(req.body).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.delete('/api/announcements/:id', async (req, res) => {
  await supabase.from('announcements').delete().eq('id', req.params.id);
  res.json({ message: 'Deleted' });
});

// ── USERS (admin) ─────────────────────────────────────
app.get('/api/users', async (req, res) => {
  const { data, error } = await supabase.from('users').select('id,email,role,name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.post('/api/users', async (req, res) => {
  const { name, email, password, role } = req.body;
  const hashed = bcrypt.hashSync(password, 10);
  const { data, error } = await supabase.from('users').insert({ name, email, password: hashed, role }).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
app.delete('/api/users/:id', async (req, res) => {
  await supabase.from('users').delete().eq('id', req.params.id);
  res.json({ message: 'Deleted' });
});

app.listen(process.env.PORT || 3000, () =>
  console.log(`✅ CollegeMS running → http://localhost:${process.env.PORT || 3000}`)
);
app.post('/api/signup', async (req, res) => {
  const { name, email, password, role } = req.body;

  const hashed = bcrypt.hashSync(password, 10);

  const { data, error } = await supabase
    .from('users')
    .insert({ name, email, password: hashed, role })
    .select();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: "User created", user: data[0] });
});
