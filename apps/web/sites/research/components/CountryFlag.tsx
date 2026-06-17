import { countryCode, countryName } from "@/sites/research/lib/countries";

export function CountryFlag({
  value,
  className = "",
}: {
  value: string | null | undefined;
  className?: string;
}) {
  const code = countryCode(value);
  if (!code) return null;

  const name = countryName(code);
  const flag = code
    .toUpperCase()
    .replace(/./g, (char) =>
      String.fromCodePoint(127397 + char.charCodeAt(0)),
    );

  return (
    <span
      aria-label={name}
      title={name}
      className={`inline-flex items-center justify-center font-normal leading-none ${className}`.trim()}
    >
      {flag}
    </span>
  );
}
