"use client";

import { useMemo, useState } from "react";
import { Search, ShieldCheck, UserRound } from "lucide-react";
import { updateResearchRoles } from "../actions";

export type AssistantRow = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};

export function AssistantsTable({ rows, roleOptions }: { rows: AssistantRow[]; roleOptions: string[] }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesRole = role === "ALL" || row.roles.includes(role);
      const haystack = [row.name, row.email, ...row.roles].join(" ").toLowerCase();
      return matchesRole && (!needle || haystack.includes(needle));
    });
  }, [query, role, rows]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people, email, role..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["ALL", ...roleOptions].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRole(item)}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition hover:-translate-y-0.5 ${
                role === item ? "bg-slate-950 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item === "ALL" ? "All" : item}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[72rem] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3"><UserRound className="h-4 w-4" aria-label="User" /></th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3"><ShieldCheck className="h-4 w-4" aria-label="Roles" /></th>
              <th className="px-4 py-3 text-right">Save</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((user) => (
              <tr key={user.id} className="align-top transition duration-200 ease-out hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-950">{user.name || "Unnamed user"}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{user.email}</td>
                <td className="px-4 py-3">
                  <form id={`roles-${user.id}`} action={updateResearchRoles}>
                    <input type="hidden" name="userId" value={user.id} />
                    <div className="flex flex-wrap gap-2">
                      {roleOptions.map((item) => (
                        <label
                          key={item}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-14 text-center text-sm text-slate-500">
                  No users match the current search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
