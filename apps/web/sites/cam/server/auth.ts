import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const CAM_SESSION_COOKIE = "cam_family_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

function configuration() {
  const sessionSecret =
    process.env.CAM_SESSION_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "";

  return {
    sessionSecret,
    ready: sessionSecret.length >= 32,
  };
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function createSessionToken(secret: string, userId: string) {
  const payload = Buffer.from(
    JSON.stringify({
      scope: "cam-user",
      userId,
      expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    }),
  ).toString("base64url");

  return `${payload}.${sign(payload, secret)}`;
}

function verifySessionToken(token: string, secret: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload, secret))) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { scope?: string; userId?: string; expiresAt?: number };
    const userId = parsed.userId;
    const valid =
      parsed.scope === "cam-user" &&
      typeof userId === "string" &&
      userId.length > 0 &&
      typeof parsed.expiresAt === "number" &&
      parsed.expiresAt > Date.now();
    return valid && userId ? { userId } : null;
  } catch {
    return null;
  }
}

export function camAuthIsConfigured() {
  return configuration().ready;
}

export async function hasCamSession() {
  const config = configuration();
  if (!config.ready) return null;

  const token = (await cookies()).get(CAM_SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token, config.sessionSecret) : null;
}

export async function createCamSession(userId: string) {
  const config = configuration();
  if (!config.ready) throw new Error("Cam authentication is not configured");

  (await cookies()).set(
    CAM_SESSION_COOKIE,
    createSessionToken(config.sessionSecret, userId),
    {
      httpOnly: true,
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    },
  );
}

export async function clearCamSession() {
  (await cookies()).set(CAM_SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
}
