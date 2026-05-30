import Link from "next/link";
import { AlertTriangle, LockKeyhole, Mail } from "lucide-react";
import { TurnstileField } from "../../components/TurnstileField";
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
      detail: "Please complete the Cloudflare security check and try again.",
    };
  }
  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string;
    warning?: string;
    email?: string;
    error?: string;
  }>;
}) {
  const { callbackUrl, warning, email, error } = await searchParams;
  const redirectTo = safeRedirectPath(callbackUrl);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-950 transition-colors duration-200 dark:bg-slate-950 dark:text-white">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
        <div className="border-b border-slate-100 px-8 py-7 text-center dark:border-slate-800">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Use your TamphSystem account across portfolio, learn, admin, and
            research.
          </p>
        </div>

        <form action={loginUser} className="space-y-5 px-8 py-7">
          <input type="hidden" name="callbackUrl" value={redirectTo} />

          {warningMessage && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <div>
                <p className="font-bold">{warningMessage.title}</p>
                <p className="mt-1 leading-5">{warningMessage.detail}</p>
              </div>
            </div>
          )}

          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Email address
            <input
              type="email"
              name="email"
              defaultValue={email ?? ""}
              placeholder="you@example.com"
              className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
              required
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Password
            <input
              type="password"
              name="password"
              placeholder="Your password"
              className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
              required
            />
          </label>

          <TurnstileField siteKey={turnstileSiteKey} />

          <button
            type="submit"
            className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 dark:border-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            <Mail className="h-4 w-4" />
            Sign in
          </button>
        </form>

        <div className="border-t border-slate-100 px-8 py-5 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Need a research account?{" "}
          <Link
            href={`/register?callbackUrl=${encodeURIComponent(redirectTo)}`}
            className="font-semibold text-blue-600 transition hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
          >
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
