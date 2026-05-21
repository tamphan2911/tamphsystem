"use client";

import { useMemo, useState } from "react";
import { Search, ShieldCheck, UserRound } from "lucide-react";
import { updateResearchRoles } from "../actions";
import { FilterSelect, IconHint, TablePagination, useTablePagination } from "../components/TableControls";

export type AssistantRow = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};

export function AssistantsTable({ rows, roleOptions }: { rows: AssistantRow[]; roleOptions: string[] }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesRole = role === "ALL" || row.roles.includes(role);
      const matchesStatus =
        status === "ALL" ||
        (status === "RESEARCH_TEAM" && (row.roles.includes("ASSISTANT") || row.roles.includes("CHIEF_ASSISTANT") || row.roles.includes("RESEARCHER"))) ||
        (status === "NON_RESEARCH" && !row.roles.includes("ASSISTANT") && !row.roles.includes("CHIEF_ASSISTANT") && !row.roles.includes("RESEARCHER"));
      const haystack = [row.name, row.email, ...row.roles].join(" ").toLowerCase();
      return matchesRole && matchesStatus && (!needle || haystack.includes(needle));
    });
  }, [query, role, rows, status]);

  const pagination = useTablePagination(filtered, 10);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <IconHint label="Search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Search className="h-4 w-4" aria-hidden="true" /></IconHint>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people, email, role..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 dark:border-slate-700 dark:bg-slate-950 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterSelect value={role} onChange={setRole} ariaLabel="Filter by role" options={["ALL", ...roleOptions].map((item) => ({ value: item, label: item === "ALL" ? "All roles" : item }))} />
          <FilterSelect value={status} onChange={setStatus} ariaLabel="Filter by research status" options={[
            { value: "ALL", label: "All users" },
            { value: "RESEARCH_TEAM", label: "Research team" },
            { value: "NON_RESEARCH", label: "Non-research" },
          ]} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[72rem] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800 dark:shadow-[1px_0_0_0_rgb(30,41,59)]"><IconHint label="User"><UserRound className="h-4 w-4" aria-hidden="true" /></IconHint></th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3"><IconHint label="Roles"><ShieldCheck className="h-4 w-4" aria-hidden="true" /></IconHint></th>
              <th className="px-4 py-3 text-right">Save</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagination.pagedRows.map((user) => (
              <tr key={user.id} className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-normal text-slate-700 shadow-[1px_0_0_0_rgb(226,232,240)] transition-colors group-hover:bg-slate-50 dark:text-slate-200 dark:shadow-[1px_0_0_0_rgb(30,41,59)] dark:group-hover:bg-slate-800">{user.name || "Unnamed user"}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{user.email}</td>
                <td className="px-4 py-3">
                  <form id={`roles-${user.id}`} action={updateResearchRoles}>
                    <input type="hidden" name="userId" value={user.id} />
                    <div className="flex flex-wrap gap-2">
                      {roleOptions.map((item) => (
                        <label
                          key={item}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <input
                            type="checkbox"
                            name="roles"
                            value={item}
                            defaultChecked={user.roles.includes(item)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                          />
                          {item}
                        </label>
                      ))}
                    </div>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    form={`roles-${user.id}`}
                    className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
            {pagination.total === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
                  No users match the current search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <TablePagination page={pagination.page} pageCount={pagination.pageCount} total={pagination.total} pageSize={pagination.pageSize} onPageChange={pagination.setPage} />
    </div>
  );
}
