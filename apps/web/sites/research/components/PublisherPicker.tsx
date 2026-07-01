"use client";

import { useMemo, useState } from "react";
import { Building2, PlusCircle } from "lucide-react";
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
  usesSingleAccount?: boolean;
  approvalStatus?: string;
};

export function PublisherPicker({
  publishers,
  initialPublisherId,
  initialPublisherName,
  required = true,
  showLabel = true,
  placeholder,
  onSelectionChange,
  onCreatePublisherRequest,
}: {
  publishers: PublisherPickerItem[];
  initialPublisherId?: string | null;
  initialPublisherName?: string | null;
  required?: boolean;
  showLabel?: boolean;
  placeholder?: string;
  onSelectionChange?: (publisher: PublisherPickerItem | null) => void;
  onCreatePublisherRequest?: (query: string) => void;
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
  const pickerOptions = useMemo(() => {
    const needle = query.trim();
    if (!needle || !onCreatePublisherRequest) return filteredOptions;
    const normalizedNeedle = needle.toLowerCase();
    const hasExactMatch = options.some(
      (option) => option.label.trim().toLowerCase() === normalizedNeedle,
    );
    if (hasExactMatch) return filteredOptions;
    return [
      ...filteredOptions,
      {
        id: "__add_publisher__",
        label: `Add new publisher "${needle}"`,
        description: "Create this publisher without leaving the journal form",
        meta: "Pending approval",
      },
    ];
  }, [filteredOptions, onCreatePublisherRequest, options, query]);

  return (
    <ResearchSearchPicker
      name="publisherId"
      label={showLabel ? "Publisher" : undefined}
      required={required}
      selected={selected}
      query={query}
      onQueryChange={setQuery}
      onSelect={(option) => {
        if (option.id === "__add_publisher__") {
          onCreatePublisherRequest?.(query.trim());
          return;
        }
        setSelected(option);
        setQuery("");
        onSelectionChange?.(option.data ?? null);
      }}
      onClear={() => {
        setSelected(null);
        setQuery("");
        onSelectionChange?.(null);
      }}
      options={pickerOptions}
      placeholder={
        placeholder ?? "Search publisher by name, alias, country, or ID..."
      }
      emptyText="No publisher matches this search. Add it from Publishers first."
      renderOption={(option) => (
        <span className="flex min-w-0 flex-1 items-start gap-3 px-3 py-0.5">
          {option.id === "__add_publisher__" ? (
            <PlusCircle className="mt-0.5 h-4 w-4 flex-none text-teal-700 dark:text-[#A8DADC]" />
          ) : (
            <Building2 className="mt-0.5 h-4 w-4 flex-none text-violet-600 dark:text-violet-300" />
          )}
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
            <span className="block truncate text-sm font-normal text-slate-900 dark:text-[#E4E4E4]">
              {option.label}
            </span>
            <span className="block truncate text-xs font-normal text-[#667085] dark:text-[#B0B0B0]">
              {[option.meta, option.description].filter(Boolean).join(" | ")}
            </span>
          </span>
        </span>
      )}
    />
  );
}
