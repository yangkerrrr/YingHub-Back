import express from "express";
import cors from "cors";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(express.json());

// Allow frontend requests (GitHub Pages origin)
app.use(cors({
  origin: "https://yangkerrr.github.io"  // only allow your site
  // origin: "*" // <-- use this if you want to allow ALL sites
}));

// --- LOAD USERS FILE ---
const USERS_FILE = "./users.json";

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([
      { username: "admin", password: process.env.ADMIN_PASS || "change_me_admin_password", role: "admin" }
    ], null, 2));
  }
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// --- ROUTES ---

// Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ ok: false, message: "username & password required" });
  }

  const users = loadUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ ok: false, message: "invalid credentials" });
  }

  res.json({ ok: true, role: user.role });
});

// Create user (admin only)
app.post("/create-user", (req, res) => {
  const { username, password, role, adminUsername, adminPassword } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ ok: false, message: "username, password & role required" });
  }

  const users = loadUsers();
  const admin = users.find(u => u.username === adminUsername && u.password === adminPassword && u.role === "admin");
  if (!admin) {
    return res.status(403).json({ ok: false, message: "admin authentication failed" });
  }

  if (users.find(u => u.username === username)) {
    return res.status(409).json({ ok: false, message: "user already exists" });
  }

  users.push({ username, password, role });
  saveUsers(users);

  res.json({ ok: true, message: `User ${username} created` });
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
