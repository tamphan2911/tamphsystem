CREATE TABLE "OrganizedProjectProduct" (
    "id" TEXT NOT NULL,
    "organizedProjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "linkedResearchProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizedProjectProduct_pkey" PRIMARY KEY ("id")
);

INSERT INTO "OrganizedProjectProduct" (
    "id",
    "organizedProjectId",
    "title",
    "position",
    "completed",
    "linkedResearchProjectId",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    project."id",
    product."title",
    product."position" - 1,
    product."title" = ANY(project."completedProducts"),
    NULL,
    NOW(),
    NOW()
FROM "OrganizedProject" project
CROSS JOIN LATERAL unnest(project."requiredProducts") WITH ORDINALITY AS product("title", "position")
WHERE product."title" IS NOT NULL
  AND btrim(product."title") <> '';

CREATE INDEX "OrganizedProjectProduct_organizedProjectId_position_idx" ON "OrganizedProjectProduct"("organizedProjectId", "position");
CREATE INDEX "OrganizedProjectProduct_linkedResearchProjectId_idx" ON "OrganizedProjectProduct"("linkedResearchProjectId");

ALTER TABLE "OrganizedProjectProduct" ADD CONSTRAINT "OrganizedProjectProduct_organizedProjectId_fkey" FOREIGN KEY ("organizedProjectId") REFERENCES "OrganizedProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizedProjectProduct" ADD CONSTRAINT "OrganizedProjectProduct_linkedResearchProjectId_fkey" FOREIGN KEY ("linkedResearchProjectId") REFERENCES "ResearchProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
