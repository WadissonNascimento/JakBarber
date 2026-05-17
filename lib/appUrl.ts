function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getConfiguredAppUrl() {
  return trimTrailingSlash(
    process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      process.env.AUTH_URL ||
      "http://localhost:3000"
  );
}

function getFirstHeaderValue(value: string | null | undefined) {
  return value?.split(",")[0]?.trim() || "";
}

function normalizeRequestProto(value: string | null | undefined) {
  const proto = getFirstHeaderValue(value).toLowerCase();

  return proto === "http" || proto === "https" ? proto : "";
}

export function getRequestAwareAppUrl(
  requestUrl: string,
  requestHeaders?: Headers
) {
  const parsedUrl = new URL(requestUrl);
  const forwardedHost = getFirstHeaderValue(
    requestHeaders?.get("x-forwarded-host")
  );
  const host = forwardedHost || getFirstHeaderValue(requestHeaders?.get("host"));

  if (host) {
    const proto =
      normalizeRequestProto(requestHeaders?.get("x-forwarded-proto")) ||
      parsedUrl.protocol.replace(":", "");

    return trimTrailingSlash(`${proto}://${host}`);
  }

  return trimTrailingSlash(parsedUrl.origin);
}
