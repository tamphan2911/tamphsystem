"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  BookOpen,
  Check,
  Coins,
  Link2,
  Loader2,
  PlusCircle,
  Save,
  Search,
  X,
} from "lucide-react";
import { currencyOptions } from "../lib/currency";
import { useResearchToast } from "../components/ResearchToast";

export type JournalFormValues = {
  name?: string;
  issn?: string | null;
  fields?: string[];
  field?: string | null;
  rank?: string | null;
  publisher?: string | null;
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
  "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
const labelClass =
  "grid gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400";
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
  const [selectedFields, setSelectedFields] = useState<string[]>(() =>
    initialFields(initialValues),
  );

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
    <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">
                  {title}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {detail}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeDialog}
              className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const missingFields = [
              ["name", "journal name"],
              ["publisher", "publisher"],
              ["issn", "ISSN"],
              ["apc", "APC"],
            ].filter(([fieldName]) => {
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
          className="grid max-h-[calc(90vh-6rem)] gap-5 overflow-y-auto px-6 py-5"
        >
          {selectedFields.map((field) => (
            <input key={field} type="hidden" name="fields" value={field} />
          ))}
          <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                <BookOpen className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-black text-slate-950 dark:text-white">
                Basic Information
              </h3>
            </div>
            <div className="grid gap-4">
              {warning ? (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
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
              <div className="grid gap-4 md:grid-cols-4">
                <label className={`${labelClass} md:col-span-2`}>
                  Publisher
                  <input
                    name="publisher"
                    defaultValue={initialValues?.publisher ?? ""}
                    placeholder="Publisher"
                    className={inputClass}
                  />
                </label>
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
                  <select
                    name="rank"
                    defaultValue={initialValues?.rank ?? ""}
                    className={inputClass}
                  >
                    <option value="">Rank</option>
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                    <option value="Scopus">Scopus</option>
                    <option value="ISI">ISI</option>
                  </select>
                </label>
              </div>
              <div className={`${labelClass} relative`}>
                Field
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950">
                  <div className="flex min-h-9 flex-wrap items-center gap-1.5">
                    {selectedFields.map((field) => (
                      <span
                        key={field}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold normal-case tracking-normal text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900"
                      >
                        {field}
                        <button
                          type="button"
                          onClick={() => removeField(field)}
                          className="rounded-full p-0.5 text-blue-500 transition hover:bg-blue-100 hover:text-blue-800 dark:hover:bg-blue-900/60 dark:hover:text-blue-100"
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
                {isFieldPickerOpen &&
                  (fieldQuery.trim() || filteredFieldOptions.length > 0) && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 normal-case tracking-normal shadow-2xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-950 dark:shadow-black/30">
                      {filteredFieldOptions.map((field) => (
                        <button
                          key={field}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => addField(field)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
                        >
                          {field}
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-500 dark:bg-blue-950/60 dark:text-blue-300">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        </button>
                      ))}
                      {fieldQuery.trim() &&
                      !selectedFields.includes(fieldQuery.trim()) &&
                      !journalFieldOptions.some(
                        (field) =>
                          field.toLowerCase() ===
                          fieldQuery.trim().toLowerCase(),
                      ) ? (
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => addField(fieldQuery)}
                          className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-slate-100 px-3 py-2.5 text-left text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-slate-800 dark:text-blue-300 dark:hover:bg-blue-950/40"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Add "{fieldQuery.trim()}"
                        </button>
                      ) : null}
                    </div>
                  )}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Coins className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-black text-slate-950 dark:text-white">
                Fees
              </h3>
            </div>
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
                  <select
                    name="apcCurrency"
                    defaultValue={initialValues?.apcCurrency ?? "USD"}
                    className={inputClass}
                  >
                    {currencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
                  <select
                    name="submissionFeeCurrency"
                    defaultValue={initialValues?.submissionFeeCurrency ?? "USD"}
                    className={inputClass}
                  >
                    {currencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300">
                <Link2 className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-black text-slate-950 dark:text-white">
                Links and Notes
              </h3>
            </div>
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
              className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              disabled={isPending}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-wait disabled:translate-y-0 disabled:opacity-70 disabled:shadow-none"
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
      </div>
    </div>
  );
}
