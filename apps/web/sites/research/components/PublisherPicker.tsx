"use client";

import { useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import {
  ResearchSearchPicker,
  type ResearchSearchPickerOption,
} from "./ResearchSearchPicker";

export type PublisherPickerItem = {
  id: string;
  publisherCode: string;
  name: string;
  alias: string;
  country: string;
};

export function PublisherPicker({
  publishers,
  initialPublisherId,
  initialPublisherName,
  required = true,
}: {
  publishers: PublisherPickerItem[];
  initialPublisherId?: string | null;
  initialPublisherName?: string | null;
  required?: boolean;
}) {
  const options = useMemo<ResearchSearchPickerOption<PublisherPickerItem>[]>(
    () =>
      publishers.map((publisher) => ({
        id: publisher.id,
        label: publisher.name,
        description: [publisher.alias, publisher.country]
          .filter(Boolean)
          .join(" | "),
        meta: publisher.publisherCode,
        data: publisher,
      })),
    [publishers],
  );
  const initialSelection = useMemo(() => {
    const normalizedName = initialPublisherName?.trim().toLowerCase();
    return (
      options.find((option) => option.id === initialPublisherId) ??
      options.find(
        (option) => option.label.trim().toLowerCase() === normalizedName,
      ) ??
      null
    );
  }, [initialPublisherId, initialPublisherName, options]);
  const [selected, setSelected] =
    useState<ResearchSearchPickerOption<PublisherPickerItem> | null>(
      initialSelection,
    );
  const [query, setQuery] = useState("");
  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options.slice(0, 4);
    return options
      .filter((option) => {
        const publisher = option.data;
        return [
          option.label,
          option.description,
          option.meta,
          publisher?.alias,
          publisher?.country,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, 4);
  }, [options, query]);

  return (
    <ResearchSearchPicker
      name="publisherId"
      label="Publisher"
      required={required}
      selected={selected}
      query={query}
      onQueryChange={setQuery}
      onSelect={(option) => {
        setSelected(option);
        setQuery("");
      }}
      onClear={() => {
        setSelected(null);
        setQuery("");
      }}
      options={filteredOptions}
      placeholder="Search publisher by name, alias, country, or ID..."
      emptyText="No publisher matches this search. Add it from Publishers first."
      renderOption={(option) => (
        <span className="flex min-w-0 flex-1 items-start gap-3 px-3 py-0.5">
          <Building2 className="mt-0.5 h-4 w-4 flex-none text-violet-600 dark:text-violet-300" />
          <span className="min-w-0 flex-1">
            <span className="block whitespace-normal break-words text-sm font-normal">
              {option.label}
            </span>
            <span className="block whitespace-normal break-words text-xs opacity-70">
              {[option.meta, option.description].filter(Boolean).join(" | ")}
            </span>
          </span>
        </span>
      )}
      renderSelected={(option) => (
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <Building2 className="h-4 w-4 flex-none text-violet-600 dark:text-violet-300" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-normal text-[#E4E4E4]">
              {option.label}
            </span>
            <span className="block truncate text-xs font-normal text-[#B0B0B0]">
              {[option.meta, option.description].filter(Boolean).join(" | ")}
            </span>
          </span>
        </span>
      )}
    />
  );
}
