import { redirect } from "next/navigation";
import {
  prisma,
  JournalApprovalStatus,
  ResearchTaskStatus,
  Role,
} from "@repo/db";
import { auth } from "../../../../auth";
import { deleteResearchTask } from "../actions";
import {
  NewTaskDialog,
  type TaskAssigneeOption,
  type TaskAccountOption,
  type TaskOrganizedProjectOption,
  type TaskResearchOption,
  type TaskReviewOption,
  type TaskSubmissionOption,
  type TaskVenueOption,
} from "./NewTaskDialog";
import { TasksClient } from "./TasksClient";
import { displayResearchEmail } from "@/sites/research/lib/display";
import { accessibleResearchReviewWhere } from "@/sites/research/lib/reviewAccess";

export const dynamic = "force-dynamic";

export default async function ResearchTasksPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) redirect("/login");
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });
  const roles =
    currentUser?.roles ??
    (((session?.user as { roles?: Role[] } | undefined)?.roles ??
      []) as Role[]);

  const isRootAdmin = roles.includes(Role.ADMIN);
  const isChiefAssistant = roles.includes(Role.CHIEF_ASSISTANT);
  const canManageTasks = isRootAdmin || isChiefAssistant;
  const assigneeWhere = isRootAdmin
    ? { activeSites: { has: "research" } }
    : {
        activeSites: { has: "research" },
        roles: { has: Role.ASSISTANT },
        NOT: { id: userId },
      };
  const scopedResearchWhere = isRootAdmin
    ? {}
    : {
        OR: [
          { leadResearcherId: userId },
          { authors: { some: { id: userId } } },
          { authorEntries: { some: { userId } } },
          { registrationUserId: userId },
          {
            organizedProjectLinks: {
              some: {
                organizedProject: {
                  OR: [
                    { createdById: userId },
                    { members: { some: { userId } } },
                  ],
                },
              },
            },
          },
        ],
      };
  const scopedOrganizedProjectWhere = isRootAdmin
    ? {}
    : {
        OR: [{ createdById: userId }, { members: { some: { userId } } }],
      };
  await prisma.researchTask.updateMany({
    where: { status: ResearchTaskStatus.OPEN },
    data: { status: ResearchTaskStatus.IN_PROGRESS },
  });

  const [
    assigneeUsers,
    projects,
    journals,
    accounts,
    conferences,
    reviews,
    organizedProjects,
    checkerUsers,
  ] = canManageTasks
    ? await Promise.all([
        prisma.user.findMany({
          where: assigneeWhere,
          orderBy: [{ name: "asc" }, { email: "asc" }],
          select: { id: true, name: true, email: true, roles: true },
        }),
        prisma.researchProject.findMany({
          where: scopedResearchWhere,
          orderBy: [{ updatedAt: "desc" }],
          select: { id: true, researchCode: true, title: true, stage: true },
        }),
        prisma.journal.findMany({
          where: { approvalStatus: JournalApprovalStatus.APPROVED },
          orderBy: [{ name: "asc" }],
          select: {
            id: true,
            name: true,
            publisher: true,
            publisherId: true,
            rank: true,
            issn: true,
          },
        }),
        prisma.publisherAccount.findMany({
          where: {
            OR: [{ journalId: { not: null } }, { publisherId: { not: null } }],
          },
          orderBy: [{ updatedAt: "desc" }, { username: "asc" }],
          select: {
            id: true,
            journalId: true,
            publisherId: true,
            username: true,
            email: true,
          },
        }),
        prisma.conference.findMany({
          orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            organizer: true,
            type: true,
            location: true,
          },
        }),
        prisma.academicReview.findMany({
          where: accessibleResearchReviewWhere(roles, userId),
          orderBy: [{ updatedAt: "desc" }, { requestedAt: "desc" }],
          include: { journal: { select: { name: true, publisher: true } } },
        }),
        prisma.organizedProject.findMany({
          where: scopedOrganizedProjectWhere,
          orderBy: [{ updatedAt: "desc" }],
          select: { id: true, title: true, referenceCode: true, status: true },
        }),
        prisma.user.findMany({
          where: {
            activeSites: { has: "research" },
            roles: { has: Role.CHIEF_ASSISTANT },
          },
          orderBy: [{ name: "asc" }, { email: "asc" }],
          select: { id: true, name: true, email: true, roles: true },
        }),
      ])
    : [[], [], [], [], [], [], [], []];

  const assignees: TaskAssigneeOption[] = assigneeUsers.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: displayResearchEmail(user.email),
    roles: user.roles,
  }));
  const checkerOptions: TaskAssigneeOption[] = checkerUsers.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: displayResearchEmail(user.email),
    roles: user.roles,
  }));
  const researchOptions: TaskResearchOption[] = projects.map((project) => ({
    id: project.id,
    title: project.title,
    code: project.researchCode ?? "",
    stage: project.stage,
  }));
  const venueOptions: TaskVenueOption[] = [
    ...journals.map((journal) => ({
      kind: "journal" as const,
      id: journal.id,
      name: journal.name,
      meta: [journal.publisher, journal.rank, journal.issn]
        .filter(Boolean)
        .join(" - "),
    })),
    ...conferences.map((conference) => ({
      kind: "conference" as const,
      id: conference.id,
      name: conference.name,
      meta: [conference.organizer, conference.type, conference.location]
        .filter(Boolean)
        .join(" - "),
    })),
  ];
  const accountOptions: TaskAccountOption[] = accounts.flatMap((account) =>
    account.journalId
      ? [
          {
            id: account.id,
            journalId: account.journalId,
            username: account.username,
            email: account.email ?? "",
          },
        ]
      : journals
          .filter((journal) => journal.publisherId === account.publisherId)
          .map((journal) => ({
            id: account.id,
            journalId: journal.id,
            username: account.username,
            email: account.email ?? "",
          })),
  );
  const reviewOptions: TaskReviewOption[] = reviews.map((review) => ({
    id: review.id,
    title: review.manuscriptTitle,
    journal: review.journal.name,
    status: review.status,
  }));
  const organizedProjectOptions: TaskOrganizedProjectOption[] =
    organizedProjects.map((project) => ({
      id: project.id,
      title: project.title,
      code: project.referenceCode ?? "",
      status: project.status,
    }));
  const projectIds = projects.map((project) => project.id);
  const [journalSubmissions, conferenceSubmissions] =
    canManageTasks && projectIds.length > 0
      ? await Promise.all([
          prisma.researchSubmission.findMany({
            where: { researchProjectId: { in: projectIds } },
            orderBy: [{ updatedAt: "desc" }],
            include: {
              project: { select: { title: true } },
              journal: { select: { name: true } },
            },
          }),
          prisma.conferenceSubmission.findMany({
            where: { researchProjectId: { in: projectIds } },
            orderBy: [{ updatedAt: "desc" }],
            include: {
              project: { select: { title: true } },
              conference: { select: { name: true } },
            },
          }),
        ])
      : [[], []];
  const submissionOptions: TaskSubmissionOption[] = [
    ...journalSubmissions.map((submission) => ({
      id: submission.id,
      kind: "journal" as const,
      researchId: submission.researchProjectId,
      venueId: submission.journalId,
      code:
        submission.submissionCode ?? submission.id.slice(0, 6).toUpperCase(),
      researchTitle: submission.project.title,
      venueName: submission.journal.name,
      status: submission.status,
    })),
    ...conferenceSubmissions.map((submission) => ({
      id: submission.id,
      kind: "conference" as const,
      researchId: submission.researchProjectId,
      venueId: submission.conferenceId,
      code:
        submission.submissionCode ?? submission.id.slice(0, 6).toUpperCase(),
      researchTitle: submission.project.title,
      venueName: submission.conference.name,
      status: submission.status,
    })),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <TasksClient
        isAdmin={canManageTasks}
        canDelete={isRootAdmin}
        deleteAction={deleteResearchTask}
        action={
          canManageTasks ? (
            <NewTaskDialog
              assignees={assignees}
              researchOptions={researchOptions}
              venueOptions={venueOptions}
              accountOptions={accountOptions}
              reviewOptions={reviewOptions}
              organizedProjectOptions={organizedProjectOptions}
              submissionOptions={submissionOptions}
              checkerOptions={checkerOptions}
              canChooseChecker={isRootAdmin}
            />
          ) : null
        }
      />
    </div>
  );
}
