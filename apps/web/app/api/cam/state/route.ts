import { Prisma, prisma } from "@repo/db";
import { NextResponse } from "next/server";
import { hasCamSession } from "@/sites/cam/server/auth";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };
const defaultActiveSessions = { sleep: null, feed: null };
const defaultSettings = { dailyReport: true, weeklyReport: true };

type CamEventInput = {
  id: string;
  type: string;
  title: string;
  detail: string;
  timestamp: Date;
  data: Prisma.InputJsonValue;
};

function unauthorized() {
  return NextResponse.json(
    { error: "LittleLog sign-in is required." },
    { status: 401, headers: noStoreHeaders },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function shortString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.length <= maxLength ? value : null;
}

function parseEvent(value: unknown): CamEventInput | null {
  if (!isRecord(value)) return null;

  const id = shortString(value.id, 100);
  const type = shortString(value.type, 30);
  const title = shortString(value.title, 200);
  const detail = shortString(value.detail, 500);
  const timestampText = shortString(value.timestamp, 100);
  const timestamp = timestampText ? new Date(timestampText) : null;
  const data = isRecord(value.data) ? value.data : {};
  const allowedTypes = new Set(["feed", "diaper", "sleep", "note"]);

  if (
    !id ||
    !type ||
    !title ||
    !allowedTypes.has(type) ||
    detail === null ||
    !timestamp ||
    Number.isNaN(timestamp.getTime())
  ) {
    return null;
  }

  return {
    id,
    type,
    title,
    detail,
    timestamp,
    data: data as Prisma.InputJsonValue,
  };
}

function normalizeObject(value: unknown, fallback: Record<string, unknown>) {
  return (isRecord(value) ? value : fallback) as Prisma.InputJsonValue;
}

async function readState(userId: string) {
  const [storedState, liveEvents, deletedEvents] = await Promise.all([
    prisma.camCareState.findUnique({ where: { userId } }),
    prisma.camCareEvent.findMany({
      where: { userId, deletedAt: null },
      orderBy: { timestamp: "asc" },
    }),
    prisma.camCareEvent.findMany({
      where: { userId, deletedAt: { not: null } },
      select: { id: true },
    }),
  ]);

  return {
    events: liveEvents.map((event) => ({
      id: event.id,
      type: event.type,
      title: event.title,
      detail: event.detail,
      timestamp: event.timestamp.toISOString(),
      data: event.data,
    })),
    activeSessions: storedState?.activeSessions ?? defaultActiveSessions,
    settings: storedState?.settings ?? defaultSettings,
    revision: storedState?.revision ?? 0,
    deletedEventIds: deletedEvents.map((event) => event.id),
    updatedAt: storedState?.updatedAt.toISOString() ?? null,
  };
}

export async function GET() {
  const session = await hasCamSession();
  if (!session) return unauthorized();

  return NextResponse.json(await readState(session.userId), {
    headers: noStoreHeaders,
  });
}

export async function PUT(request: Request) {
  const session = await hasCamSession();
  if (!session) return unauthorized();

  const body = (await request.json().catch(() => null)) as unknown;
  if (!isRecord(body)) {
    return NextResponse.json(
      { error: "Invalid sync payload." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const rawEvents = Array.isArray(body.events) ? body.events : [];
  const rawDeletedIds = Array.isArray(body.deletedEventIds)
    ? body.deletedEventIds
    : [];
  if (rawEvents.length > 5000 || rawDeletedIds.length > 10000) {
    return NextResponse.json(
      { error: "The sync payload is too large." },
      { status: 413, headers: noStoreHeaders },
    );
  }

  const events = rawEvents.map(parseEvent);
  if (events.some((event) => event === null)) {
    return NextResponse.json(
      { error: "One or more activity records are invalid." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const deletedEventIds = [
    ...new Set(
      rawDeletedIds
        .map((id) => shortString(id, 100))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const activeSessions = normalizeObject(
    body.activeSessions,
    defaultActiveSessions,
  );
  const settings = normalizeObject(body.settings, defaultSettings);

  await prisma.$transaction(async (tx) => {
    for (const event of events as CamEventInput[]) {
      await tx.camCareEvent.upsert({
        where: {
          userId_id: { userId: session.userId, id: event.id },
        },
        create: { userId: session.userId, ...event },
        update: {
          type: event.type,
          title: event.title,
          detail: event.detail,
          timestamp: event.timestamp,
          data: event.data,
        },
      });
    }

    if (deletedEventIds.length) {
      await tx.camCareEvent.updateMany({
        where: {
          userId: session.userId,
          id: { in: deletedEventIds },
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
    }

    await tx.camCareState.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        activeSessions,
        settings,
        revision: 1,
      },
      update: {
        activeSessions,
        settings,
        revision: { increment: 1 },
      },
    });
  });

  return NextResponse.json(await readState(session.userId), {
    headers: noStoreHeaders,
  });
}
