"use client";

import { useState, useTransition } from "react";
import { CheckSquare, Loader2, Save } from "lucide-react";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

export function ProjectProductsForm({
  requiredProducts,
  completedProducts,
  action,
}: {
  requiredProducts: string[];
  completedProducts: string[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [selected, setSelected] = useState(() => new Set(completedProducts));
  const [isPending, startTransition] = useTransition();
  const toast = useResearchToast();

  function toggle(product: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(product)) next.delete(product);
      else next.add(product);
      return next;
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(async () => {
            await action(formData);
            toast.showSuccess({
              title: "Project products saved",
              detail:
                "Required product progress was updated. If all products are complete, the project status is now completed.",
            });
          });
        }}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-emerald-500" />
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">
              Required products
            </h2>
          </div>
          <button
            disabled={isPending || requiredProducts.length === 0}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-200"
            aria-label="Save required products"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {requiredProducts.map((product) => (
            <label
              key={product}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/30"
            >
              <input
                type="checkbox"
                name="completedProducts"
                value={product}
                checked={selected.has(product)}
                onChange={() => toggle(product)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600"
              />
              <span>{product}</span>
            </label>
          ))}
          {requiredProducts.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
              No required products have been defined yet.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
