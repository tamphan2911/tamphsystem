"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  Check,
  FileSearch,
  Link2,
  Loader2,
  Save,
  Search,
  X,
} from "lucide-react";
import { FloatingDropdownPortal } from "@/sites/research/components/FloatingDropdownPortal";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  IconHint,
  ResearchButton,
  researchDropdownItemClass,
  researchDropdownItemIdleClass,
  researchDropdownPanelClass,
  researchSearchFieldClass,
} from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

export type ProjectProductRow = {
  id: string;
  title: string;
  completed: boolean;
  linkedResearch: {
    id: string;
    title: string;
    researchCode: string;
    stage: string;
  } | null;
};

export type ProjectProductResearchOption = {
  id: string;
  title: string;
  researchCode: string;
  stage: string;
};

function researchLabel(research: ProjectProductResearchOption) {
  return [research.researchCode, research.title].filter(Boolean).join(" - ");
}

function LinkedResearchDialog({
  product,
  researchOptions,
  action,
  onClose,
}: {
  product: ProjectProductRow;
  researchOptions: ProjectProductResearchOption[];
  action: (productId: string, formData: FormData) => Promise<{
    ok: boolean;
    reason?: string;
  }>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] =
    useState<ProjectProductResearchOption | null>(
      product.linkedResearch
        ? {
            id: product.linkedResearch.id,
            title: product.linkedResearch.title,
            researchCode: product.linkedResearch.researchCode,
            stage: product.linkedResearch.stage,
          }
        : null,
    );
  const [isPending, startTransition] = useTransition();
  const toast = useResearchToast();
  const searchRef = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return researchOptions
      .filter((research) => research.id !== selected?.id)
      .filter((research) =>
        [research.researchCode, research.title, research.stage]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 8);
  }, [query, researchOptions, selected?.id]);

  function saveLink() {
    const formData = new FormData();
    if (selected) formData.set("linkedResearchProjectId", selected.id);
    startTransition(async () => {
      const result = await action(product.id, formData);
      if (!result?.ok) {
        toast.showError({
          title: "Product link was not saved",
          detail:
            result?.reason === "RESEARCH_NOT_AVAILABLE"
              ? "Choose a linked research that is accepted or published."
              : "You do not have permission to update this required product.",
        });
        return;
      }
      onClose();
      toast.showSuccess({
        title: "Product research link saved",
        detail: selected
          ? "The required product is now linked to that research result."
          : "The required product is no longer linked to a research result.",
      });
    });
  }

  return (
    <ResearchModal
      open
      onClose={onClose}
      title="Link research result"
      description=""
      icon={<Link2 className="h-5 w-5" />}
      maxWidth="max-w-3xl"
      headerActions={
        <ResearchButton type="button" onClick={saveLink} disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save link
        </ResearchButton>
      }
    >
      <div className="grid gap-4">
        <div className="border border-[#D8D0C2] bg-[#FFFDF8] p-3 dark:border-[#444444] dark:bg-[#202020]">
          <p className="text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
            Required product
          </p>
          <p className="mt-1 whitespace-normal break-words text-sm font-normal text-[#1f2937] dark:text-[#E4E4E4]">
            {product.title}
          </p>
        </div>

        {researchOptions.length === 0 ? (
          <div className="border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-normal leading-5 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
            This project does not have any linked research that is accepted or
            published yet. Link an accepted or published research to the project
            first, then come back to connect it with this required product.
          </div>
        ) : (
          <div className="grid gap-2">
            <div ref={searchRef} className="relative">
              {selected ? (
                <div className="flex min-h-12 items-center gap-2 border border-[#D8D0C2] bg-[#FFFDF8] px-3 text-sm text-[#1f2937] dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4]">
                  <FileSearch
                    className="h-4 w-4 flex-none text-[#1F7180] dark:text-[#A8DADC]"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {researchLabel(selected)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(null);
                      setQuery("");
                    }}
                    className="research-clickable-icon research-allow-transform inline-flex h-7 w-7 cursor-pointer items-center justify-center border-0 bg-transparent text-[#667085] transition hover:bg-transparent hover:text-rose-600 active:scale-95 dark:text-[#B0B0B0] dark:hover:text-rose-300"
                    aria-label="Clear linked research"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <label className="relative block">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085] dark:text-[#B0B0B0]"
                    aria-hidden="true"
                  />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search linked accepted or published research"
                    className={`${researchSearchFieldClass} pl-10`}
                  />
                </label>
              )}
              {!selected && query.trim() ? (
                <FloatingDropdownPortal
                  anchorRef={searchRef}
                  open
                  maxPanelHeight={272}
                >
                  <div className={researchDropdownPanelClass}>
                    {results.map((research) => (
                      <button
                        key={research.id}
                        type="button"
                        onClick={() => {
                          setSelected(research);
                          setQuery("");
                        }}
                        className={`${researchDropdownItemClass} ${researchDropdownItemIdleClass}`}
                      >
                        <FileSearch
                          className="h-4 w-4 flex-none text-[#1F7180] dark:text-[#A8DADC]"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 text-left">
                          <span className="block truncate text-sm font-normal">
                            {research.title}
                          </span>
                          <span className="block truncate text-xs opacity-75">
                            {[research.researchCode, research.stage]
                              .filter(Boolean)
                              .join(" - ")}
                          </span>
                        </span>
                      </button>
                    ))}
                    {results.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-[#667085] dark:text-[#B0B0B0]">
                        No matching accepted or published linked research.
                      </p>
                    ) : null}
                  </div>
                </FloatingDropdownPortal>
              ) : null}
            </div>
            <p className="text-xs font-normal leading-5 text-[#667085] dark:text-[#B0B0B0]">
              Only research already linked with this project and already
              accepted or published can be selected.
            </p>
          </div>
        )}
      </div>
    </ResearchModal>
  );
}

export function ProjectProductsForm({
  products,
  researchOptions,
  action,
  linkAction,
  embedded = false,
}: {
  products: ProjectProductRow[];
  researchOptions: ProjectProductResearchOption[];
  action: (formData: FormData) => Promise<void>;
  linkAction: (productId: string, formData: FormData) => Promise<{
    ok: boolean;
    reason?: string;
  }>;
  embedded?: boolean;
}) {
  const [selected, setSelected] = useState(
    () => new Set(products.filter((product) => product.completed).map((p) => p.id)),
  );
  const [linkingProduct, setLinkingProduct] = useState<ProjectProductRow | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const toast = useResearchToast();

  function toggle(productId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
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
            <h2 className="text-sm font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
              Required products
            </h2>
            <IconHint label="Save required products" position="bottom">
              <button
                disabled={isPending || products.length === 0}
                className="research-clickable-icon research-allow-transform inline-flex h-8 w-8 cursor-pointer items-center justify-center border-0 bg-transparent text-[#1F7180] shadow-none outline-none transition-[color,transform] duration-200 ease-out hover:bg-transparent hover:text-[#155864] hover:shadow-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#A8DADC] dark:hover:text-cyan-200"
                aria-label="Save required products"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </button>
            </IconHint>
          </div>
        </div>
        <div className="divide-y divide-[#D8D0C2] border-y border-[#D8D0C2] dark:divide-[#444444] dark:border-[#444444]">
          {products.map((product) => {
            const checked = selected.has(product.id);

            return (
              <div
                key={product.id}
                className="group/product grid grid-cols-[2.125rem_minmax(0,1fr)] items-start gap-3 py-3 transition hover:bg-[#f8f6ef] dark:hover:bg-[#303030]"
              >
                <label className="mt-0.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="completedProductIds"
                    value={product.id}
                    checked={checked}
                    onChange={() => toggle(product.id)}
                    className="sr-only"
                  />
                  <span
                    className={`relative flex h-8 w-8 items-center justify-center border transition group-hover/product:border-[#7f8a9a] dark:group-hover/product:border-[#666666] ${
                      checked
                        ? "border-[#1F7180] bg-[#e5f3f4] text-[#1F7180] dark:border-[#A8DADC] dark:bg-[#263636] dark:text-[#A8DADC]"
                        : "border-[#D8D0C2] bg-[#FFFDF8] text-[#9aa3b2] dark:border-[#444444] dark:bg-[#202020] dark:text-[#666666]"
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
                </label>
                <button
                  type="button"
                  onClick={() => setLinkingProduct(product)}
                  className="research-allow-transform min-w-0 cursor-pointer border-0 bg-transparent p-0 text-left transition hover:bg-transparent active:scale-[0.995]"
                >
                  <span className="block whitespace-normal break-words text-sm font-normal leading-5 text-[#1f2937] transition group-hover/product:text-[#1F7180] dark:text-[#E4E4E4] dark:group-hover/product:text-[#A8DADC]">
                    {product.title}
                  </span>
                  <span className="mt-1 flex min-w-0 items-center gap-1 text-xs font-normal text-[#667085] dark:text-[#B0B0B0]">
                    <Link2
                      className="h-3.5 w-3.5 flex-none text-[#1F7180] dark:text-[#A8DADC]"
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      {product.linkedResearch
                        ? `Linked: ${[
                            product.linkedResearch.researchCode,
                            product.linkedResearch.title,
                          ]
                            .filter(Boolean)
                            .join(" - ")}`
                        : "Click to link an accepted or published research result"}
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
          {products.length === 0 && (
            <p className="px-3 py-5 text-sm text-[#777777]">
              No required products have been defined yet.
            </p>
          )}
        </div>
      </form>

      {linkingProduct ? (
        <LinkedResearchDialog
          product={linkingProduct}
          researchOptions={researchOptions}
          action={linkAction}
          onClose={() => setLinkingProduct(null)}
        />
      ) : null}
    </section>
  );
}
