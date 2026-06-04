import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const demoResearchTitles = [
  "AI-Assisted Literature Mapping for FinTech Research",
  "Banking Risk Disclosure Quality in Emerging Markets",
  "Digital Learning Analytics for Research Skill Development",
  "Corporate Green Innovation and Capital Market Response",
  "Reference Quality and Citation Behavior in Applied Research",
  "AI Feedback Loops in Academic Writing Workflows",
  "Journal Selection Signals for Interdisciplinary Manuscripts",
  "Research Task Assignment Efficiency in Submission Pipelines",
  "Conference-to-Journal Publication Pathways in Education Technology",
];

const demoOrganizedProjectTitles = [
  "Digital Teaching Innovation Grant",
  "Sustainable Finance Research Program",
  "AI for Academic Productivity Initiative",
  "Regional Business Data Partnership",
  "Conference Research Output Track",
];

const demoFunderNames = [
  "University of Economics Ho Chi Minh City",
  "Green Growth Research Institute",
  "Tam Pham Research Lab",
  "Mekong Business School",
  "International Digital Pedagogy Association",
];

function ids(rows) {
  return rows.map((row) => row.id);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("[research-demo-cleanup] DATABASE_URL is not set; skipping.");
    return;
  }

  const [researchProjects, organizedProjects, journals, conferences, funders] =
    await Promise.all([
      prisma.researchProject.findMany({
        where: { title: { in: demoResearchTitles } },
        select: { id: true },
      }),
      prisma.organizedProject.findMany({
        where: { title: { in: demoOrganizedProjectTitles } },
        select: { id: true },
      }),
      prisma.journal.findMany({
        where: { name: { startsWith: "Demo Research Journal" } },
        select: { id: true },
      }),
      prisma.conference.findMany({
        where: { name: { startsWith: "Demo " } },
        select: { id: true },
      }),
      prisma.fundingInstitution.findMany({
        where: {
          OR: [
            { name: { in: demoFunderNames } },
            { note: { startsWith: "Demo " } },
          ],
        },
        select: { id: true },
      }),
    ]);

  const researchIds = ids(researchProjects);
  const organizedProjectIds = ids(organizedProjects);
  const journalIds = ids(journals);
  const conferenceIds = ids(conferences);
  const funderIds = ids(funders);

  if (
    researchIds.length === 0 &&
    organizedProjectIds.length === 0 &&
    journalIds.length === 0 &&
    conferenceIds.length === 0 &&
    funderIds.length === 0
  ) {
    console.log("[research-demo-cleanup] No demo records found.");
    return;
  }

  const taskWhere = [
    researchIds.length ? { projectId: { in: researchIds } } : undefined,
    organizedProjectIds.length
      ? { organizedProjectId: { in: organizedProjectIds } }
      : undefined,
    journalIds.length ? { journalId: { in: journalIds } } : undefined,
    conferenceIds.length ? { conferenceId: { in: conferenceIds } } : undefined,
  ].filter(Boolean);

  await prisma.$transaction(async (tx) => {
    const taskIds = taskWhere.length
      ? await tx.researchTask.findMany({
          where: { OR: taskWhere },
          select: { id: true },
        })
      : [];
    const taskIdList = ids(taskIds);

    await tx.researchNotification.deleteMany({
      where: {
        OR: [
          researchIds.length
            ? { entityType: "research", entityId: { in: researchIds } }
            : undefined,
          organizedProjectIds.length
            ? {
                entityType: "organizedProject",
                entityId: { in: organizedProjectIds },
              }
            : undefined,
          taskIdList.length
            ? { entityType: "task", entityId: { in: taskIdList } }
            : undefined,
        ].filter(Boolean),
      },
    });

    if (taskIdList.length) {
      await tx.researchTask.deleteMany({ where: { id: { in: taskIdList } } });
    }
    if (organizedProjectIds.length) {
      await tx.organizedProject.deleteMany({
        where: { id: { in: organizedProjectIds } },
      });
    }
    if (researchIds.length) {
      await tx.researchProject.deleteMany({
        where: { id: { in: researchIds } },
      });
    }
    if (journalIds.length) {
      await tx.journal.deleteMany({ where: { id: { in: journalIds } } });
    }
    if (conferenceIds.length) {
      await tx.conference.deleteMany({
        where: { id: { in: conferenceIds } },
      });
    }
    if (funderIds.length) {
      await tx.fundingInstitution.deleteMany({
        where: { id: { in: funderIds } },
      });
    }
  });

  console.log(
    `[research-demo-cleanup] Removed demo records: research=${researchIds.length}, projects=${organizedProjectIds.length}, journals=${journalIds.length}, conferences=${conferenceIds.length}, funders=${funderIds.length}.`,
  );
}

main()
  .catch((error) => {
    console.error("[research-demo-cleanup] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
