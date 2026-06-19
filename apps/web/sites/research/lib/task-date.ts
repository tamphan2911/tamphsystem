import { researchDateValue } from "./date-time";

export function defaultResearchTaskDueDate(referenceDate = new Date()) {
  return researchDateValue(referenceDate, 7);
}
