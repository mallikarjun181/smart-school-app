# Smart School — 1M-user architecture target

## Goal
Design for **1,000,000 registered users initially**, while validating concurrent capacity in stages. Registered-user capacity and simultaneous active-user capacity are different metrics.

## Production topology
- CDN/WAF at the edge
- HTTPS load balancer / ingress
- Stateless Node.js API pods; start at 8 and autoscale toward 40+ based on measured CPU/memory/latency
- Managed Redis cluster for shared rate limiting and future cache/session workloads
- Managed PostgreSQL with automated backups, point-in-time recovery, Multi-AZ/HA, connection pooling (PgBouncer or provider pooler), read replicas as read load grows
- Object storage + CDN for photos, videos, certificates and other files; do not use per-pod local disk for durable production uploads
- Centralized logs, metrics, traces and alerts

## Database principles
All tenant-scoped tables carry `schoolId`. Keep pagination on list endpoints. Composite indexes have been added for the dominant tenant/class/student/date access patterns. Add read replicas only after measuring read pressure; writes remain on the primary.

## Application principles
- No in-memory session state.
- Redis-backed rate limiting when multiple API replicas run.
- Graceful shutdown and readiness/liveness probes.
- Keep request payloads bounded.
- Move email/SMS/report generation to background workers before very high traffic.
- Keep frontend assets behind CDN; keep API separate from static asset delivery.

## Capacity statement
This package is **architected for a 1M registered-user launch target**. It is not a claim of 1M concurrent users. A capacity number must be established with staged load tests on the actual production-class infrastructure.

## Safe rollout
1. Staging database only.
2. Synthetic users and realistic read/write mix.
3. 100 -> 500 -> 1K -> 5K -> 10K -> 25K concurrent stages.
4. Continue only when p95/p99, error rate, DB CPU/connections, Redis latency, and API CPU/memory remain within agreed SLOs.
5. Never run destructive load tests against the real production database.

## Production data safety
Do not use `prisma migrate reset`. Do not use `prisma db push --accept-data-loss` against production. Use reviewed, additive Prisma migrations and take a verified backup/PITR checkpoint before schema changes.

## Recommended starting production shape
- 8 API pods, 0.5 vCPU request / 2 vCPU limit, 512Mi request / 2Gi limit.
- HPA 8-40 pods with CPU/memory signals as a baseline; tune using p95 latency and request rate.
- Managed PostgreSQL HA with a connection pooler. Start with a conservative 10 Prisma connections per API pod; do not multiply pod count by an unlimited DB pool.
- Managed Redis with TLS and HA. Redis is not the system of record.
- CDN/WAF/load balancer in front of the API and static assets.
- Object storage for durable media. The included local `uploads/` disk is for development/staging and is not shared across replicas.

## Important scale boundary
A million registered accounts does not require a million API servers or a million database connections. The system should serve active traffic, not keep a live connection per registered account. Capacity depends on concurrent requests, endpoint mix, response size, database query cost and infrastructure.
