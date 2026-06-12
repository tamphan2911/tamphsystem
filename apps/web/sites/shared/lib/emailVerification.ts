import crypto from "crypto";
import nodemailer from "nodemailer";
import { prisma } from "@repo/db";
import {
  researchEmailButton,
  researchEmailInfoTable,
  researchEmailLink,
  researchEmailParagraph,
  researchLightEmail,
} from "./emailTemplates";

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
  return researchLightEmail({
    eyebrow: label,
    title: "Verify your email address",
    intro: `Hello ${name}, please verify this email address before signing in to ${label}.`,
    children: `
      ${researchEmailInfoTable([{ label: "Account email", value: email }])}
      ${researchEmailButton(verifyUrl, "Verify account")}
      ${researchEmailParagraph("This verification link expires in 24 hours. If the button does not work, copy and paste this link into your browser.")}
      ${researchEmailLink(verifyUrl)}
    `,
    footer:
      "If you did not request this verification, you can ignore this email.",
  });
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
