"use client";

import {
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  Check,
  ClipboardList,
  FileUp,
  PlusCircle,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { createResearchTask } from "../../actions";
import { ResearchDatePicker } from "@/sites/research/components/ResearchDatePicker";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  ResearchButton,
  researchDropdownItemActiveClass,
  researchDropdownItemClass,
  researchDropdownItemIdleClass,
  researchDropdownPanelClass,
  researchFieldClass,
  researchSearchFieldClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { FloatingDropdownPortal } from "@/sites/research/components/FloatingDropdownPortal";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import type { TaskAssigneeOption } from "../../tasks/NewTaskDialog";
import { defaultResearchTaskDueDate } from "@/sites/research/lib/task-date";
import {
  TaskGuidePicker,
  type TaskGuideOption,
} from "../../tasks/TaskGuidePicker";

type SearchPanelItem = {
  id: string;
  title: string;
  meta: string;
  selected: boolean;
  onClick: () => void;
};

function defaultReviewTaskGuideIds(guides: TaskGuideOption[]) {
  const guide = guides.find((item) => item.guideCode === "G013");
  return guide ? [guide.id] : [];
}

const defaultTaskDescription =
  "Read the the general guide by click on icons right above.";

export function NewReviewTaskDialog({
  reviewId,
  manuscriptTitle,
  journalName,
  assignees,
  checkers = [],
  taskGuideOptions = [],
  canChooseChecker = false,
}: {
  reviewId: string;
  manuscriptTitle: string;
  journalName: string;
  assignees: TaskAssigneeOption[];
  checkers?: TaskAssigneeOption[];
  taskGuideOptions?: TaskGuideOption[];
  canChooseChecker?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [checkerQuery, setCheckerQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCheckerId, setSelectedCheckerId] = useState("");
  const [selectedTaskGuideIds, setSelectedTaskGuideIds] = useState<string[]>(
    () => defaultReviewTaskGuideIds(taskGuideOptions),
  );
  const [dueDate, setDueDate] = useState(defaultResearchTaskDueDate);
  const [allowReportUpload, setAllowReportUpload] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { showError, showSuccess } = useResearchToast();

  const filteredAssignees = useMemo(() => {
    const needle = assigneeQuery.trim().toLowerCase();
    if (!needle) return [];
    return assignees
      .filter((user) =>
        [user.name, user.email, user.id, ...user.roles]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 12);
  }, [assigneeQuery, assignees]);

  const filteredCheckers = useMemo(() => {
    const needle = checkerQuery.trim().toLowerCase();
    if (!needle || !canChooseChecker) return [];
    return checkers
      .filter((user) => user.id !== selectedCheckerId)
      .filter((user) =>
        [user.name, user.email, user.id, ...user.roles]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 12);
  }, [canChooseChecker, checkerQuery, checkers, selectedCheckerId]);

  const selectedAssigneeItems: SearchPanelItem[] = assignees
    .filter((user) => selectedIds.includes(user.id))
    .map((user) => ({
      id: user.id,
      title: displayResearchPersonName(user),
      meta: [displayResearchEmail(user.email), user.roles.join(", ")]
        .filter(Boolean)
        .join(" - "),
      selected: true,
      onClick: () => toggleAssignee(user.id),
    }));

  function reset() {
    setAssigneeQuery("");
    setCheckerQuery("");
    setSelectedIds([]);
    setSelectedCheckerId("");
    setSelectedTaskGuideIds(defaultReviewTaskGuideIds(taskGuideOptions));
    setDueDate(defaultResearchTaskDueDate());
    setAllowReportUpload(false);
  }

  function toggleAssignee(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
    setAssigneeQuery("");
  }

  function selectChecker(id: string) {
    setSelectedCheckerId(id);
    setCheckerQuery("");
  }

  function submitTask(formData: FormData) {
    startTransition(async () => {
      const result = await createResearchTask(formData);
      if (!result?.ok) {
        showError({
          title: "Task was not created",
          detail:
            result?.reason === "REVIEW_CLOSED"
              ? "This review is already submitted or closed, so it cannot receive a new task."
              : result?.reason === "INACTIVE_RESEARCH_ASSIGNEE"
                ? "Choose only users who have activated their research-site account."
                : result?.reason === "INVALID_CHECKER"
                  ? "Choose a chief assistant as checker, or leave checker empty."
                  : result?.reason === "TASK_FILE_TOO_LARGE"
                    ? "Task file must be 2 MB or smaller."
                    : result?.reason === "TASK_FILE_REJECTED"
                      ? "Upload the task file as PDF, DOC, DOCX, or XLSX."
                      : "Please check the task details and try again.",
        });
        return;
      }

      showSuccess({
        title: "Review task created",
        detail: `The review task for "${manuscriptTitle}" is now assigned to ${selectedIds.length} user${selectedIds.length === 1 ? "" : "s"}.`,
      });
      reset();
      setIsOpen(false);
    });
  }

  return (
    <>
      <ResearchButton type="button" onClick={() => setIsOpen(true)}>
        <PlusCircle className="h-4 w-4" />
        Create Task
      </ResearchButton>

      <ResearchModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Create Review Task"
        icon={<ClipboardList className="h-5 w-5" />}
        maxWidth="max-w-4xl"
        headerActions={
          <ResearchButton
            form="new-review-task-form"
            disabled={selectedIds.length === 0 || isPending}
          >
            <PlusCircle className="h-4 w-4" />
            Create Task
          </ResearchButton>
        }
      >
        <form
          id="new-review-task-form"
          action={submitTask}
          className="grid gap-5"
        >
          <input type="hidden" name="taskType" value="REVIEW" />
          <input type="hidden" name="reviewId" value={reviewId} />
          <input type="hidden" name="category" value="Review" />
          <input
            type="hidden"
            name="allowAssigneeReportUpload"
            value={allowReportUpload ? "true" : "false"}
          />
          {selectedIds.map((id) => (
            <input key={id} type="hidden" name="assigneeIds" value={id} />
          ))}
          {canChooseChecker && (
            <input type="hidden" name="checkerId" value={selectedCheckerId} />
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
            <label className="grid gap-1.5">
              <input
                name="title"
                required
                aria-label="Task title"
                placeholder="Task title (*)"
                className={researchFieldClass}
              />
            </label>
            <label className="grid gap-1.5">
              <ResearchDatePicker
                name="dueDate"
                value={dueDate}
                onChange={setDueDate}
                placeholder="Due date"
                className={researchFieldClass}
              />
            </label>
          </div>

          <div className="rounded-none border border-[#D8D0C2] bg-[#FFFDF8] px-4 py-3 text-sm text-[#475467] dark:border-[#444444] dark:bg-[#202020] dark:text-[#B0B0B0]">
            <p className="text-[#1F2937] dark:text-[#E4E4E4]">
              <span className="font-normal">Manuscript:</span> {manuscriptTitle}
            </p>
            <p className="mt-1">
              <span className="font-normal text-[#1F2937] dark:text-[#E4E4E4]">
                Journal:
              </span>{" "}
              {journalName}
            </p>
          </div>

          <label className="grid gap-1.5">
            <textarea
              name="description"
              rows={3}
              aria-label="Description"
              placeholder="Description, expected output, files, or notes"
              defaultValue={defaultTaskDescription}
              className={researchTextareaClass}
            />
          </label>

          <TaskGuidePicker
            guides={taskGuideOptions}
            selectedIds={selectedTaskGuideIds}
            onChange={setSelectedTaskGuideIds}
          />

          <TaskAttachmentField />

          <div className="grid items-start gap-4 lg:grid-cols-[1fr_18rem]">
            <div className="grid gap-4">
              <SearchPanel
                query={assigneeQuery}
                setQuery={setAssigneeQuery}
                placeholder="Search task assignees by name, email, ID, or role (*)"
                selectedItems={selectedAssigneeItems}
                items={filteredAssignees.map((user) => ({
                  id: user.id,
                  title: displayResearchPersonName(user),
                  meta: [
                    displayResearchEmail(user.email),
                    user.roles.join(", "),
                  ]
                    .filter(Boolean)
                    .join(" - "),
                  selected: selectedIds.includes(user.id),
                  onClick: () => toggleAssignee(user.id),
                }))}
              />
              {canChooseChecker && (
                <SearchPanel
                  selectionMode="single"
                  query={checkerQuery}
                  setQuery={setCheckerQuery}
                  placeholder="Search chief assistant checker by name, email, or ID (optional)"
                  selectedItems={checkers
                    .filter((user) => user.id === selectedCheckerId)
                    .map((user) => ({
                      id: user.id,
                      title: displayResearchPersonName(user),
                      meta: [
                        displayResearchEmail(user.email),
                        "Chief assistant checker",
                      ]
                        .filter(Boolean)
                        .join(" - "),
                      selected: true,
                      onClick: () => selectChecker(""),
                    }))}
                  items={filteredCheckers.map((user) => ({
                    id: user.id,
                    title: displayResearchPersonName(user),
                    meta: [
                      displayResearchEmail(user.email),
                      "Chief assistant checker",
                    ]
                      .filter(Boolean)
                      .join(" - "),
                    selected: selectedCheckerId === user.id,
                    onClick: () => selectChecker(user.id),
                  }))}
                />
              )}
            </div>
            <div className="lg:pt-0">
              <ReportUploadPermissionField
                checked={allowReportUpload}
                onChange={setAllowReportUpload}
              />
            </div>
          </div>
        </form>
      </ResearchModal>
    </>
  );
}

function ReportUploadPermissionField({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-[52px] cursor-pointer items-center gap-3 border border-[#D8D0C2] bg-[#FFFDF8] px-4 py-3 text-sm text-[#243047] transition hover:border-[#A8DADC] dark:border-[#444444] dark:bg-[#202020] dark:text-[#E4E4E4]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 flex-none accent-[#1F7180]"
      />
      <span className="min-w-0 leading-5">
        Allow assignee to upload task report
      </span>
    </label>
  );
}

function TaskAttachmentField() {
  return (
    <label className="grid gap-2 border border-[#D8D0C2] bg-[#FFFDF8] px-4 py-3 text-sm text-[#6C778D] dark:border-[#444444] dark:bg-[#202020] dark:text-[#B0B0B0]">
      <span className="flex items-center gap-2 text-xs font-normal uppercase tracking-wide text-[#6C778D] dark:text-[#B0B0B0]">
        <FileUp className="h-4 w-4 text-[#1F7180] dark:text-[#A8DADC]" />
        Task file (optional)
      </span>
      <input
        name="taskFile"
        type="file"
        accept=".pdf,.doc,.docx,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="block w-full cursor-pointer text-sm text-[#243047] file:mr-4 file:cursor-pointer file:border file:border-[#D8D0C2] file:bg-transparent file:px-3 file:py-2 file:text-sm file:font-normal file:text-[#1F7180] hover:file:border-[#A8DADC] dark:text-[#E4E4E4] dark:file:border-[#444444] dark:file:text-[#A8DADC] dark:hover:file:border-[#A8DADC]"
      />
      <span className="text-xs text-[#7C8798] dark:text-[#9CA3AF]">
        PDF, DOC, DOCX, or XLSX. Maximum 2 MB.
      </span>
    </label>
  );
}

function SearchPanel({
  selectionMode = "multi",
  query,
  setQuery,
  placeholder,
  selectedItems = [],
  items,
  sideControl,
}: {
  selectionMode?: "single" | "multi";
  query: string;
  setQuery: (value: string) => void;
  placeholder: string;
  selectedItems?: SearchPanelItem[];
  items: SearchPanelItem[];
  sideControl?: ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const singleSelectedItem =
    selectionMode === "single" ? selectedItems[0] : undefined;
  const showDropdown =
    !singleSelectedItem && focused && query.trim().length > 0;

  return (
    <section className="grid gap-3">
      {selectionMode === "multi" && selectedItems.length > 0 && (
        <div className="grid gap-2">
          {selectedItems.map((item) => (
            <SelectedSearchItem key={item.id} item={item} />
          ))}
        </div>
      )}
      <div
        className={
          sideControl
            ? "grid items-start gap-4 lg:grid-cols-[1fr_18rem]"
            : undefined
        }
      >
        <div ref={wrapperRef} className="relative z-30">
          {singleSelectedItem ? (
            <SelectedSearchField item={singleSelectedItem} />
          ) : (
            <div
              className={`${researchSearchFieldClass} flex items-center gap-3 px-3`}
            >
              <Search className="h-4 w-4 flex-none text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => window.setTimeout(() => setFocused(false), 120)}
                placeholder={placeholder}
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#243047] placeholder:text-[#9AA3B4] outline-none dark:text-[#E4E4E4] dark:placeholder:text-[#6F6F6F]"
              />
            </div>
          )}

          <FloatingDropdownPortal
            anchorRef={wrapperRef}
            open={showDropdown}
            maxWidth={640}
          >
            <div
              className={`${researchDropdownPanelClass} max-h-[var(--research-dropdown-max-height)] overflow-y-auto`}
            >
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={item.onClick}
                  className={`${researchDropdownItemClass} cursor-pointer ${
                    item.selected
                      ? researchDropdownItemActiveClass
                      : researchDropdownItemIdleClass
                  }`}
                >
                  <span className="flex min-w-0 items-start gap-3 px-3">
                    <span className="mt-0.5 flex-none text-slate-400">
                      <UserRound className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-normal leading-5">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-[#B0B0B0]">
                        {item.meta}
                      </span>
                    </span>
                  </span>
                  {item.selected && (
                    <Check className="mr-3 mt-0.5 h-4 w-4 flex-none" />
                  )}
                </button>
              ))}
              {items.length === 0 && (
                <div className="py-8 text-center text-sm text-[#B0B0B0]">
                  No result matches this search.
                </div>
              )}
            </div>
          </FloatingDropdownPortal>
        </div>
        {sideControl}
      </div>
    </section>
  );
}

function SelectedSearchField({ item }: { item: SearchPanelItem }) {
  return (
    <div
      className={`${researchSearchFieldClass} flex h-auto min-h-[3rem] items-center gap-3 px-3 py-2`}
    >
      <span className="flex-none text-[#1F7180] dark:text-[#A8DADC]">
        <UserRound className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-normal leading-5 text-[#1F2937] dark:text-[#E4E4E4]">
          {item.title}
        </span>
        {item.meta ? (
          <span className="mt-0.5 block truncate text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
            {item.meta}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        onClick={item.onClick}
        aria-label={`Clear ${item.title}`}
        className="group/icon -mr-1 flex h-8 w-8 flex-none items-center justify-center text-[#667085] transition hover:scale-105 hover:text-[#1F7180] active:scale-95 dark:text-[#B0B0B0] dark:hover:text-[#A8DADC]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function SelectedSearchItem({ item }: { item: SearchPanelItem }) {
  return (
    <button
      type="button"
      onClick={item.onClick}
      className="group flex cursor-pointer items-start justify-between gap-3 rounded-none border border-[#D8D0C2] bg-[#FFFDF8] px-3 py-2 text-left text-[#1F2937] transition hover:border-[#7FBFC5] hover:bg-[#F3FAF9] dark:border-[#444444] dark:bg-[#202020] dark:text-[#E4E4E4] dark:hover:border-[#5A5A5A] dark:hover:bg-[#303030]"
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex-none text-[#1F7180] dark:text-[#A8DADC]">
          <UserRound className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-normal leading-5 text-[#1F2937] dark:text-[#E4E4E4]">
            {item.title}
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
            {item.meta}
          </span>
        </span>
      </span>
      <X className="mt-0.5 h-4 w-4 flex-none text-[#667085] transition group-hover:text-[#1F7180] dark:text-[#B0B0B0] dark:group-hover:text-[#A8DADC]" />
    </button>
  );
}
