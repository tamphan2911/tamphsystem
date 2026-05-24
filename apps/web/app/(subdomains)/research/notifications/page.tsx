import { redirect } from "next/navigation";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import {
  NotificationsCenter,
  type NotificationCenterItem,
} from "./NotificationsCenter";

export const dynamic = "force-dynamic";

function notificationTypeLabel(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function ResearchNotificationsPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];

  if (!userId) redirect("/login");

  const canUseResearch =
    roles.includes(Role.ADMIN) ||
    roles.includes(Role.ASSISTANT) ||
    roles.includes(Role.CHIEF_ASSISTANT) ||
    roles.includes(Role.RESEARCHER) ||
    roles.includes(Role.LECTURER);

  if (!canUseResearch) redirect("/401");

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
