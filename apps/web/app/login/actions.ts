"use server";

import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import { signIn } from "../../auth";

function safeRedirectPath(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value : "";
  if (!text || !text.startsWith("/") || text.startsWith("//")) return "/";
  return text;
}

function loginUrl(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/login?${searchParams.toString()}`;
}

export async function loginUser(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectPath(formData.get("callbackUrl"));

  if (!email || !password) {
    redirect(
      loginUrl({
        warning: "missing",
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
