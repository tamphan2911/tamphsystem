DO $$
DECLARE
  target_task_id TEXT := '6e34ebb4-2f8d-49ab-8e98-e565054543ef';
  marker_entity_id TEXT := 'task-reset-assignees-6e34ebb4-2f8d-49ab-8e98-e565054543ef';
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ResearchTask"
    WHERE "id" = target_task_id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "ResearchChangeLog"
    WHERE "entityType" = 'maintenance'
      AND "entityId" = marker_entity_id
      AND "action" = 'Reset task assignees to in progress'
  ) THEN
    UPDATE "ResearchTaskAssignment"
    SET
      "finishedAt" = NULL,
      "completedAt" = NULL,
      "completedById" = NULL,
      "completionMessage" = NULL,
      "redoRequestedAt" = NULL,
      "redoRequestedById" = NULL,
      "redoReason" = NULL
    WHERE "taskId" = target_task_id;

    UPDATE "ResearchTask"
    SET
      "status" = 'IN_PROGRESS',
      "completedAt" = NULL,
      "completedById" = NULL,
      "completionMessage" = NULL,
      "redoRequestedAt" = NULL,
      "redoRequestedById" = NULL,
      "redoReason" = NULL,
      "revokedAt" = NULL,
      "revokedById" = NULL,
      "revokeReason" = NULL,
      "adminViewedAt" = NULL,
      "checkerReferralTargetIds" = ARRAY[]::TEXT[],
      "checkerReferralById" = NULL,
      "checkerReferralAction" = NULL,
      "checkerReferralAt" = NULL
    WHERE "id" = target_task_id;

    INSERT INTO "ResearchChangeLog" (
      "id",
      "entityType",
      "entityId",
      "area",
      "action",
      "detail",
      "actorId",
      "createdAt"
    )
    VALUES (
      'maintenance-reset-task-6e34ebb4-20260630',
      'maintenance',
      marker_entity_id,
      'Task',
      'Reset task assignees to in progress',
      'Reset all assignee ready/completion fields and task status to IN_PROGRESS for task 6e34ebb4-2f8d-49ab-8e98-e565054543ef.',
      (
        SELECT "createdById"
        FROM "ResearchTask"
        WHERE "id" = target_task_id
      ),
      CURRENT_TIMESTAMP
    );
  END IF;
END $$;
