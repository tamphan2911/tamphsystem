const REPORT_TIME_ZONE = "Asia/Ho_Chi_Minh";
const REPORT_OFFSET = "+07:00";
const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

export const DEFAULT_CAM_TIME_RULES = {
  careDayStart: "20:00",
  daytimeStart: "06:00",
  nighttimeStart: "20:00",
} as const;

export type CamTimeRules = {
  careDayStart: string;
  daytimeStart: string;
  nighttimeStart: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clock(value: unknown, fallback: string) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
    ? value
    : fallback;
}

export function camTimeRules(settings: unknown): CamTimeRules {
  const source = isRecord(settings) ? settings : {};
  const rules = {
    careDayStart: clock(source.careDayStart, DEFAULT_CAM_TIME_RULES.careDayStart),
    daytimeStart: clock(source.daytimeStart, DEFAULT_CAM_TIME_RULES.daytimeStart),
    nighttimeStart: clock(source.nighttimeStart, DEFAULT_CAM_TIME_RULES.nighttimeStart),
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
    ...(previousIsNewer ? { timeRulesUpdatedAt: previous.timeRulesUpdatedAt } : {}),
  };
}

export function camDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function camBoundaryOn(date: Date, careDayStart: string) {
  return new Date(`${camDateKey(date)}T${careDayStart}:00${REPORT_OFFSET}`);
}

export function camWeeklyGenerationAt(weekEnd: Date, careDayStart: string) {
  const generation = camBoundaryOn(weekEnd, careDayStart);
  return generation >= weekEnd ? generation : new Date(generation.getTime() + DAY_MS);
}

export function camLatestCompletedWindow(careDayStart: string, at = new Date()) {
  const todayEnd = camBoundaryOn(at, careDayStart);
  const windowEnd = new Date(at >= todayEnd ? todayEnd.getTime() : todayEnd.getTime() - DAY_MS);
  return {
    reportDate: camDateKey(windowEnd),
    windowStart: new Date(windowEnd.getTime() - DAY_MS),
    windowEnd,
    nextAvailableAt: new Date(windowEnd.getTime() + DAY_MS),
  };
}

export function camWeeklyWindow(bornAt: Date, careDayStart: string, at = new Date()) {
  const elapsed = Math.max(0, at.getTime() - bornAt.getTime());
  const currentWeekNumber = Math.floor(elapsed / WEEK_MS) + 1;
  let completedWeekNumber = Math.floor(elapsed / WEEK_MS);
  while (completedWeekNumber > 0 && at < camWeeklyGenerationAt(
    new Date(bornAt.getTime() + completedWeekNumber * WEEK_MS), careDayStart,
  )) completedWeekNumber -= 1;
  const nextAvailableAt = camWeeklyGenerationAt(
    new Date(bornAt.getTime() + (completedWeekNumber + 1) * WEEK_MS), careDayStart,
  );
  return {
    completedWeekNumber,
    currentWeekNumber,
    windowStart: new Date(bornAt.getTime() + Math.max(0, completedWeekNumber - 1) * WEEK_MS),
    windowEnd: new Date(bornAt.getTime() + Math.max(1, completedWeekNumber) * WEEK_MS),
    nextAvailableAt,
  };
}
