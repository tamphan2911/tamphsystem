"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, BookOpen, Building2, Hash, ReceiptText, Search, StickyNote, Users } from "lucide-react";

export type JournalRow = {
  id: string;
  name: string;
  issn: string;
  field: string;
  rank: string;
  publisher: string;
  apc: string;
  submissionFee: string;
  note: string;
  submissions: number;
  accounts: number;
};

const ranks = ["ALL", "Q1", "Q2", "Q3", "Q4", "Scopus", "ISI", "UNRANKED"];

function rankBadge(rank: string) {
  if (rank === "Q1") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (rank === "Q2") return "bg-blue-50 text-blue-700 ring-blue-100";
  if (rank === "Q3") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (rank === "Q4") return "bg-rose-50 text-rose-700 ring-rose-100";
  if (rank) return "bg-slate-50 text-slate-700 ring-slate-200";
  return "bg-slate-50 text-slate-500 ring-slate-200";
}

export function JournalsTable({ rows }: { rows: JournalRow[] }) {
  const [query, setQuery] = useState("");
  const [rank, setRank] = useState("ALL");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const rowRank = row.rank || "UNRANKED";
      const matchesRank = rank === "ALL" || rowRank === rank;
      const haystack = [row.name, row.issn, row.field, row.rank, row.publisher, row.apc, row.submissionFee, row.note]
        .join(" ")
        .toLowerCase();
      return matchesRank && (!needle || haystack.includes(needle));
    });
  }, [query, rank, rows]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search journals, ISSN, publisher..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {ranks.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRank(item)}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition hover:-translate-y-0.5 ${
                rank === item ? "bg-slate-950 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item === "UNRANKED" ? "No rank" : item === "ALL" ? "All" : item}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[78rem] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3"><BookOpen className="h-4 w-4" aria-label="Journal" /></th>
              <th className="px-4 py-3"><Hash className="h-4 w-4" aria-label="ISSN" /></th>
              <th className="px-4 py-3">Field</th>
              <th className="px-4 py-3"><BadgeCheck className="h-4 w-4" aria-label="Rank" /></th>
              <th className="px-4 py-3"><Building2 className="h-4 w-4" aria-label="Publisher" /></th>
              <th className="px-4 py-3"><ReceiptText className="h-4 w-4" aria-label="APC" /></th>
              <th className="px-4 py-3">Fee</th>
              <th className="px-4 py-3"><Users className="h-4 w-4" aria-label="Usage" /></th>
              <th className="px-4 py-3"><StickyNote className="h-4 w-4" aria-label="Note" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((journal) => (
              <tr key={journal.id} className="align-top transition duration-200 ease-out hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-950">{journal.name}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{journal.issn || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{journal.field || "-"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${rankBadge(journal.rank)}`}>
                    {journal.rank || "N/A"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{journal.publisher || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{journal.apc || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{journal.submissionFee || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{journal.submissions} / {journal.accounts}</td>
                <td className="max-w-xs px-4 py-3 text-sm text-slate-600">{journal.note || "-"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-14 text-center text-sm text-slate-500">
                  No journals match the current search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
