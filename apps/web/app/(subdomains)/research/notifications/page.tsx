import { redirect } from "next/navigation";
import { BellRing, Mail, MailOpen, UsersRound } from "lucide-react";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import {
  NotificationsCenter,
  type NotificationCenterItem,
} from "./NotificationsCenter";
import {
  NotificationsTable,
  type NotificationManagementRow,
} from "./NotificationsTable";

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
  return new Intl.DateTimeFormat("en-GB", {
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

  if (roles.includes(Role.ADMIN)) {
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
        recipientName: notification.user.name ?? "",
        recipientEmail: notification.user.email,
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
        icon: BellRing,
        color: "text-blue-600",
      },
      {
        label: "Unread",
        value: unreadCount,
        icon: Mail,
        color: "text-rose-600",
      },
      {
        label: "Read",
        value: readCount,
        icon: MailOpen,
        color: "text-emerald-600",
      },
      {
        label: "Users",
        value: userCount,
        icon: UsersRound,
        color: "text-violet-600",
      },
    ];

    return (
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:flex-wrap">
          {stats.map((item) => (
            <div
              key={item.label}
              className="flex min-w-32 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {item.label}
                </p>
                <p className="text-base font-black text-slate-950 dark:text-white">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <NotificationsTable
          rows={rows.sort((a, b) => b.createdAtSort - a.createdAtSort)}
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
