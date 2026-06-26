"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  BookOpenText,
  Check,
  Loader2,
  UserRoundPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { FloatingDropdownPortal } from "@/sites/research/components/FloatingDropdownPortal";
import {
  IconHint,
  ResearchButton,
  ResearchIconButton,
  cx,
  researchDropdownItemClass,
  researchDropdownItemIdleClass,
  researchDropdownPanelClass,
  researchSearchFieldClass,
} from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

export type SuggestedReviewerOption = {
  id: string;
  name: string;
  email: string;
  institution: string;
  bio: string;
};

type UpdateReviewerAction = (
  formData: FormData,
) => Promise<{ ok: boolean; reason?: string } | void>;

function reviewerText(reviewer: SuggestedReviewerOption) {
  return [reviewer.name, reviewer.email, reviewer.institution, reviewer.bio]
    .join(" ")
    .toLowerCase();
}

function failureMessage(reason: string | undefined) {
  if (reason === "TASK_CLOSED") {
    return "This task is already closed, so reviewer suggestions can no longer be changed.";
  }
  if (reason === "NOT_JOURNAL_SUBMIT_TASK") {
    return "Suggested reviewers can only be attached to journal submit tasks.";
  }
  if (reason === "INVALID_REVIEWER") {
    return "One of the selected reviewers is no longer available. Refresh the page and choose again.";
  }
  return "Could not update suggested reviewers. Please try again.";
}

export function TaskSuggestedReviewerButton({
  reviewers,
  selectedReviewers,
  action,
}: {
  reviewers: SuggestedReviewerOption[];
  selectedReviewers: SuggestedReviewerOption[];
  action: UpdateReviewerAction;
}) {
  const router = useRouter();
  const toast = useResearchToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(
    selectedReviewers.map((reviewer) => reviewer.id),
  );
  const [isPending, startTransition] = useTransition();
  const pickerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () =>
      selectedIds.flatMap(
        (id) => reviewers.find((reviewer) => reviewer.id === id) ?? [],
      ),
    [reviewers, selectedIds],
  );
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return reviewers
      .filter((reviewer) => !selectedIds.includes(reviewer.id))
      .filter((reviewer) => reviewerText(reviewer).includes(needle))
      .slice(0, 8);
  }, [query, reviewers, selectedIds]);

  function resetFromSaved() {
    setSelectedIds(selectedReviewers.map((reviewer) => reviewer.id));
    setQuery("");
  }

  function addReviewer(reviewerId: string) {
    setSelectedIds((current) =>
      current.includes(reviewerId) ? current : [...current, reviewerId],
    );
    setQuery("");
  }

  function removeReviewer(reviewerId: string) {
    setSelectedIds((current) => current.filter((id) => id !== reviewerId));
  }

  function saveReviewers() {
    const formData = new FormData();
    selectedIds.forEach((id) => formData.append("reviewerIds", id));
    startTransition(async () => {
      const result = await action(formData);
      if (result && !result.ok) {
        toast.showError({
          title: "Reviewer suggestions not saved",
          detail: failureMessage(result.reason),
        });
        return;
      }
      toast.showSuccess({
        title: "Suggested reviewers updated",
        detail:
          selectedIds.length > 0
            ? "The reviewer list is now attached to this submit task."
            : "The reviewer list was cleared for this submit task.",
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <ResearchIconButton
        type="button"
        label="Manage suggested reviewers"
        tone="violet"
        className="h-4 w-4"
        onClick={() => {
          resetFromSaved();
          setOpen(true);
        }}
      >
        <UserRoundPlus className="h-3.5 w-3.5" aria-hidden="true" />
      </ResearchIconButton>

      <ResearchModal
        open={open}
        onClose={() => {
          if (!isPending) setOpen(false);
        }}
        title="Suggested reviewers"
        icon={<UsersRound className="h-5 w-5" />}
        maxWidth="max-w-3xl"
        headerActions={
          <ResearchButton
            type="button"
            tone="success"
            onClick={saveReviewers}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
            Save reviewers
          </ResearchButton>
        }
      >
        <div className="grid gap-4">
          {selected.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selected.map((reviewer) => (
                <span
                  key={reviewer.id}
                  className="inline-flex max-w-full items-center gap-2 border border-[#d8d0c3] bg-[#f7f4ed] px-3 py-2 text-xs text-[#1F2937] dark:border-[#444444] dark:bg-[#202020] dark:text-[#E4E4E4]"
                >
                  <UsersRound className="h-3.5 w-3.5 flex-none text-[#6F5AA8] dark:text-[#C8B6E2]" />
                  <span className="min-w-0 truncate">
                    {reviewer.name} - {reviewer.email}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${reviewer.name}`}
                    onClick={() => removeReviewer(reviewer.id)}
                    className="research-clickable-icon research-allow-transform flex-none border-0 bg-transparent p-0 text-[#667085] hover:text-rose-600 dark:text-[#B0B0B0] dark:hover:text-rose-300"
                    disabled={isPending}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="border border-[#d8d0c3] bg-[#f7f4ed] px-3 py-2 text-sm text-[#667085] dark:border-[#444444] dark:bg-[#202020] dark:text-[#B0B0B0]">
              Search and choose one or more reviewers for this submission.
            </p>
          )}

          <div ref={pickerRef} className="relative">
            <div
              className={`${researchSearchFieldClass} flex items-center gap-3 px-3`}
            >
              <UserRoundPlus className="h-4 w-4 flex-none text-[#6F5AA8] dark:text-[#C8B6E2]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search reviewer by name, email, institution..."
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#1F2937] outline-none placeholder:text-slate-400 dark:text-[#E4E4E4] dark:placeholder:text-[#5A5A5A]"
                disabled={isPending}
              />
            </div>
            <FloatingDropdownPortal
              anchorRef={pickerRef}
              open={query.trim().length > 0 && !isPending}
              maxPanelHeight={224}
            >
              <div className={researchDropdownPanelClass}>
                <div className="max-h-[var(--research-dropdown-max-height)] overflow-y-auto">
                  {results.length > 0 ? (
                    results.map((reviewer) => (
                      <button
                        key={reviewer.id}
                        type="button"
                        onClick={() => addReviewer(reviewer.id)}
                        className={`${researchDropdownItemClass} ${researchDropdownItemIdleClass} justify-start px-3`}
                        disabled={isPending}
                      >
                        <UsersRound className="h-4 w-4 flex-none text-[#6F5AA8] dark:text-[#C8B6E2]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">
                            {reviewer.name}
                          </span>
                          <span className="block truncate text-xs text-[#667085] dark:text-[#B0B0B0]">
                            {[reviewer.email, reviewer.institution]
                              .filter(Boolean)
                              .join(" - ")}
                          </span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-sm text-[#667085] dark:text-[#B0B0B0]">
                      No reviewer matches this search.
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

export function TaskSuggestedReviewersTable({
  reviewers,
}: {
  reviewers: SuggestedReviewerOption[];
}) {
  const [openBio, setOpenBio] = useState<SuggestedReviewerOption | null>(null);
  if (reviewers.length === 0) return null;

  return (
    <>
      <section className="grid gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
          Suggested reviewers
        </h2>
        <div className="overflow-x-auto border border-[#D8D0C2] dark:border-[#444444]">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-[#e8e1d5] text-xs uppercase tracking-wide text-[#667085] dark:bg-[#1A1A1A] dark:text-[#B0B0B0]">
              <tr>
                <th className="px-4 py-3 font-normal">Name</th>
                <th className="px-4 py-3 font-normal">Email</th>
                <th className="px-4 py-3 font-normal">Institution</th>
                <th className="px-4 py-3 font-normal">Bio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8D0C2] dark:divide-[#444444]">
              {reviewers.map((reviewer) => (
                <tr
                  key={reviewer.id}
                  className="bg-[#f8f6ef] text-[#1F2937] transition-colors hover:bg-[#f1ece2] dark:bg-[#242424] dark:text-[#E4E4E4] dark:hover:bg-[#2B2B2B]"
                >
                  <td className="px-4 py-3 align-top">{reviewer.name}</td>
                  <td className="px-4 py-3 align-top text-[#667085] dark:text-[#B0B0B0]">
                    {reviewer.email}
                  </td>
                  <td className="px-4 py-3 align-top text-[#667085] dark:text-[#B0B0B0]">
                    {reviewer.institution || "Not set"}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="min-w-0 flex-1 truncate text-[#667085] dark:text-[#B0B0B0]">
                        {reviewer.bio || "No bio"}
                      </span>
                      {reviewer.bio ? (
                        <IconHint label={`Read bio: ${reviewer.name}`}>
                          <button
                            type="button"
                            onClick={() => setOpenBio(reviewer)}
                            className={cx(
                              "research-clickable-icon research-allow-transform inline-flex h-5 w-5 flex-none items-center justify-center border-0 bg-transparent shadow-none outline-none transition-[color,transform,filter] duration-200 ease-out hover:bg-transparent hover:shadow-none focus-visible:ring-0 active:scale-95",
                              "text-[#1F7180] hover:text-[#155864] dark:text-[#A8DADC] dark:hover:text-cyan-200",
                            )}
                            aria-label={`Read bio for ${reviewer.name}`}
                          >
                            <BookOpenText className="h-4 w-4" />
                          </button>
                        </IconHint>
                      ) : null}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ResearchModal
        open={Boolean(openBio)}
        onClose={() => setOpenBio(null)}
        title={openBio ? `${openBio.name} bio` : "Reviewer bio"}
        icon={<BookOpenText className="h-5 w-5" />}
        maxWidth="max-w-2xl"
      >
        <div className="whitespace-pre-wrap border border-[#d8d0c3] bg-[#f7f4ed] p-4 text-sm leading-6 text-[#1F2937] dark:border-[#444444] dark:bg-[#202020] dark:text-[#B0B0B0]">
          {openBio?.bio}
        </div>
      </ResearchModal>
    </>
  );
}
