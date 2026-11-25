# LittleLog / Cam Care

LittleLog is a standalone baby-care tracker served at `research.tamph.com/cam`.
It shares the Railway deployment and PostgreSQL connection with the main web
service, but it does not use Research Hub users, sessions, or domain models.

## Runtime configuration

- `CAM_SESSION_SECRET`: optional dedicated secret of at least 32 characters used
  to sign the `cam_family_session` cookie. When omitted, the existing
  `AUTH_SECRET` is used with a LittleLog-only session scope.

LittleLog has its own username/password login and no registration route. The
initial `traph` account is created by the Cam Care migration. Its password is
stored only as a bcrypt hash.

## Storage isolation

The Prisma models map only to these prefixed tables:

- `cam_care_state`
- `cam_care_event`
- `cam_care_user`

The `/api/cam/session` and `/api/cam/state` routes are the only server entry
points for this data. Deleted events are retained as tombstones so a stale
device cannot recreate an activity that another device deleted.

The browser keeps a local cache for offline use. When connectivity returns, the
cache synchronizes with Railway PostgreSQL and activity from other devices is
pulled automatically.

The care-day boundary, daytime start, and nighttime start can be edited in
Preferences. They default to 8:00 PM, 6:00 AM, and 8:00 PM respectively. Care
windows, timelines, charts, and report schedules use these synced settings.
