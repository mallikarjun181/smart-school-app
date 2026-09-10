# Smart School — Production Security Deployment

## 1. Secrets
- Do not commit `backend/.env`.
- Run `npm run setup` once in development; it creates a fresh random JWT secret when `.env` is missing.
- In production, create secrets in the hosting provider's secret manager.
- Use a unique database password and a unique JWT secret of at least 64 random characters.
- Use a Gmail App Password or transactional email provider credential; never use a personal mailbox password.

## 2. HTTPS
Preferred architecture:

Internet -> HTTPS reverse proxy/load balancer -> Node.js -> PostgreSQL

Set:
- `FRONTEND_URL=https://school.example.com`
- `APP_BASE_URL=https://school.example.com`
- `NODE_ENV=production`
- `TRUST_PROXY=true` when the reverse proxy is the trusted immediate proxy.

Node can also terminate TLS directly by setting `HTTPS_KEY_PATH` and `HTTPS_CERT_PATH`.

## 3. PostgreSQL
- Do not expose PostgreSQL to the public internet.
- The included Docker Compose binds port 5432 to `127.0.0.1` only.
- For production, prefer managed PostgreSQL with encrypted connections, backups, point-in-time recovery, restricted network rules, and a dedicated application database user.
- Use `prisma migrate deploy` for production migrations, not `prisma db push`.

## 4. Private files
All newly uploaded files default to `PRIVATE`.
- Public files are served only when their database record is explicitly marked `PUBLIC`.
- Private files are served through `GET /api/files/:id` and require authentication plus authorization.
- Parent access is limited to files explicitly associated with one of the parent's mapped students.
- Class Teacher access is limited to files associated with a student in the teacher's assigned class.
- Owners and School Admins can access all files.
- Uploaded filenames are random UUIDs; original filenames are never used as filesystem paths.

## 5. Production checks
Before launch verify:
- `npm run prisma:validate`
- `npm test`
- `NODE_ENV=production` starts successfully with production secrets
- HTTPS works and HTTP is redirected by the reverse proxy
- PostgreSQL is not publicly reachable
- Parent A receives 403 for Student B
- Class Teacher 8-A receives 403 for Student 8-B
- Private payment proof cannot be opened without authorization
- Password reset tokens expire and cannot be reused
- Login/reset/upload rate limits work
- Error responses do not contain stack traces, SQL, password hashes, or reset tokens
