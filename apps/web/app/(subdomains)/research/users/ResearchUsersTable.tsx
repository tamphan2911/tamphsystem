"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Pencil,
  Save,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { deleteResearchSiteUser, updateResearchSiteUser } from "../actions";
import {
  FilterSelect,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "../components/TableControls";
import { useResearchToast } from "../components/ResearchToast";

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
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function reasonMessage(reason?: string) {
  if (reason === "SELF_DELETE") return "You cannot delete your own account.";
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
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
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

  const pagination = useTablePagination(filtered, 12);

  function submitEdit(formData: FormData) {
    const target = editing;
    startTransition(async () => {
      const result = await updateResearchSiteUser(formData);
      if (result?.ok) {
        setEditing(null);
        showSuccess({
          title: "User updated",
          detail: `${target?.name || target?.email || "Research user"} has been updated.`,
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
          detail: `${target?.name || target?.email || "Research user"} has been removed.`,
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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search name, email, affiliation, role..."
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect
            value={role}
            onChange={setRole}
            ariaLabel="Filter by role"
            options={[
              { value: "ALL", label: "All roles" },
              ...roleOptions.map((item) => ({ value: item, label: item })),
            ]}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[68rem] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800 dark:shadow-[1px_0_0_0_rgb(30,41,59)]">
                User
              </th>
              <th className="px-4 py-3">Affiliation</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Password</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagination.pagedRows.map((user) => {
              const passwordVisible = visiblePasswordId === user.id;
              return (
                <tr
                  key={user.id}
                  className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] transition-colors group-hover:bg-slate-50 dark:bg-slate-900 dark:shadow-[1px_0_0_0_rgb(30,41,59)] dark:group-hover:bg-slate-800">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-sm dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <UserRound className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {user.name || "Unnamed user"}
                        </span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                          {user.email}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {user.affiliation || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-xs flex-wrap gap-1.5">
                      {user.roles.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="inline-flex max-w-[14rem] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
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
                        className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-blue-600 dark:hover:bg-slate-900 dark:hover:text-blue-300"
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
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${
                        user.emailVerified
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900"
                          : "bg-amber-50 text-amber-800 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900"
                      }`}
                    >
                      {user.emailVerified ? "Verified" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(user)}
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-blue-900 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                        aria-label="Edit user"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(user)}
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-rose-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
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
                <td
                  colSpan={7}
                  className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  No research users match the current filters.
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
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <DialogHeader
              title="Edit research user"
              onClose={() => setEditing(null)}
            />
            <form action={submitEdit} className="grid gap-4 px-5 py-5">
              <input type="hidden" name="userId" value={editing.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" name="name" defaultValue={editing.name} />
                <Field
                  label="Email"
                  name="email"
                  type="email"
                  defaultValue={editing.email}
                  required
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
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Roles
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {roleOptions.map((item) => (
                    <label
                      key={item}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
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
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-wait disabled:opacity-70"
                >
                  <Save className="h-4 w-4" />
                  Save user
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <DialogHeader
              title="Delete research user"
              onClose={() => setDeleting(null)}
            />
            <form action={confirmDelete} className="space-y-4 px-5 py-5">
              <input type="hidden" name="userId" value={deleting.id} />
              <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm leading-6">
                  Delete{" "}
                  <span className="font-bold">
                    {deleting.name || deleting.email}
                  </span>
                  ? This removes the user account. If the user is linked to
                  research records or tasks, deletion may be blocked.
                </p>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeleting(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-md disabled:cursor-wait disabled:opacity-70"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete user
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
    </label>
  );
}

function DialogHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
      <h3 className="text-base font-bold text-slate-950 dark:text-white">
        {title}
      </h3>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
