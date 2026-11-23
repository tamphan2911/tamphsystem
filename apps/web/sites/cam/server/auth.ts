import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const CAM_SESSION_COOKIE = "cam_family_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

function configuration() {
  const accessCode = process.env.CAM_FAMILY_ACCESS_CODE?.trim() ?? "";
  const sessionSecret = process.env.CAM_SESSION_SECRET?.trim() ?? "";

  return {
    accessCode,
    sessionSecret,
    ready: accessCode.length >= 6 && sessionSecret.length >= 32,
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

function createSessionToken(secret: string) {
  const payload = Buffer.from(
    JSON.stringify({
      scope: "cam-family",
      expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    }),
  ).toString("base64url");

  return `${payload}.${sign(payload, secret)}`;
}

function verifySessionToken(token: string, secret: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload, secret))) {
    return false;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { scope?: string; expiresAt?: number };
    return (
      parsed.scope === "cam-family" &&
      typeof parsed.expiresAt === "number" &&
      parsed.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}

export function camSyncIsConfigured() {
  return configuration().ready;
}

export function camAccessCodeMatches(candidate: string) {
  const config = configuration();
  if (!config.ready) return false;

  const candidateDigest = sign(candidate.trim(), config.sessionSecret);
  const expectedDigest = sign(config.accessCode, config.sessionSecret);
  return safeEqual(candidateDigest, expectedDigest);
}

export async function hasCamSession() {
  const config = configuration();
  if (!config.ready) return false;

  const token = (await cookies()).get(CAM_SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token, config.sessionSecret) : false;
}

export async function createCamSession() {
  const config = configuration();
  if (!config.ready) throw new Error("Cam sync is not configured");

  (await cookies()).set(
    CAM_SESSION_COOKIE,
    createSessionToken(config.sessionSecret),
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
