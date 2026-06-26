"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { ResearchDatePicker } from "@/sites/research/components/ResearchDatePicker";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  IconHint,
  ResearchButton,
  ResearchIconButton,
  cx,
  researchFieldClass,
  researchLabelClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

type CalendarItemType = "EVENT" | "TODO";
type CalendarItemStatus = "PLANNED" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export type ResearchCalendarItemRow = {
  id: string;
  title: string;
  description: string;
  location: string;
  itemType: CalendarItemType;
  status: CalendarItemStatus;
  color: string;
  allDay: boolean;
  startAt: string;
  endAt: string | null;
  createdBy: string;
};

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const colorOptions = [
  { value: "cyan", label: "Cyan" },
  { value: "violet", label: "Violet" },
  { value: "emerald", label: "Emerald" },
  { value: "amber", label: "Amber" },
  { value: "rose", label: "Rose" },
  { value: "slate", label: "Slate" },
];
const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});
const shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

function parseMonthValue(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function calendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const firstVisibleDay = new Date(
    firstDay.getFullYear(),
    firstDay.getMonth(),
    1 - mondayOffset,
  );
  return Array.from({ length: 42 }, (_, index) => {
    return new Date(
      firstVisibleDay.getFullYear(),
      firstVisibleDay.getMonth(),
      firstVisibleDay.getDate() + index,
    );
  });
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function itemTouchesDay(item: ResearchCalendarItemRow, date: Date) {
  const dayStart = startOfDay(date);
  const nextDay = new Date(dayStart);
  nextDay.setDate(nextDay.getDate() + 1);
  const itemStart = new Date(item.startAt);
  const itemEnd = item.endAt ? new Date(item.endAt) : itemStart;
  return itemStart < nextDay && itemEnd >= dayStart;
}

function sameDate(left: Date, right: Date) {
  return dateValue(left) === dateValue(right);
}

function statusLabel(status: CalendarItemStatus) {
  if (status === "IN_PROGRESS") return "In progress";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function typeLabel(type: CalendarItemType) {
  return type === "TODO" ? "To do" : "Event";
}

function itemTone(color: string) {
  if (color === "violet")
    return "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800/70 dark:bg-violet-950/35 dark:text-violet-200";
  if (color === "emerald")
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/35 dark:text-emerald-200";
  if (color === "amber")
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/35 dark:text-amber-200";
  if (color === "rose")
    return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/70 dark:bg-rose-950/35 dark:text-rose-200";
  if (color === "slate")
    return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/35 dark:text-slate-200";
  return "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-800/70 dark:bg-cyan-950/35 dark:text-cyan-200";
}

function statusTone(status: CalendarItemStatus) {
  if (status === "DONE") return "text-emerald-700 dark:text-emerald-300";
  if (status === "CANCELLED") return "text-rose-700 dark:text-rose-300";
  if (status === "IN_PROGRESS") return "text-amber-700 dark:text-amber-300";
  return "text-sky-700 dark:text-[#A8DADC]";
}

function timeText(item: ResearchCalendarItemRow) {
  const start = new Date(item.startAt);
  const end = item.endAt ? new Date(item.endAt) : null;
  if (item.allDay) {
    return end && dateValue(end) !== dateValue(start)
      ? `${shortDateFormatter.format(start)} - ${shortDateFormatter.format(end)}`
      : "All day";
  }
  return end
    ? `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`
    : timeFormatter.format(start);
}

function dateFromIso(value: string) {
  return dateValue(new Date(value));
}

function timeFromIso(value: string) {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function ResearchCalendarClient({
  initialMonth,
  items,
  createAction,
  updateAction,
  deleteAction,
}: {
  initialMonth: string;
  items: ResearchCalendarItemRow[];
  createAction: (formData: FormData) => Promise<void>;
  updateAction: (itemId: string, formData: FormData) => Promise<void>;
  deleteAction: (itemId: string) => Promise<void>;
}) {
  const router = useRouter();
  const toast = useResearchToast();
  const [isPending, startTransition] = useTransition();
  const [editingItem, setEditingItem] =
    useState<ResearchCalendarItemRow | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const month = useMemo(() => parseMonthValue(initialMonth), [initialMonth]);
  const days = useMemo(() => calendarDays(month), [month]);
  const today = new Date();
  const monthItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        const result =
          new Date(left.startAt).getTime() - new Date(right.startAt).getTime();
        return result || left.title.localeCompare(right.title);
      }),
    [items],
  );

  function goToMonth(nextMonth: Date) {
    router.push(`/calendar?month=${monthValue(nextMonth)}`);
  }

  function closeModal() {
    setEditingItem(null);
    setSelectedDay(null);
  }

  function openCreate(day?: Date) {
    setSelectedDay(day ? dateValue(day) : dateValue(new Date()));
    setEditingItem(null);
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        if (editingItem) {
          await updateAction(editingItem.id, formData);
          toast.showSuccess({
            title: "Calendar item updated",
            detail: "The calendar entry has been saved.",
          });
        } else {
          await createAction(formData);
          toast.showSuccess({
            title: "Calendar item added",
            detail: "The new entry is now on the calendar.",
          });
        }
        closeModal();
        router.refresh();
      } catch (error) {
        toast.showError({
          title: "Calendar update failed",
          detail:
            error instanceof Error
              ? error.message
              : "Please check the calendar details and try again.",
        });
      }
    });
  }

  function removeItem() {
    if (!editingItem) return;
    startTransition(async () => {
      try {
        await deleteAction(editingItem.id);
        toast.showSuccess({
          title: "Calendar item deleted",
          detail: "The entry was removed from the calendar.",
        });
        closeModal();
        router.refresh();
      } catch {
        toast.showError({
          title: "Could not delete item",
          detail: "Please refresh the page and try again.",
        });
      }
    });
  }

  return (
    <>
      <section className="overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-[#444444] dark:bg-[#2C2C2C] dark:shadow-none">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between dark:border-[#444444]">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <CalendarPlus className="h-5 w-5 text-[#1F7180] dark:text-[#A8DADC]" />
              <h1 className="text-xl font-normal text-slate-950 dark:text-[#E4E4E4]">
                {monthFormatter.format(month)}
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-[#B0B0B0]">
              {monthItems.length} calendar item
              {monthItems.length === 1 ? "" : "s"} in this view.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ResearchIconButton
              type="button"
              label="Previous month"
              tone="cyan"
              onClick={() =>
                goToMonth(
                  new Date(month.getFullYear(), month.getMonth() - 1, 1),
                )
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </ResearchIconButton>
            <ResearchButton
              type="button"
              tone="secondary"
              onClick={() => goToMonth(new Date())}
            >
              Today
            </ResearchButton>
            <ResearchIconButton
              type="button"
              label="Next month"
              tone="cyan"
              onClick={() =>
                goToMonth(
                  new Date(month.getFullYear(), month.getMonth() + 1, 1),
                )
              }
            >
              <ChevronRight className="h-4 w-4" />
            </ResearchIconButton>
            <ResearchButton type="button" onClick={() => openCreate()}>
              <Plus className="h-4 w-4" />
              Add item
            </ResearchButton>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs uppercase tracking-wide text-slate-500 dark:border-[#444444] dark:bg-[#242424] dark:text-[#B0B0B0]">
          {weekdayLabels.map((day) => (
            <div key={day} className="px-2 py-3">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-7">
          {days.map((day) => {
            const dayItems = monthItems.filter((item) =>
              itemTouchesDay(item, day),
            );
            const outsideMonth = day.getMonth() !== month.getMonth();
            const isToday = sameDate(day, today);
            return (
              <div
                key={dateValue(day)}
                className={cx(
                  "group min-h-36 border-b border-slate-200 p-2 transition duration-150 sm:border-r dark:border-[#444444]",
                  outsideMonth
                    ? "bg-slate-50/60 text-slate-400 dark:bg-[#242424]/70 dark:text-[#6F7785]"
                    : "bg-white text-slate-800 hover:bg-slate-50 dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:hover:bg-[#303030]",
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openCreate(day)}
                    className={cx(
                      "research-allow-transform flex h-7 min-w-7 cursor-pointer items-center justify-center border border-transparent px-2 text-xs font-normal transition duration-150 ease-out hover:-translate-y-0.5 active:scale-95",
                      isToday
                        ? "border-[#A8DADC] bg-cyan-50 text-[#1F7180] dark:bg-cyan-950/30 dark:text-[#A8DADC]"
                        : "text-slate-600 hover:text-slate-950 dark:text-[#B0B0B0] dark:hover:text-[#E4E4E4]",
                    )}
                  >
                    {day.getDate()}
                  </button>
                  <IconHint label="Add item to this day">
                    <button
                      type="button"
                      onClick={() => openCreate(day)}
                      className="research-allow-transform opacity-0 transition duration-150 hover:-translate-y-0.5 group-hover:opacity-100"
                    >
                      <Plus className="h-3.5 w-3.5 text-[#1F7180] dark:text-[#A8DADC]" />
                    </button>
                  </IconHint>
                </div>
                <div className="grid gap-1.5">
                  {dayItems.slice(0, 4).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setEditingItem(item)}
                      className={cx(
                        "research-allow-transform min-w-0 cursor-pointer border px-2 py-1.5 text-left text-xs transition duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.99]",
                        itemTone(item.color),
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        {item.itemType === "TODO" ? (
                          <CheckSquare className="h-3.5 w-3.5 flex-none" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 flex-none" />
                        )}
                        <span className="truncate">{item.title}</span>
                      </span>
                      <span className="mt-0.5 block truncate opacity-80">
                        {timeText(item)}
                      </span>
                    </button>
                  ))}
                  {dayItems.length > 4 ? (
                    <span className="text-xs text-slate-500 dark:text-[#B0B0B0]">
                      +{dayItems.length - 4} more
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <CalendarItemModal
        open={Boolean(editingItem || selectedDay)}
        item={editingItem}
        selectedDay={selectedDay}
        pending={isPending}
        onClose={closeModal}
        onSubmit={submit}
        onDelete={removeItem}
      />
    </>
  );
}

function CalendarItemModal({
  open,
  item,
  selectedDay,
  pending,
  onClose,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  item: ResearchCalendarItemRow | null;
  selectedDay: string | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  onDelete: () => void;
}) {
  const [allDay, setAllDay] = useState(item?.allDay ?? true);
  const startDate = item
    ? dateFromIso(item.startAt)
    : (selectedDay ?? dateValue(new Date()));
  const endDate = item?.endAt ? dateFromIso(item.endAt) : startDate;

  useEffect(() => {
    setAllDay(item?.allDay ?? true);
  }, [item?.allDay, item?.id, selectedDay]);

  return (
    <ResearchModal
      open={open}
      onClose={onClose}
      title={item ? "Edit calendar item" : "New calendar item"}
      icon={
        item ? (
          <Pencil className="h-5 w-5" />
        ) : (
          <CalendarPlus className="h-5 w-5" />
        )
      }
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          {item ? (
            <ResearchButton
              type="button"
              tone="danger"
              disabled={pending}
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </ResearchButton>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <ResearchButton
              type="button"
              tone="quiet"
              disabled={pending}
              onClick={onClose}
            >
              Cancel
            </ResearchButton>
            <ResearchButton
              form="research-calendar-item-form"
              disabled={pending}
            >
              <Sparkles className="h-4 w-4" />
              {item ? "Save changes" : "Add item"}
            </ResearchButton>
          </div>
        </div>
      }
    >
      <form
        id="research-calendar-item-form"
        action={onSubmit}
        className="grid gap-4"
      >
        <label className={researchLabelClass}>
          Title
          <input
            name="title"
            required
            defaultValue={item?.title ?? ""}
            className={researchFieldClass}
            placeholder="Event or thing to do"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={researchLabelClass}>
            Type
            <select
              name="itemType"
              defaultValue={item?.itemType ?? "EVENT"}
              className={researchFieldClass}
            >
              <option value="EVENT">Event</option>
              <option value="TODO">To do</option>
            </select>
          </label>
          <label className={researchLabelClass}>
            Status
            <select
              name="status"
              defaultValue={item?.status ?? "PLANNED"}
              className={researchFieldClass}
            >
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="DONE">Done</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={researchLabelClass}>
            Start date
            <ResearchDatePicker
              name="startDate"
              defaultValue={startDate}
              required
              placeholder="Start date"
            />
          </label>
          <label className={researchLabelClass}>
            End date
            <ResearchDatePicker
              name="endDate"
              defaultValue={endDate}
              placeholder="End date"
            />
          </label>
        </div>
        <label className="flex cursor-pointer items-center gap-3 border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white dark:border-[#444444] dark:bg-[#242424] dark:text-[#E4E4E4] dark:hover:bg-[#303030]">
          <input
            type="hidden"
            name="allDay"
            value={allDay ? "true" : "false"}
          />
          <input
            type="checkbox"
            checked={allDay}
            onChange={(event) => setAllDay(event.target.checked)}
            className="h-4 w-4 accent-[#1F7180] dark:accent-[#A8DADC]"
          />
          All day
        </label>
        {!allDay ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={researchLabelClass}>
              Start time
              <input
                type="time"
                name="startTime"
                defaultValue={item ? timeFromIso(item.startAt) : "09:00"}
                className={researchFieldClass}
              />
            </label>
            <label className={researchLabelClass}>
              End time
              <input
                type="time"
                name="endTime"
                defaultValue={item?.endAt ? timeFromIso(item.endAt) : "10:00"}
                className={researchFieldClass}
              />
            </label>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={researchLabelClass}>
            Color
            <select
              name="color"
              defaultValue={item?.color ?? "cyan"}
              className={researchFieldClass}
            >
              {colorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={researchLabelClass}>
            Location
            <span className="relative">
              <input
                name="location"
                defaultValue={item?.location ?? ""}
                className={`${researchFieldClass} pr-10`}
                placeholder="Meeting room, website, or note"
              />
              <MapPin className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1F7180] dark:text-[#A8DADC]" />
            </span>
          </label>
        </div>
        <label className={researchLabelClass}>
          Description
          <textarea
            name="description"
            defaultValue={item?.description ?? ""}
            className={researchTextareaClass}
            placeholder="Details, preparation notes, links, or context"
          />
        </label>
        {item ? (
          <div className="border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-[#444444] dark:text-[#B0B0B0]">
            Created by {item.createdBy}. Current status:{" "}
            <span className={statusTone(item.status)}>
              {statusLabel(item.status)}
            </span>{" "}
            ({typeLabel(item.itemType)}).
          </div>
        ) : null}
      </form>
    </ResearchModal>
  );
}
