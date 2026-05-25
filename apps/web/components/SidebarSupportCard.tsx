import { LifeBuoy } from "lucide-react";

export function SidebarSupportCard({
  collapsed = false,
}: {
  collapsed?: boolean;
}) {
  if (collapsed) {
    return (
      <div
        aria-label="Contact support"
        title="Contact support"
        className="mx-3 mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-white hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
      >
        <LifeBuoy className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className="m-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300">
          <LifeBuoy className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-950 dark:text-white">
            Need support?
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">
            For account, access, or platform issues? Find me! Yes, you know who
            to look for. If not, this place is not for you!
          </p>
        </div>
      </div>
    </div>
  );
}
