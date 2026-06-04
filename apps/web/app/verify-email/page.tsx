import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { prisma } from "@repo/db";
import { AuthLightTheme } from "../../components/AuthLightTheme";

async function verifyToken(token: string | undefined) {
  if (!token) {
    return {
      ok: false,
      title: "Verification link is missing",
      detail: "Open the full verification link from your email.",
    };
  }

  const user = await prisma.user.findFirst({
    where: { emailVerificationToken: token },
    select: {
      id: true,
      email: true,
      emailVerificationTokenExpires: true,
      emailVerified: true,
    },
  });

  if (!user) {
    return {
      ok: false,
      title: "Verification link is invalid",
      detail:
        "This link was not found. It may have already been used or replaced by a newer verification email.",
    };
  }

  if (
    user.emailVerificationTokenExpires &&
    user.emailVerificationTokenExpires.getTime() < Date.now()
  ) {
    return {
      ok: false,
      title: "Verification link expired",
      detail:
        "This link has expired. Please register again or ask for a new verification email.",
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: user.emailVerified ?? new Date(),
      emailVerificationToken: null,
      emailVerificationTokenExpires: null,
    },
  });

  return {
    ok: true,
    title: "Email verified",
    detail: `${user.email} is now verified. You can log in to Research Hub and the rest of TamphSystem.`,
    email: user.email,
  };
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = await verifyToken(token);
  const Icon = result.ok ? CheckCircle2 : AlertTriangle;
  const iconClass = result.ok
    ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900"
    : "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900";
  const loginHref = result.email
    ? `/login?email=${encodeURIComponent(result.email)}`
    : "/login";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-950 dark:bg-slate-950 dark:text-white">
      <AuthLightTheme />
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white text-center shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
        <div className="border-b border-slate-100 px-8 py-8 dark:border-slate-800">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ${iconClass}`}
          >
            <Icon className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            {result.title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {result.detail}
          </p>
        </div>
        <div className="px-8 py-6">
          <Link
            href={loginHref}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-blue-600 bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-md dark:border-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            Go to login
          </Link>
        </div>
      </div>
    </div>
  );
}
