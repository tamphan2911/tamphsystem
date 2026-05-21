"use client";

import { useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, ClipboardList, Plus, Search, Send, Trash2, UserRound, X } from "lucide-react";
import { addSuggestedJournal, createResearchTask, deleteSuggestedJournal } from "../../actions";

export type SuggestedJournalOption = {
  id: string;
  name: string;
  issn: string;
  field: string;
  rank: string;
  publisher: string;
  apc: string;
};

export type TaskAssigneeOption = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};

export function SuggestedJournalsPanel({
  projectId,
  projectTitle,
  journals,
  suggested,
  assistants,
  isAdmin,
}: {
  projectId: string;
  projectTitle: string;
  journals: SuggestedJournalOption[];
  suggested: SuggestedJournalOption[];
  assistants: TaskAssigneeOption[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [assignJournal, setAssignJournal] = useState<SuggestedJournalOption | null>(null);
  const [deleteJournal, setDeleteJournal] = useState<SuggestedJournalOption | null>(null);
  const [journalQuery, setJournalQuery] = useState("");
  const [assistantQuery, setAssistantQuery] = useState("");
  const [selectedAssistantIds, setSelectedAssistantIds] = useState<string[]>([]);
  const [taskMode, setTaskMode] = useState<"submit" | "other">("submit");

  const suggestedIds = useMemo(() => new Set(suggested.map((journal) => journal.id)), [suggested]);
  const journalResults = useMemo(() => {
    const needle = journalQuery.trim().toLowerCase();
    return journals
      .filter((journal) => !suggestedIds.has(journal.id))
      .filter((journal) => {
        if (!needle) return true;
        return [journal.name, journal.issn, journal.field, journal.rank, journal.publisher].join(" ").toLowerCase().includes(needle);
      })
      .slice(0, 12);
  }, [journalQuery, journals, suggestedIds]);

  const assistantResults = useMemo(() => {
    const needle = assistantQuery.trim().toLowerCase();
    return assistants
      .filter((assistant) => {
        if (!needle) return true;
        return [assistant.name, assistant.email, assistant.id, ...assistant.roles].join(" ").toLowerCase().includes(needle);
      })
      .slice(0, 12);
  }, [assistantQuery, assistants]);

  function toggleAssistant(id: string) {
    setSelectedAssistantIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function addJournal(journalId: string) {
    const formData = new FormData();
    formData.set("journalId", journalId);
    startTransition(async () => {
      await addSuggestedJournal(projectId, formData);
      setAddOpen(false);
      setJournalQuery("");
      router.refresh();
    });
  }

  function removeJournal() {
    if (!deleteJournal) return;
    startTransition(async () => {
      await deleteSuggestedJournal(projectId, deleteJournal.id);
      setDeleteJournal(null);
      router.refresh();
    });
  }

  function assignTask(formData: FormData) {
    startTransition(async () => {
      await createResearchTask(formData);
      setAssignJournal(null);
      setSelectedAssistantIds([]);
      setAssistantQuery("");
      setTaskMode("submit");
      router.refresh();
    });
  }

  function openSubmitTask(journal: SuggestedJournalOption) {
    setTaskMode("submit");
    setAssignJournal(journal);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-bold text-slate-950 dark:text-white">Suggested journals</h2>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-sm dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70"
          >
            <Plus className="h-4 w-4" />
            Add suggested journal
          </button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {suggested.map((journal) => (
          <div
            key={journal.id}
            className="group relative rounded-lg border border-slate-200 p-3 text-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-sm dark:border-slate-800 dark:hover:border-blue-900 dark:hover:bg-blue-950/30"
          >
            {isAdmin && (
              <div className="absolute right-2 top-2 flex translate-y-1 gap-1 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => openSubmitTask(journal)}
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50 dark:border-blue-900 dark:bg-slate-950 dark:text-blue-300 dark:hover:bg-blue-950/40"
                  aria-label="Assign submission task"
                >
                  <Send className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteJournal(journal)}
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-950 dark:text-rose-300 dark:hover:bg-rose-950/40"
                  aria-label="Delete suggested journal"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
            <p className="pr-16 font-semibold text-slate-950 dark:text-white">{journal.name}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {journal.field || "No field"} - {journal.rank || "No rank"} - {journal.publisher || "No publisher"}
            </p>
            {journal.apc && <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">APC: {journal.apc}</p>}
          </div>
        ))}
        {suggested.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Add journals to build suggestions.</p>}
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <DialogHeader title="Add suggested journal" icon={<Plus className="h-5 w-5" />} onClose={() => setAddOpen(false)} />
            <div className="grid gap-3 px-5 py-4">
              <SearchBox value={journalQuery} onChange={setJournalQuery} placeholder="Search journal name, ISSN, field, rank, publisher..." />
              <div className="grid max-h-96 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-800">
                {journalResults.map((journal) => (
                  <button
                    key={journal.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => addJournal(journal.id)}
                    className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-sm disabled:cursor-wait dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-900 dark:hover:bg-blue-950/30"
                  >
                    <span className="block text-sm font-semibold text-slate-950 dark:text-white">{journal.name}</span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                      {journal.issn || "No ISSN"} - {journal.field || "No field"} - {journal.rank || "No rank"} - {journal.publisher || "No publisher"}
                    </span>
                  </button>
                ))}
                {journalResults.length === 0 && <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No journal matches this search.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteJournal && (
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <DialogHeader title="Remove suggestion" icon={<Trash2 className="h-5 w-5" />} onClose={() => setDeleteJournal(null)} />
            <div className="space-y-4 px-5 py-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">Remove {deleteJournal.name} from suggested journals for this research?</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDeleteJournal(null)} className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  Cancel
                </button>
                <button type="button" disabled={isPending} onClick={removeJournal} className="cursor-pointer rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-700 disabled:cursor-wait disabled:opacity-70">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {assignJournal && (
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <DialogHeader title="Assign task" icon={<ClipboardList className="h-5 w-5" />} onClose={() => setAssignJournal(null)} />
            <form action={assignTask} className="grid max-h-[calc(90vh-5rem)] gap-5 overflow-y-auto px-6 py-5">
              {selectedAssistantIds.map((id) => (
                <input key={id} type="hidden" name="assigneeIds" value={id} />
              ))}
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="journalId" value={assignJournal.id} />
              <input type="hidden" name="taskType" value={taskMode === "submit" ? "SUBMIT_RESEARCH" : "OTHER"} />
              <input type="hidden" name="category" value={taskMode === "submit" ? "Submit research" : "Other"} />

              <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
                {(["submit", "other"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTaskMode(mode)}
                    className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-bold transition ${
                      taskMode === mode
                        ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-300"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                    }`}
                  >
                    {mode === "submit" ? "Submit research task" : "Other task"}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Task title</span>
                  <input
                    name="title"
                    required
                    defaultValue={taskMode === "submit" ? `Submit "${projectTitle}" to ${assignJournal.name}` : `Task for "${projectTitle}"`}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Due date</span>
                  <div className="relative">
                    <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input name="dueDate" type="date" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                  </div>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ReadOnlyField label="Research" value={projectTitle} />
                <ReadOnlyField label="Journal" value={`${assignJournal.name}${assignJournal.rank ? ` (${assignJournal.rank})` : ""}`} />
              </div>

              <label className="grid gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Note</span>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={taskMode === "submit" ? `Prepare and submit this manuscript to ${assignJournal.name}.` : ""}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>

              <div className="grid gap-3">
                <SearchBox value={assistantQuery} onChange={setAssistantQuery} placeholder="Search assistants or admin by name, email, ID, or role..." />
                <div className="grid max-h-72 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-800">
                  {assistantResults.map((assistant) => {
                    const selected = selectedAssistantIds.includes(assistant.id);
                    return (
                      <button
                        key={assistant.id}
                        type="button"
                        onClick={() => toggleAssistant(assistant.id)}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                          selected
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <UserRound className="h-4 w-4 flex-none text-slate-400" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold">{assistant.name || assistant.email}</span>
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{assistant.email}</span>
                          </span>
                        </span>
                        {selected && <Check className="h-4 w-4 flex-none" />}
                      </button>
                    );
                  })}
                  {assistantResults.length === 0 && <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No user matches this search.</div>}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button type="button" onClick={() => setAssignJournal(null)} className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  Cancel
                </button>
                <button disabled={selectedAssistantIds.length === 0 || isPending} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:translate-y-0 disabled:hover:shadow-none">
                  <Plus className="h-4 w-4" />
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function DialogHeader({ title, icon, onClose }: { title: string; icon: ReactNode; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">{icon}</span>
        <h3 className="text-base font-bold text-slate-950 dark:text-white">{title}</h3>
      </div>
      <button type="button" onClick={onClose} className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="Close">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      <input readOnly value={value} className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300" />
    </label>
  );
}
