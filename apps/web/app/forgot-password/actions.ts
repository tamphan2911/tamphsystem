"use server";

import crypto from "crypto";
import nodemailer from "nodemailer";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import { requestIp, verifyTurnstileToken } from "../../lib/turnstile";

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
  return `
    <div style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f8fafc;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
              <tr>
                <td style="padding:28px 32px;border-bottom:1px solid #e2e8f0;">
                  <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#2563eb;">${label}</div>
                  <h1 style="margin:10px 0 0;font-size:24px;line-height:1.25;color:#0f172a;">Reset your password</h1>
                  <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#475569;">A password reset was requested for <strong style="color:#0f172a;">${email}</strong>.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 32px;">
                  <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 18px;border-radius:12px;">Reset password</a>
                  <p style="margin:22px 0 0;font-size:12px;line-height:1.7;color:#64748b;">This link expires in 1 hour. If the button does not work, copy and paste this link into your browser:</p>
                  <p style="margin:8px 0 0;font-size:12px;line-height:1.6;word-break:break-all;color:#2563eb;">${resetUrl}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#64748b;">
                  If you did not request this, you can ignore this email.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
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
    from: process.env.SMTP_FROM,
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

  if (user) {
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
  }

  redirect(forgotUrl({ sent: "1", email }));
}
