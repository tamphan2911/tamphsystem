import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { auth } from "../../../../auth";
import { activateResearchSite } from "./actions";

export default async function ActivateResearchPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900">
          <BarChart3 className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Activate Research access</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Your account is already signed in. Confirm once to activate it for the
          research workspace, then research user search and assignment tools can
          include your account.
        </p>
        <form action={activateResearchSite} className="mt-6">
          <button className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-bold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow-md dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
            Activate Research
          </button>
        </form>
      </div>
    </div>
  );
}
