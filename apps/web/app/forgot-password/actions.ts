"use server";

import crypto from "crypto";
import nodemailer from "nodemailer";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import {
  researchEmailButton,
  researchEmailInfoTable,
  researchEmailLink,
  researchEmailParagraph,
  researchLightEmail,
} from "@/sites/shared/lib/emailTemplates";
import { requestIp, verifyTurnstileToken } from "@/sites/shared/lib/turnstile";

function siteFromHost(host: string | null) {
  if (!host) return "portfolio";
  if (host.startsWith("research.")) return "research";
  if (host.startsWith("learn.")) return "learn";
  if (host.startsWith("admin.")) return "admin";
  return "portfolio";
}

function siteLabel(site: string) {
  if (site === "research") return "Research Hub";
  if (site === "learn") return "Tamph Learn";
  if (site === "admin") return "Tamph Admin";
  return "TamphSystem";
}

function extractMailbox(value: string | null | undefined) {
  const text = value?.trim();
  if (!text) return "";
  const match = text.match(/<([^<>@\s]+@[^<>@\s]+)>/);
  return match?.[1] ?? text;
}

function mailFromForSite(site: string) {
  const from = process.env.SMTP_FROM?.trim() ?? "";
  if (site !== "research") return from;
  const mailbox = extractMailbox(from);
  return mailbox ? `"Tamph Research Hub" <${mailbox}>` : from;
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

function baseUrlFromHeaders(requestHeaders: Headers) {
  const host = hostFromHeaders(requestHeaders);
  const forwardedProto =
    requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() || null;

  if (!host) return process.env.NEXT_PUBLIC_APP_URL || "https://tamph.com";

  const protocol =
    forwardedProto ||
    (host.includes("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${protocol}://${host}`;
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function createTransporter() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
  });
}

function resetEmailHtml({
  email,
  site,
  resetUrl,
}: {
  email: string;
  site: string;
  resetUrl: string;
}) {
  const label = siteLabel(site);
  return researchLightEmail({
    eyebrow: label,
    title: "Reset your password",
    intro: `A password reset was requested for ${email}.`,
    children: `
      ${researchEmailInfoTable([{ label: "Account email", value: email }])}
      ${researchEmailButton(resetUrl, "Reset password")}
      ${researchEmailParagraph("This link expires in 1 hour. If the button does not work, copy and paste this link into your browser.")}
      ${researchEmailLink(resetUrl)}
    `,
    footer: "If you did not request this, you can ignore this email.",
  });
}

async function sendResetEmail({
  email,
  site,
  resetUrl,
}: {
  email: string;
  site: string;
  resetUrl: string;
}) {
  if (!smtpConfigured()) {
    console.info(`[password reset] ${email}: ${resetUrl}`);
    return;
  }

  const label = siteLabel(site);
  await createTransporter().sendMail({
    from: mailFromForSite(site),
    to: email,
    subject: `Reset your ${label} password`,
    text: `A password reset was requested for your ${label} account.\n\nUse this link within 1 hour:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: resetEmailHtml({ email, site, resetUrl }),
  });
}

function forgotUrl(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/forgot-password?${searchParams.toString()}`;
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const requestHeaders = await headers();
  const host = hostFromHeaders(requestHeaders);
  const site = siteFromHost(host);

  if (!email) {
    redirect(forgotUrl({ warning: "missing" }));
  }

  const turnstileResult = await verifyTurnstileToken(
    formData.get("cf-turnstile-response"),
    requestIp(requestHeaders),
  );
  if (!turnstileResult.ok) {
    redirect(
      forgotUrl({
        warning:
          turnstileResult.reason === "config" ? "security_config" : "security",
        email,
      }),
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    redirect(forgotUrl({ warning: "email_not_found", email }));
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: token,
      passwordResetTokenExpires: expiresAt,
    },
  });

  const resetUrl = `${baseUrlFromHeaders(requestHeaders)}/reset-password?token=${token}`;
  await sendResetEmail({ email: user.email, site, resetUrl });

  redirect(`/forgot-password/check-email?email=${encodeURIComponent(email)}`);
}
