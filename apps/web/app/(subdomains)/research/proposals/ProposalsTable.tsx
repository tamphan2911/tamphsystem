"use client";

import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "../components/TableControls";

export type ProposalRow = {
  id: string;
  type: string;
  status: string;
  title: string;
  description: string;
  contactInfo: string;
  notes: string;
  fileName: string;
  fileSize: string;
  submittedBy: string;
  submittedByEmail: string;
  createdAt: string;
};

const typeOptions = ["ALL", "RESEARCH", "PROJECT"];
const statusOptions = ["ALL", "NEW", "REVIEWING", "ACCEPTED", "DECLINED"];

function label(value: string) {
  return value
    .toLowerCase()
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status: string) {
  if (status === "ACCEPTED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  }
  if (status === "DECLINED") {
    return "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900";
  }
  if (status === "REVIEWING") {
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  }
  return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
}

export function ProposalsTable({ rows }: { rows: ProposalRow[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesType = type === "ALL" || row.type === type;
      const matchesStatus = status === "ALL" || row.status === status;
      const haystack = [
        row.title,
        row.description,
        row.contactInfo,
        row.notes,
        row.fileName,
        row.submittedBy,
        row.submittedByEmail,
      ]
        .join(" ")
        .toLowerCase();
      return (
        matchesType && matchesStatus && (!needle || haystack.includes(needle))
      );
    });
  }, [query, rows, status, type]);

  const pagination = useTablePagination(filtered, 10);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search proposal, contact, submitter..."
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect
            value={type}
            onChange={setType}
            ariaLabel="Filter by proposal type"
            options={typeOptions.map((item) => ({
              value: item,
              label: item === "ALL" ? "All types" : label(item),
            }))}
          />
          <FilterSelect
            value={status}
            onChange={setStatus}
            ariaLabel="Filter by proposal status"
            options={statusOptions.map((item) => ({
              value: item,
              label: item === "ALL" ? "All statuses" : label(item),
            }))}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[78rem] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="sticky left-0 z-20 w-[26rem] bg-slate-50 px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800 dark:shadow-[1px_0_0_0_rgb(30,41,59)]">
                Proposal
              </th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted by</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagination.pagedRows.map((proposal) => (
              <tr
                key={proposal.id}
                className="group align-top transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <td className="sticky left-0 z-10 bg-white px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] transition-colors group-hover:bg-slate-50 dark:bg-slate-900 dark:shadow-[1px_0_0_0_rgb(30,41,59)] dark:group-hover:bg-slate-800">
                  <p className="text-sm font-normal text-slate-800 dark:text-slate-100">
                    {proposal.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {proposal.description}
                  </p>
                  {proposal.notes && (
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      Notes: {proposal.notes}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  {label(proposal.type)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusClass(proposal.status)}`}
                  >
                    {label(proposal.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  <span className="block text-slate-700 dark:text-slate-200">
                    {proposal.submittedBy}
                  </span>
                  <span>{proposal.submittedByEmail}</span>
                </td>
                <td className="max-w-56 px-4 py-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {proposal.contactInfo || "-"}
                </td>
                <td className="px-4 py-3">
                  {proposal.fileName ? (
                    <IconHint label="Download support file">
                      <a
                        href={`/api/research/proposals/${proposal.id}/file`}
                        className="inline-flex max-w-48 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:bg-white hover:text-emerald-700 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-emerald-200"
                      >
                        <Download className="h-3.5 w-3.5 flex-none" />
                        <span className="truncate">{proposal.fileName}</span>
                        <span className="text-slate-400">
                          {proposal.fileSize}
                        </span>
                      </a>
                    </IconHint>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-xs text-slate-400">
                      <FileText className="h-3.5 w-3.5" />
                      No file
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                  {proposal.createdAt}
                </td>
              </tr>
            ))}
            {pagination.total === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  No proposals match the current search.
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
    </div>
  );
}
