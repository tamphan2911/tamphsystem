export const RESEARCH_TIME_ZONE = "Asia/Ho_Chi_Minh";
const hanoiUtcOffsetMs = 7 * 60 * 60 * 1000;

const researchDatePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: RESEARCH_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const researchHourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: RESEARCH_TIME_ZONE,
  hour: "2-digit",
  hourCycle: "h23",
});

function researchDateParts(value: Date) {
  const parts = researchDatePartsFormatter.formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return {
    year: Number(part("year")),
    month: Number(part("month")),
    day: Number(part("day")),
  };
}

export function researchDateTimeFormat(
  locales?: Intl.LocalesArgument,
  options: Intl.DateTimeFormatOptions = {},
) {
  return new Intl.DateTimeFormat(locales, {
    ...options,
    timeZone: RESEARCH_TIME_ZONE,
  });
}

export function researchDateValue(value = new Date(), dayOffset = 0) {
  const { year, month, day } = researchDateParts(value);
  const shiftedDate = new Date(Date.UTC(year, month - 1, day + dayOffset));
  return shiftedDate.toISOString().slice(0, 10);
}

export function researchCalendarDate(value = new Date()) {
  const { year, month, day } = researchDateParts(value);
  return new Date(year, month - 1, day);
}

export function researchWeekday(value = new Date()) {
  const { year, month, day } = researchDateParts(value);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function researchStartOfDay(value = new Date(), dayOffset = 0) {
  const { year, month, day } = researchDateParts(value);
  return new Date(
    Date.UTC(year, month - 1, day + dayOffset) - hanoiUtcOffsetMs,
  );
}

export function researchStartOfMonth(value = new Date(), monthOffset = 0) {
  const { year, month } = researchDateParts(value);
  return new Date(
    Date.UTC(year, month - 1 + monthOffset, 1) - hanoiUtcOffsetMs,
  );
}

export function researchHour(value = new Date()) {
  return Number(researchHourFormatter.format(value));
}

export function researchYear(value = new Date()) {
  return researchDateParts(value).year;
}
