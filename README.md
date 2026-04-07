# 🎓 CollegeMS — College Management System

A full-stack web application for managing students, teachers, and admins with role-based dashboards.

## 🛠 Tech Stack
- **Frontend**: Plain HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js + Express.js
- **Database**: Supabase (PostgreSQL)
- **Auth**: JWT (JSON Web Tokens) + bcryptjs password hashing
- **Charts**: Chart.js

## 🚀 How to Run

### 1. Install dependencies
```bash
npm install
```

### 2. Set up .env file
```
SUPABASE_URL=your_project_url
SUPABASE_KEY=your_anon_key
JWT_SECRET=collegems_super_secret_2024
PORT=3000
```

### 3. Set up Supabase tables (see below)

### 4. Create hashed passwords
```bash
node hashpass.js
```
Copy the hashes into Supabase users table.

### 5. Start server
```bash
node server.js
```

### 6. Open browser
Go to: http://localhost:3000

## 🔑 Demo Login Credentials
| Role | Email | Password |
|------|-------|----------|
| Student | student@college.edu | student123 |
| Teacher | teacher@college.edu | teacher123 |
| Admin | admin@college.edu | admin123 |

## 🗄 Supabase Tables

### users
| Column | Type |
|--------|------|
| id | int8, PK, auto-increment |
| email | text |
| password | text (bcrypt hash) |
| role | text (student/teacher/admin) |
| name | text |

### students
| Column | Type |
|--------|------|
| id | int8, PK, auto-increment |
| user_id | int8 (FK → users.id) |
| roll_no | text |
| department | text |
| cgpa | float4 |
| status | text |

### attendance
| Column | Type |
|--------|------|
| id | int8, PK, auto-increment |
| student_id | int8 |
| subject | text |
| date | date |
| status | text (P/A/L) |
| reason | text |

### results
| Column | Type |
|--------|------|
| id | int8, PK, auto-increment |
| student_id | int8 |
| subject | text |
| exam_type | text |
| marks | int4 |
| max_marks | int4 |
| grade | text |

### announcements
| Column | Type |
|--------|------|
| id | int8, PK, auto-increment |
| title | text |
| message | text |
| created_at | timestamp (default: now()) |

## ✨ Features
- **Student Portal**: Attendance charts, results, timetable, announcements
- **Teacher Panel**: Full CRUD students, bulk attendance marking, result upload with auto-grading
- **Admin Dashboard**: Charts/analytics, teacher management, user role management, reports
