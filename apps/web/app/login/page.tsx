import { AlertTriangle, LockKeyhole, LogIn, Mail } from "lucide-react";
import { headers } from "next/headers";
import { TurnstileField } from "@/sites/shared/components/TurnstileField";
import {
  AuthDarkTheme,
  AuthLightTheme,
} from "@/sites/shared/components/AuthLightTheme";
import {
  AuthSwitchLink,
  AuthTransitionCard,
} from "@/sites/shared/components/AuthTransition";
import { LearnAuthHeader } from "@/sites/learn/components/LearnAuthHeader";
import {
  researchAuthCardClass,
  researchAuthFooterClass,
  researchAuthFormClass,
  researchAuthHeaderClass,
  researchAuthIconClass,
  researchAuthLabelClass,
  researchAuthLinkClass,
  researchAuthPageClass,
  researchAuthPrimaryButtonClass,
  researchAuthTitleClass,
  researchAuthWarningClass,
} from "@/sites/research/lib/authStyles";
import { turnstileSiteKey } from "@/sites/shared/lib/turnstile";
import { loginUser } from "./actions";

function safeRedirectPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function warningCopy(warning?: string, email?: string) {
  if (warning === "unverified") {
    return {
      title: "Email verification required",
      detail: `The account ${email || "you entered"} is registered but not verified yet. Please open the verification email and activate the account before logging in.`,
    };
  }
  if (warning === "missing") {
    return {
      title: "Missing login information",
      detail: "Enter both email and password to continue.",
    };
  }
  if (warning === "security") {
    return {
      title: "Security check required",
      detail:
        "Cloudflare verification was not completed. Wait for the checkbox to load, complete it, then sign in again.",
    };
  }
  if (warning === "security_config") {
    return {
      title: "Security check is not configured",
      detail:
        "The server has a Turnstile secret key but no public site key. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY in Railway, redeploy, then try again.",
    };
  }
  return null;
}

function siteCopy(host: string) {
  if (host.startsWith("research.")) {
    return {
      registerPrompt: "Need an account?",
      registerLabel: "Register here",
    };
  }
  if (host.startsWith("learn.")) {
    return {
      registerPrompt: "Need a Learn account?",
      registerLabel: "Register here",
    };
  }
  return {
    registerPrompt: "Need an account?",
    registerLabel: "Register here",
  };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string;
    warning?: string;
    email?: string;
    error?: string;
    reset?: string;
  }>;
}) {
  const { callbackUrl, warning, email, error } = await searchParams;
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const isResearch = host.startsWith("research.");
  const redirectTo = safeRedirectPath(callbackUrl);
  const siteKey = turnstileSiteKey();
  const copy = siteCopy(host);
  const warningMessage =
    warningCopy(warning, email) ||
    (error
      ? {
          title: "Login failed",
          detail:
            "The email or password is not correct, or the account is not active yet.",
        }
      : null);

  return (
    <>
      {!isResearch && <LearnAuthHeader />}
      <div
        className={
          isResearch
            ? researchAuthPageClass
            : "flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-950 transition-colors duration-200 dark:bg-slate-950 dark:text-white"
        }
      >
        {isResearch ? <AuthDarkTheme /> : <AuthLightTheme />}
        <AuthTransitionCard
          mode="login"
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
            {isResearch ? (
              <h1 className="inline-flex items-center justify-center gap-2">
                <span className={researchAuthIconClass}>
                  <LogIn className="h-6 w-6" />
                </span>
                <span className={researchAuthTitleClass}>SIGN IN</span>
              </h1>
            ) : (
              <>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900">
                  <LogIn className="h-6 w-6" />
                </div>
                <h1 className="mt-4 text-2xl font-bold tracking-tight">
                  Sign in
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Use your TamphSystem account across portfolio, learn, admin,
                  and research.
                </p>
              </>
            )}
          </div>

          <form
            action={loginUser}
            className={
              isResearch ? researchAuthFormClass : "space-y-5 px-8 py-7"
            }
          >
            <input type="hidden" name="callbackUrl" value={redirectTo} />
            <label
              className={
                isResearch
                  ? researchAuthLabelClass
                  : "block text-sm font-semibold text-slate-700 dark:text-slate-200"
              }
            >
              Email address (*)
              {isResearch ? (
                <span className="research-auth-input-shell mt-2">
                  <input
                    type="email"
                    name="email"
                    defaultValue={email ?? ""}
                    placeholder="Enter your account email"
                    required
                  />
                  <Mail aria-hidden="true" />
                </span>
              ) : (
                <input
                  type="email"
                  name="email"
                  defaultValue={email ?? ""}
                  placeholder="you@example.com"
                  className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
                  required
                />
              )}
            </label>

            <label
              className={
                isResearch
                  ? researchAuthLabelClass
                  : "block text-sm font-semibold text-slate-700 dark:text-slate-200"
              }
            >
              Password (*)
              {isResearch ? (
                <span className="research-auth-input-shell mt-2">
                  <input
                    type="password"
                    name="password"
                    placeholder="Enter your password"
                    required
                  />
                  <LockKeyhole aria-hidden="true" />
                </span>
              ) : (
                <input
                  type="password"
                  name="password"
                  placeholder="Your password"
                  className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
                  required
                />
              )}
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
              <LogIn className="h-4 w-4" />
              {isResearch ? "SIGN IN" : "Sign in"}
            </button>

            {warningMessage && (
              <div
                className={
                  isResearch
                    ? `${researchAuthWarningClass} research-auth-feedback`
                    : "flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
                }
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                <div>
                  <p className="font-bold">{warningMessage.title}</p>
                  <p className="mt-1 leading-5">{warningMessage.detail}</p>
                </div>
              </div>
            )}
          </form>

          <div
            className={
              isResearch
                ? `${researchAuthFooterClass} space-y-3`
                : "border-t border-slate-100 px-8 py-5 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
            }
          >
            <p>
              {copy.registerPrompt}{" "}
              <AuthSwitchLink
                href={`/register?callbackUrl=${encodeURIComponent(redirectTo)}`}
                className={
                  isResearch
                    ? researchAuthLinkClass
                    : "font-semibold text-blue-600 transition hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
                }
              >
                {copy.registerLabel}
              </AuthSwitchLink>
            </p>
            <p>
              Forget your password?{" "}
              <AuthSwitchLink
                href="/forgot-password"
                className={
                  isResearch
                    ? researchAuthLinkClass
                    : "font-semibold text-blue-600 transition hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
                }
              >
                Reset it here
              </AuthSwitchLink>
              .
            </p>
          </div>
        </AuthTransitionCard>
      </div>
    </>
  );
}
