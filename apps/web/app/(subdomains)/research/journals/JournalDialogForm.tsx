"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  AtSign,
  BookmarkCheck,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  DollarSign,
  FileText,
  Globe2,
  Hash,
  KeyRound,
  LinkIcon,
  Loader2,
  LockKeyhole,
  PlusCircle,
  Save,
  Search,
  Star,
  StickyNote,
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
import {
  researchDropdownItemActiveClass,
  researchDropdownItemClass,
  researchDropdownItemIdleClass,
  researchDropdownPanelClass,
  ResearchButton,
} from "@/sites/research/components/ResearchPrimitives";

export type JournalFormValues = {
  name?: string;
  issn?: string | null;
  fields?: string[];
  field?: string | null;
  type?: string | null;
  rank?: string | null;
  localRank?: string | null;
  issuesPerYear?: number | string | null;
  isFavorite?: boolean | null;
  isInterest?: boolean | null;
  publisher?: string | null;
  country?: string | null;
  apc?: string | null;
  apcCurrency?: string;
  hasApcOption?: boolean | null;
  submissionFee?: string | null;
  submissionFeeCurrency?: string;
  homepageLink?: string | null;
  submissionLink?: string | null;
  scimagoLink?: string | null;
  scopusLink?: string | null;
  note?: string | null;
};

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

function JournalInput({
  name,
  placeholder,
  icon,
  defaultValue,
  type = "text",
  min,
  step,
  className = "",
}: {
  name: string;
  placeholder: string;
  icon: ReactNode;
  defaultValue?: string | number | null;
  type?: string;
  min?: string;
  step?: string;
  className?: string;
}) {
  return (
    <span className={`research-auth-input-shell ${className}`}>
      <input
        name={name}
        type={type}
        min={min}
        step={step}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {icon}
    </span>
  );
}

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
      placeholder="Search and choose one country"
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

function JournalFlagCheckbox({
  name,
  defaultChecked,
  icon,
  title,
  detail,
  checkedClass,
}: {
  name: string;
  defaultChecked?: boolean | null;
  icon: ReactNode;
  title: string;
  detail: string;
  checkedClass: string;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-3 border border-[#444444] bg-[#2C2C2C] p-3 transition duration-150 ease-out hover:border-[#5A5A5A] hover:bg-[#383838]">
      <input
        type="checkbox"
        name={name}
        defaultChecked={Boolean(defaultChecked)}
        className="peer sr-only"
      />
      <span
        className={`flex h-9 w-9 items-center justify-center text-[#777777] transition duration-150 ease-out group-hover:text-[#B0B0B0] ${checkedClass}`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold normal-case tracking-normal text-[#E4E4E4]">
          {title}
        </span>
        <span className="block text-xs font-normal normal-case tracking-normal text-[#B0B0B0]">
          {detail}
        </span>
      </span>
    </label>
  );
}

function InlineCheckbox({
  name,
  defaultChecked,
  label,
}: {
  name: string;
  defaultChecked?: boolean | null;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 normal-case tracking-normal text-[#B0B0B0]">
      <input
        type="checkbox"
        name={name}
        defaultChecked={Boolean(defaultChecked)}
        className="peer sr-only"
      />
      <span className="flex h-4 w-4 flex-none items-center justify-center border border-[#5A5A5A] bg-[#242424] text-transparent transition peer-checked:border-[#A8DADC] peer-checked:bg-[#263636] peer-checked:text-[#A8DADC]">
        <Check className="h-3 w-3" aria-hidden="true" />
      </span>
      <span className="text-xs font-normal">{label}</span>
    </label>
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
  const [journalType, setJournalType] = useState(
    initialValues?.type === "LOCAL"
      ? "LOCAL"
      : initialValues?.type === "INTERNATIONAL"
        ? "INTERNATIONAL"
        : "",
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
      headerActions={
        <ResearchButton form="journal-form" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isEdit ? (
            <Save className="h-4 w-4" />
          ) : (
            <PlusCircle className="h-4 w-4" />
          )}
          {isEdit ? "Save changes" : "Add Journal"}
        </ResearchButton>
      }
    >
      <form
        id="journal-form"
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
          if (!isEdit) {
            const accountFields = [
              "accountUsername",
              "accountPassword",
              "accountEmail",
              "accountNote",
            ];
            const hasAccountInfo = accountFields.some((fieldName) => {
              const value = formData.get(fieldName);
              return typeof value === "string" && value.trim().length > 0;
            });
            const accountUsername = formData.get("accountUsername");
            if (
              hasAccountInfo &&
              (typeof accountUsername !== "string" ||
                accountUsername.trim().length === 0)
            ) {
              setWarning(
                "Enter the account login ID if you want to add an account for this new journal.",
              );
              return;
            }
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
            <JournalInput
              name="name"
              defaultValue={initialValues?.name}
              placeholder="Enter the official journal name"
              icon={<BookOpen aria-hidden="true" />}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <JournalInput
                name="publisher"
                defaultValue={initialValues?.publisher}
                placeholder="Enter publisher name, for example Elsevier"
                icon={<Building2 aria-hidden="true" />}
              />
              <CountryPicker
                value={selectedCountry}
                onChange={setSelectedCountry}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <JournalInput
                name="issn"
                defaultValue={initialValues?.issn}
                placeholder="Enter ISSN, for example 1234-5678"
                icon={<Hash aria-hidden="true" />}
              />
              <JournalInput
                name="issuesPerYear"
                type="number"
                min="1"
                step="1"
                defaultValue={initialValues?.issuesPerYear}
                placeholder="Enter number of issues per year"
                icon={<CalendarDays aria-hidden="true" />}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <JournalFlagCheckbox
                name="isFavorite"
                defaultChecked={initialValues?.isFavorite}
                icon={<Star className="h-5 w-5" />}
                title="Favorite journal"
                detail="Mark this as a preferred venue."
                checkedClass="peer-checked:text-amber-400"
              />
              <JournalFlagCheckbox
                name="isInterest"
                defaultChecked={initialValues?.isInterest}
                icon={<BookmarkCheck className="h-5 w-5" />}
                title="Journal of interest"
                detail="Track this journal for future submissions."
                checkedClass="peer-checked:text-sky-400"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <ResearchFormSelect
                name="type"
                defaultValue={journalType}
                ariaLabel="Journal type"
                onValueChange={setJournalType}
                options={[
                  { value: "", label: "Choose journal type" },
                  { value: "INTERNATIONAL", label: "International journal" },
                  { value: "LOCAL", label: "Local journal" },
                ]}
              />
              {journalType === "LOCAL" ? (
                <JournalInput
                  name="localRank"
                  defaultValue={initialValues?.localRank}
                  placeholder="Enter local rank or category"
                  icon={<Hash aria-hidden="true" />}
                />
              ) : (
                <ResearchFormSelect
                  name="rank"
                  defaultValue={initialValues?.rank ?? ""}
                  ariaLabel="Journal rank"
                  options={[
                    { value: "", label: "Choose international rank" },
                    { value: "Q1", label: "Q1" },
                    { value: "Q2", label: "Q2" },
                    { value: "Q3", label: "Q3" },
                    { value: "Q4", label: "Q4" },
                    { value: "Scopus", label: "Scopus" },
                    { value: "ISI", label: "ISI" },
                  ]}
                />
              )}
            </div>
            <div ref={fieldPickerRef} className="relative">
              <div className="border border-[#444444] bg-[#2C2C2C] p-2 transition focus-within:border-[#A8DADC] focus-within:bg-[#383838]">
                <div className="flex min-h-9 flex-wrap items-center gap-1.5">
                  {selectedFields.map((field) => (
                    <span
                      key={field}
                      className="inline-flex items-center gap-1 rounded-none border border-[#5A5A5A] bg-[#383838] px-2.5 py-1 text-xs font-normal normal-case tracking-normal text-[#E4E4E4]"
                    >
                      {field}
                      <button
                        type="button"
                        onClick={() => removeField(field)}
                        className="rounded-none p-0.5 text-[#B0B0B0] transition hover:bg-[#444444] hover:text-[#E4E4E4]"
                        aria-label={`Remove ${field}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <span className="flex min-w-[9rem] flex-1 items-center gap-2">
                    <Search className="h-4 w-4 text-[#B0B0B0]" />
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
                          ? "Search another research field to add"
                          : "Search or add research field, for example Finance"
                      }
                      className="min-w-0 flex-1 bg-transparent text-sm font-normal normal-case tracking-normal text-[#E4E4E4] outline-none placeholder:text-[#5A5A5A]"
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
                <div
                  className={`${researchDropdownPanelClass} max-h-[var(--research-dropdown-max-height)] overflow-y-auto normal-case tracking-normal`}
                >
                  <>
                    {filteredFieldOptions.map((field) => (
                      <button
                        key={field}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => addField(field)}
                        className={`${researchDropdownItemClass} ${
                          selectedFields.includes(field)
                            ? researchDropdownItemActiveClass
                            : researchDropdownItemIdleClass
                        }`}
                      >
                        <span className="min-w-0 px-3">{field}</span>
                        <span className="mr-3 flex h-6 w-6 items-center justify-center rounded-none text-[#A8DADC]">
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
                        className={`${researchDropdownItemClass} ${researchDropdownItemIdleClass}`}
                      >
                        <span className="flex items-center gap-2 px-3">
                          <PlusCircle className="h-4 w-4 text-[#A8DADC]" />
                          Add &quot;{fieldQuery.trim()}&quot;
                        </span>
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
            <div className="grid gap-2">
              <span className="flex items-center justify-end gap-3">
                <InlineCheckbox
                  name="hasApcOption"
                  defaultChecked={initialValues?.hasApcOption}
                  label="Option"
                />
              </span>
              <span className="grid grid-cols-[1fr_9rem] gap-2">
                <JournalInput
                  name="apc"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={initialValues?.apc}
                  placeholder="Enter APC amount"
                  icon={<DollarSign aria-hidden="true" />}
                />
                <ResearchFormSelect
                  name="apcCurrency"
                  defaultValue={initialValues?.apcCurrency ?? ""}
                  ariaLabel="APC currency"
                  options={[
                    { value: "", label: "Choose APC currency" },
                    ...currencyOptions,
                  ]}
                />
              </span>
            </div>
            <div className="grid gap-2">
              <span className="grid grid-cols-[1fr_9rem] gap-2">
                <JournalInput
                  name="submissionFee"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={initialValues?.submissionFee}
                  placeholder="Enter submission fee if any"
                  icon={<DollarSign aria-hidden="true" />}
                />
                <ResearchFormSelect
                  name="submissionFeeCurrency"
                  defaultValue={initialValues?.submissionFeeCurrency ?? ""}
                  ariaLabel="Submission fee currency"
                  options={[
                    { value: "", label: "Choose fee currency" },
                    ...currencyOptions,
                  ]}
                />
              </span>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 pt-5 dark:border-slate-800">
          <div className="grid gap-4 md:grid-cols-2">
            <JournalInput
              name="homepageLink"
              defaultValue={initialValues?.homepageLink}
              placeholder="Paste journal homepage URL"
              icon={<Globe2 aria-hidden="true" />}
            />
            <JournalInput
              name="submissionLink"
              defaultValue={initialValues?.submissionLink}
              placeholder="Paste manuscript submission portal URL"
              icon={<LinkIcon aria-hidden="true" />}
            />
            <JournalInput
              name="scimagoLink"
              defaultValue={initialValues?.scimagoLink}
              placeholder="Paste Scimago profile URL"
              icon={<LinkIcon aria-hidden="true" />}
            />
            <JournalInput
              name="scopusLink"
              defaultValue={initialValues?.scopusLink}
              placeholder="Paste Scopus source profile URL"
              icon={<LinkIcon aria-hidden="true" />}
            />
            <JournalInput
              name="note"
              defaultValue={initialValues?.note}
              placeholder="Add fit notes, login notes, or review notes"
              icon={<StickyNote aria-hidden="true" />}
              className="md:col-span-2"
            />
          </div>
        </section>

        {!isEdit ? (
          <section className="border-t border-slate-200 pt-5 dark:border-slate-800">
            <div className="grid gap-4 md:grid-cols-2">
              <JournalInput
                name="accountUsername"
                placeholder="Optional: enter journal-site login ID for this new journal"
                icon={<KeyRound aria-hidden="true" />}
              />
              <JournalInput
                name="accountPassword"
                placeholder="Optional: enter password for this journal account"
                icon={<LockKeyhole aria-hidden="true" />}
              />
              <JournalInput
                name="accountEmail"
                type="email"
                placeholder="Optional: enter email used for this journal account"
                icon={<AtSign aria-hidden="true" />}
              />
              <JournalInput
                name="accountNote"
                placeholder="Optional: add account recovery notes or login URL"
                icon={<FileText aria-hidden="true" />}
              />
            </div>
          </section>
        ) : null}
      </form>
    </ResearchModal>
  );
}
