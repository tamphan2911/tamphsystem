import Link from "next/link";
import { MailCheck } from "lucide-react";
import { headers } from "next/headers";
import { AuthLightTheme } from "@/sites/shared/components/AuthLightTheme";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; callbackUrl?: string }>;
}) {
  const { email, callbackUrl } = await searchParams;
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const isResearch = host.startsWith("research.");
  const isLearn = host.startsWith("learn.");
  const loginHref = callbackUrl
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}&email=${encodeURIComponent(email ?? "")}`
    : `/login?email=${encodeURIComponent(email ?? "")}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-950 dark:bg-slate-950 dark:text-white">
      <AuthLightTheme />
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white text-center shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
        <div className="border-b border-slate-100 px-8 py-8 dark:border-slate-800">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900">
            <MailCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            {isResearch
              ? "Check your email for Research Hub"
              : isLearn
                ? "Check your email for Tamph Learn"
                : "Check your email"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
            We sent an account verification link to{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {email || "your registered email"}
            </span>
            . Open that email and verify the account before logging in
            {isResearch ? " to Research Hub" : isLearn ? " to Tamph Learn" : ""}
            .
          </p>
        </div>
        <div className="space-y-3 px-8 py-6">
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            The link expires in 24 hours. If you do not see the email, check
            spam or promotions first. The sender can be configured when the site
            email is ready.
          </p>
          <Link
            href={loginHref}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-bold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 hover:shadow-md dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/55"
          >
            Go to login
          </Link>
        </div>
      </div>
    </div>
  );
}
