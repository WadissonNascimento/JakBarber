import { NextRequest } from "next/server";
import { handlers } from "@/auth";

function getFirstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || "";
}

function isLocalHost(value: string | null | undefined) {
  const host = getFirstHeaderValue(value || "").toLowerCase();

  return (
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host === "127.0.0.1" ||
    host.startsWith("127.0.0.1:") ||
    host === "::1" ||
    host === "[::1]" ||
    host.startsWith("[::1]:")
  );
}

function getPublicHost(headers: Headers, requestUrl: URL) {
  const host = getFirstHeaderValue(headers.get("host"));
  const forwardedHost = getFirstHeaderValue(headers.get("x-forwarded-host"));

  if (host && !isLocalHost(host)) {
    return host;
  }

  if (forwardedHost && !isLocalHost(forwardedHost)) {
    return forwardedHost;
  }

  if (!isLocalHost(requestUrl.host)) {
    return requestUrl.host;
  }

  return host || forwardedHost || requestUrl.host;
}

function normalizeAuthRequest(request: NextRequest) {
  const headers = new Headers(request.headers);
  const url = new URL(request.url);
  const publicHost = getPublicHost(headers, url);
  const forwardedProto = getFirstHeaderValue(headers.get("x-forwarded-proto"));
  const publicProto =
    forwardedProto && forwardedProto !== "http"
      ? forwardedProto
      : isLocalHost(publicHost)
        ? url.protocol.replace(":", "")
        : "https";

  if (publicHost) {
    headers.set("host", publicHost);
    headers.set("x-forwarded-host", publicHost);
    url.host = publicHost;
  }

  headers.set("x-forwarded-proto", publicProto);
  url.protocol = `${publicProto}:`;

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  return new NextRequest(url, init as never);
}

export function GET(request: NextRequest) {
  return handlers.GET(normalizeAuthRequest(request));
}

export function POST(request: NextRequest) {
  return handlers.POST(normalizeAuthRequest(request));
}
