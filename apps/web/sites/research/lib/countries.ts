export type CountryOption = {
  code: string;
  name: string;
};

export const countryOptions: CountryOption[] = [
  { code: "AR", name: "Argentina" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "BD", name: "Bangladesh" },
  { code: "BE", name: "Belgium" },
  { code: "BR", name: "Brazil" },
  { code: "CA", name: "Canada" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HK", name: "Hong Kong" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "MY", name: "Malaysia" },
  { code: "MX", name: "Mexico" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NO", name: "Norway" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "SG", name: "Singapore" },
  { code: "ZA", name: "South Africa" },
  { code: "KR", name: "South Korea" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "TW", name: "Taiwan" },
  { code: "TH", name: "Thailand" },
  { code: "TR", name: "Turkey" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "VN", name: "Vietnam" },
].sort((left, right) => left.name.localeCompare(right.name));

export function countryName(code: string | null | undefined) {
  if (!code) return "";
  return (
    countryOptions.find((country) => country.code === code.toUpperCase())
      ?.name ??
    code.toUpperCase()
  );
}

export function countryCode(value: string | null | undefined) {
  if (!value) return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  const upper = trimmed.toUpperCase();
  if (upper.length === 2) {
    return (
      countryOptions.find((country) => country.code === upper)?.code ?? upper
    );
  }

  const normalized = trimmed.toLowerCase();
  return (
    countryOptions.find((country) => country.name.toLowerCase() === normalized)
      ?.code ?? ""
  );
}

export function countryFlagSrc(value: string | null | undefined) {
  const code = countryCode(value);
  if (!code) return "";
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}
