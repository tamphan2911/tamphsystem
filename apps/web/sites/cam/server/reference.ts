export type CamAgeReference = {
  ageLabel: string;
  feeds: { min: number; average: number; max: number };
  bottleMl: { min: number; average: number; max: number };
  diapers: { min: number; average: number; max: number };
  sleepHours: { min: number; average: number; max: number };
};

export const CAM_BORN_AT = new Date("2026-11-18T08:00:00+07:00");

export function camAgeDays(at = new Date()) {
  return Math.max(
    0,
    Math.floor((at.getTime() - CAM_BORN_AT.getTime()) / 86_400_000),
  );
}

export function camReferenceForAge(ageDays: number): CamAgeReference {
  if (ageDays <= 1) {
    return {
      ageLabel: "first 2 days",
      feeds: { min: 3, average: 4, max: 6 },
      bottleMl: { min: 30, average: 90, max: 180 },
      diapers: { min: 2, average: 3, max: 4 },
      sleepHours: { min: 14, average: 15.5, max: 17 },
    };
  }
  if (ageDays <= 3) {
    return {
      ageLabel: "days 3–4",
      feeds: { min: 6, average: 9, max: 12 },
      bottleMl: { min: 120, average: 240, max: 360 },
      diapers: { min: 3, average: 5, max: 7 },
      sleepHours: { min: 14, average: 15.5, max: 17 },
    };
  }
  if (ageDays <= 5) {
    return {
      ageLabel: "days 5–6",
      feeds: { min: 8, average: 10, max: 12 },
      bottleMl: { min: 240, average: 360, max: 540 },
      diapers: { min: 5, average: 7, max: 9 },
      sleepHours: { min: 14, average: 15.5, max: 17 },
    };
  }
  if (ageDays <= 30) {
    return {
      ageLabel: "newborn · 1–4 weeks",
      feeds: { min: 8, average: 10, max: 12 },
      bottleMl: { min: 450, average: 650, max: 850 },
      diapers: { min: 6, average: 8, max: 10 },
      sleepHours: { min: 14, average: 15.5, max: 17 },
    };
  }
  if (ageDays <= 120) {
    return {
      ageLabel: "1–3 months",
      feeds: { min: 6, average: 8, max: 10 },
      bottleMl: { min: 600, average: 750, max: 900 },
      diapers: { min: 5, average: 7, max: 9 },
      sleepHours: { min: 14, average: 15.5, max: 17 },
    };
  }
  if (ageDays <= 180) {
    return {
      ageLabel: "4–6 months",
      feeds: { min: 5, average: 7, max: 9 },
      bottleMl: { min: 700, average: 850, max: 1000 },
      diapers: { min: 5, average: 7, max: 9 },
      sleepHours: { min: 12, average: 14, max: 16 },
    };
  }
  if (ageDays <= 365) {
    return {
      ageLabel: "7–12 months",
      feeds: { min: 4, average: 5, max: 7 },
      bottleMl: { min: 480, average: 650, max: 850 },
      diapers: { min: 5, average: 7, max: 9 },
      sleepHours: { min: 12, average: 14, max: 16 },
    };
  }
  return {
    ageLabel: "12–24 months",
    feeds: { min: 3, average: 4, max: 5 },
    bottleMl: { min: 300, average: 450, max: 600 },
    diapers: { min: 4, average: 6, max: 8 },
    sleepHours: { min: 11, average: 12.5, max: 14 },
  };
}
