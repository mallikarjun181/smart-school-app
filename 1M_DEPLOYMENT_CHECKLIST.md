# 1M launch checklist

- [ ] Managed PostgreSQL HA + backups + PITR configured
- [ ] Connection pooler configured; per-pod pool sized against DB max connections
- [ ] Managed Redis/cluster configured
- [ ] CDN/WAF + HTTPS load balancer configured
- [ ] Object storage configured for durable uploads
- [ ] 8+ API replicas deployed with HPA
- [ ] Centralized logs, metrics, traces and alerts enabled
- [ ] Secrets stored in a secret manager; no real credentials in Git/ZIP
- [ ] Prisma migrations reviewed and tested on a restored backup
- [ ] Staging load test passed at the intended SLOs
- [ ] Backup restore drill completed
- [ ] Rate limits tuned using real traffic measurements
- [ ] Error budget/SLOs defined (availability, p95/p99 latency, error rate)
- [ ] Incident rollback procedure tested
