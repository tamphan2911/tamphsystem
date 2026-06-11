"use server";

import bcrypt from "bcrypt";
import { redirect } from "next/navigation";
import { prisma } from "@repo/db";

function resetUrl(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/reset-password?${searchParams.toString()}`;
}

export async function resetPassword(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    redirect(resetUrl({ warning: "missing" }));
  }
  if (!password || !confirmPassword) {
    redirect(resetUrl({ token, warning: "required" }));
  }
  if (password.length < 6) {
    redirect(resetUrl({ token, warning: "short" }));
  }
  if (password !== confirmPassword) {
    redirect(resetUrl({ token, warning: "mismatch" }));
  }

  const user = await prisma.user.findFirst({
    where: { passwordResetToken: token },
    select: {
      id: true,
      email: true,
      passwordResetTokenExpires: true,
    },
  });

  if (!user) {
    redirect(resetUrl({ warning: "invalid" }));
  }
  if (
    user.passwordResetTokenExpires &&
    user.passwordResetTokenExpires.getTime() < Date.now()
  ) {
    redirect(resetUrl({ warning: "expired" }));
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      passwordResetToken: null,
      passwordResetTokenExpires: null,
      emailVerified: new Date(),
    },
  });

  redirect(`/reset-password/success?email=${encodeURIComponent(user.email)}`);
}
