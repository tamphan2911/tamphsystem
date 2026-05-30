export function requestIp(headersList: Headers) {
  return (
    headersList.get("cf-connecting-ip") ||
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    undefined
  );
}

export async function verifyTurnstileToken(
  token: FormDataEntryValue | null,
  remoteIp?: string,
) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;

  const responseToken = typeof token === "string" ? token : "";
  if (!responseToken) return false;

  const body = new URLSearchParams({
    secret,
    response: responseToken,
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body,
        cache: "no-store",
      },
    );
    const result = (await response.json()) as { success?: boolean };
    return Boolean(result.success);
  } catch (error) {
    console.error("[turnstile] verification failed", error);
    return false;
  }
}
