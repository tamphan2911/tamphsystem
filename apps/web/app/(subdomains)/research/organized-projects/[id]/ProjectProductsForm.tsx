"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Save } from "lucide-react";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

export function ProjectProductsForm({
  requiredProducts,
  completedProducts,
  action,
  embedded = false,
}: {
  requiredProducts: string[];
  completedProducts: string[];
  action: (formData: FormData) => Promise<void>;
  embedded?: boolean;
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
    <section
      className={
        embedded ? "" : "border border-[#444444] bg-[#2C2C2C] p-5 shadow-none"
      }
    >
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
            <h2 className="text-sm font-normal uppercase tracking-wide text-[#B0B0B0]">
              Required products
            </h2>
            <button
              disabled={isPending || requiredProducts.length === 0}
              className="research-task-icon-motion inline-flex h-8 w-8 cursor-pointer items-center justify-center border-0 bg-transparent text-[#B0B0B0] transition hover:text-[#A8DADC] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Save required products"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <div className="divide-y divide-[#444444] border-y border-[#444444]">
          {requiredProducts.map((product) => {
            const checked = selected.has(product);

            return (
              <label
                key={product}
                className="group/product grid cursor-pointer grid-cols-[2.125rem_minmax(0,1fr)] items-center gap-3 py-3 transition hover:bg-[#303030]"
              >
                <input
                  type="checkbox"
                  name="completedProducts"
                  value={product}
                  checked={checked}
                  onChange={() => toggle(product)}
                  className="sr-only"
                />
                <span
                  className={`relative flex h-8 w-8 items-center justify-center border bg-[#202020] transition group-hover/product:border-[#666666] ${
                    checked
                      ? "border-[#A8DADC] bg-[#263636] text-[#A8DADC] group-hover/product:border-[#A8DADC]"
                      : "border-[#444444] text-[#666666]"
                  }`}
                >
                  <Check
                    className={`h-4 w-4 transition ${checked ? "opacity-100" : "opacity-0"}`}
                    aria-hidden="true"
                  />
                  <span
                    className={`absolute h-2 w-2 bg-current transition ${checked ? "opacity-0" : "opacity-100"}`}
                  />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-normal text-[#E4E4E4]">
                    {product}
                  </span>
                </span>
              </label>
            );
          })}
          {requiredProducts.length === 0 && (
            <p className="px-3 py-5 text-sm text-[#777777]">
              No required products have been defined yet.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
