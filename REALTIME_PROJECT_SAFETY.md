# Smart School V4 safety and validation

## Verified in this package
- Frontend JavaScript syntax checked with Node.
- 146 inline event-handler attributes scanned; referenced application handlers exist.
- Duplicate `/api/api/` URL pattern checked and absent.
- Stale `localhost:4000` frontend API base checked and absent; direct-file API base is localhost:5000.
- Backend JavaScript syntax checked.
- Backend regression/security/tenant tests: 6/6 passing.
- ZIP integrity checked.
- UUID-safe dynamic teacher/class edit and credential buttons use `data-*` values instead of numeric coercion.
- Class Teacher identity no longer falls back to the first teacher; it matches authenticated user and backend teacher records.
- Parent credential-status refresh is guarded against recursive request loops.

## Database safety
This release does not contain `prisma migrate reset`, `prisma db push --accept-data-loss`, or destructive database-reset commands in the normal run path.

For an existing production database, take a PostgreSQL backup before any schema change. Do not run `prisma db push --accept-data-loss` on a database containing important records.

## Important production qualification
This package is a tested development/full-stack foundation, not proof of 10 million concurrent-user capacity. A real 1-crore-user deployment requires managed PostgreSQL/Redis, object storage, load balancers, multiple backend instances, observability, backups/PITR, security review, and a staged load/chaos test.
