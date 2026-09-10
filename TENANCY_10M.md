# Multi-school tenancy foundation

The application now assigns every authenticated user to a `schoolId` and adds a school tenant key to school-owned records. API reads, writes, parent-child lookups, class-teacher lookups, school information/settings/state, and protected files are scoped to the authenticated user's school.

## Isolation rules
- Never trust a client-supplied `schoolId`; the API overwrites it with the authenticated user's tenant.
- Every school-owned query must include `schoolId`.
- Parent access is additionally restricted to linked students.
- Class-teacher access is additionally restricted to the assigned class.
- Private files are tenant-scoped before authorization is evaluated.
- Cross-tenant tests must be part of every release.

## Scaling note
The current UI is still a single-page compatibility frontend. Tenant-aware backend infrastructure is in place, but a true multi-school control plane (create school, invite admin, choose tenant, billing, domain mapping) should be added before onboarding many schools.
