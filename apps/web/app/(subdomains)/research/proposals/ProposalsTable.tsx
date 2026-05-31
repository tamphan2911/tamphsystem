"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  Download,
  FileQuestion,
  FolderGit2,
  Trash2,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "../components/TableControls";
import { ResearchConfirmDialog } from "../components/ResearchConfirmDialog";
import { useResearchToast } from "../components/ResearchToast";

export type ProposalRow = {
  id: string;
  type: string;
  status: string;
  title: string;
  description: string;
  contactInfo: string;
  notes: string;
  identifier: string;
  organization: string;
  location: string;
  website: string;
  decisionComment: string;
  fileName: string;
  fileSize: string;
  submittedBy: string;
  submittedByEmail: string;
  createdAt: string;
};

const typeOptions = ["ALL", "RESEARCH", "PROJECT", "CONFERENCE", "JOURNAL"];
const statusOptions = ["ALL", "NEW", "ACCEPTED", "DECLINED"];

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
  return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
}

function statusIcon(status: string) {
  if (status === "ACCEPTED") return CheckCircle2;
  if (status === "DECLINED") return XCircle;
  return FolderGit2;
}

function typeIcon(type: string) {
  if (type === "JOURNAL") return BookOpen;
  if (type === "PROJECT") return Building2;
  return FolderGit2;
}

function typeClass(type: string) {
  if (type === "PROJECT") {
    return "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900";
  }
  if (type === "CONFERENCE") {
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  }
  if (type === "JOURNAL") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  }
  return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
}

function IconChip({
  icon: Icon,
  label,
  className,
}: {
  icon: LucideIcon;
  label: string;
  className: string;
}) {
  return (
    <IconHint label={label}>
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ring-1 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${className}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>
    </IconHint>
  );
}

function DeleteProposalButton({
  proposal,
  deleteAction,
}: {
  proposal: ProposalRow;
  deleteAction: (proposalId: string) => Promise<void>;
}) {
  const router = useRouter();
  const toast = useResearchToast();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <>
      <IconHint label="Delete proposal">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100 hover:shadow-md dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-300 dark:hover:border-rose-700 dark:hover:bg-rose-900/50"
          aria-label={`Delete ${proposal.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </IconHint>

      <ResearchConfirmDialog
        open={open}
        title="Delete this proposal?"
        description="This will remove the proposal record and any support file attached to it."
        confirmLabel={isDeleting ? "Deleting..." : "Delete proposal"}
        isConfirming={isDeleting}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await deleteAction(proposal.id);
            setOpen(false);
            router.refresh();
            toast.showSuccess({
              title: "Proposal deleted",
              detail: "The proposal has been removed from the list.",
            });
          } catch (error) {
            toast.showError({
              title: "Could not delete proposal",
              detail:
                error instanceof Error
                  ? error.message
                  : "The proposal was not removed. Please refresh the page and try again.",
            });
          } finally {
            setIsDeleting(false);
          }
        }}
      >
        <p>
          Proposal:{" "}
          <span className="font-semibold text-slate-950 dark:text-white">
            {proposal.title}
          </span>
        </p>
        <p className="font-semibold text-rose-700 dark:text-rose-300">
          This action cannot be undone from this screen.
        </p>
      </ResearchConfirmDialog>
    </>
  );
}

export function ProposalsTable({
  rows,
  isAdmin,
  deleteAction,
}: {
  rows: ProposalRow[];
  isAdmin: boolean;
  deleteAction: (proposalId: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const rowStatus = row.status === "REVIEWING" ? "NEW" : row.status;
      const matchesType = type === "ALL" || row.type === type;
      const matchesStatus = status === "ALL" || rowStatus === status;
      const haystack = [
        row.title,
        row.description,
        row.contactInfo,
        row.notes,
        row.identifier,
        row.organization,
        row.location,
        row.website,
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

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="w-20 px-3 py-3">ID</th>
              <th className="px-3 py-3">Proposal</th>
              <th className="w-14 px-2 py-3 text-center">Type</th>
              <th className="w-14 px-2 py-3 text-center">Status</th>
              <th className="w-36 px-3 py-3">Submitted</th>
              <th className="w-28 px-3 py-3">Contact</th>
              <th className="w-12 px-2 py-3 text-center">File</th>
              {isAdmin && (
                <th className="w-12 px-2 py-3 text-center">Delete</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagination.pagedRows.map((proposal) => (
              <tr
                key={proposal.id}
                className={`group align-top transition ${
                  proposal.status === "NEW"
                    ? "bg-amber-50/70 ring-1 ring-inset ring-amber-100 hover:bg-amber-50 dark:bg-amber-950/20 dark:ring-amber-900/60 dark:hover:bg-amber-950/30"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
              >
                <td className="px-3 py-3 align-top">
                  <Link href={`/proposals/${proposal.id}`}>
                    <span className="font-mono text-xs font-semibold text-slate-400 transition hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-300">
                      {proposal.id.slice(0, 8)}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 align-top">
                  <Link
                    href={`/proposals/${proposal.id}`}
                    className="line-clamp-2 text-base font-normal leading-snug text-slate-800 transition hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-300"
                  >
                    {proposal.title}
                  </Link>
                  <p className="mt-1 font-mono text-xs text-slate-400 dark:text-slate-500">
                    {proposal.createdAt}
                  </p>
                  {(proposal.identifier || proposal.organization) && (
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                      {[proposal.identifier, proposal.organization]
                        .filter(Boolean)
                        .join(" - ")}
                    </p>
                  )}
                </td>
                <td className="px-2 py-3 text-center align-top">
                  <IconChip
                    icon={typeIcon(proposal.type)}
                    label={label(proposal.type)}
                    className={typeClass(proposal.type)}
                  />
                </td>
                <td className="px-2 py-3 text-center align-top">
                  <IconChip
                    icon={statusIcon(
                      proposal.status === "REVIEWING" ? "NEW" : proposal.status,
                    )}
                    label={label(
                      proposal.status === "REVIEWING" ? "NEW" : proposal.status,
                    )}
                    className={statusClass(
                      proposal.status === "REVIEWING" ? "NEW" : proposal.status,
                    )}
                  />
                </td>
                <td className="px-3 py-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  <span className="block text-slate-700 dark:text-slate-200">
                    {proposal.submittedBy}
                  </span>
                  <span className="line-clamp-1">
                    {proposal.submittedByEmail}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  <span className="line-clamp-2">
                    {proposal.contactInfo || "-"}
                  </span>
                </td>
                <td className="px-2 py-3 text-center align-top">
                  {proposal.fileName ? (
                    <IconHint label="Download support file">
                      <a
                        href={`/api/research/proposals/${proposal.id}/file`}
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-100 hover:shadow-md dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/50"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </IconHint>
                  ) : (
                    <IconHint label="No support file">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600">
                        <FileQuestion className="h-4 w-4" />
                      </span>
                    </IconHint>
                  )}
                </td>
                {isAdmin && (
                  <td className="px-2 py-3 text-center align-top">
                    <DeleteProposalButton
                      proposal={proposal}
                      deleteAction={deleteAction}
                    />
                  </td>
                )}
              </tr>
            ))}
            {pagination.total === 0 && (
              <tr>
                <td
                  colSpan={isAdmin ? 8 : 7}
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
