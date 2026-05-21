"use client";

import { useMemo, useState } from "react";
import { AtSign, BookOpen, Building2, KeyRound, LockKeyhole, Search, Send, StickyNote, UserRound } from "lucide-react";

export type AccountRow = {
  id: string;
  username: string;
  password: string;
  email: string;
  note: string;
  journalName: string;
  publisher: string;
  submissions: number;
};

const scopes = ["ALL", "PUBLISHER", "JOURNAL"];

export function AccountsTable({ rows }: { rows: AccountRow[] }) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("ALL");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const rowScope = row.journalName ? "JOURNAL" : "PUBLISHER";
      const matchesScope = scope === "ALL" || rowScope === scope;
      const haystack = [row.username, row.email, row.journalName, row.publisher, row.note].join(" ").toLowerCase();
      return matchesScope && (!needle || haystack.includes(needle));
    });
  }, [query, rows, scope]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search accounts, email, journal..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {scopes.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setScope(item)}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition hover:-translate-y-0.5 ${
                scope === item ? "bg-slate-950 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item === "ALL" ? "All" : item === "PUBLISHER" ? "Publisher-wide" : "Journal"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[72rem] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3"><UserRound className="h-4 w-4" aria-label="ID" /></th>
              <th className="px-4 py-3"><LockKeyhole className="h-4 w-4" aria-label="Password" /></th>
              <th className="px-4 py-3"><AtSign className="h-4 w-4" aria-label="Email" /></th>
              <th className="px-4 py-3"><BookOpen className="h-4 w-4" aria-label="Journal" /></th>
              <th className="px-4 py-3"><Building2 className="h-4 w-4" aria-label="Publisher" /></th>
              <th className="px-4 py-3"><Send className="h-4 w-4" aria-label="Submissions" /></th>
              <th className="px-4 py-3"><StickyNote className="h-4 w-4" aria-label="Note" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((account) => (
              <tr key={account.id} className="align-top transition duration-200 ease-out hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 font-semibold text-slate-950">
                    <KeyRound className="h-4 w-4 text-slate-400" />
                    {account.username}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-sm text-slate-600">{account.password || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{account.email || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{account.journalName || "Publisher-wide"}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{account.publisher || "-"}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-600">{account.submissions}</td>
                <td className="max-w-sm px-4 py-3 text-sm text-slate-600">{account.note || "-"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center text-sm text-slate-500">
                  No accounts match the current search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
