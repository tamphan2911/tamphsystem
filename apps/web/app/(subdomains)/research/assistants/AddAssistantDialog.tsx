"use client";

import { useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Crown, Mail, PlusCircle, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { assignResearchAssistant } from "../actions";
import { useResearchToast } from "../components/ResearchToast";

export type AssistantCandidate = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};

export function AddAssistantDialog({ users }: { users: AssistantCandidate[] }) {
  const router = useRouter();
  const { showSuccess } = useResearchToast();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assistantRole, setAssistantRole] = useState("ASSISTANT");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users
      .filter((user) => {
        if (!needle) return true;
        const haystack = [user.id, user.email, user.name, ...user.roles].join(" ").toLowerCase();
        return haystack.includes(needle);
      })
      .slice(0, 10);
  }, [query, users]);

  function closeDialog() {
    setIsOpen(false);
    setQuery("");
    setSelectedUserId("");
    setAssistantRole("ASSISTANT");
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await assignResearchAssistant(formData);
      closeDialog();
      showSuccess("Assistant role assigned");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
      >
        <PlusCircle className="h-4 w-4" />
        Add Assistant
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="flex h-[44rem] w-full max-w-3xl animate-[modalPanelIn_220ms_ease-out] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">Add Assistant</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Search one account, choose assistant level, then assign jurisdiction.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-5 px-6 py-5">
              <input type="hidden" name="userId" value={selectedUserId} />
              <input type="hidden" name="assistantRole" value={assistantRole} />

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSelectedUserId("");
                  }}
                  placeholder="Search by email, user ID, name, or role..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
                {filtered.map((user) => {
                  const isSelected = selectedUserId === user.id;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      className={`flex w-full items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${
                        isSelected ? "bg-blue-50 ring-1 ring-inset ring-blue-200 dark:bg-blue-950/40 dark:ring-blue-900" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <UserRound className="h-4 w-4 text-slate-400" />
                          <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{user.name || "Unnamed user"}</p>
                        </div>
                        <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <Mail className="h-3.5 w-3.5 flex-none" />
                          <span className="truncate">{user.email}</span>
                        </div>
                        <p className="mt-1 truncate font-mono text-[11px] text-slate-400">{user.id}</p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        {user.roles.map((role) => (
                          <span key={role} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                            {role}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">No user account matches this search.</div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <RoleButton
                  active={assistantRole === "ASSISTANT"}
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title="Assistant"
                  description="Submission and task support"
                  onClick={() => setAssistantRole("ASSISTANT")}
                />
                <RoleButton
                  active={assistantRole === "CHIEF_ASSISTANT"}
                  icon={<Crown className="h-5 w-5" />}
                  title="Chief Assistant"
                  description="Can coordinate research operations"
                  onClick={() => setAssistantRole("CHIEF_ASSISTANT")}
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button type="button" onClick={closeDialog} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  Cancel
                </button>
                <button disabled={!selectedUserId || isPending} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:translate-y-0 disabled:hover:shadow-none">
                  <PlusCircle className="h-4 w-4" />
                  Assign Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function RoleButton({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
        active
          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
          : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
      }`}
    >
      {icon}
      <span>
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{description}</span>
      </span>
    </button>
  );
}
