"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  IconHint,
  TableSearchInput,
} from "@/sites/research/components/TableControls";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { SuggestedReviewerDialog } from "./SuggestedReviewerDialog";

export type SuggestedReviewerRow = {
  id: string;
  name: string;
  email: string;
  institution: string;
  bio: string;
  updatedAt: string;
  createdBy: string;
};

function DeleteReviewerButton({
  reviewer,
  action,
}: {
  reviewer: SuggestedReviewerRow;
  action: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const toast = useResearchToast();

  return (
    <>
      <IconHint label="Delete suggested reviewer">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="research-allow-transform inline-flex h-6 w-6 items-center justify-center border-0 bg-transparent text-rose-700 transition hover:-translate-y-0.5 hover:text-rose-800 active:translate-y-0 active:scale-95 dark:text-rose-300 dark:hover:text-rose-200"
          aria-label={`Delete ${reviewer.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </IconHint>
      <ResearchConfirmDialog
        open={open}
        title="Delete this suggested reviewer?"
        confirmLabel={pending ? "Deleting..." : "Delete reviewer"}
        isConfirming={pending}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          setPending(true);
          try {
            await action(reviewer.id);
            setOpen(false);
            router.refresh();
            toast.showSuccess({
              title: "Suggested reviewer deleted",
              detail: `${reviewer.name} has been removed.`,
            });
          } catch (error) {
            toast.showError({
              title: "Suggested reviewer was not deleted",
              detail:
                error instanceof Error
                  ? error.message
                  : "Refresh the page and try again.",
            });
          } finally {
            setPending(false);
          }
        }}
      >
        <p>
          This removes the reviewer from the reviewer list and any task reviewer
          suggestions.
        </p>
      </ResearchConfirmDialog>
    </>
  );
}

export function SuggestedReviewersTable({
  rows,
  updateAction,
  deleteAction,
}: {
  rows: SuggestedReviewerRow[];
  updateAction: (id: string, formData: FormData) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.name, row.email, row.institution, row.bio]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, rows]);

  return (
    <div className="overflow-hidden border border-slate-200 bg-white dark:border-[#444444] dark:bg-[#2C2C2C]">
      <div className="border-b border-slate-200 py-3 dark:border-[#444444]">
        <TableSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search reviewer name, email, institution, or bio..."
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[62rem] table-fixed text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-[#444444] dark:bg-[#383838] dark:text-[#B0B0B0]">
            <tr>
              <th className="w-[18%] px-4 py-3">Name</th>
              <th className="w-[21%] px-4 py-3">Email</th>
              <th className="w-[22%] px-4 py-3">Institution</th>
              <th className="px-4 py-3">Bio</th>
              <th className="w-12 px-2 py-3 text-center">
                <span className="sr-only">Edit</span>
              </th>
              <th className="w-12 px-2 py-3 text-center">
                <span className="sr-only">Delete</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-[#444444]">
            {filtered.map((reviewer) => (
              <tr
                key={reviewer.id}
                className="align-top transition-colors hover:bg-slate-50 dark:hover:bg-[#383838]"
              >
                <td className="px-4 py-3 text-sm font-normal text-slate-900 dark:text-[#E4E4E4]">
                  {reviewer.name}
                </td>
                <td className="px-4 py-3 text-sm text-[#1F7180] dark:text-[#A8DADC]">
                  {reviewer.email}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-[#B0B0B0]">
                  {reviewer.institution || "Not set"}
                </td>
                <td className="px-4 py-3">
                  <p className="line-clamp-1 text-sm text-slate-600 dark:text-[#B0B0B0]">
                    {reviewer.bio || "No bio"}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-[#777777]">
                    Updated {reviewer.updatedAt} · Created by{" "}
                    {reviewer.createdBy}
                  </p>
                </td>
                <td className="px-2 py-3 text-center">
                  <SuggestedReviewerDialog
                    mode="edit"
                    action={updateAction.bind(null, reviewer.id)}
                    initialValues={reviewer}
                  />
                </td>
                <td className="px-2 py-3 text-center">
                  <DeleteReviewerButton
                    reviewer={reviewer}
                    action={deleteAction}
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-2">
                  <ResearchEmptyState
                    title="No suggested reviewers match this search."
                    detail={
                      rows.length
                        ? "Try another name, email, institution, or keyword."
                        : "Create the first suggested reviewer."
                    }
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
