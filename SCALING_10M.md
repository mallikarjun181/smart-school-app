# Smart School — 1 Crore User Scale Plan

This release is a **scale-ready foundation**, not a claim that 10 million concurrent users have already been load-tested.

## Included in this release
- Stateless JWT API suitable for multiple backend instances.
- Optional Redis-backed rate limiting via `REDIS_URL`; without Redis, rate limits are process-local.
- Gzip/Brotli-compatible response compression through the `compression` middleware.
- Database readiness endpoint: `GET /api/ready`.
- Request IDs via `X-Request-Id` for distributed tracing/correlation.
- Graceful SIGINT/SIGTERM shutdown for load balancers/orchestrators.
- Exact email/mobile login query instead of scanning up to 50 active users.
- Bounded API reads (maximum 500 records when pagination is not explicitly requested).
- Optional pagination on normalized resources: `?limit=100&offset=0`; response is `{items,total,limit,offset,hasMore}` when pagination parameters are supplied.

## Required production architecture for 10M registered users
1. CDN + WAF/DDoS protection in front of the frontend.
2. HTTPS load balancer in front of multiple Node.js instances.
3. Shared Redis for rate limiting and future distributed caching.
4. Managed PostgreSQL with connection pooling, automated backups, point-in-time recovery, and read replicas as traffic requires.
5. Object storage + CDN for photos, videos, receipts, and certificates. Do not depend on local disk across multiple API instances.
6. Queue workers for email/SMS/notification workloads.
7. Central logs, metrics, traces, uptime checks, and alerting.
8. Multi-school tenant isolation must be enforced with a school/tenant identifier on every school-owned record before onboarding many schools. The current schema is still primarily single-school and therefore must be evolved before a true 10M-user multi-school launch.

## Deployment rule
Run several identical backend instances behind a load balancer. Never rely on one Node process or one local PostgreSQL container for production scale.

## Load-test gate
Before advertising a capacity number, test progressively (1k, 5k, 10k, 50k, 100k+ concurrent users) and record p95/p99 latency, error rate, requests/second, DB CPU, DB connections, Redis latency, and file-transfer throughput.

## This release's additional scale foundation
- Multi-school `School` tenant model and `schoolId` on school-owned records.
- Tenant-scoped API reads/writes and protected file access.
- Owner endpoints to create schools and school administrators.
- Production Dockerfile and reference production compose configuration.
- Lightweight authenticated load-test harness under `load-test/`.
