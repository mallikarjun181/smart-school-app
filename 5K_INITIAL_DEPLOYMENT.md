# Smart School — Initial 5K-user deployment baseline

This release is configured as a **5K-user-ready starting architecture**, not a certification that 5,000 users will always be served successfully under every workload.

## Application changes
- API rate limit increased from 300 to 3,000 requests per 15 minutes per authenticated user/IP key.
- Authenticated requests are rate-limited by verified JWT subject when available, avoiding one shared IP bucket for all users behind a school NAT.
- Health/readiness endpoints are available before the general API limiter so load balancers can probe them reliably.
- Authentication attempts remain separately protected at 30 attempts per 15 minutes per IP+identity key.
- Uploads are separately limited to 60 per 15 minutes per authenticated user/IP key.
- Node HTTP keep-alive/request timeout settings are tuned for sustained concurrent connections.
- Production Compose supports four app replicas; standard Docker Compose can start them with `docker compose -f docker-compose.production.yml up -d --scale app=4`.
- Shared Redis is used for distributed rate limiting in the production Compose environment.
- PostgreSQL pool baseline is 30 connections per app instance; size the managed PostgreSQL service accordingly.

## Staging test
Use `docker-compose.5k.yml` only with test data. Set a real random JWT secret before starting it.

1. Start the stack:
   `docker compose -f docker-compose.5k.yml up -d --build --scale app=4`
2. Verify:
   `curl http://127.0.0.1:8080/api/health`
3. Install backend dependencies if needed:
   `npm --prefix backend install`
4. Run the staged load test against the dedicated staging stack:
   `BASE_URL=http://127.0.0.1:8080 RUN_ALL=true REQUESTS_PER_WORKER=10 node load-test/load.mjs`

The staged test increases through 100, 500, 1,000, 2,500 and 5,000 concurrent workers and stops at the first stage with request failures.

## Production requirement
For a real public launch, use a managed PostgreSQL database with backups/PITR and connection pooling, managed Redis, HTTPS load balancing/WAF/CDN, object storage for uploads, monitoring/alerts, and a reviewed migration process. Do not run the included local/staging PostgreSQL as the public production database.

A capacity number is only considered **verified** after the 5K test passes with acceptable p95/p99 latency, error rate, CPU, memory, PostgreSQL connection/CPU and Redis metrics on the actual deployment class.
