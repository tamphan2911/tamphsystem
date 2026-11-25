import assert from "node:assert/strict";
import test from "node:test";
import {
  camLatestCompletedWindow,
  camTimeRules,
  camWeeklyWindow,
  mergeCamSettings,
} from "./time-preferences";

const bornAt = new Date("2026-11-18T08:00:00+07:00");

test("existing families keep the established time rules", () => {
  assert.deepEqual(camTimeRules({}), {
    careDayStart: "20:00",
    daytimeStart: "06:00",
    nighttimeStart: "20:00",
  });
});

test("daily report follows the edited care-day boundary", () => {
  const before = camLatestCompletedWindow("12:30", new Date("2026-11-25T12:29:00+07:00"));
  const after = camLatestCompletedWindow("12:30", new Date("2026-11-25T12:30:00+07:00"));
  assert.equal(before.windowEnd.toISOString(), "2026-11-24T05:30:00.000Z");
  assert.equal(after.windowEnd.toISOString(), "2026-11-25T05:30:00.000Z");
  assert.equal(after.nextAvailableAt.toISOString(), "2026-11-26T05:30:00.000Z");
});

test("weekly report waits until the first care-day boundary after the age week ends", () => {
  const before = camWeeklyWindow(bornAt, "06:00", new Date("2026-11-26T05:59:00+07:00"));
  const after = camWeeklyWindow(bornAt, "06:00", new Date("2026-11-26T06:00:00+07:00"));
  assert.equal(before.completedWeekNumber, 0);
  assert.equal(before.nextAvailableAt.toISOString(), "2026-11-25T23:00:00.000Z");
  assert.equal(after.completedWeekNumber, 1);
  assert.equal(after.windowStart.toISOString(), bornAt.toISOString());
});

test("an older device cannot overwrite newer time rules while syncing another activity", () => {
  const merged = mergeCamSettings(
    { careDayStart: "20:00", daytimeStart: "06:00", nighttimeStart: "20:00", timeRulesUpdatedAt: "2026-11-25T05:00:00Z" },
    { careDayStart: "12:30", daytimeStart: "07:15", nighttimeStart: "19:45", timeRulesUpdatedAt: "2026-11-25T06:00:00Z" },
  );
  assert.equal(merged.careDayStart, "12:30");
  assert.equal(merged.daytimeStart, "07:15");
  assert.equal(merged.nighttimeStart, "19:45");
});
