# Production deployment blueprint — 10M registered users

This release provides the application-side foundation for horizontal scaling. It does **not** certify 10M concurrent users.

## Target architecture
- CDN + WAF/DDoS protection for the web frontend.
- HTTPS load balancer across multiple stateless Node.js instances.
- Shared Redis for rate limiting and distributed cache.
- Managed PostgreSQL with pooling, automated backups/PITR, monitoring and read replicas as required.
- Object storage + CDN for media and documents. Local `backend/uploads` is for development only.
- Queue workers for email, SMS and other long-running notification work.
- Centralized logs/metrics/traces and alerts.

## Tenant model
All school-owned records carry `schoolId`. The authenticated user's tenant is applied by the API; client-supplied tenant IDs are ignored. Parent and class-teacher access has additional relationship/class restrictions.

The Owner can create schools through `POST /api/schools` and create a school admin through `POST /api/schools/:schoolId/admin`.

## Production database
Use a managed PostgreSQL service. Set `DATABASE_URL` to the provider's pooled connection string. For production migrations, apply the immutable SQL migration under `backend/prisma/migrations/0003_multischool_tenancy/` (or generate a reviewed Prisma migration from the final schema) rather than relying on `prisma db push`.

## Container
`Dockerfile` builds a production image. `docker-compose.production.yml` is a reference for local/staging orchestration; in a real cloud deployment, use the provider's service/load-balancer/autoscaling primitives and managed PostgreSQL/Redis.

## Files
The current API still uses local disk for uploads. Before multi-instance production, move file bytes to object storage and retain only metadata in PostgreSQL. Never put user-uploaded private documents on a public bucket.

## Capacity gate
Run `load-test/load.mjs` against a dedicated staging environment. Increase gradually and record p50/p95/p99 latency, error rate, requests/second, PostgreSQL CPU/connections, Redis latency and network throughput. Capacity must be reported from measured results, not from the number of registered users.
