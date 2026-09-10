# Security Release

This release is the production-security follow-up to the Smart School full-stack project.

Verified in the build environment:
- Node syntax check: PASS
- Security regression tests: 5/5 PASS
- Docker PostgreSQL binding is localhost-only
- Private-file authorization route is present
- Direct HTTPS TLS configuration is present
- Production HTTPS URL checks are present
- Setup generates a fresh JWT secret when `.env` is first created

The release intentionally does not contain `backend/.env`. Run `npm run setup` to create a local `.env` from `.env.example` with a fresh JWT secret.
