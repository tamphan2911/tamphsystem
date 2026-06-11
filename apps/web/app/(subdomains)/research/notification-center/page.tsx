import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import { auth } from "../../../../auth";
import {
  NotificationsCenter,
  type NotificationCenterItem,
} from "../notifications/NotificationsCenter";

export const dynamic = "force-dynamic";

function notificationTypeLabel(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function PersonalNotificationCenterPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeSites: true },
  });
  if (!currentUser?.activeSites.includes("research")) redirect("/401");

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
