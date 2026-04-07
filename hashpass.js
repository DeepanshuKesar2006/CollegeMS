const bcrypt = require('bcryptjs');

const accounts = [
  { role: 'student',  email: 'student@college.edu',  password: 'student123' },
  { role: 'teacher',  email: 'teacher@college.edu',  password: 'teacher123' },
  { role: 'admin',    email: 'admin@college.edu',    password: 'admin123'   },
];

console.log('\n=== COPY THESE HASHED PASSWORDS INTO SUPABASE ===\n');
accounts.forEach(a => {
  const hash = bcrypt.hashSync(a.password, 10);
  console.log(`Role   : ${a.role}`);
  console.log(`Email  : ${a.email}`);
  console.log(`Pass   : ${a.password}`);
  console.log(`Hash   : ${hash}`);
  console.log('---');
});
console.log('\nIn Supabase → Table Editor → users → Insert rows using above data\n');
