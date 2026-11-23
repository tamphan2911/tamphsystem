CREATE TABLE "cam_care_state" (
    "id" TEXT NOT NULL DEFAULT 'cam',
    "activeSessions" JSONB NOT NULL,
    "settings" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cam_care_state_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cam_care_event" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cam_care_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cam_care_event_timestamp_idx" ON "cam_care_event"("timestamp");
CREATE INDEX "cam_care_event_deletedAt_idx" ON "cam_care_event"("deletedAt");
