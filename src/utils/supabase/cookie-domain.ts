type CookieDomainOptions = {
  hostname?: string;
  appUrl?: string | null;
};

function parseHostname(appUrl?: string | null): string | undefined {
  if (!appUrl) return undefined;
  try {
    return new URL(appUrl).hostname;
  } catch {
    return undefined;
  }
}

export function getCookieDomain({
  hostname,
  appUrl,
}: CookieDomainOptions): string | undefined {
  const host = hostname ?? parseHostname(appUrl);
  if (!host) return undefined;
  if (host === "localhost" || host.endsWith(".localhost")) return undefined;
  if (host === "127.0.0.1" || host === "::1") return undefined;
  if (host.endsWith("chatiq.io")) return ".chatiq.io";
  return undefined;
}
