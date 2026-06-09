"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, Globe2, MapPin } from "lucide-react";
import {
  FilterSelect,
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
  const [country, setCountry] = useState("ALL");
  const [website, setWebsite] = useState("ALL");

  const countryOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(new Set(rows.map((row) => row.country).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b)),
    ],
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesCountry = country === "ALL" || row.country === country;
      const matchesWebsite =
        website === "ALL" ||
        (website === "WITH" ? Boolean(row.website) : !row.website);
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

      return (
        matchesCountry &&
        matchesWebsite &&
        (!needle || haystack.includes(needle))
      );
    });
  }, [country, query, rows, website]);

  const pagination = useTablePagination(filtered, 10);

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search funder, ID, alias, country..."
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect
            value={country}
            onChange={setCountry}
            ariaLabel="Filter by country"
            options={countryOptions.map((item) => ({
              value: item,
              label: item === "ALL" ? "All countries" : item,
            }))}
          />
          <FilterSelect
            value={website}
            onChange={setWebsite}
            ariaLabel="Filter by website"
            options={[
              { value: "ALL", label: "All websites" },
              { value: "WITH", label: "With website" },
              { value: "WITHOUT", label: "No website" },
            ]}
          />
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
            <tr>
              <th className="w-24 px-4 py-3">Funder ID</th>
              <th className="px-4 py-3">Funder name</th>
              <th className="w-24 px-3 py-3">Alias</th>
              <th className="w-28 px-3 py-3">Country</th>
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
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-normal uppercase tracking-wide text-[#777777]">
                    {institution.funderCode || institution.id.slice(0, 8)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="line-clamp-1 text-base font-normal text-[#E4E4E4]">
                    {institution.name}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-[#B0B0B0]">
                    {institution.note || "No note"}
                  </p>
                </td>
                <td className="px-3 py-3 text-sm font-normal text-[#B0B0B0]">
                  {institution.shortName || "-"}
                </td>
                <td className="px-3 py-3">
                  {institution.country ? (
                    <IconHint label={institution.country}>
                      <span className="inline-flex h-8 max-w-full items-center justify-center text-[#B0B0B0] transition group-hover:text-[#A8DADC]">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="sr-only">{institution.country}</span>
                      </span>
                    </IconHint>
                  ) : (
                    <IconHint label="No country">
                      <span className="inline-flex h-8 items-center justify-center text-[#666666]">
                        <MapPin className="h-4 w-4" />
                      </span>
                    </IconHint>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex min-w-8 items-center justify-center border border-[#444444] bg-[#383838] px-2 py-1 text-xs font-normal text-[#E4E4E4]">
                    {institution.organizedProjects}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  {institution.website ? (
                    <IconHint label="Open website">
                      <Link
                        href={institution.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center border-0 bg-transparent text-[#B0B0B0] transition hover:text-[#A8DADC]"
                        aria-label={`Open ${institution.name} website`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </IconHint>
                  ) : (
                    <IconHint label="No website">
                      <span className="inline-flex h-8 w-8 items-center justify-center text-[#666666]">
                        <Globe2 className="h-4 w-4" />
                      </span>
                    </IconHint>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
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
                <td className="px-3 py-3 text-center">
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
                    detail="Try another funder name, alias, ID, country, or website filter."
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
