import { headers } from "next/headers";

const LOCAL_FALLBACK = "http://localhost:3023";

function firstHeaderValue(value: string | null): string {
  return value?.split(",")[0]?.trim() || "";
}

function validHost(value: string): boolean {
  return /^[a-z0-9.-]+(?::\d+)?$/i.test(value);
}

export function getShareBaseUrl(): URL {
  const requestHeaders = headers();
  const forwardedHost = firstHeaderValue(requestHeaders.get("x-forwarded-host"));
  const requestHost = firstHeaderValue(requestHeaders.get("host"));
  const host = validHost(forwardedHost) ? forwardedHost : validHost(requestHost) ? requestHost : "";
  const forwardedProto = firstHeaderValue(requestHeaders.get("x-forwarded-proto"));
  const protocol = forwardedProto === "http" || forwardedProto === "https"
    ? forwardedProto
    : host.startsWith("localhost") || host.startsWith("127.")
      ? "http"
      : "https";

  if (host) return new URL(`${protocol}://${host}`);

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  try {
    return configured ? new URL(configured) : new URL(LOCAL_FALLBACK);
  } catch {
    return new URL(LOCAL_FALLBACK);
  }
}

export function toAbsoluteShareUrl(value: string | null | undefined, baseUrl: URL): string {
  const fallback = new URL("/og-image.png", baseUrl).toString();
  const source = value?.trim();
  if (!source) return fallback;

  try {
    const resolved = new URL(source, baseUrl);
    return resolved.protocol === "http:" || resolved.protocol === "https:" ? resolved.toString() : fallback;
  } catch {
    return fallback;
  }
}
