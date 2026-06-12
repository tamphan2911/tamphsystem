"use client";

import { useMemo, useState } from "react";
import {
  formatResearchNumber,
  normalizeResearchNumberInput,
} from "@/sites/research/lib/currency";

function sanitizeInput(value: string, allowDecimal: boolean) {
  const allowed = allowDecimal ? /[^\d.,-]/g : /[^\d-]/g;
  let sanitized = value.replace(allowed, "");
  const negative = sanitized.startsWith("-");
  sanitized = sanitized.replaceAll("-", "");
  return `${negative ? "-" : ""}${sanitized}`;
}

export function ResearchNumberInput({
  name,
  defaultValue,
  placeholder,
  className,
  required = false,
  min,
  allowDecimal = true,
  ariaLabel,
}: {
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  className: string;
  required?: boolean;
  min?: number;
  allowDecimal?: boolean;
  ariaLabel?: string;
}) {
  const initialValue = useMemo(
    () =>
      defaultValue === null || defaultValue === undefined
        ? ""
        : formatResearchNumber(defaultValue),
    [defaultValue],
  );
  const [displayValue, setDisplayValue] = useState(initialValue);
  const normalizedValue = normalizeResearchNumberInput(displayValue);

  return (
    <>
      <input type="hidden" name={name} value={normalizedValue} />
      <input
        type="text"
        inputMode={allowDecimal ? "decimal" : "numeric"}
        value={displayValue}
        required={required}
        data-min={min}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder ?? name}
        className={className}
        onChange={(event) => {
          const sanitized = sanitizeInput(event.target.value, allowDecimal);
          setDisplayValue(formatResearchNumber(sanitized));
        }}
      />
    </>
  );
}
