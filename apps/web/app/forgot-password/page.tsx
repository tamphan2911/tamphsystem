import { AlertTriangle, Mail, RotateCcw } from "lucide-react";
import { headers } from "next/headers";
import {
  AuthDarkTheme,
  AuthLightTheme,
} from "@/sites/shared/components/AuthLightTheme";
import {
  AuthSwitchLink,
  AuthTransitionCard,
} from "@/sites/shared/components/AuthTransition";
import { TurnstileField } from "@/sites/shared/components/TurnstileField";
import {
  researchAuthCardClass,
  researchAuthFooterClass,
  researchAuthFormClass,
  researchAuthHeaderClass,
  researchAuthIconClass,
  researchAuthInputClass,
  researchAuthLabelClass,
  researchAuthLinkClass,
  researchAuthPageClass,
  researchAuthPrimaryButtonClass,
  researchAuthSuccessClass,
  researchAuthTitleClass,
  researchAuthWarningClass,
} from "@/sites/research/lib/authStyles";
import { turnstileSiteKey } from "@/sites/shared/lib/turnstile";
import { requestPasswordReset } from "./actions";

function warningCopy(warning?: string) {
  if (warning === "missing") {
    return "Enter your email address to request a password reset link.";
  }
  if (warning === "security") {
    return "Cloudflare verification was not completed. Complete the security check, then try again.";
  }
  if (warning === "security_config") {
    return "Cloudflare security check is not configured. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY in Railway and redeploy.";
  }
  return null;
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ warning?: string; email?: string; sent?: string }>;
}) {
  const { warning, email, sent } = await searchParams;
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const isResearch = host.startsWith("research.");
  const siteKey = turnstileSiteKey();
  const warningMessage = warningCopy(warning);

  return (
    <div
      className={
        isResearch
          ? researchAuthPageClass
          : "flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-950 transition-colors duration-200 dark:bg-slate-950 dark:text-white"
      }
    >
      {isResearch ? <AuthDarkTheme /> : <AuthLightTheme />}
      <AuthTransitionCard
        mode="reset"
        className={
          isResearch
            ? `${researchAuthCardClass} max-w-md`
            : "w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30"
        }
      >
        <div
          className={
            isResearch
              ? researchAuthHeaderClass
              : "border-b border-slate-100 px-8 py-7 text-center dark:border-slate-800"
          }
        >
          <h1 className="inline-flex items-center justify-center gap-2">
            <span
              className={
                isResearch
                  ? researchAuthIconClass
                  : "inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900"
              }
            >
              <RotateCcw className="h-5 w-5" />
            </span>
            <span
              className={
                isResearch
                  ? researchAuthTitleClass
                  : "text-2xl font-bold tracking-tight"
              }
            >
              Reset password
            </span>
          </h1>
        </div>

        <form
          action={requestPasswordReset}
          className={isResearch ? researchAuthFormClass : "space-y-5 px-8 py-7"}
        >
          {sent === "1" && (
            <div
              className={
                isResearch
                  ? researchAuthSuccessClass
                  : "flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-100"
              }
            >
              <Mail className="mt-0.5 h-4 w-4 flex-none" />
              <span>
                If {email || "that email"} exists, a reset link has been sent.
                Check spam or promotions if you do not see it.
              </span>
            </div>
          )}

          {warningMessage && (
            <div
              className={
                isResearch
                  ? researchAuthWarningClass
                  : "flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
              }
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <span>{warningMessage}</span>
            </div>
          )}

          <label
            className={
              isResearch
                ? researchAuthLabelClass
                : "block text-sm font-semibold text-slate-700 dark:text-slate-200"
            }
          >
            <span className="sr-only">Email address</span>
            <input
              type="email"
              name="email"
              defaultValue={email ?? ""}
              placeholder="you@example.com"
              className={
                isResearch
                  ? researchAuthInputClass
                  : "h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
              }
              required
            />
          </label>

          <TurnstileField
            siteKey={siteKey}
            theme={isResearch ? "dark" : "light"}
          />

          <button
            type="submit"
            className={
              isResearch
                ? researchAuthPrimaryButtonClass
                : "inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 dark:border-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"
            }
          >
            <Mail className="h-4 w-4" />
            Send reset link
          </button>
        </form>

        <div
          className={
            isResearch
              ? researchAuthFooterClass
              : "border-t border-slate-100 px-8 py-5 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
          }
        >
          Remembered your password?{" "}
          <AuthSwitchLink
            href="/login"
            className={
              isResearch
                ? researchAuthLinkClass
                : "font-semibold text-blue-600 transition hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
            }
          >
            Sign in
          </AuthSwitchLink>
        </div>
      </AuthTransitionCard>
    </div>
  );
}
