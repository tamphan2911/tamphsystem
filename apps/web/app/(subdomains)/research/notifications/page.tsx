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
import { deleteExpiredResearchNotifications } from "./retention";

export const dynamic = "force-dynamic";

function notificationTypeLabel(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

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
    const rows: NotificationManagementRow[] = notifications.map(
      (notification) => ({
        id: notification.id,
        type: notification.type,
        typeLabel: notificationTypeLabel(notification.type),
        title: notification.title,
        summary: notification.summary,
        body: notification.body ?? "",
        href: notification.href ?? "",
        entityType: notification.entityType ?? "",
        entityId: notification.entityId ?? "",
        recipientName: displayResearchPersonName(notification.user),
        recipientEmail: displayResearchEmail(notification.user.email),
        recipientRoles: notification.user.roles.join(", "),
        readAt: shortDate(notification.readAt),
        createdAt: shortDate(notification.createdAt),
        createdAtSort: notification.createdAt.getTime(),
      }),
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
    typeLabel: notificationTypeLabel(notification.type),
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
