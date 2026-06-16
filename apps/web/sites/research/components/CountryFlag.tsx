import Image from "next/image";
import { countryCode, countryFlagSrc, countryName } from "@/sites/research/lib/countries";

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

  return (
    <Image
      src={countryFlagSrc(code)}
      alt={`${name} flag`}
      width={20}
      height={16}
      loading="lazy"
      className={`inline-block h-4 w-5 object-cover ${className}`.trim()}
    />
  );
}
