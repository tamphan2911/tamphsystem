"use client";

import { useMemo, useState } from "react";
import { BookOpenText, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  IconHint,
  TableSearchInput,
} from "@/sites/research/components/TableControls";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { TaskGuideDialog } from "./TaskGuideDialog";

export type TaskGuideRow = {
  id: string;
  guideCode: string;
  title: string;
  content: string;
  updatedAt: string;
  createdBy: string;
};

function DeleteGuideButton({
  guide,
  action,
}: {
  guide: TaskGuideRow;
  action: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const toast = useResearchToast();
  return (
    <>
      <IconHint label="Delete task guide">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="research-allow-transform inline-flex h-6 w-6 items-center justify-center border-0 bg-transparent text-rose-700 transition hover:-translate-y-0.5 hover:text-rose-800 active:translate-y-0 active:scale-95 dark:text-rose-300 dark:hover:text-rose-200"
          aria-label={`Delete ${guide.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </IconHint>
      <ResearchConfirmDialog
        open={open}
        title="Delete this task guide?"
        confirmLabel={pending ? "Deleting..." : "Delete guide"}
        isConfirming={pending}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          setPending(true);
          try {
            await action(guide.id);
            setOpen(false);
            router.refresh();
            toast.showSuccess({
              title: "Task guide deleted",
              detail: `${guide.title} has been removed.`,
            });
          } catch (error) {
            toast.showError({
              title: "Task guide was not deleted",
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
        <p>This removes the guide only. Existing tasks are not changed.</p>
      </ResearchConfirmDialog>
    </>
  );
}

export function TaskGuidesTable({
  rows,
  updateAction,
  deleteAction,
}: {
  rows: TaskGuideRow[];
  updateAction: (id: string, formData: FormData) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.guideCode, row.title, row.content]
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
          placeholder="Search guide ID, title, or content..."
        />
      </div>
      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-[#444444] dark:bg-[#383838] dark:text-[#B0B0B0]">
            <tr>
              <th className="w-24 px-4 py-3">ID</th>
              <th className="px-4 py-3">Guide</th>
              <th className="w-[9rem] px-3 py-3">Updated</th>
              <th className="w-12 px-2 py-3 text-center">
                <span className="sr-only">Edit</span>
              </th>
              <th className="w-12 px-2 py-3 text-center">
                <span className="sr-only">Delete</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-[#444444]">
            {filtered.map((guide) => (
              <tr
                key={guide.id}
                className="align-top transition-colors hover:bg-slate-50 dark:hover:bg-[#383838]"
              >
                <td className="px-4 py-3 font-mono text-xs text-violet-700 dark:text-violet-300">
                  {guide.guideCode}
                </td>
                <td className="px-4 py-3">
                  <p className="font-normal text-slate-900 dark:text-[#E4E4E4]">
                    {guide.title}
                  </p>
                  <p className="mt-1 line-clamp-3 whitespace-pre-line break-words text-xs leading-5 text-slate-500 dark:text-[#B0B0B0]">
                    {guide.content}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-[#777777]">
                    Created by {guide.createdBy}
                  </p>
                </td>
                <td className="px-3 py-3 text-xs text-slate-500 dark:text-[#B0B0B0]">
                  {guide.updatedAt}
                </td>
                <td className="px-2 py-3 text-center">
                  <TaskGuideDialog
                    mode="edit"
                    action={updateAction.bind(null, guide.id)}
                    initialValues={guide}
                  />
                </td>
                <td className="px-2 py-3 text-center">
                  <DeleteGuideButton guide={guide} action={deleteAction} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-2">
                  <ResearchEmptyState
                    title="No task guides match this search."
                    detail={
                      rows.length
                        ? "Try another guide ID or keyword."
                        : "Create the first task guide."
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
