"use server";

import bcrypt from "bcrypt";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
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

function appBaseUrl(host: string | null) {
  if (host) {
    const protocol = host.includes("localhost") ? "http" : "https";
    return `${protocol}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "https://tamph.com";
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

  if (!host) return appBaseUrl(null);

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

function verificationEmailHtml({
  name,
  email,
  site,
  verifyUrl,
}: {
  name: string;
  email: string;
  site: string;
  verifyUrl: string;
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
                  <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#059669;">${label}</div>
                  <h1 style="margin:10px 0 0;font-size:24px;line-height:1.25;color:#0f172a;">Verify your email address</h1>
                  <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#475569;">Hello ${name}, thanks for registering an account for ${label}. Please verify this email address before signing in.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 32px;">
                  <p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#475569;">Account email: <strong style="color:#0f172a;">${email}</strong></p>
                  <a href="${verifyUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 18px;border-radius:12px;">Verify account</a>
                  <p style="margin:22px 0 0;font-size:12px;line-height:1.7;color:#64748b;">This verification link expires in 24 hours. If the button does not work, copy and paste this link into your browser:</p>
                  <p style="margin:8px 0 0;font-size:12px;line-height:1.6;word-break:break-all;color:#2563eb;">${verifyUrl}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#64748b;">
                  If you did not create this account, you can ignore this email.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

async function sendVerificationEmail({
  name,
  email,
  site,
  verifyUrl,
}: {
  name: string;
  email: string;
  site: string;
  verifyUrl: string;
}) {
  if (!smtpConfigured()) {
    console.info(`[email verification] ${email}: ${verifyUrl}`);
    return;
  }

  const label = siteLabel(site);
  await createTransporter().sendMail({
    from: mailFromForSite(site),
    to: email,
    subject: `Verify your ${label} account`,
    text: `Hello ${name},\n\nPlease verify your ${label} account before logging in:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you did not create this account, you can ignore this email.`,
    html: verificationEmailHtml({ name, email, site, verifyUrl }),
  });
}

function safeCallbackUrl(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value : "";
  return text && text.startsWith("/") && !text.startsWith("//") ? text : "";
}

export async function registerUser(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const affiliation = String(formData.get("affiliation") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));
  const requestHeaders = await headers();
  const host = hostFromHeaders(requestHeaders);
  const activeSite = siteFromHost(host);

  if (!name || !email || !affiliation || !password || !confirmPassword) {
    return { error: "All fields are required." };
  }
  if (password.length < 6) {
    return { error: "Password must have at least 6 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Confirm password does not match the password." };
  }
  const turnstileResult = await verifyTurnstileToken(
    formData.get("cf-turnstile-response"),
    requestIp(requestHeaders),
  );
  if (!turnstileResult.ok) {
    return {
      error:
        turnstileResult.reason === "config"
          ? "Cloudflare security check is not configured. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY in Railway and redeploy."
          : "Cloudflare verification was not completed. Wait for the checkbox to load, complete it, then register again.",
    };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return { error: "User already exists with this email." };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.create({
      data: {
        name,
        email,
        affiliation,
        passwordHash,
        emailVerified: null,
        emailVerificationToken: token,
        emailVerificationTokenExpires: expiresAt,
        roles: activeSite === "research" ? ["USER"] : ["STUDENT"],
        activeSites: [activeSite],
      },
    });

    const verifyUrl = `${baseUrlFromHeaders(requestHeaders)}/verify-email?token=${token}`;
    await sendVerificationEmail({
      name,
      email,
      site: activeSite,
      verifyUrl,
    });
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong. Please try again." };
  }

  const params = new URLSearchParams({ email });
  if (callbackUrl) params.set("callbackUrl", callbackUrl);
  redirect(`/register/check-email?${params.toString()}`);
}
