import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { auth } from "../../../../auth";

function notificationTypeLabel(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function GET(request: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeSites: true },
  });
  if (!user?.activeSites.includes("research")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") ?? "all";
  const where = {
    userId,
    ...(scope === "unread" ? { readAt: null } : {}),
  };

  const [notifications, unreadCount] = await Promise.all([
    prisma.researchNotification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: scope === "unread" ? 30 : 200,
    }),
    prisma.researchNotification.count({ where: { userId, readAt: null } }),
  ]);

  return NextResponse.json({
    unreadCount,
    notifications: notifications.map((notification) => ({
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
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    notificationId?: string;
    markAll?: boolean;
  };

  if (body.markAll) {
    await prisma.researchNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (!body.notificationId) {
    return NextResponse.json(
      { error: "Missing notification id" },
      { status: 400 },
    );
  }

  await prisma.researchNotification.updateMany({
    where: { id: body.notificationId, userId },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
