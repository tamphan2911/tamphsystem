import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { headers } from "next/headers";
import {
  AuthLightTheme,
} from "@/sites/shared/components/AuthLightTheme";
import {
  researchAuthCardClass,
  researchAuthFooterClass,
  researchAuthHeaderClass,
  researchAuthIconClass,
  researchAuthPageClass,
  researchAuthPrimaryButtonClass,
  researchAuthSubtitleClass,
  researchAuthTitleClass,
} from "@/sites/research/lib/authStyles";

export default async function ResetPasswordSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const isResearch = host.startsWith("research.");
  const loginHref = email
    ? `/login?email=${encodeURIComponent(email)}`
    : "/login";

  return (
    <div
      className={
        isResearch
          ? researchAuthPageClass
          : "flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-950 dark:bg-slate-950 dark:text-white"
      }
    >
      <AuthLightTheme />
      <div
        className={
          isResearch
            ? `${researchAuthCardClass} max-w-lg text-center`
            : "w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white text-center shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30"
        }
      >
        <div
          className={
            isResearch
              ? researchAuthHeaderClass
              : "border-b border-slate-100 px-8 py-8 dark:border-slate-800"
          }
        >
          <div
            className={
              isResearch
                ? researchAuthIconClass
                : "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900"
            }
          >
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1
            className={
              isResearch
                ? researchAuthTitleClass
                : "mt-5 text-2xl font-bold tracking-tight"
            }
          >
            Password changed
          </h1>
          <p
            className={
              isResearch
                ? researchAuthSubtitleClass
                : "mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400"
            }
          >
            Your password has been updated and your email is now verified. You
            can sign in with the new password.
          </p>
        </div>
        <div className={isResearch ? researchAuthFooterClass : "px-8 py-6"}>
          <Link
            href={loginHref}
            className={
              isResearch
                ? `${researchAuthPrimaryButtonClass} w-auto px-5`
                : "inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-blue-600 bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-md dark:border-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"
            }
          >
            Go to login
          </Link>
        </div>
      </div>
    </div>
  );
}
