import { researchDateTimeFormat } from "@/sites/research/lib/date-time";
import { redirect } from "next/navigation";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import {
  NotificationsCenter,
  type NotificationCenterItem,
} from "./NotificationsCenter";
import {
  NotificationsTable,
  type NotificationManagementRow,
} from "./NotificationsTable";
import { deleteResearchNotification } from "../actions";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import {
  researchNotificationEmailSent,
  researchNotificationTypeLabel,
} from "@/sites/research/lib/notifications";
import { deleteExpiredResearchNotifications } from "./retention";

export const dynamic = "force-dynamic";

function shortDate(value: Date | null) {
  if (!value) return "";
  return researchDateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(value);
}

export default async function ResearchNotificationsPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];

  if (!userId) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeSites: true },
  });
  if (!currentUser?.activeSites.includes("research")) redirect("/401");

  await deleteExpiredResearchNotifications();

  if (roles.includes(Role.ADMIN) || roles.includes(Role.CHIEF_ASSISTANT)) {
    const notifications = await prisma.researchNotification.findMany({
      include: {
        user: {
          select: { name: true, email: true, roles: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 1000,
    });

    const taskIds = Array.from(
      new Set(
        notifications
          .filter(
            (notification) =>
              notification.entityType === "task" && notification.entityId,
          )
          .map((notification) => notification.entityId as string),
      ),
    );
    const proposalIds = Array.from(
      new Set(
        notifications
          .filter(
            (notification) =>
              notification.entityType === "proposal" && notification.entityId,
          )
          .map((notification) => notification.entityId as string),
      ),
    );
    const [tasks, proposals] = await Promise.all([
      taskIds.length > 0
        ? prisma.researchTask.findMany({
            where: { id: { in: taskIds } },
            select: {
              id: true,
              createdById: true,
              assignments: { select: { userId: true } },
            },
          })
        : [],
      proposalIds.length > 0
        ? prisma.proposal.findMany({
            where: { id: { in: proposalIds } },
            select: {
              id: true,
              submittedById: true,
              task: {
                select: {
                  createdById: true,
                  assignments: { select: { userId: true } },
                },
              },
            },
          })
        : [],
    ]);
    const taskById = new Map(
      tasks.map((task) => [
        task.id,
        {
          createdById: task.createdById,
          assignmentUserIds: task.assignments.map(
            (assignment) => assignment.userId,
          ),
        },
      ]),
    );
    const proposalById = new Map(
      proposals.map((proposal) => [
        proposal.id,
        {
          submittedById: proposal.submittedById,
          task: proposal.task
            ? {
                createdById: proposal.task.createdById,
                assignmentUserIds: proposal.task.assignments.map(
                  (assignment) => assignment.userId,
                ),
              }
            : null,
        },
      ]),
    );
    const rows: NotificationManagementRow[] = notifications.map(
      (notification) => {
        const task =
          notification.entityType === "task" && notification.entityId
            ? taskById.get(notification.entityId)
            : null;
        const proposal =
          notification.entityType === "proposal" && notification.entityId
            ? proposalById.get(notification.entityId)
            : null;

        return {
          id: notification.id,
          type: notification.type,
          typeLabel: researchNotificationTypeLabel(notification.type),
          title: notification.title,
          summary: notification.summary,
          body: notification.body ?? "",
          href: notification.href ?? "",
          entityType: notification.entityType ?? "",
          entityId: notification.entityId ?? "",
          emailSent: researchNotificationEmailSent({
            type: notification.type,
            title: notification.title,
            recipientId: notification.userId,
            task: task ?? proposal?.task,
            proposal,
          }),
          recipientName: displayResearchPersonName(notification.user),
          recipientEmail: displayResearchEmail(notification.user.email),
          recipientRoles: notification.user.roles.join(", "),
          readAt: shortDate(notification.readAt),
          createdAt: shortDate(notification.createdAt),
          createdAtSort: notification.createdAt.getTime(),
        };
      },
    );
    const unreadCount = rows.filter((row) => !row.readAt).length;
    const readCount = rows.length - unreadCount;
    const userCount = new Set(rows.map((row) => row.recipientEmail)).size;
    const stats = [
      {
        label: "Notifications",
        value: rows.length,
      },
      {
        label: "Unread",
        value: unreadCount,
      },
      {
        label: "Read",
        value: readCount,
      },
      {
        label: "Users",
        value: userCount,
      },
    ];

    return (
      <div className="mx-auto max-w-7xl space-y-4">
        <ResearchPageHeaderPortal>
          <div className="grid min-w-0 border border-[#444444] bg-[#2C2C2C] sm:grid-cols-4">
            {stats.map((item, index) => (
              <div
                key={item.label}
                className={`whitespace-nowrap px-3 py-2 text-sm text-[#E4E4E4] ${
                  index > 0 ? "border-l border-[#444444]" : ""
                }`}
              >
                <span className="font-normal text-[#B0B0B0]">
                  {item.label}:{" "}
                </span>
                <span className="font-normal text-[#E4E4E4]">{item.value}</span>
              </div>
            ))}
          </div>
        </ResearchPageHeaderPortal>

        <NotificationsTable
          rows={rows.sort((a, b) => b.createdAtSort - a.createdAtSort)}
          deleteNotificationAction={deleteResearchNotification}
        />
      </div>
    );
  }

  const notifications = await prisma.researchNotification.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
    take: 300,
  });

  const rows: NotificationCenterItem[] = notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    typeLabel: researchNotificationTypeLabel(notification.type),
    title: notification.title,
    summary: notification.summary,
    body: notification.body ?? "",
    href: notification.href ?? "",
    entityType: notification.entityType ?? "",
    entityId: notification.entityId ?? "",
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-7xl flex-col overflow-hidden">
      <NotificationsCenter initialNotifications={rows} />
    </div>
  );
}
