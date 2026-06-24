"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  FileQuestion,
  FileSearch,
  FileText,
  FolderGit2,
  Trash2,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  IconHint,
  MultiFilterSelect,
  TablePagination,
  TableSearchInput,
  useTablePagination,
  usePersistentTableValue,
  usePersistentMultiFilter,
} from "@/sites/research/components/TableControls";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { researchMutedLinkClass } from "@/sites/research/components/ResearchPrimitives";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

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
  if (status === "REVIEWING") {
    return "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900";
  }
  if (status === "DECLINED") {
    return "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900";
  }
  return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
}

function statusIcon(status: string) {
  if (status === "ACCEPTED") return CheckCircle2;
  if (status === "REVIEWING") return FileSearch;
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
        className={`inline-flex h-8 w-8 items-center justify-center rounded-none ring-1 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${className}`}
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
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center border border-transparent bg-transparent text-rose-600 shadow-none outline-none transition-[color,transform] duration-150 ease-out hover:border-transparent hover:bg-transparent hover:text-rose-700 hover:shadow-none active:scale-95 focus-visible:ring-0 dark:text-rose-300 dark:hover:text-rose-200"
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
          <span className="font-semibold text-[#E4E4E4]">{proposal.title}</span>
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
  linkTitleToDetail = true,
}: {
  rows: ProposalRow[];
  isAdmin: boolean;
  deleteAction?: (proposalId: string) => Promise<void>;
  linkTitleToDetail?: boolean;
}) {
  const [query, setQuery] = usePersistentTableValue("proposals:q", "");
  const [types, setTypes] = usePersistentMultiFilter(
    "proposals:type",
    typeOptions,
  );
  const [statuses, setStatuses] = usePersistentMultiFilter(
    "proposals:status",
    statusOptions,
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const rowStatus = row.status === "REVIEWING" ? "NEW" : row.status;
      const matchesType = types.length === 0 || types.includes(row.type);
      const matchesStatus =
        statuses.length === 0 || statuses.includes(rowStatus);
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
  }, [query, rows, statuses, types]);

  const pagination = useTablePagination(filtered, 10, 1, "proposals");

  function updateQuery(value: string) {
    setQuery(value);
    pagination.setPage(1);
  }

  function updateTypes(values: string[]) {
    setTypes(values);
    pagination.setPage(1);
  }

  function updateStatuses(values: string[]) {
    setStatuses(values);
    pagination.setPage(1);
  }

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={updateQuery}
          placeholder="Search proposal, contact, submitter..."
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <MultiFilterSelect
            values={types}
            onChange={updateTypes}
            ariaLabel="Filter by proposal type"
            options={typeOptions.map((item) => ({
              value: item,
              label: item === "ALL" ? "All types" : label(item),
            }))}
          />
          <MultiFilterSelect
            values={statuses}
            onChange={updateStatuses}
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
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
            <tr>
              <th className="w-20 px-3 py-3">ID</th>
              <th className="px-3 py-3">Proposal</th>
              <th className="w-14 px-2 py-3 text-center">Type</th>
              <th className="w-14 px-2 py-3 text-center">Status</th>
              <th className="w-56 px-3 py-3">Submitted</th>
              <th className="w-24 px-3 py-3">Contact</th>
              <th className="w-12 px-2 py-3 text-center">File</th>
              {isAdmin && deleteAction && (
                <th className="w-12 px-2 py-3 text-center">
                  <span className="sr-only">Delete</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#444444]">
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
                    <span
                      className={`font-mono text-xs ${researchMutedLinkClass}`}
                    >
                      {proposal.id.slice(0, 8)}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 align-top">
                  {linkTitleToDetail ? (
                    <Link
                      href={`/proposals/${proposal.id}`}
                      className="line-clamp-2 origin-left text-base font-normal leading-snug text-[#E4E4E4] outline-none transition-[color,text-shadow,transform] duration-180 ease-out hover:bg-transparent hover:text-[#A8DADC] hover:[text-shadow:0_0_0.55rem_rgba(168,218,220,0.18)] active:scale-[0.985] focus-visible:bg-transparent focus-visible:ring-0 motion-reduce:transform-none motion-reduce:transition-none"
                    >
                      {proposal.title}
                    </Link>
                  ) : (
                    <span className="line-clamp-2 text-base font-normal leading-snug text-[#E4E4E4]">
                      {proposal.title}
                    </span>
                  )}
                  <p className="mt-1 font-mono text-xs text-[#777777]">
                    {proposal.createdAt}
                  </p>
                  {(proposal.identifier || proposal.organization) && (
                    <p className="mt-1 line-clamp-1 text-xs text-[#B0B0B0]">
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
                    icon={statusIcon(proposal.status)}
                    label={label(proposal.status)}
                    className={statusClass(proposal.status)}
                  />
                </td>
                <td className="px-3 py-3 text-xs leading-5 text-[#B0B0B0]">
                  <span className="block text-[#E4E4E4]">
                    {proposal.submittedBy}
                  </span>
                  <span className="block break-all">
                    {proposal.submittedByEmail}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs leading-5 text-[#B0B0B0]">
                  <span className="line-clamp-2">
                    {proposal.contactInfo || "-"}
                  </span>
                </td>
                <td className="px-2 py-3 text-center align-top">
                  {proposal.fileName ? (
                    <IconHint label="Download support file">
                      <a
                        href={`/api/research/proposals/${proposal.id}/file`}
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center border border-transparent bg-transparent text-emerald-700 shadow-none outline-none transition-[color,transform] duration-150 ease-out hover:border-transparent hover:bg-transparent hover:text-emerald-800 hover:shadow-none active:scale-95 focus-visible:ring-0 dark:text-emerald-300 dark:hover:text-emerald-200"
                      >
                        <FileText className="h-4 w-4" />
                      </a>
                    </IconHint>
                  ) : (
                    <IconHint label="No support file">
                      <span className="inline-flex h-8 w-8 items-center justify-center border border-transparent bg-transparent text-slate-300 dark:text-slate-600">
                        <FileQuestion className="h-4 w-4" />
                      </span>
                    </IconHint>
                  )}
                </td>
                {isAdmin && deleteAction && (
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
                  colSpan={isAdmin && deleteAction ? 8 : 7}
                  className="px-4 py-2"
                >
                  <ResearchEmptyState
                    title="No proposals match the current search."
                    detail="Try another proposal title, ID, type, status, or contact keyword."
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
    </div>
  );
}
