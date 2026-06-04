"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AlertTriangle, BarChart3, Loader2, UserPlus } from "lucide-react";
import { TurnstileField } from "@/sites/shared/components/TurnstileField";
import { AuthLightTheme } from "@/sites/shared/components/AuthLightTheme";
import { LearnAuthHeader } from "@/sites/learn/components/LearnAuthHeader";
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
      title: "Create Research Hub account",
      subtitle:
        "Register with the shared TamphSystem account database. Email verification is required before login.",
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
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const isResearch = copy.accent === "emerald";
  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    process.env.NEXT_PUBLIC_TURNSTILE_SITE ||
    "";

  useEffect(() => {
    setCopy(siteCopy());
  }, []);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    const result = await registerUser(formData);
    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
      setTurnstileResetKey((current) => current + 1);
    }
  };

  return (
    <>
      <LearnAuthHeader />
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-950 transition-colors duration-200 dark:bg-slate-950 dark:text-white">
        <AuthLightTheme />
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
          <div className="border-b border-slate-100 px-8 py-7 text-center dark:border-slate-800">
            <div
              className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${
                isResearch
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900"
                  : "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900"
              }`}
            >
              {isResearch ? (
                <BarChart3 className="h-6 w-6" />
              ) : (
                <UserPlus className="h-6 w-6" />
              )}
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">
              {copy.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {copy.subtitle}
            </p>
          </div>

          <form action={handleSubmit} className="space-y-5 px-8 py-7">
            {callbackUrl && (
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                <span>{error}</span>
              </div>
            )}

            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Full name
              <input
                type="text"
                name="name"
                placeholder="Your full name"
                className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
                required
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Email address
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
                required
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Affiliation
              <input
                type="text"
                name="affiliation"
                placeholder="University, institution, or organization"
                className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
                required
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Password
              <input
                type="password"
                name="password"
                placeholder="At least 6 characters"
                className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
                required
                minLength={6}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Confirm password
              <input
                type="password"
                name="confirmPassword"
                placeholder="Retype your password"
                className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
                required
                minLength={6}
              />
            </label>

            <TurnstileField siteKey={siteKey} resetKey={turnstileResetKey} />

            <button
              type="submit"
              disabled={isLoading}
              className={`inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${
                isResearch
                  ? "border-emerald-600 bg-emerald-600 shadow-emerald-900/15 hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 dark:border-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                  : "border-blue-600 bg-blue-600 shadow-blue-900/15 hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 dark:border-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {isLoading ? "Creating account..." : "Register"}
            </button>
          </form>

          <div className="border-t border-slate-100 px-8 py-5 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              href={
                callbackUrl
                  ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
                  : "/login"
              }
              className="font-semibold text-blue-600 transition hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
