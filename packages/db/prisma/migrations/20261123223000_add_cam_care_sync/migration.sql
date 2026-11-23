CREATE TABLE IF NOT EXISTS "cam_care_user" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "passwordHash" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cam_care_user_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cam_care_user_username_key" ON "cam_care_user"("username");

CREATE TABLE IF NOT EXISTS "cam_care_state" (
    "userId" TEXT NOT NULL,
    "activeSessions" JSONB NOT NULL,
    "settings" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cam_care_state_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "cam_care_state_userId_fkey" FOREIGN KEY ("userId") REFERENCES "cam_care_user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "cam_care_event" (
    "userId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cam_care_event_pkey" PRIMARY KEY ("userId", "id"),
    CONSTRAINT "cam_care_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "cam_care_user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "cam_care_event_userId_timestamp_idx" ON "cam_care_event"("userId", "timestamp");
CREATE INDEX IF NOT EXISTS "cam_care_event_userId_deletedAt_idx" ON "cam_care_event"("userId", "deletedAt");

INSERT INTO "cam_care_user" (
    "id",
    "username",
    "displayName",
    "avatarUrl",
    "passwordHash",
    "createdAt",
    "updatedAt"
) VALUES (
    '9a4a9fc6-9ec2-4dd0-9f45-3eca809bb189',
    'traph',
    'Phan Hoa Trà',
    '/cam-app/house_cam.jpg',
    '$2b$12$glAfJAYlg9kZDAxG76vSN.8Fu8qRpjn0DgjeIbDYDXX/TjcYcYmDi',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("username") DO NOTHING;
