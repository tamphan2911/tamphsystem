"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  LibraryBig,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRound,
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
  usePersistentTableValue,
} from "@/sites/research/components/TableControls";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  ResearchButton,
  researchFieldClass,
} from "@/sites/research/components/ResearchPrimitives";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
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
  canManageResearchVenues: boolean;
  unfinishedTasks: {
    status: string;
    count: number;
  }[];
};

const unfinishedTaskStatusOrder = [
  "OPEN",
  "IN_PROGRESS",
  "REVISION_REQUESTED",
  "CHECKING",
  "NEED_CLARIFY",
];

const unfinishedTaskFilterStatuses = [
  "IN_PROGRESS",
  "REVISION_REQUESTED",
  "CHECKING",
  "NEED_CLARIFY",
  "OVERDUE",
];

const allTaskTypeFilterValues = [
  "ALL",
  "SUBMIT",
  "PRODUCTION",
  "SUGGEST_VENUE",
  "ADD_JOURNAL",
  "PROPOSAL_RESEARCH",
  "PROPOSAL_PROJECT",
  "REVIEW",
  "PROJECT",
  "OTHER",
];

function taskStatusLabel(status: string) {
  if (status === "OPEN") return "open";
  if (status === "IN_PROGRESS") return "in progress";
  if (status === "REVISION_REQUESTED") return "revision requested";
  if (status === "CHECKING") return "checking";
  if (status === "NEED_CLARIFY") return "need clarify";
  return status.toLowerCase().replaceAll("_", " ");
}

function sortedTaskBreakdown(row: AssistantRow) {
  return [...row.unfinishedTasks].sort(
    (left, right) =>
      unfinishedTaskStatusOrder.indexOf(left.status) -
      unfinishedTaskStatusOrder.indexOf(right.status),
  );
}

function unfinishedTaskTotal(row: AssistantRow) {
  return row.unfinishedTasks.reduce((total, item) => total + item.count, 0);
}

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
  const [query, setQuery] = usePersistentTableValue("assistants:q", "");
  const [role, setRole] = usePersistentTableValue("assistants:role", "ALL");
  const [editing, setEditing] = useState<AssistantRow | null>(null);
  const [deleting, setDeleting] = useState<AssistantRow | null>(null);
  const [editRole, setEditRole] = useState("ASSISTANT");
  const [editCanManageVenues, setEditCanManageVenues] = useState(false);
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
      const haystack = [
        row.name,
        row.email,
        row.assistantRole,
        row.canManageResearchVenues ? "venue journal conference" : "",
        row.unfinishedTasks
          .map((item) => `${item.count} ${taskStatusLabel(item.status)}`)
          .join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return matchesRole && (!needle || haystack.includes(needle));
    });
  }, [query, role, rows]);

  const pagination = useTablePagination(filtered, 10, 1, "assistants");

  function updateQuery(value: string) {
    setQuery(value);
    pagination.setPage(1);
  }

  function updateRole(value: string) {
    setRole(value);
    pagination.setPage(1);
  }

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

  function prefillTaskFilters(row: AssistantRow) {
    if (typeof window === "undefined") return;
    const searchValue = row.name || row.email;
    window.sessionStorage.setItem(
      "research:/tasks:tasks:prefill",
      "person-unfinished",
    );
    window.sessionStorage.setItem("research:/tasks:tasks:q", searchValue);
    window.sessionStorage.setItem(
      "research:/tasks:tasks:status",
      unfinishedTaskFilterStatuses.join(","),
    );
    window.sessionStorage.setItem(
      "research:/tasks:tasks:type",
      allTaskTypeFilterValues.join(","),
    );
    window.sessionStorage.removeItem("research:/tasks:tasks:page");
  }

  function openEdit(row: AssistantRow) {
    setEditing(row);
    setEditRole(row.assistantRole);
    setEditCanManageVenues(row.canManageResearchVenues);
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
          : `${assistant ? displayResearchPersonName(assistant) || "Assistant" : "Assistant"} is now set as ${editRole === "CHIEF_ASSISTANT" ? "chief assistant" : "assistant"}${editCanManageVenues ? " with journal/conference add authority" : ""}.`,
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
          onChange={updateQuery}
          placeholder="Search assistant, email, role..."
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect
            value={role}
            onChange={updateRole}
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
              <th className="w-[23%] px-4 py-3">Assistant</th>
              <th className="w-[20%] px-3 py-3">Email</th>
              <th className="w-[15%] px-3 py-3">Password</th>
              <th className="w-[10%] px-3 py-3">Role</th>
              <th className="w-[13%] px-3 py-3">Unfinished tasks</th>
              <th className="w-[11%] px-3 py-3">Jurisdiction</th>
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
                    <Link
                      href={`/profile?userId=${encodeURIComponent(user.id)}`}
                      className="min-w-0 truncate text-sm font-medium text-slate-700 transition-colors duration-180 ease-out hover:text-[#1F7180] focus-visible:outline-none focus-visible:text-[#1F7180] dark:text-slate-100 dark:hover:text-[#A8DADC] dark:focus-visible:text-[#A8DADC]"
                    >
                      {user.name || "Unnamed user"}
                    </Link>
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
                      className="research-allow-transform inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center border border-transparent bg-transparent p-0 text-slate-400 shadow-none outline-none transition-[color,transform] duration-180 ease-out hover:-translate-y-0.5 hover:border-transparent hover:bg-transparent hover:text-blue-600 hover:shadow-none active:scale-95 focus-visible:ring-0 dark:hover:text-blue-300"
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
                <td className="px-3 py-3 text-sm leading-5 text-[#243047] dark:text-[#E4E4E4]">
                  {unfinishedTaskTotal(user) > 0 ? (
                    <Link
                      href="/tasks"
                      onClick={() => prefillTaskFilters(user)}
                      className="research-allow-transform grid gap-1 text-left outline-none transition-[color,transform] duration-180 ease-out hover:-translate-y-0.5 hover:text-[#1F7180] focus-visible:text-[#1F7180] focus-visible:ring-0 active:translate-y-0 active:scale-[0.985] dark:hover:text-[#A8DADC] dark:focus-visible:text-[#A8DADC]"
                      aria-label={`Open unfinished tasks for ${user.name || user.email}`}
                    >
                      {sortedTaskBreakdown(user).map((item) => (
                        <span key={item.status} className="block">
                          <span className="font-normal text-[#1F2937] dark:text-[#E4E4E4]">
                            {item.count}
                          </span>{" "}
                          <span className="text-[#6C778D] dark:text-[#B0B0B0]">
                            {taskStatusLabel(item.status)}
                          </span>
                        </span>
                      ))}
                    </Link>
                  ) : (
                    <span className="text-[#6C778D] dark:text-[#B0B0B0]">
                      No unfinished task
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <VenueJurisdictionPill
                    enabled={user.canManageResearchVenues}
                  />
                </td>
                {canManage && (
                  <td className="px-2 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        className="research-allow-transform inline-flex h-5 w-5 cursor-pointer items-start justify-center border-0 bg-transparent p-0 text-blue-700 shadow-none outline-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-blue-800 hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 dark:text-blue-300 dark:hover:text-blue-200"
                        aria-label="Edit assistant role"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(user)}
                        className="research-allow-transform inline-flex h-5 w-5 cursor-pointer items-start justify-center border-0 bg-transparent p-0 text-rose-700 shadow-none outline-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-rose-800 hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 dark:text-rose-300 dark:hover:text-rose-200"
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
                <td colSpan={canManage ? 7 : 6} className="px-4 py-2">
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

      <ResearchModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit assistant role"
        icon={<ShieldCheck className="h-5 w-5" />}
        maxWidth="max-w-lg"
        bodyClassName="px-5 py-5"
        headerActions={
          <ResearchButton form="edit-assistant-form" disabled={isPending}>
            Save change
          </ResearchButton>
        }
      >
        {editing && (
          <form
            id="edit-assistant-form"
            action={submitEdit}
            className="grid gap-5"
          >
            <input type="hidden" name="userId" value={editing.id} />
            <input type="hidden" name="assistantRole" value={editRole} />
            <input
              type="hidden"
              name="canManageResearchVenues"
              value={editCanManageVenues ? "true" : "false"}
            />
            <div className="border border-slate-200 bg-slate-50 p-4 dark:border-[#444444] dark:bg-[#202020]">
              <p className="text-sm font-bold text-slate-800 dark:text-[#E4E4E4]">
                {editing.name || "Unnamed user"}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-[#B0B0B0]">
                {displayResearchEmail(editing.email)}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <RoleChoice
                active={editRole === "ASSISTANT"}
                title="Assistant"
                icon={<ShieldCheck className="h-5 w-5" />}
                onClick={() => {
                  setEditRole("ASSISTANT");
                  setEditCanManageVenues(true);
                }}
              />
              <RoleChoice
                active={editRole === "CHIEF_ASSISTANT"}
                title="Chief Assistant"
                icon={<Crown className="h-5 w-5" />}
                onClick={() => {
                  setEditRole("CHIEF_ASSISTANT");
                  setEditCanManageVenues(true);
                }}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <RoleChoice
                active={editCanManageVenues}
                title="Can Add Venues"
                icon={<LibraryBig className="h-5 w-5" />}
                onClick={() => setEditCanManageVenues(true)}
              />
              <RoleChoice
                active={!editCanManageVenues}
                title="No Venue Authority"
                icon={<ShieldCheck className="h-5 w-5" />}
                onClick={() => setEditCanManageVenues(false)}
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
                Set a new value here to update the assistant login password and
                the password shown in this table.
              </span>
            </label>
          </form>
        )}
      </ResearchModal>

      <ResearchModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Remove assistant role"
        icon={<Trash2 className="h-5 w-5" />}
        maxWidth="max-w-md"
        bodyClassName="px-5 py-5"
        headerActions={
          <ResearchButton
            form="delete-assistant-role-form"
            disabled={isPending}
            tone="danger"
          >
            Remove role
          </ResearchButton>
        }
      >
        {deleting && (
          <form
            id="delete-assistant-role-form"
            action={confirmDelete}
            className="space-y-4"
          >
            <input type="hidden" name="userId" value={deleting.id} />
            <p className="text-sm leading-6 text-slate-600 dark:text-[#B0B0B0]">
              Remove the assistant role from{" "}
              <span className="font-semibold text-slate-800 dark:text-[#E4E4E4]">
                {displayResearchPersonName(deleting) || "Selected user"}
              </span>
              ? This does not delete the user account.
            </p>
          </form>
        )}
      </ResearchModal>
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

function VenueJurisdictionPill({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`inline-flex text-xs font-normal ${
        enabled
          ? "text-[#1F7180] dark:text-[#A8DADC]"
          : "text-[#6C778D] dark:text-[#777777]"
      }`}
    >
      {enabled ? "Can add venues" : "Proposal only"}
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
          ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-[#A8DADC]/45 dark:bg-[#263636] dark:text-[#C9F0F2]"
          : "border-slate-200 bg-white text-slate-700 dark:border-[#444444] dark:bg-[#242424] dark:text-slate-300"
      }`}
    >
      {icon}
      <span className="text-sm font-bold">{title}</span>
    </button>
  );
}
