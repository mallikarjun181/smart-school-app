# Smart School staged load test

Use a dedicated staging environment. Never run this against a production database.

## Single stage
`BASE_URL=http://127.0.0.1:5000 CONCURRENCY=100 REQUESTS_PER_WORKER=20 node load.mjs`

## Progressive 5K test
`BASE_URL=http://127.0.0.1:5000 RUN_ALL=true REQUESTS_PER_WORKER=10 node load.mjs`

Default stages are 100, 500, 1000, 2500 and 5000 concurrent workers. This is a load-test harness, not a guarantee that the application can safely serve 5,000 users. Record p95/p99 latency, error rate, CPU, memory, PostgreSQL connections/CPU, Redis latency and network throughput.
