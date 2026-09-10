# Smart School Management — Full-Stack Demo

This package preserves the existing HTML/CSS/JS UI and adds a Node.js + Express + PostgreSQL + Prisma backend. The frontend uses a compatibility state bridge (`/api/state`) so the existing workflows can be run without redesigning the UI, while normalized REST resources and School Information APIs are also available.

## Run
1. Install Node.js 20+ and Docker.
2. Copy `backend/.env.example` to `backend/.env`.
3. From this folder:
   `docker compose up -d`
4. `cd backend && npm install`
5. `npm run prisma:generate`
6. `npm run db:push`
7. `npm run db:seed`

> **Important:** Run `npm run db:seed` after `db:push`. The seed script deliberately resets the development accounts to the documented temporary password, so an older PostgreSQL volume cannot leave you with stale credentials. If you previously ran an older version, use `docker compose down -v` once, then repeat the setup steps.
8. `npm run dev`
9. Open http://localhost:4000

## Development login
All seeded users use temporary password `Smart@123` and are marked for first-login password change. Re-running `npm run db:seed` resets these development credentials to this password.

- Owner: owner@smartschool.local / 9000000001
- School Admin: admin@smartschool.local / 9000000002
- Class Teacher: ravi@smartschool.local / 9000000003
- Subject Teacher: anitha@smartschool.local / 9000000004
- Parent: parent@smartschool.local / 9000000005

## Database
PostgreSQL is provided by docker-compose. Prisma schema is in `backend/prisma/schema.prisma`. For this demo package, Prisma creates/updates the PostgreSQL schema with `npm run db:push`.

## Security
JWT authentication, bcrypt hashing, role middleware, Helmet, CORS, authentication rate limiting, upload MIME/size checks, audit logs, and backend parent/class isolation are included. Replace all development secrets before production.

## Important
School Admin is represented by the backend role `SCHOOL_ADMIN` (not `ADMIN`). The frontend maps that authenticated role to its existing `admin` UI key. The login API returns `{ success, token, user }` and also includes the same payload under `data` for compatibility.

The existing frontend remains the visual source of truth. Its localStorage state is synchronized to PostgreSQL through `/api/state` as a compatibility bridge. For a production rollout, each UI module can be switched to the normalized `/api/*` resources without changing the UI.


### Password reset email
Set SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM and APP_BASE_URL in `.env`. Gmail requires an App Password. Restart the server after editing `.env`.
