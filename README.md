# Backend (Railway)

This Node + Express backend uses a file `users.json` to store users. It is intentionally DB-free so you can deploy quickly on Railway.

Important environment variables:
- `JWT_SECRET` - change from default for production.
- `ADMIN_PASS` - password for the initial `admin` user created on first start (default: change_me_admin_password).
- `PORT` - set by Railway (usually provided by the platform).

Endpoints:
- POST /login            { username, password } -> { token }
- POST /create-user      (Authorization: Bearer <token>) { username, password, role }
- GET  /users            (Authorization: Bearer <token>) -> { users }

How it works:
- On first start, if `users.json` doesn't contain an `admin` user, the server will create one with username `admin` and password from `ADMIN_PASS` env var (or default). Change the password ASAP in production.
- Passwords are hashed with bcryptjs.
- JWT tokens are issued for authenticated sessions.
