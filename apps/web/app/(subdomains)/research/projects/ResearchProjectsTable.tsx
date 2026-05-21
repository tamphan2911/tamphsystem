"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, FileText, Search, Send, Trophy } from "lucide-react";

export type ResearchProjectRow = {
  id: string;
  title: string;
  abstract: string;
  stage: string;
  claimStatus: string;
  coAuthors: string;
  universityRegistration: string;
  leadResearcher: string;
  submissions: number;
  publications: number;
  updatedAt: string;
};

const stages = ["ALL", "PRODUCTION", "SUBMITTING", "ACCEPTED", "PUBLISHED"];

function statusClass(stage: string) {
  if (stage === "PUBLISHED") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (stage === "ACCEPTED") return "bg-purple-50 text-purple-700 ring-purple-100";
  if (stage === "SUBMITTING") return "bg-blue-50 text-blue-700 ring-blue-100";
  return "bg-slate-50 text-slate-700 ring-slate-200";
}

export function ResearchProjectsTable({ rows }: { rows: ResearchProjectRow[] }) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("ALL");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStage = stage === "ALL" || row.stage === stage;
      const haystack = [
        row.title,
        row.abstract,
        row.coAuthors,
        row.universityRegistration,
        row.leadResearcher,
        row.claimStatus,
        row.stage,
      ].join(" ").toLowerCase();
      return matchesStage && (!needle || haystack.includes(needle));
    });
  }, [query, rows, stage]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search research, authors, registration..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {stages.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStage(item)}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition hover:-translate-y-0.5 ${
                stage === item ? "bg-slate-950 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item === "ALL" ? "All" : item}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[74rem] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Research</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Claim</th>
              <th className="px-4 py-3">Reg.</th>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3 text-center" title="Submissions"><Send className="mx-auto h-4 w-4" /></th>
              <th className="px-4 py-3 text-center" title="Publications"><Trophy className="mx-auto h-4 w-4" /></th>
              <th className="px-4 py-3 text-right">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((row) => (
            <tr key={row.id} className="transition duration-200 ease-out hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/projects/${row.id}`} className="group">
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-4 w-4 flex-none text-slate-400 group-hover:text-blue-600" />
                      <div>
                        <p className="font-semibold text-slate-950 group-hover:text-blue-600">{row.title}</p>
                        <p className="mt-1 line-clamp-1 max-w-lg text-xs text-slate-500">{row.coAuthors || row.abstract || "No notes"}</p>
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${statusClass(row.stage)}`}>{row.stage}</span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{row.claimStatus.replace("_", " ")}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{row.universityRegistration || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{row.leadResearcher}</td>
                <td className="px-4 py-3 text-center text-sm font-semibold text-slate-600">{row.submissions}</td>
                <td className="px-4 py-3 text-center text-sm font-semibold text-slate-600">{row.publications}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/projects/${row.id}`} className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600" title="Open research">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-14 text-center text-sm text-slate-500">
                  No research matches the current search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
