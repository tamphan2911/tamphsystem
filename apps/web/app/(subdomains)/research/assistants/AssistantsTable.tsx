"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  assignResearchAssistant,
  removeResearchAssistantRole,
} from "../actions";
import {
  FilterSelect,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "@/sites/research/components/TableControls";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  ResearchButton,
  researchFieldClass,
} from "@/sites/research/components/ResearchPrimitives";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";

export type AssistantRow = {
  id: string;
  name: string;
  email: string;
  password: string;
  assistantRole: string;
};

export function AssistantsTable({
  rows,
  canManage,
}: {
  rows: AssistantRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { showSuccess } = useResearchToast();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [editing, setEditing] = useState<AssistantRow | null>(null);
  const [deleting, setDeleting] = useState<AssistantRow | null>(null);
  const [editRole, setEditRole] = useState("ASSISTANT");
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});
  const passwordTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  useEffect(() => {
    const timers = passwordTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesRole = role === "ALL" || row.assistantRole === role;
      const haystack = [row.name, row.email, row.assistantRole]
        .join(" ")
        .toLowerCase();
      return matchesRole && (!needle || haystack.includes(needle));
    });
  }, [query, role, rows]);

  const pagination = useTablePagination(filtered, 10);

  function togglePassword(userId: string) {
    setVisiblePasswords((current) => {
      const willShow = !current[userId];
      if (passwordTimers.current[userId]) {
        clearTimeout(passwordTimers.current[userId]);
        delete passwordTimers.current[userId];
      }
      if (willShow) {
        passwordTimers.current[userId] = setTimeout(() => {
          setVisiblePasswords((latest) => ({ ...latest, [userId]: false }));
          delete passwordTimers.current[userId];
        }, 5000);
      }
      return { ...current, [userId]: willShow };
    });
  }

  function openEdit(row: AssistantRow) {
    setEditing(row);
    setEditRole(row.assistantRole);
  }

  function submitEdit(formData: FormData) {
    const assistant = editing;
    const passwordChanged = Boolean(
      String(formData.get("password") ?? "").trim(),
    );
    startTransition(async () => {
      await assignResearchAssistant(formData);
      setEditing(null);
      showSuccess({
        title: passwordChanged
          ? "Assistant account updated"
          : "Assistant role updated",
        detail: passwordChanged
          ? `${assistant ? displayResearchPersonName(assistant) || "Assistant" : "Assistant"} has a new login password and ${editRole === "CHIEF_ASSISTANT" ? "chief assistant" : "assistant"} access.`
          : `${assistant ? displayResearchPersonName(assistant) || "Assistant" : "Assistant"} is now set as ${editRole === "CHIEF_ASSISTANT" ? "chief assistant" : "assistant"}.`,
      });
      router.refresh();
    });
  }

  function confirmDelete(formData: FormData) {
    const assistant = deleting;
    startTransition(async () => {
      await removeResearchAssistantRole(formData);
      setDeleting(null);
      showSuccess({
        title: "Assistant role removed",
        detail: `${assistant ? displayResearchPersonName(assistant) || "Selected user" : "Selected user"} no longer has assistant access in the research site.`,
      });
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search assistant, email, role..."
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect
            value={role}
            onChange={setRole}
            ariaLabel="Filter by assistant role"
            options={[
              { value: "ALL", label: "All roles" },
              { value: "ASSISTANT", label: "Assistant" },
              { value: "CHIEF_ASSISTANT", label: "Chief assistant" },
            ]}
          />
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
            <tr>
              <th className="w-[32%] px-4 py-3">Assistant</th>
              <th className="w-[28%] px-3 py-3">Email</th>
              <th className="w-[20%] px-3 py-3">Password</th>
              <th className="w-[12%] px-3 py-3">Role</th>
              {canManage && (
                <th className="w-[8%] px-2 py-3 text-right">
                  <span className="sr-only">Action</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#444444]">
            {pagination.pagedRows.map((user) => (
              <tr
                key={user.id}
                className="group align-top transition-colors duration-150 hover:bg-[#383838]"
              >
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center text-[#6F5AA8] dark:text-[#B39CD0]">
                      <UserRound className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 truncate text-sm font-medium text-slate-700 dark:text-slate-100">
                      {user.name || "Unnamed user"}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-sm text-[#B0B0B0]">
                  <span className="block truncate">
                    {displayResearchEmail(user.email)}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="inline-flex max-w-full items-center gap-2 py-1.5 text-sm text-slate-700 dark:text-slate-200">
                    <KeyRound className="h-4 w-4 shrink-0 text-[#777777]" />
                    <span className="min-w-0 flex-1 truncate font-mono">
                      {visiblePasswords[user.id]
                        ? user.password || "Not stored"
                        : user.password
                          ? "••••••••"
                          : "••••"}
                    </span>
                    <button
                      type="button"
                      onClick={() => togglePassword(user.id)}
                      className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-none text-slate-400 transition hover:text-blue-600 dark:hover:text-blue-300"
                      aria-label={
                        visiblePasswords[user.id]
                          ? "Hide assistant password"
                          : "Show assistant password"
                      }
                    >
                      {visiblePasswords[user.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <RolePill role={user.assistantRole} />
                </td>
                {canManage && (
                  <td className="px-2 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center border border-transparent bg-transparent text-slate-500 transition hover:-translate-y-0.5 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-300"
                        aria-label="Edit assistant role"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(user)}
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center border border-transparent bg-transparent text-slate-500 transition hover:-translate-y-0.5 hover:text-rose-700 dark:text-slate-300 dark:hover:text-rose-300"
                        aria-label="Remove assistant role"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {pagination.total === 0 && (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="px-4 py-2">
                  <ResearchEmptyState
                    title="No assistants match the current search."
                    detail="Try another name, email, role, or active-site filter."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={pagination.page}
        pageCount={pagination.pageCount}
        total={pagination.total}
        pageSize={pagination.pageSize}
        onPageChange={pagination.setPage}
      />

      {editing && (
        <div
          data-research-modal-overlay="true"
          className="fixed inset-0 z-[1000] flex overflow-y-auto animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg animate-[modalPanelIn_220ms_ease-out] overflow-hidden border border-[#444444] bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <DialogHeader
              title="Edit assistant role"
              onClose={() => setEditing(null)}
              actions={
                <ResearchButton form="edit-assistant-form" disabled={isPending}>
                  Save change
                </ResearchButton>
              }
            />
            <form
              id="edit-assistant-form"
              action={submitEdit}
              className="grid gap-5 px-5 py-5"
            >
              <input type="hidden" name="userId" value={editing.id} />
              <input type="hidden" name="assistantRole" value={editRole} />
              <div className="border border-[#444444] bg-[#202020] p-4">
                <p className="text-sm font-bold text-[#E4E4E4]">
                  {editing.name || "Unnamed user"}
                </p>
                <p className="mt-1 text-xs text-[#B0B0B0]">
                  {displayResearchEmail(editing.email)}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <RoleChoice
                  active={editRole === "ASSISTANT"}
                  title="Assistant"
                  icon={<ShieldCheck className="h-5 w-5" />}
                  onClick={() => setEditRole("ASSISTANT")}
                />
                <RoleChoice
                  active={editRole === "CHIEF_ASSISTANT"}
                  title="Chief Assistant"
                  icon={<Crown className="h-5 w-5" />}
                  onClick={() => setEditRole("CHIEF_ASSISTANT")}
                />
              </div>
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                  Login password
                </span>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777777]" />
                  <input
                    name="password"
                    type="text"
                    autoComplete="new-password"
                    placeholder="Leave blank to keep current password"
                    className={`${researchFieldClass} pl-10`}
                  />
                </div>
                <span className="text-xs leading-5 text-[#B0B0B0]">
                  Set a new value here to update the assistant login password
                  and the password shown in this table.
                </span>
              </label>
            </form>
          </div>
        </div>
      )}

      {deleting && (
        <div
          data-research-modal-overlay="true"
          className="fixed inset-0 z-[1000] flex overflow-y-auto animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
        >
          <div className="w-full max-w-md animate-[modalPanelIn_220ms_ease-out] overflow-hidden border border-[#444444] bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <DialogHeader
              title="Remove assistant role"
              onClose={() => setDeleting(null)}
              actions={
                <ResearchButton
                  form="delete-assistant-role-form"
                  disabled={isPending}
                  tone="danger"
                >
                  Remove role
                </ResearchButton>
              }
            />
            <form
              id="delete-assistant-role-form"
              action={confirmDelete}
              className="space-y-4 px-5 py-5"
            >
              <input type="hidden" name="userId" value={deleting.id} />
              <p className="text-sm leading-6 text-[#B0B0B0]">
                Remove the assistant role from{" "}
                <span className="font-semibold text-[#E4E4E4]">
                  {displayResearchPersonName(deleting) || "Selected user"}
                </span>
                ? This does not delete the user account.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RolePill({ role }: { role: string }) {
  const chief = role === "CHIEF_ASSISTANT";
  return (
    <span
      className={`inline-flex text-xs font-normal ${
        chief
          ? "text-emerald-700 dark:text-emerald-300"
          : "text-blue-700 dark:text-blue-300"
      }`}
    >
      {chief ? "Chief Assistant" : "Assistant"}
    </span>
  );
}

function RoleChoice({
  active,
  title,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  icon: ReactNode;
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
      <span className="text-sm font-bold">{title}</span>
    </button>
  );
}

function DialogHeader({
  title,
  onClose,
  actions,
}: {
  title: string;
  onClose: () => void;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
      <h3 className="text-base font-bold text-[#E4E4E4]">{title}</h3>
      <div className="flex items-center gap-2">
        {actions}
        <button
          type="button"
          onClick={onClose}
          className="rounded-none p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
