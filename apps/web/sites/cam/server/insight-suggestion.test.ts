import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CAM_INSIGHT_SUGGESTION_VERSION,
  hasCurrentInsightSuggestion,
  qualitativeSuggestion,
  unavailableSuggestion,
} from "./insight-suggestion";

test("accepts a qualitative interpretation with an action", () => {
  assert.equal(
    qualitativeSuggestion("The logged feeding pattern looks worth watching because it changed from Cam's usual pattern. Keep watching feeding cues and wet diapers, and contact her pediatrician if the change continues."),
    "The logged feeding pattern looks worth watching because it changed from Cam's usual pattern. Keep watching feeding cues and wet diapers, and contact her pediatrician if the change continues.",
  );
});

test("rejects repeated figures and incomplete model output", () => {
  assert.equal(qualitativeSuggestion("Cam logged 5 feeds and 4 diapers. Keep watching her pattern."), null);
  assert.equal(qualitativeSuggestion("Cam logged five feeds and four diapers. Keep watching her pattern."), null);
  assert.equal(qualitativeSuggestion("The pattern is worth watching."), null);
});

test("old saved suggestions are regenerated and unavailable text has no totals", () => {
  assert.equal(hasCurrentInsightSuggestion({ suggestionVersion: CAM_INSIGHT_SUGGESTION_VERSION }), true);
  assert.equal(hasCurrentInsightSuggestion({ suggestionVersion: 1 }), false);
  assert.doesNotMatch(unavailableSuggestion(true), /\d/);
  assert.match(unavailableSuggestion(false), /not enough logged activity/);
});
