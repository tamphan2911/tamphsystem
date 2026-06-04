# Site Code Organization

This folder separates reusable code by site ownership.

- `shared/`: components and helpers used by more than one site or global auth/root pages.
- `research/`: reusable Research Hub components and utilities.
- `learn/`: reusable LMS/Learn components and utilities.

Next.js route files stay under `app/` because routing depends on that folder. Route files should import reusable code from `@/sites/...` instead of reaching into another subdomain route folder.

When adding a new subdomain, create a sibling folder here, for example `sites/admin` or `sites/new-domain`, and keep cross-site code in `sites/shared`.
