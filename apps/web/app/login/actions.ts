"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import { signIn } from "../../auth";
import { requestIp, verifyTurnstileToken } from "../../lib/turnstile";

function safeRedirectPath(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value : "";
  if (!text || !text.startsWith("/") || text.startsWith("//")) return "/";
  return text;
}

function loginUrl(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/login?${searchParams.toString()}`;
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
  const host = requestHeaders.get("host");
  const callbackPath = safeRedirectPath(formData.get("callbackUrl"));
  const redirectTo =
    isResearchHost(host) && callbackPath === "/" ? "/projects" : callbackPath;

  if (!email || !password) {
    redirect(
      loginUrl({
        warning: "missing",
        callbackUrl: redirectTo,
      }),
    );
  }

  const turnstileOk = await verifyTurnstileToken(
    formData.get("cf-turnstile-response"),
    requestIp(requestHeaders),
  );
  if (!turnstileOk) {
    redirect(
      loginUrl({
        warning: "security",
        email,
        callbackUrl: redirectTo,
      }),
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { email: true, emailVerified: true },
  });

  if (user && !user.emailVerified) {
    redirect(
      loginUrl({
        warning: "unverified",
        email: user.email,
        callbackUrl: redirectTo,
      }),
    );
  }

  formData.set("email", email);
  await signIn("credentials", formData, { redirectTo });
}
