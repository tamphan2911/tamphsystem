"use server";

import { prisma } from "@repo/db";
import bcrypt from "bcrypt";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

function siteFromHost(host: string | null) {
  if (!host) return "portfolio";
  if (host.startsWith("research.")) return "research";
  if (host.startsWith("learn.")) return "learn";
  if (host.startsWith("admin.")) return "admin";
  return "portfolio";
}

export async function registerUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const callbackUrl = formData.get("callbackUrl") as string | null;
  const host = (await headers()).get("host");
  const activeSite = siteFromHost(host);

  if (!name || !email || !password) {
    return { error: "All fields are required" };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: "User already exists with this email" };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with default STUDENT role
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        roles: ["STUDENT"],
        activeSites: [activeSite],
      },
    });
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }

  // Redirect to login page on success
  const redirectTo =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/login";

  redirect(redirectTo);
}
