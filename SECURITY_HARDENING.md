# Smart School Security Hardening

## Application security
- JWT secret is mandatory; production requires a non-placeholder 64+ character secret.
- JWTs use issuer/audience validation and 2-hour expiry.
- Login, password-reset and upload endpoints are rate limited.
- All `/api` traffic has a general rate limit.
- CORS uses an explicit `FRONTEND_URL` allow-list.
- Helmet security headers are enabled; HSTS is enabled in production.
- `x-powered-by` is disabled.
- Request bodies are limited to 1 MB and uploads to 10 MB.
- Passwords require 10+ characters with upper/lowercase, number and special character.
- Password changes invalidate outstanding reset tokens.
- Password reset tokens are random, hashed in the database, expire after 30 minutes and are single-use.
- Reset responses do not reveal whether an email account exists.
- Upload filenames are random UUIDs; original filenames are never used as filesystem paths.
- Upload MIME type, extension and common file signatures are checked.

## Authorization
- Generic CRUD endpoints enforce role-based write permissions.
- Parent reads are restricted to their mapped children where applicable.
- Class-teacher reads/writes are restricted to the assigned class.
- Direct student access checks are enforced in the backend.
- Private files require authentication and authorization.
- Parent private-file access is limited to files associated with mapped children.
- Class-teacher private-file access is limited to files associated with students in the assigned class.
- Owners and School Admins can access all files.
- Global compatibility state can only be written by Owner/School Admin.

## File security
New uploads default to `PRIVATE` and are recorded in the `FileAsset` table.
- `PUBLIC` files are served only when explicitly marked public by Owner/School Admin.
- Private files use `GET /api/files/:id` and authorization checks.
- Files are stored outside the frontend directory.
- Path traversal is prevented by using generated filenames and `path.basename`.

## Database/network security
- Included Docker Compose publishes PostgreSQL only on `127.0.0.1:5432`.
- Production should use managed PostgreSQL or a private database network, encrypted connections, backups and least-privilege credentials.
- Production migrations should use `prisma migrate deploy`, not `prisma db push`.

## HTTPS
- Production requires HTTPS URLs for `FRONTEND_URL` and `APP_BASE_URL`.
- Node can terminate TLS directly with `HTTPS_KEY_PATH` and `HTTPS_CERT_PATH`.
- Recommended: terminate TLS at a trusted reverse proxy/load balancer and set `TRUST_PROXY=true` only when that proxy is the trusted immediate proxy.

## Production checklist
1. Set `NODE_ENV=production`.
2. Generate a new 64+ character random `JWT_SECRET`.
3. Set exact HTTPS `FRONTEND_URL` and `APP_BASE_URL`.
4. Configure SMTP using an App Password/API credential.
5. Use HTTPS at the reverse proxy or Node.
6. Keep PostgreSQL private.
7. Use production database backups and restricted credentials.
8. Keep `.env` out of Git and deployment artifacts.
9. Run `npm test` and `npm run prisma:validate` before release.
10. Test Parent A -> Student B returns 403.
11. Test Class Teacher 8-A -> Student 8-B returns 403.
12. Test private payment proof access without authorization returns 401/403.
13. Test reset-token expiry and one-time use.
14. Verify API errors do not expose stack traces, SQL, password hashes or reset tokens.
