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

const FALLBACK_SHOP_CONFIG: ShopRuntimeConfig = {
  id: DEFAULT_SHOP_ID,
  name: "Jak Barber",
  slug: DEFAULT_SHOP_SLUG,
  primaryDomain: "jakbarbercompany.com",
  isDefault: true,
  isActive: true,
  metadataTitle: "Jak Barber | Barbearia com hora marcada",
  metadataDescription:
    "Agende seu horario na Jak Barber, acompanhe seus atendimentos e encontre produtos para manter o cuidado em dia.",
  whatsappNumber: "5511961971267",
  instagramUrl: "https://www.instagram.com/jakcompany_/",
  addressLine: "Osasco, SP",
  businessHours: "Terça a domingo, das 09h as 20h",
  logoPath: "/logo.png",
  faviconPath: "/favicon.png?v=20260503-j",
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
        primaryDomain: host,
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
    return FALLBACK_SHOP_CONFIG;
  }

  return shop;
}

export async function getCurrentShopId() {
  const shop = await getCurrentShop();
  return shop.id;
}
