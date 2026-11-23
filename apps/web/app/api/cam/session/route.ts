import { NextRequest, NextResponse } from "next/server";
import {
  camAccessCodeMatches,
  camSyncIsConfigured,
  clearCamSession,
  createCamSession,
  hasCamSession,
} from "@/sites/cam/server/auth";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

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
  return NextResponse.json(
    {
      authenticated: await hasCamSession(),
      configured: camSyncIsConfigured(),
    },
    { headers: noStoreHeaders },
  );
}

export async function POST(request: NextRequest) {
  if (!camSyncIsConfigured()) {
    return NextResponse.json(
      { error: "Cam sync has not been configured on the server." },
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
    accessCode?: unknown;
  } | null;
  const accessCode =
    typeof body?.accessCode === "string" ? body.accessCode.slice(0, 128) : "";

  if (!camAccessCodeMatches(accessCode)) {
    camAccessAttempts.set(attemptKey, {
      count: (currentAttempts?.count ?? 0) + 1,
      resetAt: currentAttempts?.resetAt ?? Date.now() + ATTEMPT_WINDOW_MS,
    });
    return NextResponse.json(
      { error: "That family access code is not correct." },
      { status: 401, headers: noStoreHeaders },
    );
  }

  camAccessAttempts.delete(attemptKey);
  await createCamSession();
  return NextResponse.json(
    { authenticated: true, configured: true },
    { headers: noStoreHeaders },
  );
}

export async function DELETE() {
  await clearCamSession();
  return NextResponse.json(
    { authenticated: false, configured: camSyncIsConfigured() },
    { headers: noStoreHeaders },
  );
}
