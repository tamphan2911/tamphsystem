export function requestIp(headersList: Headers) {
  return (
    headersList.get("cf-connecting-ip") ||
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    undefined
  );
}

export function turnstileSiteKey() {
  return (
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    process.env.NEXT_PUBLIC_TURNSTILE_SITE ||
    ""
  );
}

export async function verifyTurnstileToken(
  token: FormDataEntryValue | null,
  remoteIp?: string,
) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true as const };
  if (!turnstileSiteKey()) return { ok: false as const, reason: "config" };

  const responseToken = typeof token === "string" ? token : "";
  if (!responseToken) return { ok: false as const, reason: "missing" };

  const body = new URLSearchParams({
    secret,
    response: responseToken,
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body,
        cache: "no-store",
        signal: controller.signal,
      },
    );
    const result = (await response.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    if (!result.success) {
      console.warn(
        "[turnstile] rejected token",
        result["error-codes"]?.join(", ") || "invalid",
      );
    }
    return result.success
      ? { ok: true as const }
      : {
          ok: false as const,
          reason: result["error-codes"]?.join(", ") || "invalid",
        };
  } catch (error) {
    console.error("[turnstile] verification failed", error);
    return { ok: false as const, reason: "unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}
