# LittleLog / Cam Care

LittleLog is a standalone baby-care tracker served at `research.tamph.com/cam`.
It shares the Railway deployment and PostgreSQL connection with the main web
service, but it does not use Research Hub users, sessions, or domain models.

## Runtime configuration

- `CAM_FAMILY_ACCESS_CODE`: private code entered on each approved device.
- `CAM_SESSION_SECRET`: random secret of at least 32 characters used to sign the
  dedicated `cam_family_session` cookie.

## Storage isolation

The Prisma models map only to these prefixed tables:

- `cam_care_state`
- `cam_care_event`

The `/api/cam/session` and `/api/cam/state` routes are the only server entry
points for this data. Deleted events are retained as tombstones so a stale
device cannot recreate an activity that another device deleted.

The browser keeps a local cache for offline use. When connectivity returns, the
cache synchronizes with Railway PostgreSQL and activity from other devices is
pulled automatically.
