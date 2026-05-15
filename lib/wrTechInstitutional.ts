export const WR_TECH_INSTITUTIONAL_HOSTS = [
  "wrtechsolutions.tech",
  "www.wrtechsolutions.tech",
  "wrtechsolutions.localhost",
  "www.wrtechsolutions.localhost",
];

export const WR_TECH_SITE_URL = "https://wrtechsolutions.tech";
export const WR_TECH_LOGO_PATH = "/wr-tech/logo.png";
export const WR_TECH_HEADER_LOGO_PATH = "/wr-tech/logo-header.png";

export function normalizeWrTechHost(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.trim().toLowerCase().replace(/:\d+$/, "");
}

export function isWrTechInstitutionalHost(value: string | null | undefined) {
  const host = normalizeWrTechHost(value);

  return Boolean(host && WR_TECH_INSTITUTIONAL_HOSTS.includes(host));
}
