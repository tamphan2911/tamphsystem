"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  Download,
  FileText,
  GitBranch,
  Loader2,
  Pencil,
  PlusCircle,
  Route,
  Save,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  ResearchButton,
  ResearchIconButton,
  researchFieldClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import {
  IconHint,
  TableSearchInput,
} from "@/sites/research/components/TableControls";

export type WorkflowStep = {
  title: string;
  detail: string;
  options?: WorkflowOption[];
};

export type WorkflowOption = {
  label: string;
  detail: string;
};

export type WorkflowGuideRow = {
  id: string;
  guideCode: string;
  title: string;
  content: string;
  workflow: WorkflowStep[];
  workflowText: string;
  supportFileName: string;
  supportFileSize: string;
  updatedAt: string;
  createdBy: string;
};

type GuideAction = (formData: FormData) => Promise<void>;

function WorkflowGuideDialog({
  mode,
  action,
  initialValues,
}: {
  mode: "create" | "edit";
  action: GuideAction;
  initialValues?: WorkflowGuideRow;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useResearchToast();
  const isEdit = mode === "edit";

  return (
    <>
      {isEdit ? (
        <ResearchIconButton
          type="button"
          label="Edit workflow guide"
          tone="blue"
          className="!h-6 !w-6"
          onClick={() => setOpen(true)}
        >
          <Pencil className="h-4 w-4" />
        </ResearchIconButton>
      ) : (
        <ResearchButton type="button" onClick={() => setOpen(true)}>
          <PlusCircle className="h-4 w-4" />
          New Workflow Guide
        </ResearchButton>
      )}

      <ResearchModal
        open={open}
        onClose={() => setOpen(false)}
        title={isEdit ? "Edit Workflow Guide" : "New Workflow Guide"}
        icon={<Route className="h-5 w-5" />}
        maxWidth="max-w-4xl"
        headerActions={
          <ResearchButton form="workflow-guide-form" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEdit ? (
              <Save className="h-4 w-4" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            {isEdit ? "Save changes" : "Create guide"}
          </ResearchButton>
        }
      >
        <form
          id="workflow-guide-form"
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const supportFileInput = form.elements.namedItem(
              "supportFile",
            ) as HTMLInputElement | null;
            const file = supportFileInput?.files?.[0];
            if (file && file.size > 2 * 1024 * 1024) {
              toast.showError({
                title: "Support file is too large",
                detail: "Upload a Word or PDF file that is 2 MB or smaller.",
              });
              return;
            }
            const formData = new FormData(form);
            startTransition(async () => {
              try {
                await action(formData);
                setOpen(false);
                router.refresh();
                toast.showSuccess({
                  title: isEdit
                    ? "Workflow guide updated"
                    : "Workflow guide created",
                  detail: "Assistants can now follow this workflow guide.",
                });
              } catch (error) {
                toast.showError({
                  title: "Workflow guide was not saved",
                  detail:
                    error instanceof Error
                      ? error.message
                      : "Check the guide information and try again.",
                });
              }
            });
          }}
        >
          {isEdit ? (
            <label className="grid gap-1.5 text-sm">
              <span className="text-xs uppercase text-slate-500 dark:text-[#B0B0B0]">
                Guide ID
              </span>
              <input
                value={initialValues?.guideCode ?? ""}
                readOnly
                aria-label="Guide ID"
                className={`${researchFieldClass} font-mono`}
              />
            </label>
          ) : null}
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs uppercase text-slate-500 dark:text-[#B0B0B0]">
              Title
            </span>
            <input
              name="title"
              required
              defaultValue={initialValues?.title}
              placeholder="Example: Venue suggestion decision path"
              className={researchFieldClass}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs uppercase text-slate-500 dark:text-[#B0B0B0]">
              Content
            </span>
            <textarea
              name="content"
              required
              rows={8}
              defaultValue={initialValues?.content}
              placeholder="Write the policy, checklist, and expected assistant behavior."
              className={`${researchTextareaClass} min-h-48 whitespace-pre-wrap`}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs uppercase text-slate-500 dark:text-[#B0B0B0]">
              Workflow steps
            </span>
            <textarea
              name="workflowText"
              rows={7}
              defaultValue={initialValues?.workflowText}
              placeholder={
                "One step per line. Use: Step title :: What happens => Option A: next action | Option B: next action | Option C: next action"
              }
              className={`${researchTextareaClass} min-h-40 whitespace-pre-wrap`}
            />
            <span className="text-xs leading-5 text-slate-500 dark:text-[#B0B0B0]">
              Add branches after =&gt; and separate each branch with |.
            </span>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs uppercase text-slate-500 dark:text-[#B0B0B0]">
              Support file
            </span>
            <span className="flex min-h-12 items-center gap-3 border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-[#444444] dark:bg-[#202020] dark:text-[#E4E4E4]">
              <FileText className="h-4 w-4 flex-none text-[#1F7180] dark:text-[#A8DADC]" />
              <input
                name="supportFile"
                type="file"
                accept=".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                className="min-w-0 flex-1 cursor-pointer text-sm file:mr-3 file:border-0 file:bg-[#1F7180] file:px-3 file:py-1.5 file:text-sm file:font-normal file:text-white hover:file:bg-[#155864] dark:file:bg-[#A8DADC] dark:file:text-[#1F2937]"
              />
            </span>
            <span className="text-xs leading-5 text-slate-500 dark:text-[#B0B0B0]">
              {initialValues?.supportFileName
                ? `Current: ${initialValues.supportFileName}${
                    initialValues.supportFileSize
                      ? ` (${initialValues.supportFileSize})`
                      : ""
                  }. Optional replacement.`
                : "Optional. Accepted formats: .doc, .docx, .pdf. Maximum 2 MB."}
            </span>
          </label>
        </form>
      </ResearchModal>
    </>
  );
}

function DeleteGuideButton({
  guide,
  action,
}: {
  guide: WorkflowGuideRow;
  action: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const toast = useResearchToast();

  return (
    <>
      <IconHint label="Delete workflow guide">
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
        title="Delete this workflow guide?"
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
              title: "Workflow guide deleted",
              detail: `${guide.title} has been removed.`,
            });
          } catch (error) {
            toast.showError({
              title: "Workflow guide was not deleted",
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
        <p>This removes the assistant workflow guide and its support file.</p>
      </ResearchConfirmDialog>
    </>
  );
}

function WorkflowDiagram({ steps }: { steps: WorkflowStep[] }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  if (steps.length === 0) {
    return (
      <div className="border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-[#555555] dark:text-[#B0B0B0]">
        No diagram steps yet.
      </div>
    );
  }

  return (
    <div
      className={`relative h-[34rem] overflow-hidden border border-slate-200 bg-slate-50 dark:border-[#444444] dark:bg-[#202020] ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{ touchAction: "none" }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          originX: offset.x,
          originY: offset.y,
        };
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        setOffset({
          x: drag.originX + event.clientX - drag.startX,
          y: drag.originY + event.clientY - drag.startY,
        });
      }}
      onPointerUp={(event) => {
        if (dragRef.current?.pointerId === event.pointerId) {
          dragRef.current = null;
          setDragging(false);
        }
      }}
      onPointerCancel={() => {
        dragRef.current = null;
        setDragging(false);
      }}
    >
      <div
        className="absolute left-0 top-0 min-h-full min-w-max p-8 transition-[transform] duration-75"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        <div className="flex items-start gap-8">
          {steps.map((step, index) => (
            <div
              key={`${step.title}-${index}`}
              className="flex items-start gap-8"
            >
              <WorkflowTreeStep step={step} index={index} />
              {index < steps.length - 1 ? (
                <ArrowRight className="mt-14 h-5 w-5 flex-none text-[#1F7180] dark:text-[#A8DADC]" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkflowTreeStep({
  step,
  index,
}: {
  step: WorkflowStep;
  index: number;
}) {
  const options = step.options ?? [];
  const branchWidth = Math.max(18, options.length * 13);

  return (
    <div
      className="flex flex-none flex-col items-center"
      style={{ width: `${branchWidth}rem` }}
    >
      <div className="w-72 border border-slate-200 bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#1F7180] dark:border-[#444444] dark:bg-[#242424] dark:hover:border-[#A8DADC]">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 flex-none items-center justify-center border border-[#1F7180] text-xs font-normal text-[#1F7180] dark:border-[#A8DADC] dark:text-[#A8DADC]">
            {index + 1}
          </span>
          <p className="min-w-0 truncate text-sm font-normal text-slate-950 dark:text-[#E4E4E4]">
            {step.title}
          </p>
        </div>
        {step.detail ? (
          <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-[#B0B0B0]">
            {step.detail}
          </p>
        ) : null}
      </div>

      {options.length > 0 ? (
        <>
          <div className="h-5 w-px bg-[#1F7180]/40 dark:bg-[#A8DADC]/45" />
          <div className="h-px w-[calc(100%-4rem)] bg-[#1F7180]/30 dark:bg-[#A8DADC]/35" />
          <div
            className="mt-4 grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${options.length}, minmax(11rem, 1fr))`,
            }}
          >
            {options.map((option, optionIndex) => (
              <div
                key={`${option.label}-${optionIndex}`}
                className="relative border border-[#D8D0C2] bg-[#FFFDF8] p-3 dark:border-[#444444] dark:bg-[#2C2C2C]"
              >
                <div className="absolute -top-4 left-1/2 h-4 w-px -translate-x-1/2 bg-[#1F7180]/30 dark:bg-[#A8DADC]/35" />
                <p className="text-xs font-normal uppercase tracking-wide text-[#1F7180] dark:text-[#A8DADC]">
                  {option.label}
                </p>
                {option.detail ? (
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-[#B0B0B0]">
                    {option.detail}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function WorkflowGuideHeaderAction({
  isAdmin,
  createAction,
}: {
  isAdmin: boolean;
  createAction: GuideAction;
}) {
  return isAdmin ? (
    <WorkflowGuideDialog mode="create" action={createAction} />
  ) : null;
}

export function WorkflowGuidesClient({
  rows,
  isAdmin,
  createAction,
  updateAction,
  deleteAction,
}: {
  rows: WorkflowGuideRow[];
  isAdmin: boolean;
  createAction: GuideAction;
  updateAction: (id: string, formData: FormData) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(rows[0]?.id ?? "");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [
        row.guideCode,
        row.title,
        row.content,
        row.supportFileName,
        ...row.workflow.flatMap((step) => [step.title, step.detail]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, rows]);
  const activeGuide =
    filtered.find((guide) => guide.id === activeId) ?? filtered[0] ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <aside className="border border-slate-200 bg-white dark:border-[#444444] dark:bg-[#2C2C2C]">
        <div className="border-b border-slate-200 py-3 dark:border-[#444444]">
          <TableSearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search workflow guides..."
          />
        </div>
        <div className="max-h-[calc(100vh-17rem)] overflow-y-auto">
          {filtered.map((guide) => (
            <button
              key={guide.id}
              type="button"
              data-active={activeGuide?.id === guide.id}
              onClick={() => setActiveId(guide.id)}
              className="group w-full cursor-pointer border-b border-slate-200 px-4 py-3 text-left transition duration-200 hover:bg-slate-50 data-[active=true]:bg-[#E8F6F8] dark:border-[#444444] dark:hover:bg-[#383838] dark:data-[active=true]:bg-[#1F3A40]"
            >
              <p className="font-mono text-[11px] uppercase text-[#1F7180] dark:text-[#A8DADC]">
                {guide.guideCode}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-950 dark:text-[#E4E4E4]">
                {guide.title}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-[#B0B0B0]">
                {guide.workflow.length} step
                {guide.workflow.length === 1 ? "" : "s"}
              </p>
            </button>
          ))}
          {filtered.length === 0 ? (
            <ResearchEmptyState
              title="No workflow guides match this search."
              detail={rows.length ? "Try another keyword." : "Create a guide."}
            />
          ) : null}
        </div>
      </aside>

      <section className="min-w-0 border border-slate-200 bg-white dark:border-[#444444] dark:bg-[#2C2C2C]">
        {activeGuide ? (
          <div className="p-4">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-[#444444] lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-[#1F7180] dark:text-[#A8DADC]" />
                  <p className="font-mono text-xs uppercase text-[#1F7180] dark:text-[#A8DADC]">
                    {activeGuide.guideCode}
                  </p>
                </div>
                <h2 className="mt-2 text-xl font-normal text-slate-950 dark:text-[#E4E4E4]">
                  {activeGuide.title}
                </h2>
                <p className="mt-2 max-w-4xl whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-[#B0B0B0]">
                  {activeGuide.content}
                </p>
              </div>
              <div className="flex flex-none items-center gap-2">
                {activeGuide.supportFileName ? (
                  <a
                    href={`/api/research/workflow-guides/${activeGuide.id}/file`}
                    className="research-clickable-icon inline-flex h-8 max-w-56 items-center gap-2 border border-slate-200 px-2 text-xs text-[#1F7180] transition hover:-translate-y-0.5 dark:border-[#444444] dark:text-[#A8DADC]"
                  >
                    <FileText className="h-3.5 w-3.5 flex-none" />
                    <span className="min-w-0 truncate">
                      {activeGuide.supportFileName}
                    </span>
                    <Download className="h-3.5 w-3.5 flex-none" />
                  </a>
                ) : null}
                {isAdmin ? (
                  <>
                    <WorkflowGuideDialog
                      mode="edit"
                      action={updateAction.bind(null, activeGuide.id)}
                      initialValues={activeGuide}
                    />
                    <DeleteGuideButton
                      guide={activeGuide}
                      action={deleteAction}
                    />
                  </>
                ) : null}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-normal uppercase tracking-wide text-slate-500 dark:text-[#B0B0B0]">
                Interactive workflow
              </p>
              <div className="mt-3">
                <WorkflowDiagram steps={activeGuide.workflow} />
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {activeGuide.workflow.map((step, index) => (
                <div
                  key={`${step.title}-detail-${index}`}
                  className="border border-slate-200 bg-slate-50 p-3 dark:border-[#444444] dark:bg-[#242424]"
                >
                  <p className="text-xs uppercase text-slate-500 dark:text-[#8F98A8]">
                    Case {index + 1}
                  </p>
                  <p className="mt-1 text-sm text-slate-950 dark:text-[#E4E4E4]">
                    {step.title}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-[#B0B0B0]">
                    {step.detail || "Follow the main content for this step."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ResearchEmptyState
            title="No workflow guide selected."
            detail="Choose a guide from the list."
          />
        )}
      </section>
    </div>
  );
}
