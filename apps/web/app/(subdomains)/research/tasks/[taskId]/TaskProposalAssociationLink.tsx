"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  FileText,
  FolderGit2,
  Link2,
  Pencil,
  Search,
  X,
} from "lucide-react";
import { updateProposalTaskAssociation } from "../../actions";
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

export type ProposalAssociationResearchOption = {
  id: string;
  title: string;
  code: string;
  stage: string;
};

export type ProposalAssociationProjectOption = {
  id: string;
  title: string;
  code: string;
  status: string;
};

type SelectedAssociation = {
  type: "research" | "project";
  id: string;
  title: string;
  meta: string;
};

function associationMeta(option: {
  code: string;
  stage?: string;
  status?: string;
}) {
  return [option.code, option.stage ?? option.status]
    .filter(Boolean)
    .join(" - ");
}

export function TaskProposalAssociationLink({
  taskId,
  currentAssociation,
  researchOptions,
  projectOptions,
  canManage,
}: {
  taskId: string;
  currentAssociation: SelectedAssociation | null;
  researchOptions: ProposalAssociationResearchOption[];
  projectOptions: ProposalAssociationProjectOption[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"research" | "project">(
    currentAssociation?.type ?? "research",
  );
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SelectedAssociation | null>(
    currentAssociation,
  );
  const [isPending, startTransition] = useTransition();
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useResearchToast();

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    if (tab === "research") {
      return researchOptions
        .filter((option) =>
          [option.title, option.code, option.stage, option.id]
            .join(" ")
            .toLowerCase()
            .includes(needle),
        )
        .slice(0, 8)
        .map((option) => ({
          type: "research" as const,
          id: option.id,
          title: option.title,
          meta: associationMeta(option),
        }));
    }
    return projectOptions
      .filter((option) =>
        [option.title, option.code, option.status, option.id]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 8)
      .map((option) => ({
        type: "project" as const,
        id: option.id,
        title: option.title,
        meta: associationMeta(option),
      }));
  }, [projectOptions, query, researchOptions, tab]);

  function openPicker() {
    if (!canManage) return;
    setSelected(currentAssociation);
    setTab(currentAssociation?.type ?? "research");
    setQuery("");
    setOpen(true);
  }

  function saveAssociation() {
    if (!selected || isPending) return;
    const formData = new FormData();
    formData.set("associationType", selected.type);
    formData.set("associationId", selected.id);
    startTransition(async () => {
      const result = await updateProposalTaskAssociation(taskId, formData);
      if (!result?.ok) {
        toast.showError({
          title: "Linked item was not updated",
          detail:
            result?.reason === "ASSOCIATION_NOT_FOUND"
              ? "The selected research or project could not be found."
              : "Choose one research or project and try again.",
        });
        return;
      }
      setOpen(false);
      toast.showSuccess({
        title: "Linked item updated",
        detail: "This proposal task is now connected to the selected item.",
      });
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className={`group w-full border border-dashed border-[#CFC6B8] bg-[#FBF9F4] p-4 text-left transition duration-180 dark:border-[#4A4A4A] dark:bg-[#262626] ${
          canManage
            ? "cursor-pointer hover:-translate-y-0.5 hover:border-[#7FBFC5] hover:bg-[#F3F8F6] dark:hover:border-[#A8DADC] dark:hover:bg-[#303838]"
            : "cursor-default"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
              {currentAssociation?.type === "project"
                ? "Linked project"
                : "Linked research"}
            </div>
            {currentAssociation ? (
              <>
                <p className="mt-2 truncate text-sm font-normal text-[#1F7180] dark:text-[#A8DADC]">
                  {currentAssociation.title}
                </p>
                <p className="mt-1 truncate text-xs text-[#667085] dark:text-[#B0B0B0]">
                  {currentAssociation.meta || "No ID recorded"}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm font-normal text-[#243047] dark:text-[#E4E4E4]">
                  No research or project linked.
                </p>
                <p className="mt-1 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
                  {canManage
                    ? "Click to link one research or project to this proposal task."
                    : "Admin can link this proposal task to a research or project."}
                </p>
              </>
            )}
          </div>
          {canManage ? (
            <IconHint
              label={currentAssociation ? "Change linked item" : "Link item"}
            >
              <span className="research-clickable-icon inline-flex flex-none text-[#1F7180] dark:text-[#A8DADC]">
                {currentAssociation ? (
                  <Pencil className="h-4 w-4" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
              </span>
            </IconHint>
          ) : null}
        </div>
      </button>

      <ResearchModal
        open={open}
        onClose={() => setOpen(false)}
        title={currentAssociation ? "Change linked item" : "Link proposal task"}
        icon={<Link2 className="h-5 w-5" />}
        maxWidth="max-w-2xl"
        headerActions={
          <ResearchButton
            type="button"
            onClick={saveAssociation}
            disabled={!selected || isPending}
          >
            <Check className="h-4 w-4" />
            {isPending ? "Saving..." : "Save link"}
          </ResearchButton>
        }
      >
        <div className="grid gap-4">
          <div className="journal-detail-tabs grid grid-cols-2 border border-[#D8D0C2] p-1 dark:border-[#444444]">
            {(["research", "project"] as const).map((value) => (
              <button
                key={value}
                type="button"
                data-active={tab === value}
                className="journal-detail-tab-button px-4 py-2 text-sm capitalize"
                onClick={() => {
                  setTab(value);
                  setQuery("");
                  setSelected(null);
                }}
              >
                {value}
              </button>
            ))}
          </div>

          {selected ? (
            <div className="flex max-w-full items-center justify-between gap-3 overflow-hidden border border-[#D8D0C2] bg-[#FFFDF8] px-3 py-2 dark:border-[#444444] dark:bg-[#202020]">
              <span className="min-w-0 flex-1 overflow-hidden">
                <span className="block truncate text-sm text-[#243047] dark:text-[#E4E4E4]">
                  {selected.title}
                </span>
                <span className="block truncate text-xs text-[#667085] dark:text-[#B0B0B0]">
                  {selected.meta}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="research-clickable-icon flex-none text-[#667085] hover:text-[#B33E5C] dark:text-[#B0B0B0] dark:hover:text-[#FF9DAE]"
                aria-label="Clear selected linked item"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div ref={searchRef} className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C95A4] dark:text-[#B0B0B0]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                tab === "research"
                  ? "Search research by title, ID, or stage..."
                  : "Search project by title, ID, or status..."
              }
              className={`${researchSearchFieldClass} pl-9`}
            />
            <FloatingDropdownPortal
              anchorRef={searchRef}
              open={query.trim().length > 0}
              maxPanelHeight={224}
            >
              <div className={researchDropdownPanelClass}>
                <div className="max-h-[var(--research-dropdown-max-height)] overflow-y-auto">
                  {results.length > 0 ? (
                    results.map((item) => {
                      const Icon =
                        item.type === "research" ? FileText : FolderGit2;
                      return (
                        <button
                          key={`${item.type}-${item.id}`}
                          type="button"
                          onClick={() => {
                            setSelected(item);
                            setQuery("");
                          }}
                          className={`${researchDropdownItemClass} ${researchDropdownItemIdleClass} justify-start px-3`}
                        >
                          <Icon className="h-4 w-4 flex-none text-[#1F7180] dark:text-[#A8DADC]" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">
                              {item.title}
                            </span>
                            <span className="block truncate text-xs text-[#667085] dark:text-[#B0B0B0]">
                              {item.meta}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-3 text-sm text-[#667085] dark:text-[#B0B0B0]">
                      No matching {tab} found.
                    </div>
                  )}
                </div>
              </div>
            </FloatingDropdownPortal>
          </div>
        </div>
      </ResearchModal>
    </>
  );
}
