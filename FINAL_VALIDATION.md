# FINAL VALIDATION — ZERO PRISMA SCHEMA ERRORS

The Prisma schema is located at:

`backend/prisma/schema.prisma`

The root validation command is:

```powershell
npm run prisma:validate
```

This explicitly delegates to the backend and runs:

```powershell
prisma validate --schema prisma/schema.prisma
```

from the `backend` directory, so Prisma cannot accidentally look for a schema in the project root.

Expected result:

```text
The schema at prisma/schema.prisma is valid 🚀
```

## Fresh setup

From the project root:

```powershell
npm install
npm install --prefix backend
npm run prisma:validate
npm run setup
npm run dev
```

If an old PostgreSQL development database is being reused, reset it once:

```powershell
docker compose down -v
npm run setup
```

Do not run `npm audit fix --force` as part of setup.
