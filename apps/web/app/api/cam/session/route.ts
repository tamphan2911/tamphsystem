import bcrypt from "bcrypt";
import { prisma } from "@repo/db";
import { NextRequest, NextResponse } from "next/server";
import {
  camAuthIsConfigured,
  clearCamSession,
  createCamSession,
  hasCamSession,
} from "@/sites/cam/server/auth";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const DUMMY_PASSWORD_HASH =
  "$2b$12$glAfJAYlg9kZDAxG76vSN.8Fu8qRpjn0DgjeIbDYDXX/TjcYcYmDi";

type AttemptRecord = { count: number; resetAt: number };
const globalForCamAccess = globalThis as unknown as {
  camAccessAttempts?: Map<string, AttemptRecord>;
};
const camAccessAttempts =
  globalForCamAccess.camAccessAttempts ?? new Map<string, AttemptRecord>();
globalForCamAccess.camAccessAttempts = camAccessAttempts;

function clientKey(request: NextRequest) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function activeAttemptRecord(key: string) {
  const current = camAccessAttempts.get(key);
  if (!current || current.resetAt <= Date.now()) {
    camAccessAttempts.delete(key);
    return null;
  }
  return current;
}

export async function GET() {
  const session = await hasCamSession();
  const user = session
    ? await prisma.camCareUser.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      })
    : null;

  return NextResponse.json(
    {
      authenticated: Boolean(user),
      configured: camAuthIsConfigured(),
      user,
    },
    { headers: noStoreHeaders },
  );
}

export async function POST(request: NextRequest) {
  if (!camAuthIsConfigured()) {
    return NextResponse.json(
      { error: "LittleLog authentication has not been configured." },
      { status: 503, headers: noStoreHeaders },
    );
  }

  const attemptKey = clientKey(request);
  const currentAttempts = activeAttemptRecord(attemptKey);
  if (currentAttempts && currentAttempts.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: noStoreHeaders },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    username?: unknown;
    password?: unknown;
  } | null;
  const username =
    typeof body?.username === "string"
      ? body.username.trim().toLowerCase().slice(0, 100)
      : "";
  const password =
    typeof body?.password === "string" ? body.password.slice(0, 200) : "";
  const user = username
    ? await prisma.camCareUser.findUnique({ where: { username } })
    : null;
  const passwordMatches = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordMatches) {
    camAccessAttempts.set(attemptKey, {
      count: (currentAttempts?.count ?? 0) + 1,
      resetAt: currentAttempts?.resetAt ?? Date.now() + ATTEMPT_WINDOW_MS,
    });
    return NextResponse.json(
      { error: "The LittleLog ID or password is not correct." },
      { status: 401, headers: noStoreHeaders },
    );
  }

  camAccessAttempts.delete(attemptKey);
  await Promise.all([
    createCamSession(user.id),
    prisma.camCareUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
  ]);
  return NextResponse.json(
    {
      authenticated: true,
      configured: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    },
    { headers: noStoreHeaders },
  );
}

export async function DELETE() {
  await clearCamSession();
  return NextResponse.json(
    { authenticated: false, configured: camAuthIsConfigured(), user: null },
    { headers: noStoreHeaders },
  );
}
