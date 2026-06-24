"use client";

import { researchDateTimeFormat } from "@/sites/research/lib/date-time";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Mail,
  MailCheck,
  MailWarning,
  Pencil,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { deleteResearchSiteUser, updateResearchSiteUser } from "../actions";
import {
  FilterSelect,
  IconHint,
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
import { displayResearchPersonName } from "@/sites/research/lib/display";

export type ResearchUserRow = {
  id: string;
  name: string;
  email: string;
  affiliation: string;
  roles: string[];
  activeSites: string[];
  password: string;
  emailVerified: string | null;
  createdAt: string;
  updatedAt: string;
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

function sortedTaskBreakdown(row: ResearchUserRow) {
  return [...row.unfinishedTasks].sort(
    (left, right) =>
      unfinishedTaskStatusOrder.indexOf(left.status) -
      unfinishedTaskStatusOrder.indexOf(right.status),
  );
}

function unfinishedTaskTotal(row: ResearchUserRow) {
  return row.unfinishedTasks.reduce((total, item) => total + item.count, 0);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return researchDateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function reasonMessage(reason?: string) {
  if (reason === "SELF_DELETE") return "You cannot delete your own account.";
  if (reason === "VERIFIED_EMAIL_LOCKED")
    return "The main email cannot be changed after it has been verified.";
  if (reason === "DELETE_FAILED")
    return "This user is linked to research records, tasks, or notifications and could not be deleted.";
  if (reason === "UPDATE_FAILED")
    return "The user could not be updated. Check for duplicate email addresses.";
  return "Please check the user information and try again.";
}

export function ResearchUsersTable({
  rows,
  roleOptions,
}: {
  rows: ResearchUserRow[];
  roleOptions: string[];
}) {
  const router = useRouter();
  const { showSuccess, showError } = useResearchToast();
  const [query, setQuery] = usePersistentTableValue("users:q", "");
  const [role, setRole] = usePersistentTableValue("users:role", "ALL");
  const [editing, setEditing] = useState<ResearchUserRow | null>(null);
  const [deleting, setDeleting] = useState<ResearchUserRow | null>(null);
  const [visiblePasswordId, setVisiblePasswordId] = useState<string | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesRole = role === "ALL" || row.roles.includes(role);
      const haystack = [
        row.name,
        row.email,
        row.affiliation,
        row.id,
        ...row.roles,
      ]
        .join(" ")
        .toLowerCase();
      return matchesRole && (!needle || haystack.includes(needle));
    });
  }, [query, role, rows]);

  const pagination = useTablePagination(filtered, 12, 1, "users");

  function updateQuery(value: string) {
    setQuery(value);
    pagination.setPage(1);
  }

  function updateRole(value: string) {
    setRole(value);
    pagination.setPage(1);
  }

  function prefillTaskFilters(row: ResearchUserRow) {
    if (typeof window === "undefined") return;
    const searchValue = row.name || row.email;
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

  function submitEdit(formData: FormData) {
    const target = editing;
    startTransition(async () => {
      const result = await updateResearchSiteUser(formData);
      if (result?.ok) {
        setEditing(null);
        showSuccess({
          title: "User updated",
          detail: `${target ? displayResearchPersonName(target) || "Research user" : "Research user"} has been updated.`,
        });
        router.refresh();
        return;
      }
      showError({
        title: "User update failed",
        detail: reasonMessage(result?.reason),
      });
    });
  }

  function confirmDelete(formData: FormData) {
    const target = deleting;
    startTransition(async () => {
      const result = await deleteResearchSiteUser(formData);
      if (result?.ok) {
        setDeleting(null);
        showSuccess({
          title: "User deleted",
          detail: `${target ? displayResearchPersonName(target) || "Research user" : "Research user"} has been removed.`,
        });
        router.refresh();
        return;
      }
      showError({
        title: "User delete failed",
        detail: reasonMessage(result?.reason),
      });
    });
  }

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={updateQuery}
          placeholder="Search name, email, affiliation, role..."
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect
            value={role}
            onChange={updateRole}
            ariaLabel="Filter by role"
            options={[
              { value: "ALL", label: "All roles" },
              ...roleOptions.map((item) => ({ value: item, label: item })),
            ]}
          />
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
            <tr>
              <th className="w-[27%] px-4 py-3">User</th>
              <th className="w-[15%] px-3 py-3">Affiliation</th>
              <th className="w-[14%] px-3 py-3">Roles</th>
              <th className="w-[12%] px-3 py-3">Password</th>
              <th className="w-[13%] px-3 py-3">Unfinished tasks</th>
              <th className="w-[8%] px-3 py-3">Email</th>
              <th className="w-[6%] px-3 py-3">Joined</th>
              <th className="w-[5%] px-2 py-3 text-right">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#444444]">
            {pagination.pagedRows.map((user) => {
              const passwordVisible = visiblePasswordId === user.id;
              return (
                <tr
                  key={user.id}
                  className="group align-top transition-colors duration-150 hover:bg-[#383838]"
                >
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center text-[#1F7180] dark:text-[#A8DADC]">
                        <UserRound className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <Link
                          href={`/profile?userId=${encodeURIComponent(user.id)}`}
                          className="block truncate text-sm font-medium text-slate-700 transition-colors duration-180 ease-out hover:text-[#1F7180] focus-visible:outline-none focus-visible:text-[#1F7180] dark:text-slate-100 dark:hover:text-[#A8DADC] dark:focus-visible:text-[#A8DADC]"
                        >
                          {user.name || "Unnamed user"}
                        </Link>
                        <span className="block truncate text-xs text-[#B0B0B0]">
                          {user.email || "No email recorded"}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-[#B0B0B0]">
                    <span className="line-clamp-2">
                      {user.affiliation || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs font-normal leading-5 text-[#B0B0B0]">
                      {user.roles.join(", ") || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="inline-flex max-w-full items-center gap-2 py-1.5 text-sm text-slate-700 dark:text-slate-200">
                      <span className="min-w-0 flex-1 truncate font-mono">
                        {passwordVisible
                          ? user.password || "Not stored"
                          : user.password
                            ? "••••••••"
                            : "••••"}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setVisiblePasswordId(passwordVisible ? null : user.id)
                        }
                        className="research-allow-transform inline-flex h-5 w-5 shrink-0 cursor-pointer items-start justify-center border-0 bg-transparent p-0 text-blue-700 shadow-none outline-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-blue-800 hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 dark:text-blue-300 dark:hover:text-blue-200"
                        aria-label={
                          passwordVisible ? "Hide password" : "Show password"
                        }
                      >
                        {passwordVisible ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
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
                  <td className="px-3 py-3 text-sm align-top">
                    {(() => {
                      const hasEmail = Boolean(user.email.trim());
                      const label = !hasEmail
                        ? "Empty"
                        : user.emailVerified
                          ? "Verified"
                          : "Pending";
                      const EmailIcon = !hasEmail
                        ? MailWarning
                        : user.emailVerified
                          ? MailCheck
                          : Mail;
                      const className = !hasEmail
                        ? "text-rose-700 dark:text-rose-300"
                        : user.emailVerified
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-amber-700 dark:text-amber-300";

                      return (
                        <IconHint label={`Email: ${label}`}>
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center ${className}`}
                          >
                            <EmailIcon className="h-4 w-4" />
                          </span>
                        </IconHint>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-3 text-sm text-[#B0B0B0]">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditing(user)}
                        className="research-allow-transform inline-flex h-5 w-5 cursor-pointer items-start justify-center border-0 bg-transparent p-0 text-blue-700 shadow-none outline-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-blue-800 hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 dark:text-blue-300 dark:hover:text-blue-200"
                        aria-label="Edit user"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(user)}
                        className="research-allow-transform inline-flex h-5 w-5 cursor-pointer items-start justify-center border-0 bg-transparent p-0 text-rose-700 shadow-none outline-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-rose-800 hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 dark:text-rose-300 dark:hover:text-rose-200"
                        aria-label="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {pagination.total === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-2">
                  <ResearchEmptyState
                    title="No research users match the current filters."
                    detail="Try another name, email, role, or activation filter."
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
        title="Edit research user"
        icon={<UserRound className="h-5 w-5" />}
        maxWidth="max-w-2xl"
        bodyClassName="px-5 py-5"
        headerActions={
          <ResearchButton form="edit-research-user-form" disabled={isPending}>
            <Save className="h-4 w-4" />
            Save user
          </ResearchButton>
        }
      >
        {editing && (
          <form
            id="edit-research-user-form"
            action={submitEdit}
            className="grid gap-4"
          >
            <input type="hidden" name="userId" value={editing.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" name="name" defaultValue={editing.name} />
              <Field
                label="Email"
                name="email"
                type="email"
                defaultValue={editing.email}
                placeholder="Main account email"
                readOnly={Boolean(editing.emailVerified)}
                hint={
                  editing.emailVerified
                    ? "Verified main email cannot be changed."
                    : undefined
                }
              />
              <Field
                label="Affiliation"
                name="affiliation"
                defaultValue={editing.affiliation}
              />
              <Field
                label="New password"
                name="password"
                type="text"
                placeholder="Leave blank to keep current password"
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                Roles
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {roleOptions.map((item) => (
                  <label
                    key={item}
                    className="flex items-center gap-2 border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-[#444444] dark:text-slate-200"
                  >
                    <input
                      type="checkbox"
                      name="roles"
                      value={item}
                      defaultChecked={editing.roles.includes(item)}
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>
          </form>
        )}
      </ResearchModal>

      <ResearchModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete research user"
        icon={<AlertTriangle className="h-5 w-5" />}
        maxWidth="max-w-md"
        bodyClassName="px-5 py-5"
        headerActions={
          <ResearchButton
            form="delete-research-user-form"
            disabled={isPending}
            tone="danger"
          >
            <Trash2 className="h-4 w-4" />
            Delete user
          </ResearchButton>
        }
      >
        {deleting && (
          <form
            id="delete-research-user-form"
            action={confirmDelete}
            className="space-y-4"
          >
            <input type="hidden" name="userId" value={deleting.id} />
            <div className="flex gap-3 rounded-none border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm leading-6">
                Delete{" "}
                <span className="font-bold">
                  {displayResearchPersonName(deleting) || "Research user"}
                </span>
                ? This removes the user account. If the user is linked to
                research records or tasks, deletion may be blocked.
              </p>
            </div>
          </form>
        )}
      </ResearchModal>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required = false,
  readOnly = false,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  hint?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
        {label}
        {required ? <span className="research-required-mark">(*)</span> : null}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        aria-readonly={readOnly}
        className={`${researchFieldClass} ${readOnly ? "cursor-not-allowed opacity-70" : ""}`}
      />
      {hint ? (
        <span className="text-xs font-normal text-[#B0B0B0]">{hint}</span>
      ) : null}
    </label>
  );
}
