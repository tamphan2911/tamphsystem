"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, Globe2 } from "lucide-react";
import {
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "@/sites/research/components/TableControls";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import { DeleteFundingInstitutionButton } from "./DeleteFundingInstitutionButton";
import { FundingInstitutionDialog } from "./FundingInstitutionDialog";

export type FundingInstitutionRow = {
  id: string;
  funderCode: string;
  name: string;
  shortName: string;
  country: string;
  website: string;
  note: string;
  organizedProjects: number;
  researchProjects: number;
};

function countryFlag(country: string) {
  const normalized = country.trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "vietnam" || normalized === "viet nam") return "🇻🇳";
  return "🇺🇳";
}

export function FundingInstitutionsTable({
  rows,
  updateAction,
  deleteAction,
}: {
  rows: FundingInstitutionRow[];
  updateAction: (funderId: string, formData: FormData) => Promise<void>;
  deleteAction: (funderId: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const haystack = [
        row.funderCode,
        row.name,
        row.shortName,
        row.country,
        row.website,
        row.note,
        String(row.organizedProjects),
        String(row.researchProjects),
      ]
        .join(" ")
        .toLowerCase();

      return !needle || haystack.includes(needle);
    });
  }, [query, rows]);

  const pagination = useTablePagination(filtered, 10);

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search funder, ID, alias, country..."
        />
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
            <tr>
              <th className="w-24 px-4 py-3">Funder ID</th>
              <th className="px-4 py-3">Funder name</th>
              <th className="w-24 px-3 py-3 text-center">Alias</th>
              <th className="w-28 px-3 py-3 text-center">Country</th>
              <th className="w-20 px-3 py-3 text-center">Projects</th>
              <th className="w-16 px-3 py-3 text-center">Web</th>
              <th className="w-14 px-3 py-3 text-center">Edit</th>
              <th className="w-14 px-3 py-3 text-center">
                <span className="sr-only">Delete</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#444444]">
            {pagination.pagedRows.map((institution) => (
              <tr
                key={institution.id}
                className="group align-top transition-colors duration-150 hover:bg-[#383838]"
              >
                <td className="px-4 py-3 align-top">
                  <span className="font-mono text-xs font-normal uppercase tracking-wide text-[#777777]">
                    {institution.funderCode || institution.id.slice(0, 8)}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="line-clamp-1 text-base font-normal text-[#E4E4E4]">
                    {institution.name}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-[#B0B0B0]">
                    {institution.note || "No note"}
                  </p>
                </td>
                <td className="px-3 py-3 text-center align-top text-sm font-normal text-[#B0B0B0]">
                  {institution.shortName || "-"}
                </td>
                <td className="px-3 py-3 text-center align-top">
                  {institution.country ? (
                    <IconHint label={institution.country}>
                      <span className="inline-flex max-w-full items-start justify-center align-top text-xl leading-none">
                        {countryFlag(institution.country)}
                        <span className="sr-only">{institution.country}</span>
                      </span>
                    </IconHint>
                  ) : (
                    <IconHint label="No country">
                      <span className="inline-flex items-start justify-center align-top text-xl leading-none opacity-50">
                        🇺🇳
                      </span>
                    </IconHint>
                  )}
                </td>
                <td className="px-3 py-3 text-center align-top text-sm font-normal text-[#E4E4E4]">
                  {institution.organizedProjects + institution.researchProjects}
                </td>
                <td className="px-3 py-3 text-center align-top">
                  {institution.website ? (
                    <IconHint label="Open website">
                      <Link
                        href={institution.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-5 w-5 cursor-pointer items-start justify-center align-top border-0 bg-transparent text-[#B0B0B0] transition hover:text-[#A8DADC]"
                        aria-label={`Open ${institution.name} website`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </IconHint>
                  ) : (
                    <IconHint label="No website">
                      <span className="inline-flex h-5 w-5 items-start justify-center align-top text-[#666666]">
                        <Globe2 className="h-4 w-4" />
                      </span>
                    </IconHint>
                  )}
                </td>
                <td className="px-3 py-3 text-center align-top">
                  <FundingInstitutionDialog
                    mode="edit"
                    submitAction={updateAction.bind(null, institution.id)}
                    initialValues={{
                      funderCode: institution.funderCode,
                      name: institution.name,
                      shortName: institution.shortName,
                      country: institution.country,
                      website: institution.website,
                      note: institution.note,
                    }}
                  />
                </td>
                <td className="px-3 py-3 text-center align-top">
                  <DeleteFundingInstitutionButton
                    funder={{
                      id: institution.id,
                      name: institution.name,
                      organizedProjects: institution.organizedProjects,
                      researchProjects: institution.researchProjects,
                    }}
                    deleteAction={deleteAction}
                  />
                </td>
              </tr>
            ))}
            {pagination.total === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-2">
                  <ResearchEmptyState
                    title="No funders match the current search."
                    detail="Try another funder name, alias, ID, country, or website keyword."
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
