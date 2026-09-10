# Smart School Management — Final Full-Stack 

## Windows step-by-step

Open the project root in VS Code. The terminal must end with the project folder, for example:

`PS C:\Users\malli\Downloads\Smart_School_FullStack_FINAL_PATH_FIXED>`

### 1. Install dependencies

```powershell
npm install
npm install --prefix backend
```

### 2. Start and initialize the database (recommended)

```powershell
npm run setup
```

This creates/uses `backend/.env`, starts the bundled PostgreSQL container, generates Prisma Client, pushes the schema, and seeds the demo accounts.

### 3. Validate Prisma

```powershell
npm run prisma:validate
```

Expected:

```text
The schema at prisma/schema.prisma is valid 🚀
```

The schema is explicitly `backend/prisma/schema.prisma`.

The setup script:
- starts PostgreSQL through Docker Compose;
- creates `backend/.env` if required;
- installs backend packages;
- validates the exact Prisma schema path;
- generates Prisma Client;
- pushes the schema to PostgreSQL;
- seeds development accounts.

### 4. Start the application

```powershell
npm run dev
```

Open:

`http://localhost:4000`

## Demo accounts

All demo accounts use temporary password `Smart@123` and require a password change on first login.

- Owner: owner@smartschool.local / 9000000001
- School Admin: admin@smartschool.local / 9000000002
- Class Teacher: ravi@smartschool.local / 9000000003
- Subject Teacher: anitha@smartschool.local / 9000000004
- Parent: parent@smartschool.local / 9000000005

## If an old database/container causes conflicts

```powershell
docker compose down -v
npm run setup
```

This removes the local development database volume and recreates it.

## Important

School Admin is represented by the backend role `SCHOOL_ADMIN`.

Do not run `npm audit fix --force` during normal setup.


## Email / Forgot Password

The Forgot Password button sends a real password-reset email through SMTP. Configure these variables in `backend/.env` before testing it:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-school-email@gmail.com
SMTP_PASS=your-16-character-gmail-app-password
MAIL_FROM=your-school-email@gmail.com
APP_BASE_URL=http://localhost:5000
```

For Gmail, use a Google **App Password** rather than your normal account password. After changing `.env`, restart the backend. The reset link expires after 30 minutes and can only be used once.

## Security and production deployment
See `SECURITY_HARDENING.md` and `DEPLOYMENT_SECURITY.md` for HTTPS, private file downloads, database/network protection, production secrets and release checks.

## 1M registered-user architecture
See `1M_ARCHITECTURE.md`, `1M_DEPLOYMENT_CHECKLIST.md` and `k8s/smart-school-1m.yaml`. These provide the production topology and autoscaling baseline for a 1,000,000-registered-user target. They do not claim 1,000,000 concurrent users without load testing.
