import { headers } from "next/headers";
import { RegisterClient } from "./RegisterClient";

function siteFromHost(host: string) {
  if (host.startsWith("research.")) return "research";
  if (host.startsWith("learn.")) return "learn";
  return "default";
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const { callbackUrl } = await searchParams;

  return (
    <RegisterClient
      callbackUrl={callbackUrl ?? ""}
      site={siteFromHost(host)}
    />
  );
}
