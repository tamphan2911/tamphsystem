export const currencyOptions = [
  { value: "VND", label: "₫ (VND)", symbol: "₫" },
  { value: "USD", label: "$ (USD)", symbol: "$" },
  { value: "CHF", label: "Fr (CHF)", symbol: "Fr" },
  { value: "GBP", label: "£ (Bảng Anh)", symbol: "£" },
  { value: "EUR", label: "€ (EUR)", symbol: "€" },
] as const;

export type CurrencyCodeValue = (typeof currencyOptions)[number]["value"];

export function currencySymbol(value?: string | null) {
  return (
    currencyOptions.find((option) => option.value === value)?.symbol ?? "$"
  );
}

export function currencyLabel(value?: string | null) {
  return (
    currencyOptions.find((option) => option.value === value)?.label ?? "$ (USD)"
  );
}

export function formatResearchNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value).trim().replaceAll(",", "").replaceAll(" ", "");
  const [integerPart, decimalPart] = text.split(".");
  const formattedInteger = (integerPart || "0").replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ".",
  );
  return decimalPart ? `${formattedInteger},${decimalPart}` : formattedInteger;
}

export function formatMoney(amount?: string | null, currency?: string | null) {
  if (!amount) return "-";
  return `${currencySymbol(currency)} ${formatResearchNumber(amount)}`;
}

export function formatCurrencyCodeMoney(
  amount?: string | null,
  currency?: string | null,
) {
  if (!amount) return "";
  return `${currency ?? "VND"} ${formatResearchNumber(amount)}`;
}
