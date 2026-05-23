export const currencyOptions = [
  { value: "VND", label: "₫ (VND)", symbol: "₫" },
  { value: "USD", label: "$ (USD)", symbol: "$" },
  { value: "CHF", label: "Fr (CHF)", symbol: "Fr" },
  { value: "GBP", label: "£ (Bảng Anh)", symbol: "£" },
  { value: "EUR", label: "€ (EUR)", symbol: "€" },
] as const;

export type CurrencyCodeValue = (typeof currencyOptions)[number]["value"];

export function currencySymbol(value?: string | null) {
  return currencyOptions.find((option) => option.value === value)?.symbol ?? "$";
}

export function currencyLabel(value?: string | null) {
  return currencyOptions.find((option) => option.value === value)?.label ?? "$ (USD)";
}

export function formatMoney(amount?: string | null, currency?: string | null) {
  if (!amount) return "-";
  return `${currencySymbol(currency)} ${amount}`;
}
