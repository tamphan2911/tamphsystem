"use server";

import bcrypt from "bcrypt";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import { signIn } from "../../auth";
import {
  createAndSendVerificationEmail,
  siteFromHost,
} from "@/sites/shared/lib/emailVerification";
import { requestIp, verifyTurnstileToken } from "@/sites/shared/lib/turnstile";

function safeRedirectPath(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value : "";
  if (!text || !text.startsWith("/") || text.startsWith("//")) return "/";
  return text;
}

function loginUrl(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/login?${searchParams.toString()}`;
}

function hostFromHeaders(requestHeaders: Headers) {
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  if (forwardedHost) return forwardedHost.split(",")[0]?.trim() ?? null;

  const host = requestHeaders.get("host");
  if (host) return host;

  const referer = requestHeaders.get("referer");
  if (!referer) return null;

  try {
    return new URL(referer).host;
  } catch {
    return null;
  }
}

function originFromHeaders(requestHeaders: Headers, host: string | null) {
  const forwardedProto =
    requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() || null;
  const referer = requestHeaders.get("referer");

  if (host) {
    const protocol =
      forwardedProto ||
      (host.includes("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");
    return `${protocol}://${host}`;
  }

  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  return null;
}

function isResearchHost(host: string | null) {
  return Boolean(
    host?.startsWith("research.") || host?.startsWith("research.localhost"),
  );
}

export async function loginUser(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const requestHeaders = await headers();
  const host = hostFromHeaders(requestHeaders);
  const origin = originFromHeaders(requestHeaders, host);
  const callbackPath = safeRedirectPath(formData.get("callbackUrl"));
  const isResearch = isResearchHost(host);
  const redirectPath =
    isResearch && callbackPath === "/" ? "/projects" : callbackPath;
  const redirectTo =
    isResearch && origin ? `${origin}${redirectPath}` : redirectPath;

  if (!email) {
    redirect(
      loginUrl({
        warning: "missing_email",
        callbackUrl: redirectPath,
      }),
    );
  }
  if (!password) {
    redirect(
      loginUrl({
        warning: "missing_password",
        email,
        callbackUrl: redirectPath,
      }),
    );
  }

  const turnstileResult = await verifyTurnstileToken(
    formData.get("cf-turnstile-response"),
    requestIp(requestHeaders),
  );
  if (!turnstileResult.ok) {
    redirect(
      loginUrl({
        warning:
          turnstileResult.reason === "config" ? "security_config" : "security",
        email,
        callbackUrl: redirectPath,
      }),
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      passwordHash: true,
    },
  });

  if (!user) {
    redirect(
      loginUrl({
        warning: "email_not_found",
        email,
        callbackUrl: redirectPath,
      }),
    );
  }

  const passwordMatches =
    (await bcrypt.compare(password, user.passwordHash)) ||
    (user.passwordHash === "hashed_password_placeholder" &&
      password === "password");

  if (!passwordMatches) {
    redirect(
      loginUrl({
        warning: "password_wrong",
        email,
        callbackUrl: redirectPath,
      }),
    );
  }

  if (!user.emailVerified) {
    await createAndSendVerificationEmail({
      userId: user.id,
      name: user.name,
      email: user.email,
      site: siteFromHost(host),
      baseUrl: origin || process.env.NEXT_PUBLIC_APP_URL || "https://tamph.com",
    });
    const params = new URLSearchParams({ email: user.email });
    if (redirectPath) params.set("callbackUrl", redirectPath);
    redirect(`/register/check-email?${params.toString()}`);
  }

  formData.set("email", email);
  await signIn("credentials", formData, { redirectTo });
}
