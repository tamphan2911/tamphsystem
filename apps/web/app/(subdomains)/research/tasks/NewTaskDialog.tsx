"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import {
  CalendarClock,
  Check,
  ClipboardList,
  FileText,
  PlusCircle,
  Search,
  Send,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { createResearchTask } from "../actions";
import { useResearchToast } from "../components/ResearchToast";

export type TaskAssigneeOption = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};

export type TaskResearchOption = {
  id: string;
  title: string;
  code: string;
  stage: string;
};

export type TaskVenueOption = {
  kind: "journal" | "conference";
  id: string;
  name: string;
  meta: string;
};

export type TaskReviewOption = {
  id: string;
  title: string;
  journal: string;
  status: string;
};

export type TaskOrganizedProjectOption = {
  id: string;
  title: string;
  code: string;
  status: string;
};

type TaskMode = "submit" | "production" | "review" | "project" | "other";
type ProjectTaskSubtype = "PROJECT_PRODUCTION" | "PROJECT_RESEARCH_ASSOCIATED";
type SearchPanelItem = {
  id: string;
  title: string;
  meta: string;
  icon: ReactNode;
  selected: boolean;
  onClick: () => void;
};

const inputClass =
  "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

function modeLabel(mode: TaskMode) {
  if (mode === "submit") return "Submit";
  if (mode === "production") return "Production";
  if (mode === "review") return "Review";
  if (mode === "project") return "Project";
  return "Other";
}

export function NewTaskDialog({
  assignees,
  researchOptions,
  venueOptions,
  reviewOptions,
  organizedProjectOptions,
}: {
  assignees: TaskAssigneeOption[];
  researchOptions: TaskResearchOption[];
  venueOptions: TaskVenueOption[];
  reviewOptions: TaskReviewOption[];
  organizedProjectOptions: TaskOrganizedProjectOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<TaskMode>("submit");
  const [projectSubtype, setProjectSubtype] =
    useState<ProjectTaskSubtype>("PROJECT_PRODUCTION");
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [researchQuery, setResearchQuery] = useState("");
  const [venueQuery, setVenueQuery] = useState("");
  const [reviewQuery, setReviewQuery] = useState("");
  const [organizedProjectQuery, setOrganizedProjectQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedResearch, setSelectedResearch] =
    useState<TaskResearchOption | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<TaskVenueOption | null>(
    null,
  );
  const [selectedReview, setSelectedReview] = useState<TaskReviewOption | null>(
    null,
  );
  const [selectedOrganizedProject, setSelectedOrganizedProject] =
    useState<TaskOrganizedProjectOption | null>(null);
  const [isPending, startTransition] = useTransition();
  const { showSuccess, showError } = useResearchToast();

  const filteredAssignees = useMemo(() => {
    const needle = assigneeQuery.trim().toLowerCase();
    if (!needle) return [];
    return assignees
      .filter((user) => {
        return [user.name, user.email, user.id, ...user.roles]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, 12);
  }, [assigneeQuery, assignees]);

  const filteredResearch = useMemo(() => {
    const needle = researchQuery.trim().toLowerCase();
    if (!needle) return [];
    return researchOptions
      .filter((project) => {
        return [project.title, project.code, project.stage, project.id]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, 10);
  }, [researchOptions, researchQuery]);

  const filteredVenues = useMemo(() => {
    const needle = venueQuery.trim().toLowerCase();
    if (!needle) return [];
    return venueOptions
      .filter((venue) => {
        return [venue.name, venue.meta, venue.kind, venue.id]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, 10);
  }, [venueOptions, venueQuery]);

  const filteredReviews = useMemo(() => {
    const needle = reviewQuery.trim().toLowerCase();
    if (!needle) return [];
    return reviewOptions
      .filter((review) => {
        return [review.title, review.journal, review.status, review.id]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, 10);
  }, [reviewOptions, reviewQuery]);

  const filteredOrganizedProjects = useMemo(() => {
    const needle = organizedProjectQuery.trim().toLowerCase();
    if (!needle) return [];
    return organizedProjectOptions
      .filter((project) => {
        return [project.title, project.code, project.status, project.id]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, 10);
  }, [organizedProjectOptions, organizedProjectQuery]);

  function reset() {
    setMode("submit");
    setProjectSubtype("PROJECT_PRODUCTION");
    setAssigneeQuery("");
    setResearchQuery("");
    setVenueQuery("");
    setReviewQuery("");
    setOrganizedProjectQuery("");
    setSelectedIds([]);
    setSelectedResearch(null);
    setSelectedVenue(null);
    setSelectedReview(null);
    setSelectedOrganizedProject(null);
  }

  function toggleAssignee(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function submitTask(formData: FormData) {
    startTransition(async () => {
      const result = await createResearchTask(formData);
      if (!result?.ok) {
        showError({
          title: "Task was not created",
          detail:
            result?.reason === "PRODUCTION_INCOMPLETE"
              ? "Complete the production timeline before assigning a submission task."
              : result?.reason === "MISSING_ASSOCIATION"
                ? "Choose the required research, venue, review, or project before creating this task."
                : result?.reason === "INACTIVE_RESEARCH_ASSIGNEE"
                  ? "Choose only users who have activated their research-site account."
                  : result?.reason === "ACTIVE_SUBMISSION_TASK_EXISTS"
                    ? "An active submission task already exists for this research and venue."
                    : "Please check the task details and try again.",
        });
        return;
      }
      showSuccess({
        title: "Task created",
        detail: `${modeLabel(mode)} task assigned to ${selectedIds.length} user${selectedIds.length === 1 ? "" : "s"}.`,
      });
      reset();
      setIsOpen(false);
    });
  }

  const needsResearch = mode === "submit" || mode === "production";
  const needsVenue = mode === "submit";
  const needsReview = mode === "review";
  const needsOrganizedProject = mode === "project";
  const canSubmit =
    selectedIds.length > 0 &&
    (!needsResearch || Boolean(selectedResearch)) &&
    (!needsVenue || Boolean(selectedVenue)) &&
    (!needsReview || Boolean(selectedReview)) &&
    (!needsOrganizedProject || Boolean(selectedOrganizedProject));
  const selectedAssigneeItems: SearchPanelItem[] = assignees
    .filter((user) => selectedIds.includes(user.id))
    .map((user) => ({
      id: user.id,
      title: user.name || user.email,
      meta: `${user.email} - ${user.roles.join(", ")}`,
      icon: <UserRound className="h-4 w-4" />,
      selected: true,
      onClick: () => toggleAssignee(user.id),
    }));

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700 shadow-sm shadow-violet-900/5 transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-100 hover:shadow-md dark:border-violet-800/70 dark:bg-violet-950/50 dark:text-violet-200 dark:hover:border-violet-600 dark:hover:bg-violet-900/60"
      >
        <PlusCircle className="h-4 w-4" />
        New Task
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-5xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-violet-50 p-2 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                    Assign Task
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Create submit, production, review, or general research work.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              action={submitTask}
              className="grid max-h-[calc(90vh-6rem)] gap-5 overflow-y-auto px-6 py-5"
            >
              {selectedIds.map((id) => (
                <input key={id} type="hidden" name="assigneeIds" value={id} />
              ))}
              {selectedResearch && (
                <input
                  type="hidden"
                  name="projectId"
                  value={selectedResearch.id}
                />
              )}
              {selectedVenue?.kind === "journal" && (
                <>
                  <input
                    type="hidden"
                    name="taskType"
                    value="SUBMIT_RESEARCH"
                  />
                  <input
                    type="hidden"
                    name="journalId"
                    value={selectedVenue.id}
                  />
                  <input
                    type="hidden"
                    name="category"
                    value="Submit research"
                  />
                </>
              )}
              {selectedVenue?.kind === "conference" && (
                <>
                  <input
                    type="hidden"
                    name="taskType"
                    value="SUBMIT_CONFERENCE"
                  />
                  <input
                    type="hidden"
                    name="conferenceId"
                    value={selectedVenue.id}
                  />
                  <input
                    type="hidden"
                    name="category"
                    value="Submit research"
                  />
                </>
              )}
              {mode === "production" && (
                <>
                  <input type="hidden" name="taskType" value="PRODUCTION" />
                  <input type="hidden" name="category" value="Production" />
                </>
              )}
              {mode === "review" && selectedReview && (
                <>
                  <input type="hidden" name="taskType" value="REVIEW" />
                  <input
                    type="hidden"
                    name="reviewId"
                    value={selectedReview.id}
                  />
                </>
              )}
              {mode === "project" && selectedOrganizedProject && (
                <>
                  <input type="hidden" name="taskType" value={projectSubtype} />
                  <input
                    type="hidden"
                    name="organizedProjectId"
                    value={selectedOrganizedProject.id}
                  />
                  <input
                    type="hidden"
                    name="category"
                    value={
                      projectSubtype === "PROJECT_PRODUCTION"
                        ? "Production"
                        : "Research production"
                    }
                  />
                </>
              )}
              {mode === "other" && (
                <input type="hidden" name="taskType" value="OTHER" />
              )}

              <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Task title
                  </span>
                  <input
                    name="title"
                    required
                    placeholder="Task title"
                    className={inputClass}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Due date
                  </span>
                  <div className="relative">
                    <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      name="dueDate"
                      type="date"
                      className={`${inputClass} w-full pl-9`}
                    />
                  </div>
                </label>
              </div>

              <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
                {(
                  [
                    "submit",
                    "production",
                    "review",
                    "project",
                    "other",
                  ] as const
                ).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMode(item)}
                    className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-bold transition ${
                      mode === item
                        ? "bg-white text-violet-700 shadow-sm dark:bg-slate-800 dark:text-violet-300"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                    }`}
                  >
                    {modeLabel(item)}
                  </button>
                ))}
              </div>

              {needsResearch && (
                <SearchPanel
                  title="Research"
                  query={researchQuery}
                  setQuery={setResearchQuery}
                  placeholder="Search research by title, ID, or stage..."
                  selectedItems={
                    selectedResearch
                      ? [
                          {
                            id: selectedResearch.id,
                            title: selectedResearch.title,
                            meta: [selectedResearch.code, selectedResearch.stage]
                              .filter(Boolean)
                              .join(" - "),
                            icon: <FileText className="h-4 w-4" />,
                            selected: true,
                            onClick: () => {
                              setSelectedResearch(null);
                              setResearchQuery("");
                            },
                          },
                        ]
                      : []
                  }
                  items={filteredResearch.map((project) => ({
                    id: project.id,
                    title: project.title,
                    meta: [project.code, project.stage]
                      .filter(Boolean)
                      .join(" - "),
                    icon: <FileText className="h-4 w-4" />,
                    selected: selectedResearch?.id === project.id,
                    onClick: () => {
                      setSelectedResearch(project);
                      setResearchQuery(project.title);
                    },
                  }))}
                />
              )}

              {needsVenue && (
                <SearchPanel
                  title="Journal or conference"
                  query={venueQuery}
                  setQuery={setVenueQuery}
                  placeholder="Search journal or conference..."
                  selectedItems={
                    selectedVenue
                      ? [
                          {
                            id: `${selectedVenue.kind}-${selectedVenue.id}`,
                            title: selectedVenue.name,
                            meta: `${selectedVenue.kind} - ${selectedVenue.meta}`,
                            icon: <Send className="h-4 w-4" />,
                            selected: true,
                            onClick: () => {
                              setSelectedVenue(null);
                              setVenueQuery("");
                            },
                          },
                        ]
                      : []
                  }
                  items={filteredVenues.map((venue) => ({
                    id: `${venue.kind}-${venue.id}`,
                    title: venue.name,
                    meta: `${venue.kind} - ${venue.meta}`,
                    icon: <Send className="h-4 w-4" />,
                    selected:
                      selectedVenue?.kind === venue.kind &&
                      selectedVenue?.id === venue.id,
                    onClick: () => {
                      setSelectedVenue(venue);
                      setVenueQuery(venue.name);
                    },
                  }))}
                />
              )}

              {needsReview && (
                <SearchPanel
                  title="Academic review"
                  query={reviewQuery}
                  setQuery={setReviewQuery}
                  placeholder="Search review by manuscript, journal, or status..."
                  selectedItems={
                    selectedReview
                      ? [
                          {
                            id: selectedReview.id,
                            title: selectedReview.title,
                            meta: `${selectedReview.journal} - ${selectedReview.status}`,
                            icon: <Star className="h-4 w-4" />,
                            selected: true,
                            onClick: () => {
                              setSelectedReview(null);
                              setReviewQuery("");
                            },
                          },
                        ]
                      : []
                  }
                  items={filteredReviews.map((review) => ({
                    id: review.id,
                    title: review.title,
                    meta: `${review.journal} - ${review.status}`,
                    icon: <Star className="h-4 w-4" />,
                    selected: selectedReview?.id === review.id,
                    onClick: () => {
                      setSelectedReview(review);
                      setReviewQuery(review.title);
                    },
                  }))}
                />
              )}

              {needsOrganizedProject && (
                <div className="grid gap-4">
                  <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
                    {(
                      [
                        ["PROJECT_PRODUCTION", "Project Production"],
                        ["PROJECT_RESEARCH_ASSOCIATED", "Research Associated"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setProjectSubtype(value)}
                        className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-bold transition ${
                          projectSubtype === value
                            ? "bg-white text-violet-700 shadow-sm dark:bg-slate-800 dark:text-violet-300"
                            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <SearchPanel
                    title="Project"
                    query={organizedProjectQuery}
                    setQuery={setOrganizedProjectQuery}
                    placeholder="Search project by title, ID, or status..."
                    selectedItems={
                      selectedOrganizedProject
                        ? [
                            {
                              id: selectedOrganizedProject.id,
                              title: selectedOrganizedProject.title,
                              meta: [
                                selectedOrganizedProject.code,
                                selectedOrganizedProject.status,
                              ]
                                .filter(Boolean)
                                .join(" - "),
                              icon: <FileText className="h-4 w-4" />,
                              selected: true,
                              onClick: () => {
                                setSelectedOrganizedProject(null);
                                setOrganizedProjectQuery("");
                              },
                            },
                          ]
                        : []
                    }
                    items={filteredOrganizedProjects.map((project) => ({
                      id: project.id,
                      title: project.title,
                      meta: [project.code, project.status]
                        .filter(Boolean)
                        .join(" - "),
                      icon: <FileText className="h-4 w-4" />,
                      selected: selectedOrganizedProject?.id === project.id,
                      onClick: () => {
                        setSelectedOrganizedProject(project);
                        setOrganizedProjectQuery(project.title);
                      },
                    }))}
                  />
                </div>
              )}

              <label className="grid gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Description
                </span>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Add instructions, expected output, files, or notes..."
                  className={inputClass}
                />
              </label>

              <SearchPanel
                title="Assign to"
                query={assigneeQuery}
                setQuery={setAssigneeQuery}
                placeholder="Search active research users by name, email, ID, or role..."
                selectedItems={selectedAssigneeItems}
                items={filteredAssignees.map((user) => ({
                  id: user.id,
                  title: user.name || user.email,
                  meta: `${user.email} - ${user.roles.join(", ")}`,
                  icon: <UserRound className="h-4 w-4" />,
                  selected: selectedIds.includes(user.id),
                  onClick: () => toggleAssignee(user.id),
                }))}
              />

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  disabled={!canSubmit || isPending}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  <PlusCircle className="h-4 w-4" />
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function SearchPanel({
  title,
  query,
  setQuery,
  placeholder,
  selectedItems = [],
  items,
}: {
  title: string;
  query: string;
  setQuery: (value: string) => void;
  placeholder: string;
  selectedItems?: SearchPanelItem[];
  items: SearchPanelItem[];
}) {
  const [focused, setFocused] = useState(false);
  const showDropdown = focused && query.trim().length > 0;
  return (
    <section className="grid gap-3">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </span>
      {selectedItems.length > 0 && (
        <div className="grid gap-2">
          {selectedItems.map((item) => (
            <SelectedSearchItem key={item.id} item={item} />
          ))}
        </div>
      )}
      <div className="relative z-30">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          placeholder={placeholder}
          className={`${inputClass} w-full pl-9`}
        />

        {showDropdown && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-950 dark:shadow-black/35">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={item.onClick}
                className={`flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                  item.selected
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex-none text-slate-400">
                    {item.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-5">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {item.meta}
                    </span>
                  </span>
                </span>
                {item.selected && <Check className="mt-0.5 h-4 w-4 flex-none" />}
              </button>
            ))}
            {items.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No result matches this search.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function SelectedSearchItem({ item }: { item: SearchPanelItem }) {
  return (
    <button
      type="button"
      onClick={item.onClick}
      className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex-none text-emerald-500">{item.icon}</span>
        <span className="min-w-0">
          <span className="block text-sm font-bold leading-5">
            {item.title}
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-emerald-700/80 dark:text-emerald-200/80">
            {item.meta}
          </span>
        </span>
      </span>
      <X className="mt-0.5 h-4 w-4 flex-none" />
    </button>
  );
}
