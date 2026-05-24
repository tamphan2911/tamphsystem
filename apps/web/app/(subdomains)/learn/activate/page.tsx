import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { auth } from "../../../../auth";
import { activateLearnSite } from "./actions";

export default async function ActivateLearnPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900">
          <GraduationCap className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Activate Learn access</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Your account is already signed in. Confirm once to activate it for the
          learning workspace.
        </p>
        <form action={activateLearnSite} className="mt-6">
          <button className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-bold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-md dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
            Activate Learn
          </button>
        </form>
      </div>
    </div>
  );
}
