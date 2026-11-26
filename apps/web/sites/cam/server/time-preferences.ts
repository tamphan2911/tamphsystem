const DEFAULT_TIME_ZONE = "Asia/Ho_Chi_Minh";
const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

export const DEFAULT_CAM_TIME_RULES = {
  careDayStart: "20:00",
  daytimeStart: "06:00",
  nighttimeStart: "20:00",
  dailyReportTime: "20:00",
  weeklyReportTime: "20:00",
  timeZone: DEFAULT_TIME_ZONE,
} as const;

export type CamTimeRules = {
  careDayStart: string;
  daytimeStart: string;
  nighttimeStart: string;
  dailyReportTime: string;
  weeklyReportTime: string;
  timeZone: string;
};

export const DEFAULT_CAM_REMINDER_AGE_MONTHS = 6;

export function camReminderAgeMonths(settings: unknown) {
  const value = isRecord(settings) ? settings.reminderAgeMonths : undefined;
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 24
    ? value
    : DEFAULT_CAM_REMINDER_AGE_MONTHS;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clock(value: unknown, fallback: string) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
    ? value
    : fallback;
}

function timeZone(value: unknown) {
  if (typeof value !== "string" || value.length > 100) return DEFAULT_TIME_ZONE;
  try { return new Intl.DateTimeFormat("en", { timeZone: value }).resolvedOptions().timeZone; }
  catch { return DEFAULT_TIME_ZONE; }
}

export function camTimeRules(settings: unknown): CamTimeRules {
  const source = isRecord(settings) ? settings : {};
  const rules = {
    careDayStart: clock(source.careDayStart, DEFAULT_CAM_TIME_RULES.careDayStart),
    daytimeStart: clock(source.daytimeStart, DEFAULT_CAM_TIME_RULES.daytimeStart),
    nighttimeStart: clock(source.nighttimeStart, DEFAULT_CAM_TIME_RULES.nighttimeStart),
    dailyReportTime: clock(source.dailyReportTime, DEFAULT_CAM_TIME_RULES.dailyReportTime),
    weeklyReportTime: clock(source.weeklyReportTime, DEFAULT_CAM_TIME_RULES.weeklyReportTime),
    timeZone: timeZone(source.timeZone),
  };
  if (rules.daytimeStart === rules.nighttimeStart) {
    rules.daytimeStart = DEFAULT_CAM_TIME_RULES.daytimeStart;
    rules.nighttimeStart = DEFAULT_CAM_TIME_RULES.nighttimeStart;
  }
  return rules;
}

export function mergeCamSettings(incoming: unknown, stored: unknown) {
  const next = isRecord(incoming) ? incoming : {};
  const previous = isRecord(stored) ? stored : {};
  const timestamp = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
  const previousIsNewer = timestamp(previous.timeRulesUpdatedAt) > timestamp(next.timeRulesUpdatedAt);
  const selected = previousIsNewer ? previous : next;
  return {
    ...next,
    ...camTimeRules(selected),
    reminderAgeMonths: camReminderAgeMonths(selected),
    ...(previousIsNewer ? { timeRulesUpdatedAt: previous.timeRulesUpdatedAt } : {}),
  };
}

export function camDateKey(date: Date, zone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function shiftedDateKey(key: string, days: number) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function zonedClockOnKey(key: string, value: string, zone: string) {
  const [year = 0, month = 0, day = 0] = key.split("-").map(Number);
  const [hour = 0, minute = 0] = value.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let instant = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(instant));
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    const displayed = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    const correction = target - displayed;
    if (!correction) break;
    instant += correction;
  }
  return new Date(instant);
}

export function camBoundaryOn(date: Date, careDayStart: string, zone = DEFAULT_TIME_ZONE) {
  return zonedClockOnKey(camDateKey(date, zone), careDayStart, zone);
}

function firstScheduledAfter(end: Date, reportTime: string, zone: string) {
  const key = camDateKey(end, zone);
  const sameDay = zonedClockOnKey(key, reportTime, zone);
  return sameDay >= end ? sameDay : zonedClockOnKey(shiftedDateKey(key, 1), reportTime, zone);
}

export function camWeeklyGenerationAt(weekEnd: Date, reportTime: string, zone = DEFAULT_TIME_ZONE) {
  return firstScheduledAfter(weekEnd, reportTime, zone);
}

export function camLatestCompletedWindow(careDayStart: string, at = new Date(), reportTime = careDayStart, zone = DEFAULT_TIME_ZONE) {
  let endKey = camDateKey(at, zone);
  let windowEnd = zonedClockOnKey(endKey, careDayStart, zone);
  while (at < firstScheduledAfter(windowEnd, reportTime, zone)) {
    endKey = shiftedDateKey(endKey, -1);
    windowEnd = zonedClockOnKey(endKey, careDayStart, zone);
  }
  return {
    reportDate: endKey,
    windowStart: zonedClockOnKey(shiftedDateKey(endKey, -1), careDayStart, zone),
    windowEnd,
    nextAvailableAt: firstScheduledAfter(zonedClockOnKey(shiftedDateKey(endKey, 1), careDayStart, zone), reportTime, zone),
  };
}

export function camWeeklyWindow(bornAt: Date, reportTime: string, at = new Date(), zone = DEFAULT_TIME_ZONE) {
  const elapsed = Math.max(0, at.getTime() - bornAt.getTime());
  const currentWeekNumber = Math.floor(elapsed / WEEK_MS) + 1;
  let completedWeekNumber = Math.floor(elapsed / WEEK_MS);
  while (completedWeekNumber > 0 && at < camWeeklyGenerationAt(
    new Date(bornAt.getTime() + completedWeekNumber * WEEK_MS), reportTime, zone,
  )) completedWeekNumber -= 1;
  const nextAvailableAt = camWeeklyGenerationAt(
    new Date(bornAt.getTime() + (completedWeekNumber + 1) * WEEK_MS), reportTime, zone,
  );
  return {
    completedWeekNumber,
    currentWeekNumber,
    windowStart: new Date(bornAt.getTime() + Math.max(0, completedWeekNumber - 1) * WEEK_MS),
    windowEnd: new Date(bornAt.getTime() + Math.max(1, completedWeekNumber) * WEEK_MS),
    nextAvailableAt,
  };
}
