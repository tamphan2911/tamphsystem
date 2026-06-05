"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  BookOpen,
  Check,
  Loader2,
  PlusCircle,
  Save,
  Search,
  X,
} from "lucide-react";
import { currencyOptions } from "@/sites/research/lib/currency";
import { countryFlag, countryOptions } from "@/sites/research/lib/countries";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { ResearchFormSelect } from "@/sites/research/components/ResearchFormSelect";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  ResearchSearchPicker,
  type ResearchSearchPickerOption,
} from "@/sites/research/components/ResearchSearchPicker";
import { FloatingDropdownPortal } from "@/sites/research/components/FloatingDropdownPortal";

export type JournalFormValues = {
  name?: string;
  issn?: string | null;
  fields?: string[];
  field?: string | null;
  rank?: string | null;
  publisher?: string | null;
  country?: string | null;
  apc?: string | null;
  apcCurrency?: string;
  submissionFee?: string | null;
  submissionFeeCurrency?: string;
  homepageLink?: string | null;
  submissionLink?: string | null;
  scimagoLink?: string | null;
  scopusLink?: string | null;
  note?: string | null;
};

const inputClass =
  "border border-[#444444] bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
const labelClass =
  "grid gap-1.5 text-xs font-bold uppercase tracking-wide text-[#B0B0B0]";
const journalFieldOptions = [
  "Accounting",
  "Business",
  "Computer science",
  "Economics",
  "Education",
  "Finance",
  "Health sciences",
  "Information systems",
  "Law",
  "Management",
  "Marketing",
  "Operations",
  "Social sciences",
  "Sustainability",
  "Technology",
  "Tourism",
];

function initialFields(values?: JournalFormValues) {
  if (values?.fields?.length) return values.fields;
  return values?.field
    ? values.field
        .split(";")
        .map((field) => field.trim())
        .filter(Boolean)
    : [];
}

function CountryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const selectedCountry = countryOptions.find(
    (country) => country.code === value,
  );
  const filteredCountries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return countryOptions.slice(0, 8);
    return countryOptions
      .filter(
        (country) =>
          country.name.toLowerCase().includes(needle) ||
          country.code.toLowerCase().includes(needle),
      )
      .slice(0, 8);
  }, [query]);
  const options = useMemo<
    ResearchSearchPickerOption<(typeof countryOptions)[number]>[]
  >(
    () =>
      filteredCountries.map((country) => ({
        id: country.code,
        label: country.name,
        description: country.code,
        data: country,
      })),
    [filteredCountries],
  );

  return (
    <ResearchSearchPicker
      label="Country"
      name="country"
      selected={
        selectedCountry
          ? {
              id: selectedCountry.code,
              label: selectedCountry.name,
              description: selectedCountry.code,
              data: selectedCountry,
            }
          : null
      }
      query={query}
      onQueryChange={(nextQuery) => {
        setQuery(nextQuery);
        onChange("");
      }}
      onSelect={(option) => {
        onChange(option.id);
        setQuery("");
      }}
      onClear={() => {
        onChange("");
        setQuery("");
      }}
      options={options}
      placeholder="Search country"
      emptyText="No country matches this search."
      renderSelected={(option) => (
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-base" aria-hidden="true">
            {countryFlag(option.id)}
          </span>
          <span className="truncate text-sm font-semibold text-[#E4E4E4]">
            {option.label}
          </span>
        </span>
      )}
      renderOption={(option) => (
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-base" aria-hidden="true">
            {countryFlag(option.id)}
          </span>
          <span className="min-w-0 flex-1 truncate">{option.label}</span>
          <span className="font-mono text-[11px] font-bold text-slate-400">
            {option.id}
          </span>
        </span>
      )}
    />
  );
}

export function JournalDialogForm({
  mode,
  isOpen,
  onClose,
  submitAction,
  initialValues,
}: {
  mode: "create" | "edit";
  isOpen: boolean;
  onClose: () => void;
  submitAction: (formData: FormData) => Promise<void> | void;
  initialValues?: JournalFormValues;
}) {
  const toast = useResearchToast();
  const [isPending, startTransition] = useTransition();
  const [fieldQuery, setFieldQuery] = useState("");
  const [isFieldPickerOpen, setIsFieldPickerOpen] = useState(false);
  const [warning, setWarning] = useState("");
  const warningRef = useRef<HTMLDivElement>(null);
  const fieldPickerRef = useRef<HTMLDivElement>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>(() =>
    initialFields(initialValues),
  );
  const [selectedCountry, setSelectedCountry] = useState(
    initialValues?.country ?? "",
  );

  useEffect(() => {
    if (!warning) return;
    window.setTimeout(() => {
      warningRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  }, [warning]);

  const filteredFieldOptions = useMemo(() => {
    const needle = fieldQuery.trim().toLowerCase();
    const options = journalFieldOptions.filter(
      (field) => !selectedFields.includes(field),
    );
    if (!needle) return options.slice(0, 8);
    return options
      .filter((field) => field.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [fieldQuery, selectedFields]);

  const addField = (field: string) => {
    const nextField = field.trim();
    if (!nextField || selectedFields.includes(nextField)) return;
    setSelectedFields((current) => [...current, nextField]);
    setFieldQuery("");
    setIsFieldPickerOpen(false);
  };

  const removeField = (field: string) => {
    setSelectedFields((current) => current.filter((item) => item !== field));
  };

  if (!isOpen) return null;

  const isEdit = mode === "edit";
  const title = isEdit ? "Edit Journal" : "New Journal";
  const detail = isEdit
    ? "Update identity, fees, and source links."
    : "Add basic identity, fees, and source links.";
  const closeDialog = () => {
    setWarning("");
    onClose();
  };

  return (
    <ResearchModal
      open={isOpen}
      onClose={closeDialog}
      title={title}
      description={detail}
      icon={<BookOpen className="h-5 w-5" />}
      maxWidth="max-w-4xl"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const missingFields = (
            [
              ["name", "journal name"],
              ["publisher", "publisher"],
              ["issn", "ISSN"],
              ["apc", "APC"],
            ] as const
          ).filter(([fieldName]) => {
            const value = formData.get(fieldName);
            return typeof value !== "string" || value.trim().length === 0;
          });
          if (missingFields.length > 0) {
            setWarning(
              `Please enter ${missingFields
                .map(([, label]) => label)
                .join(", ")} before saving this journal.`,
            );
            return;
          }
          setWarning("");
          startTransition(async () => {
            await submitAction(formData);
            closeDialog();
            toast.showSuccess({
              title: isEdit ? "Journal details updated" : "Journal added",
              detail: isEdit
                ? "The journal profile is saved with the latest details."
                : "The new journal is saved and ready to use.",
            });
          });
        }}
        className="grid gap-5"
      >
        {selectedFields.map((field) => (
          <input key={field} type="hidden" name="fields" value={field} />
        ))}
        <section className="grid gap-4">
          <div className="grid gap-4">
            {warning ? (
              <div
                ref={warningRef}
                className="flex items-start gap-2 rounded-none border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{warning}</span>
              </div>
            ) : null}
            <label className={labelClass}>
              Journal name
              <input
                name="name"
                defaultValue={initialValues?.name ?? ""}
                placeholder="Journal name"
                className={inputClass}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                Publisher
                <input
                  name="publisher"
                  defaultValue={initialValues?.publisher ?? ""}
                  placeholder="Publisher"
                  className={inputClass}
                />
              </label>
              <CountryPicker
                value={selectedCountry}
                onChange={setSelectedCountry}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                ISSN
                <input
                  name="issn"
                  defaultValue={initialValues?.issn ?? ""}
                  placeholder="ISSN"
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Rank
                <ResearchFormSelect
                  name="rank"
                  defaultValue={initialValues?.rank ?? ""}
                  ariaLabel="Journal rank"
                  options={[
                    { value: "", label: "Rank" },
                    { value: "Q1", label: "Q1" },
                    { value: "Q2", label: "Q2" },
                    { value: "Q3", label: "Q3" },
                    { value: "Q4", label: "Q4" },
                    { value: "Scopus", label: "Scopus" },
                    { value: "ISI", label: "ISI" },
                  ]}
                />
              </label>
            </div>
            <div ref={fieldPickerRef} className={`${labelClass} relative`}>
              Field
              <div className="border border-[#444444] bg-slate-50 p-2 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950">
                <div className="flex min-h-9 flex-wrap items-center gap-1.5">
                  {selectedFields.map((field) => (
                    <span
                      key={field}
                      className="inline-flex items-center gap-1 rounded-none bg-blue-50 px-2.5 py-1 text-xs font-semibold normal-case tracking-normal text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900"
                    >
                      {field}
                      <button
                        type="button"
                        onClick={() => removeField(field)}
                        className="rounded-none p-0.5 text-blue-500 transition hover:bg-blue-100 hover:text-blue-800 dark:hover:bg-blue-900/60 dark:hover:text-blue-100"
                        aria-label={`Remove ${field}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <span className="flex min-w-[9rem] flex-1 items-center gap-2">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      value={fieldQuery}
                      onFocus={() => setIsFieldPickerOpen(true)}
                      onBlur={() =>
                        window.setTimeout(
                          () => setIsFieldPickerOpen(false),
                          120,
                        )
                      }
                      onChange={(event) => setFieldQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addField(fieldQuery);
                        }
                      }}
                      placeholder={
                        selectedFields.length
                          ? "Search field"
                          : "Search or add field"
                      }
                      className="min-w-0 flex-1 bg-transparent text-sm font-medium normal-case tracking-normal text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                    />
                  </span>
                </div>
              </div>
              <FloatingDropdownPortal
                anchorRef={fieldPickerRef}
                open={
                  isFieldPickerOpen &&
                  Boolean(fieldQuery.trim() || filteredFieldOptions.length > 0)
                }
                maxWidth={640}
              >
                <div className="max-h-[var(--research-dropdown-max-height)] overflow-y-auto rounded-none border border-slate-200 bg-white normal-case tracking-normal shadow-2xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-950 dark:shadow-black/30">
                  <>
                    {filteredFieldOptions.map((field) => (
                      <button
                        key={field}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => addField(field)}
                        className="flex w-full items-center justify-between rounded-none border-y border-transparent px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:border-blue-100 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
                      >
                        {field}
                        <span className="flex h-6 w-6 items-center justify-center rounded-none bg-blue-50 text-blue-500 dark:bg-blue-950/60 dark:text-blue-300">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    ))}
                    {fieldQuery.trim() &&
                    !selectedFields.includes(fieldQuery.trim()) &&
                    !journalFieldOptions.some(
                      (field) =>
                        field.toLowerCase() === fieldQuery.trim().toLowerCase(),
                    ) ? (
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => addField(fieldQuery)}
                        className="flex w-full items-center gap-2 rounded-none border-y border-slate-100 px-3 py-2.5 text-left text-sm font-semibold text-blue-700 transition hover:border-blue-100 hover:bg-blue-50 dark:border-slate-800 dark:text-blue-300 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/40"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Add &quot;{fieldQuery.trim()}&quot;
                      </button>
                    ) : null}
                  </>
                </div>
              </FloatingDropdownPortal>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 pt-5 dark:border-slate-800">
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>
              APC
              <span className="grid grid-cols-[1fr_9rem] gap-2">
                <input
                  name="apc"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={initialValues?.apc ?? ""}
                  placeholder="APC"
                  className={inputClass}
                />
                <ResearchFormSelect
                  name="apcCurrency"
                  defaultValue={initialValues?.apcCurrency ?? "USD"}
                  ariaLabel="APC currency"
                  options={currencyOptions}
                />
              </span>
            </label>
            <label className={labelClass}>
              Submission fee
              <span className="grid grid-cols-[1fr_9rem] gap-2">
                <input
                  name="submissionFee"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={initialValues?.submissionFee ?? ""}
                  placeholder="Submission fee"
                  className={inputClass}
                />
                <ResearchFormSelect
                  name="submissionFeeCurrency"
                  defaultValue={initialValues?.submissionFeeCurrency ?? "USD"}
                  ariaLabel="Submission fee currency"
                  options={currencyOptions}
                />
              </span>
            </label>
          </div>
        </section>

        <section className="border-t border-slate-200 pt-5 dark:border-slate-800">
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>
              Homepage
              <input
                name="homepageLink"
                defaultValue={initialValues?.homepageLink ?? ""}
                placeholder="Journal homepage"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Submission link
              <input
                name="submissionLink"
                defaultValue={initialValues?.submissionLink ?? ""}
                placeholder="Submission portal link"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Scimago
              <input
                name="scimagoLink"
                defaultValue={initialValues?.scimagoLink ?? ""}
                placeholder="Scimago link"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Scopus
              <input
                name="scopusLink"
                defaultValue={initialValues?.scopusLink ?? ""}
                placeholder="Scopus link"
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} md:col-span-2`}>
              Note
              <input
                name="note"
                defaultValue={initialValues?.note ?? ""}
                placeholder="Fit notes, login notes, review notes"
                className={inputClass}
              />
            </label>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
          <button
            type="button"
            disabled={isPending}
            onClick={closeDialog}
            className="cursor-pointer rounded-none border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            disabled={isPending}
            className="inline-flex cursor-pointer items-center gap-2 rounded-none bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-wait disabled:translate-y-0 disabled:opacity-70 disabled:shadow-none"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEdit ? (
              <Save className="h-4 w-4" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            {isEdit ? "Save changes" : "Add Journal"}
          </button>
        </div>
      </form>
    </ResearchModal>
  );
}
