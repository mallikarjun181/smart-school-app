# Smart School FullStack — Fixed Build

This build fixes the Prisma schema/setup issues found during Windows setup.

## Main fixes

- `generator client` and `datasource db` are now proper multiline Prisma blocks.
- `Attendance.markedBy` and `Mark.enteredBy` are nullable because their relations use `onDelete: SetNull`.
- `npm run setup` validates the Prisma schema before generating the client.
- Setup reuses an existing `smart-school-postgres` Docker container when present, avoiding the container-name conflict seen on Windows.
- README quick-start paths now refer to `Smart_School_FullStack_WORKING`.

## Windows commands

From the project root (the folder containing `package.json` and `docker-compose.yml`):

```powershell
npm run setup
npm run dev
```

Then open:

`http://localhost:4000`

Demo accounts use the temporary password shown by the seed script (`Smart@123`).
