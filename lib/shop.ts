import { cache as reactCache } from "react";
import { headers } from "next/headers";
import type { Shop } from "@prisma/client";
import { basePrisma } from "@/lib/prisma-core";

const cache: typeof reactCache =
  typeof reactCache === "function"
    ? reactCache
    : ((<T extends (...args: unknown[]) => unknown>(callback: T) => callback) as typeof reactCache);

export const DEFAULT_SHOP_ID = "shop_jak_barber";
export const DEFAULT_SHOP_SLUG = "jak-barber";
export const UNCONFIGURED_SHOP_ID = "__unconfigured_shop__";

const UNCONFIGURED_SHOP_CONFIG: ShopRuntimeConfig = {
  id: UNCONFIGURED_SHOP_ID,
  name: "Loja nao configurada",
  slug: "loja-nao-configurada",
  primaryDomain: null,
  isDefault: false,
  isActive: false,
  metadataTitle: "Loja nao configurada",
  metadataDescription: "Esta loja ainda nao foi configurada para este dominio.",
  whatsappNumber: null,
  instagramUrl: null,
  addressLine: null,
  businessHours: null,
  logoPath: null,
  faviconPath: null,
  brandColor: "#0ea5e9",
  brandColorStrong: "#7dd3fc",
  brandColorMuted: "rgba(14, 165, 233, 0.18)",
};

export type ShopRuntimeConfig = Pick<
  Shop,
  | "id"
  | "name"
  | "slug"
  | "primaryDomain"
  | "isDefault"
  | "isActive"
  | "metadataTitle"
  | "metadataDescription"
  | "whatsappNumber"
  | "instagramUrl"
  | "addressLine"
  | "businessHours"
  | "logoPath"
  | "faviconPath"
  | "brandColor"
  | "brandColorStrong"
  | "brandColorMuted"
>;

type ShopCacheEntry = {
  expiresAt: number;
  value: ShopRuntimeConfig | null;
};

const SHOP_CACHE_TTL_MS = 60_000;
const shopRuntimeCache = new Map<string, ShopCacheEntry>();
const shopRuntimeSelect = {
  id: true,
  name: true,
  slug: true,
  primaryDomain: true,
  isDefault: true,
  isActive: true,
  metadataTitle: true,
  metadataDescription: true,
  whatsappNumber: true,
  instagramUrl: true,
  addressLine: true,
  businessHours: true,
  logoPath: true,
  faviconPath: true,
  brandColor: true,
  brandColorStrong: true,
  brandColorMuted: true,
} satisfies Record<keyof ShopRuntimeConfig, true>;

function normalizeHost(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.trim().toLowerCase().replace(/:\d+$/, "");
}

function getConfiguredHost() {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.AUTH_URL,
    process.env.APP_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      return normalizeHost(new URL(candidate).host);
    } catch {
      continue;
    }
  }

  return null;
}

function isLocalHost(host: string | null | undefined) {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function getDomainCandidates(host: string) {
  const candidates = new Set([host]);

  if (host.startsWith("www.")) {
    candidates.add(host.slice(4));
  } else {
    candidates.add(`www.${host}`);
  }

  return [...candidates];
}

function canUseDefaultShopFallback(host: string | null) {
  if (!host) {
    return true;
  }

  if (process.env.NODE_ENV !== "production" && isLocalHost(host)) {
    return true;
  }

  const configuredHost = getConfiguredHost();
  return Boolean(configuredHost && getDomainCandidates(configuredHost).includes(host));
}

export async function getRequestHost() {
  try {
    const headerList = await headers();

    return (
      normalizeHost(headerList.get("x-forwarded-host")) ||
      normalizeHost(headerList.get("host")) ||
      getConfiguredHost()
    );
  } catch {
    return getConfiguredHost();
  }
}

const getShopByHost = cache(async (host: string | null): Promise<ShopRuntimeConfig | null> => {
  const cacheKey = host || "__default__";
  const now = Date.now();
  const cached = shopRuntimeCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  if (host) {
    const shopByDomain = await basePrisma.shop.findFirst({
      where: {
        isActive: true,
        primaryDomain: {
          in: getDomainCandidates(host),
        },
      },
      select: shopRuntimeSelect,
    });

    if (shopByDomain) {
      shopRuntimeCache.set(cacheKey, {
        expiresAt: now + SHOP_CACHE_TTL_MS,
        value: shopByDomain,
      });
      return shopByDomain;
    }

    if (!canUseDefaultShopFallback(host)) {
      shopRuntimeCache.set(cacheKey, {
        expiresAt: now + SHOP_CACHE_TTL_MS,
        value: null,
      });
      return null;
    }
  }

  const defaultShop =
    (await basePrisma.shop.findFirst({
      where: {
        isActive: true,
        isDefault: true,
      },
      select: shopRuntimeSelect,
    })) ||
    (await basePrisma.shop.findFirst({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: shopRuntimeSelect,
    }));

  shopRuntimeCache.set(cacheKey, {
    expiresAt: now + SHOP_CACHE_TTL_MS,
    value: defaultShop,
  });

  return defaultShop;
});

export async function getCurrentShop() {
  const host = await getRequestHost();
  const shop = await getShopByHost(host).catch(() => null);

  if (!shop) {
    return UNCONFIGURED_SHOP_CONFIG;
  }

  return shop;
}

export async function getCurrentShopId() {
  const shop = await getCurrentShop();
  return shop.id;
}

export function clearShopRuntimeCache() {
  shopRuntimeCache.clear();
}
