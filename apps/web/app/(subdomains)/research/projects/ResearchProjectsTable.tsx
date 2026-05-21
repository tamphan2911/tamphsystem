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
const claims = ["ALL", "CANNOT_CLAIM", "MAKING_DOCUMENT", "WAITING", "CLAIMED"];

function statusClass(stage: string) {
  if (stage === "PUBLISHED") return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  if (stage === "ACCEPTED") return "bg-purple-50 text-purple-700 ring-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:ring-purple-900";
  if (stage === "SUBMITTING") return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  return "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

export function ResearchProjectsTable({ rows }: { rows: ResearchProjectRow[] }) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("ALL");
  const [claim, setClaim] = useState("ALL");
  const [lead, setLead] = useState("ALL");

  const leadOptions = useMemo(() => ["ALL", ...Array.from(new Set(rows.map((row) => row.leadResearcher).filter(Boolean))).sort()], [rows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStage = stage === "ALL" || row.stage === stage;
      const matchesClaim = claim === "ALL" || row.claimStatus === claim;
      const matchesLead = lead === "ALL" || row.leadResearcher === lead;
      const haystack = [
        row.title,
        row.abstract,
        row.coAuthors,
        row.universityRegistration,
        row.leadResearcher,
        row.claimStatus,
        row.stage,
      ].join(" ").toLowerCase();
      return matchesStage && matchesClaim && matchesLead && (!needle || haystack.includes(needle));
    });
  }, [claim, lead, query, rows, stage]);

  const selectClass = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search research, authors, registration..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 dark:border-slate-700 dark:bg-slate-950 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={stage} onChange={(event) => setStage(event.target.value)} className={selectClass} aria-label="Filter by stage">
            {stages.map((item) => <option key={item} value={item}>{item === "ALL" ? "All stages" : item}</option>)}
          </select>
          <select value={claim} onChange={(event) => setClaim(event.target.value)} className={selectClass} aria-label="Filter by claim">
            {claims.map((item) => <option key={item} value={item}>{item === "ALL" ? "All claims" : item.replace("_", " ")}</option>)}
          </select>
          <select value={lead} onChange={(event) => setLead(event.target.value)} className={selectClass} aria-label="Filter by lead">
            {leadOptions.map((item) => <option key={item} value={item}>{item === "ALL" ? "All leads" : item}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[74rem] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800 dark:shadow-[1px_0_0_0_rgb(30,41,59)]">Research</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Claim</th>
              <th className="px-4 py-3">Reg.</th>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3 text-center" title="Submissions"><Send className="mx-auto h-4 w-4" /></th>
              <th className="px-4 py-3 text-center" title="Publications"><Trophy className="mx-auto h-4 w-4" /></th>
              <th className="px-4 py-3 text-right">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((row) => (
              <tr key={row.id} className="group transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="sticky left-0 z-10 bg-white px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-900 dark:shadow-[1px_0_0_0_rgb(30,41,59)] transition-colors group-hover:bg-slate-50 dark:group-hover:bg-slate-800">
                  <Link href={`/projects/${row.id}`} className="group">
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-4 w-4 flex-none text-slate-400 group-hover:text-blue-600" />
                      <div>
                        <p className="font-semibold text-slate-950 dark:text-white group-hover:text-blue-600">{row.title}</p>
                        <p className="mt-1 line-clamp-1 max-w-lg text-xs text-slate-500 dark:text-slate-400">{row.coAuthors || row.abstract || "No notes"}</p>
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${statusClass(row.stage)}`}>{row.stage}</span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{row.claimStatus.replace("_", " ")}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{row.universityRegistration || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{row.leadResearcher}</td>
                <td className="px-4 py-3 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">{row.submissions}</td>
                <td className="px-4 py-3 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">{row.publications}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/projects/${row.id}`} className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 dark:text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-300" title="Open research">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
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
