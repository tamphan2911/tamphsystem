import Link from "next/link";
import { AlertTriangle, KeyRound } from "lucide-react";
import { prisma } from "@repo/db";
import { AuthLightTheme } from "../../components/AuthLightTheme";
import { resetPassword } from "./actions";

function warningCopy(warning?: string) {
  if (warning === "missing") return "Open the full reset link from your email.";
  if (warning === "required") return "Enter and confirm your new password.";
  if (warning === "short") return "Password must have at least 6 characters.";
  if (warning === "mismatch") return "Confirm password does not match.";
  if (warning === "invalid") return "This reset link is invalid or was already used.";
  if (warning === "expired") return "This reset link has expired. Request a new one.";
  return null;
}

async function tokenState(token?: string) {
  if (!token) return { ok: false, email: null };

  const user = await prisma.user.findFirst({
    where: { passwordResetToken: token },
    select: { email: true, passwordResetTokenExpires: true },
  });

  if (!user) return { ok: false, email: null };
  if (
    user.passwordResetTokenExpires &&
    user.passwordResetTokenExpires.getTime() < Date.now()
  ) {
    return { ok: false, email: user.email };
  }

  return { ok: true, email: user.email };
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; warning?: string }>;
}) {
  const { token, warning } = await searchParams;
  const state = await tokenState(token);
  const warningMessage =
    warningCopy(warning) ||
    (!state.ok
      ? "This reset link is invalid, expired, or was already used."
      : null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-950 transition-colors duration-200 dark:bg-slate-950 dark:text-white">
      <AuthLightTheme />
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
        <div className="border-b border-slate-100 px-8 py-7 text-center dark:border-slate-800">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            Create new password
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {state.email
              ? `Reset password for ${state.email}.`
              : "Reset your TamphSystem password."}
          </p>
        </div>

        <form action={resetPassword} className="space-y-5 px-8 py-7">
          <input type="hidden" name="token" value={token ?? ""} />

          {warningMessage && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <span>{warningMessage}</span>
            </div>
          )}

          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            New password
            <input
              type="password"
              name="password"
              placeholder="At least 6 characters"
              className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
              required
              minLength={6}
              disabled={!state.ok}
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Confirm new password
            <input
              type="password"
              name="confirmPassword"
              placeholder="Retype your new password"
              className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
              required
              minLength={6}
              disabled={!state.ok}
            />
          </label>

          <button
            type="submit"
            disabled={!state.ok}
            className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 dark:border-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            <KeyRound className="h-4 w-4" />
            Update password
          </button>
        </form>

        <div className="border-t border-slate-100 px-8 py-5 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Need a new link?{" "}
          <Link
            href="/forgot-password"
            className="font-semibold text-blue-600 transition hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
          >
            Request reset
          </Link>
        </div>
      </div>
    </div>
  );
}
