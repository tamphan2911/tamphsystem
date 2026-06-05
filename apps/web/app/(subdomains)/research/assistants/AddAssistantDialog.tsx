"use client";

import { useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Crown, Mail, PlusCircle, ShieldCheck, UserRound } from "lucide-react";
import { assignResearchAssistant } from "../actions";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  ResearchSearchPicker,
  type ResearchSearchPickerOption,
} from "@/sites/research/components/ResearchSearchPicker";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

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
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users
      .filter((user) => {
        if (!needle) return true;
        const haystack = [user.id, user.email, user.name, ...user.roles]
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      })
      .slice(0, 10);
  }, [query, users]);

  const options = useMemo<ResearchSearchPickerOption<AssistantCandidate>[]>(
    () =>
      filtered.map((user) => ({
        id: user.id,
        label: user.name || user.email,
        description: `${user.email} - ${user.roles.join(", ") || "No role"}`,
        meta: user.id,
        data: user,
      })),
    [filtered],
  );

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
      showSuccess({
        title: "Assistant role assigned",
        detail: `${selectedUser?.name || selectedUser?.email || "Selected user"} is now assigned as ${assistantRole === "CHIEF_ASSISTANT" ? "chief assistant" : "assistant"}.`,
      });
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-none border border-violet-200 bg-violet-100/80 px-4 py-2.5 text-sm font-bold text-violet-800 shadow-sm shadow-violet-900/5 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 hover:shadow-md hover:shadow-violet-900/10 focus:outline-none focus:ring-4 focus:ring-violet-200/70 dark:border-violet-700/60 dark:bg-violet-900/35 dark:text-violet-100 dark:hover:border-violet-500/70 dark:hover:bg-violet-800/55 dark:hover:text-white dark:hover:shadow-black/25 dark:focus:ring-violet-700/35"
      >
        <PlusCircle className="h-4 w-4" />
        Add Assistant
      </button>

      <ResearchModal
        open={isOpen}
        onClose={closeDialog}
        title="Add Assistant"
        description="Search one account, choose assistant level, then assign jurisdiction."
        icon={<ShieldCheck className="h-5 w-5" />}
        maxWidth="max-w-3xl"
      >
        <form
          action={handleSubmit}
          className="flex min-h-0 flex-1 flex-col gap-5"
        >
          <input type="hidden" name="userId" value={selectedUserId} />
          <input type="hidden" name="assistantRole" value={assistantRole} />

          <ResearchSearchPicker
            label="Assistant account"
            selected={
              selectedUser
                ? {
                    id: selectedUser.id,
                    label: selectedUser.name || selectedUser.email,
                    description: `${selectedUser.email} - ${selectedUser.roles.join(", ") || "No role"}`,
                    data: selectedUser,
                  }
                : null
            }
            query={query}
            onQueryChange={(value) => {
              setQuery(value);
              setSelectedUserId("");
            }}
            onSelect={(option) => {
              setSelectedUserId(option.id);
              setQuery("");
            }}
            onClear={() => {
              setSelectedUserId("");
              setQuery("");
            }}
            options={options}
            placeholder="Search by email, user ID, name, or role..."
            emptyText="No user account matches this search."
            renderSelected={(option) => {
              const user = option.data as AssistantCandidate;
              return (
                <>
                  <UserRound className="h-4 w-4 flex-none text-slate-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">
                      {user.name || "Unnamed user"}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-[#B0B0B0]">
                      <Mail className="h-3.5 w-3.5 flex-none" />
                      {user.email}
                    </span>
                  </span>
                </>
              );
            }}
          />

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
            <button
              type="button"
              onClick={closeDialog}
              className="rounded-none border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              disabled={!selectedUserId || isPending}
              className="inline-flex items-center gap-2 rounded-none bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              <PlusCircle className="h-4 w-4" />
              Assign Role
            </button>
          </div>
        </form>
      </ResearchModal>
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
      className={`flex items-center gap-3 rounded-none border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
        active
          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
          : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
      }`}
    >
      {icon}
      <span>
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-xs text-[#B0B0B0]">{description}</span>
      </span>
    </button>
  );
}
