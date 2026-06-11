import crypto from "crypto";
import nodemailer from "nodemailer";
import { prisma } from "@repo/db";

export function siteFromHost(host: string | null) {
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
                  <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#475569;">Hello ${name}, please verify this email address before signing in to ${label}.</p>
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
                  If you did not request this verification, you can ignore this email.
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
    text: `Hello ${name},\n\nPlease verify your ${label} account before logging in:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you did not request this verification, you can ignore this email.`,
    html: verificationEmailHtml({ name, email, site, verifyUrl }),
  });
}

export async function createAndSendVerificationEmail({
  userId,
  name,
  email,
  site,
  baseUrl,
}: {
  userId: string;
  name: string | null;
  email: string;
  site: string;
  baseUrl: string;
}) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationToken: token,
      emailVerificationTokenExpires: expiresAt,
    },
  });

  await sendVerificationEmail({
    name: name || email,
    email,
    site,
    verifyUrl,
  });
}
