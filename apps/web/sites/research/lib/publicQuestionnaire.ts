export const cryptocurrencyQuestionnairePath =
  "/questionnaires/value-realization-in-cryptocurrency-investment";

export function isPublicResearchQuestionnaire(pathname: string) {
  return pathname.replace(/\/$/, "") === cryptocurrencyQuestionnairePath;
}
