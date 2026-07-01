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

export function normalizeResearchNumberInput(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value).trim().replace(/\s/g, "");
  if (!text) return "";

  const hasComma = text.includes(",");
  const hasDot = text.includes(".");
  let normalized = text;

  if (hasComma) {
    normalized = text.replaceAll(".", "").replace(",", ".");
  } else if (hasDot) {
    const dotParts = text.split(".");
    const looksGrouped =
      dotParts.length > 1 &&
      dotParts.slice(1).every((part) => /^\d{3}$/.test(part));
    normalized = looksGrouped ? dotParts.join("") : text;
  }

  return normalized.replace(/[^\d.-]/g, "");
}

export function isFreeResearchAmount(value?: string | number | null) {
  const text = String(value ?? "").trim();
  if (!text) return true;
  if (
    /^(free|no fee|no apc|none|n\/a|na|waived|waiver|0(?:[.,]0+)?)$/i.test(
      text,
    )
  ) {
    return true;
  }
  const normalized = normalizeResearchNumberInput(text);
  if (!normalized) return false;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed <= 0;
}

export function formatResearchNumber(value?: string | number | null) {
  const normalized = normalizeResearchNumberInput(value);
  if (!normalized) return "";

  const sign = normalized.startsWith("-") ? "-" : "";
  const unsigned = sign ? normalized.slice(1) : normalized;
  const [integerRaw, decimalRaw] = unsigned.split(".");
  const integerPart = (integerRaw ?? "").replace(/\D/g, "") || "0";
  const decimalPart = decimalRaw?.replace(/\D/g, "");
  const formattedInteger = (integerPart || "0").replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ".",
  );
  return decimalRaw !== undefined
    ? `${sign}${formattedInteger},${decimalPart}`
    : `${sign}${formattedInteger}`;
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
