# Prisma validation path fix

The root command now runs the backend package script:

```powershell
npm run prisma:validate
```

It resolves the schema from the backend working directory and explicitly validates:

`backend/prisma/schema.prisma`

The previous error **Could not find Prisma Schema** was a command working-directory/path error, not a Prisma model validation result.
