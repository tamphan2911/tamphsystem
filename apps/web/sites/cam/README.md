# LittleLog / Cam Care

LittleLog is a standalone baby-care tracker served at `research.tamph.com/cam`.
It shares the Railway deployment and PostgreSQL connection with the main web
service, but it does not use Research Hub users, sessions, or domain models.

## Runtime configuration

- `CAM_SESSION_SECRET`: optional dedicated secret of at least 32 characters used
  to sign the `cam_family_session` cookie. When omitted, the existing
  `AUTH_SECRET` is used with a LittleLog-only session scope.
- `OPENAI_API_KEY`: enables GPT interpretations in daily and weekly reports.
  When it is unavailable, the report says so instead of presenting a generated
  clinical judgment.
- `OPENAI_CAM_MODEL`: optional Responses API model for those interpretations;
  defaults to `gpt-6.2-astra`.

LittleLog has its own username/password login and no registration route. The
initial `traph` account is created by the Cam Care migration. Its password is
stored only as a bcrypt hash.
The observer family code has its own bcrypt hash and creates a signed,
read-only session for the same family records. The state write endpoint rejects
observer sessions, and report reads do not generate new AI results for them.

## Storage isolation

The Prisma models map only to these prefixed tables:

- `cam_care_state`
- `cam_care_event`
- `cam_care_user`

The `/api/cam/session`, `/api/cam/state`, and insight routes are the server
entry points for this data. Deleted events are retained as tombstones so a
stale device cannot recreate an activity that another device deleted.

The browser keeps a local cache for offline use. When connectivity returns, the
cache synchronizes with Railway PostgreSQL and activity from other devices is
pulled automatically.

The time zone, care-day boundary, daytime start, nighttime start, and daily and
weekly report times can be edited in Preferences. The time zone defaults to
`Asia/Ho_Chi_Minh`; the clocks default to 8:00 PM, 6:00 AM, 8:00 PM, 8:00 PM,
and 8:00 PM respectively. Care windows, timelines, charts, and report schedules
use these synced settings. Growth measurements and health notes use the same
family event store and appear in a separate Statistics section.
