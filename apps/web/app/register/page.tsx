"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Loader2,
  LockKeyhole,
  Mail,
  User,
  UserPlus,
} from "lucide-react";
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
  researchAuthErrorClass,
  researchAuthFooterClass,
  researchAuthFormClass,
  researchAuthHeaderClass,
  researchAuthIconClass,
  researchAuthLabelClass,
  researchAuthLinkClass,
  researchAuthPageClass,
  researchAuthPrimaryButtonClass,
  researchAuthTitleClass,
} from "@/sites/research/lib/authStyles";
import { registerUser } from "./actions";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  );
}

function siteCopy() {
  if (typeof window === "undefined") return defaultCopy;
  const host = window.location.host;
  if (host.startsWith("research.")) {
    return {
      title: "REGISTER",
      subtitle: "",
      accent: "emerald",
    };
  }
  if (host.startsWith("learn.")) {
    return {
      title: "Create Learn account",
      subtitle: "Register with the shared TamphSystem account database.",
      accent: "blue",
    };
  }
  return {
    title: "Create account",
    subtitle: "Register with the shared TamphSystem account database.",
    accent: "blue",
  };
}

const defaultCopy = {
  title: "Create account",
  subtitle: "Register with the shared TamphSystem account database.",
  accent: "blue",
};

function RegisterContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copy, setCopy] = useState(defaultCopy);
  const [siteResolved, setSiteResolved] = useState(false);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const isResearch = copy.accent === "emerald";
  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    process.env.NEXT_PUBLIC_TURNSTILE_SITE ||
    "";

  useEffect(() => {
    setCopy(siteCopy());
    setSiteResolved(true);
  }, []);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const affiliation = String(formData.get("affiliation") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name) {
      setError("Enter your full name to create the account.");
      return;
    }
    if (!email) {
      setError("Enter your email address to create the account.");
      return;
    }
    if (!affiliation) {
      setError("Enter your university or institution.");
      return;
    }
    if (!password) {
      setError("Create a password for this account.");
      return;
    }
    if (!confirmPassword) {
      setError("Retype the password to confirm it.");
      return;
    }
    if (!emailPattern.test(email)) {
      setError("Use a valid email address, for example name@university.edu.");
      return;
    }
    if (password.length < 6) {
      setError("Password must have at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Confirm password must match the password.");
      return;
    }

    setIsLoading(true);
    const result = await registerUser(formData);
    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
      setTurnstileResetKey((current) => current + 1);
    }
  };

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
          mode="register"
          className={
            isResearch
              ? `${researchAuthCardClass} max-w-lg`
              : "w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30"
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
                  <UserPlus className="h-6 w-6" />
                </span>
                <span className={researchAuthTitleClass}>{copy.title}</span>
              </h1>
            ) : (
              <>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900">
                  <UserPlus className="h-6 w-6" />
                </div>
                <h1 className="mt-4 text-2xl font-bold tracking-tight">
                  {copy.title}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {copy.subtitle}
                </p>
              </>
            )}
          </div>

          <form
            action={handleSubmit}
            className={
              isResearch ? researchAuthFormClass : "space-y-5 px-8 py-7"
            }
          >
            {callbackUrl && (
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
            )}

            <label
              className={
                isResearch
                  ? researchAuthLabelClass
                  : "block text-sm font-semibold text-slate-700 dark:text-slate-200"
              }
            >
              <span className="sr-only">Full name</span>
              {isResearch ? (
                <span className="research-auth-input-shell">
                  <input
                    type="text"
                    name="name"
                    placeholder="Enter your full legal name"
                    required
                  />
                  <User aria-hidden="true" />
                </span>
              ) : (
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full legal name"
                  className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
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
              <span className="sr-only">Email address</span>
              {isResearch ? (
                <span className="research-auth-input-shell">
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your working email"
                    required
                  />
                  <Mail aria-hidden="true" />
                </span>
              ) : (
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your working email"
                  className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
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
              <span className="sr-only">Affiliation</span>
              {isResearch ? (
                <span className="research-auth-input-shell">
                  <input
                    type="text"
                    name="affiliation"
                    placeholder="Enter your university or institution"
                    required
                  />
                  <Building2 aria-hidden="true" />
                </span>
              ) : (
                <input
                  type="text"
                  name="affiliation"
                  placeholder="Enter your university or institution"
                  className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
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
              <span className="sr-only">Password</span>
              {isResearch ? (
                <span className="research-auth-input-shell">
                  <input
                    type="password"
                    name="password"
                    placeholder="Create a password with 6+ characters"
                    required
                    minLength={6}
                  />
                  <LockKeyhole aria-hidden="true" />
                </span>
              ) : (
                <input
                  type="password"
                  name="password"
                  placeholder="Create a password with 6+ characters"
                  className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
                  required
                  minLength={6}
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
              <span className="sr-only">Confirm password</span>
              {isResearch ? (
                <span className="research-auth-input-shell">
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Retype the same password"
                    required
                    minLength={6}
                  />
                  <LockKeyhole aria-hidden="true" />
                </span>
              ) : (
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Retype the same password"
                  className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
                  required
                  minLength={6}
                />
              )}
            </label>

            {siteResolved ? (
              <TurnstileField
                siteKey={siteKey}
                resetKey={turnstileResetKey}
                theme={isResearch ? "dark" : "light"}
              />
            ) : null}

            {error && (
              <div
                className={
                  isResearch
                    ? `${researchAuthErrorClass} research-auth-feedback`
                    : "flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200"
                }
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={
                isResearch
                  ? researchAuthPrimaryButtonClass
                  : "inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 dark:border-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"
              }
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {isLoading ? "Creating account..." : "REGISTER"}
            </button>
          </form>

          <div
            className={
              isResearch
                ? researchAuthFooterClass
                : "border-t border-slate-100 px-8 py-5 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
            }
          >
            Already have an account?{" "}
            <AuthSwitchLink
              href={
                callbackUrl
                  ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
                  : "/login"
              }
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
    </>
  );
}
