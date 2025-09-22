const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const USERS_FILE = path.join(__dirname, 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_env';
const PORT = process.env.PORT || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || 'change_me_admin_password';

const app = express();
app.use(bodyParser.json());

function loadUsers(){
  if(!fs.existsSync(USERS_FILE)){
    fs.writeFileSync(USERS_FILE, JSON.stringify([],'',2));
  }
  const raw = fs.readFileSync(USERS_FILE,'utf8') || '[]';
  try { return JSON.parse(raw); } catch(e){ return []; }
}
function saveUsers(users){
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function ensureAdminExists(){
  const users = loadUsers();
  if(users.find(u=>u.username==='admin')) return;
  const hash = bcrypt.hashSync(ADMIN_PASS, 10);
  users.push({ id: 1, username: 'admin', passwordHash: hash, role: 'admin' });
  saveUsers(users);
  console.log('Created default admin user (username: admin). Set ADMIN_PASS env var to change password.');
}
ensureAdminExists();

function generateToken(user){
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
}

function authMiddleware(req,res,next){
  const h = req.headers.authorization;
  if(!h || !h.startsWith('Bearer ')) return res.status(401).json({ ok:false, message: 'missing token' });
  const token = h.slice(7);
  try{
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  } catch(e){
    return res.status(401).json({ ok:false, message: 'invalid token' });
  }
}

// login
app.post('/login', (req,res)=>{
  const { username, password } = req.body || {};
  if(!username || !password) return res.status(400).json({ ok:false, message: 'username & password required' });
  const users = loadUsers();
  const user = users.find(u=>u.username === username);
  if(!user) return res.status(401).json({ ok:false, message: 'invalid credentials' });
  const ok = bcrypt.compareSync(password, user.passwordHash);
  if(!ok) return res.status(401).json({ ok:false, message: 'invalid credentials' });
  const token = generateToken(user);
  res.json({ ok:true, token });
});

// create user (admin only)
app.post('/create-user', authMiddleware, (req,res)=>{
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ ok:false, message: 'admin only' });
  const { username, password, role } = req.body || {};
  if(!username || !password) return res.status(400).json({ ok:false, message: 'username & password required' });
  const users = loadUsers();
  if(users.find(u=>u.username === username)) return res.status(400).json({ ok:false, message: 'username exists' });
  const id = users.length ? Math.max(...users.map(u=>u.id)) + 1 : 1;
  const hash = bcrypt.hashSync(password, 10);
  users.push({ id, username, passwordHash: hash, role: role || 'user' });
  saveUsers(users);
  res.json({ ok:true, message: 'created' });
});

// list users (admin)
app.get('/users', authMiddleware, (req,res)=>{
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ ok:false, message: 'admin only' });
  const users = loadUsers().map(u=>({ id: u.id, username: u.username, role: u.role }));
  res.json({ ok:true, users });
});

app.listen(PORT, ()=>{
  console.log('Server listening on port', PORT);
});