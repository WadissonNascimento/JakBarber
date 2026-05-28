import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { basePrisma } from "@/lib/prisma-core";
import { isStrongPassword, PASSWORD_REQUIREMENT_MESSAGE } from "@/lib/passwordPolicy";
import {
  DEFAULT_PUBLIC_HOME_CONTENT,
  type PublicHomeContent,
} from "@/lib/shopHomeContent";
import { normalizeIdentityEmail } from "@/lib/userIdentity";

export const WR_ADMIN_ROLE = "WR_ADMIN";
export const SHOP_ADMIN_ROLE = "SHOP_ADMIN";

const DEFAULT_BRAND_COLOR = "#14b8a6";
const DEFAULT_BRAND_COLOR_STRONG = "#99f6e4";
const DEFAULT_BRAND_COLOR_MUTED = "rgba(20, 184, 166, 0.18)";
const DEFAULT_BACKGROUND_COLOR = "#05070b";
const DEFAULT_TEXT_COLOR = "#ffffff";
const DEFAULT_BUSINESS_HOURS = "Horario sob consulta";
const ALLOWED_FONT_FAMILIES = new Set(["modern", "display", "system", "serif"]);

type NullableHomeContentInput = {
  [Key in keyof PublicHomeContent]?: PublicHomeContent[Key] | null;
};

export type CreateTenantShopInput = {
  name: string;
  slug?: string | null;
  primaryDomain?: string | null;
  metadataTitle?: string | null;
  metadataDescription?: string | null;
  whatsappNumber?: string | null;
  instagramUrl?: string | null;
  addressLine?: string | null;
  businessHours?: string | null;
  logoPath?: string | null;
  faviconPath?: string | null;
  brandColor?: string | null;
  brandColorStrong?: string | null;
  brandColorMuted?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  fontFamily?: string | null;
  emailSettings?: {
    fromName?: string | null;
    replyToEmail?: string | null;
    notificationEmail?: string | null;
  } | null;
  homeContent?: NullableHomeContentInput | null;
  admin: {
    name: string;
    email: string;
    password: string;
    phone?: string | null;
  };
  defaultServices?: Array<{
    name: string;
    description?: string | null;
    price: number;
    duration: number;
    commissionType?: "PERCENT" | "FIXED";
    commissionValue?: number;
  }>;
};

export type CreateTenantShopResult = {
  shopId: string;
  shopSlug: string;
  primaryDomain: string | null;
  adminUserId: string;
  defaultServiceIds: string[];
};

export class TenantProvisioningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantProvisioningError";
  }
}

function requiredTrimmed(value: string | null | undefined, fieldName: string) {
  const trimmed = String(value || "").trim().replace(/\s+/g, " ");

  if (!trimmed) {
    throw new TenantProvisioningError(`${fieldName} e obrigatorio.`);
  }

  return trimmed;
}

export function normalizeTenantSlug(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  if (!/^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$/.test(slug)) {
    throw new TenantProvisioningError(
      "Slug invalido. Use letras, numeros e hifens."
    );
  }

  return slug;
}

export function normalizeTenantDomain(value: string | null | undefined) {
  const rawValue = String(value || "").trim().toLowerCase();

  if (!rawValue) {
    return null;
  }

  const withProtocol = /^[a-z]+:\/\//i.test(rawValue)
    ? rawValue
    : `https://${rawValue}`;

  let hostname: string;

  try {
    hostname = new URL(withProtocol).hostname;
  } catch {
    throw new TenantProvisioningError("Dominio invalido.");
  }

  const normalized = hostname.replace(/^www\./, "");

  if (
    !/^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/.test(normalized) ||
    normalized.includes("..")
  ) {
    throw new TenantProvisioningError("Dominio invalido.");
  }

  return normalized;
}

function nullableTrimmed(value: string | null | undefined) {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}

function nullableLimitedText(
  value: string | null | undefined,
  maxLength: number
) {
  const trimmed = String(value || "").trim().slice(0, maxLength);
  return trimmed || null;
}

function normalizeHexColor(value: string | null | undefined, fallback: string) {
  const color = nullableTrimmed(value);

  if (!color) {
    return fallback;
  }

  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    throw new TenantProvisioningError("Cor invalida. Use formato #RRGGBB.");
  }

  return color;
}

function normalizeFontFamily(value: string | null | undefined) {
  const fontFamily = nullableTrimmed(value) || "modern";

  if (!ALLOWED_FONT_FAMILIES.has(fontFamily)) {
    throw new TenantProvisioningError("Fonte invalida.");
  }

  return fontFamily;
}

function hexToRgb(color: string) {
  const normalized = color.replace("#", "");

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function toHex(value: number) {
  return Math.round(value).toString(16).padStart(2, "0");
}

function mixHexColor(color: string, target: string, amount: number) {
  const from = hexToRgb(color);
  const to = hexToRgb(target);

  return `#${toHex(from.r + (to.r - from.r) * amount)}${toHex(
    from.g + (to.g - from.g) * amount
  )}${toHex(from.b + (to.b - from.b) * amount)}`;
}

function buildMutedColor(color: string) {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, 0.18)`;
}

function normalizeAssetPathOrUrl(value: string | null | undefined, fieldName: string) {
  const asset = nullableTrimmed(value);

  if (!asset) {
    return null;
  }

  if (asset.startsWith("/")) {
    return asset;
  }

  try {
    const url = new URL(asset);

    if (url.protocol !== "https:") {
      throw new Error("Protocolo invalido.");
    }

    return url.toString();
  } catch {
    throw new TenantProvisioningError(`${fieldName} invalido. Use caminho /arquivo.png ou URL https.`);
  }
}

function normalizePublicHref(value: string | null | undefined, fallback: string) {
  const href = nullableTrimmed(value);

  if (!href) {
    return fallback;
  }

  if (href.startsWith("/")) {
    return href;
  }

  try {
    const url = new URL(href);

    if (url.protocol !== "https:") {
      throw new Error("Protocolo invalido.");
    }

    return url.toString();
  } catch {
    throw new TenantProvisioningError(
      "Link de botao invalido. Use caminho /pagina ou URL https."
    );
  }
}

function normalizeOptionalEmail(value: string | null | undefined, fieldName: string) {
  const email = normalizeIdentityEmail(value);

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new TenantProvisioningError(`${fieldName} invalido.`);
  }

  return email || null;
}

function buildShopId(slug: string) {
  return `shop_${slug.replace(/-/g, "_")}`;
}

function normalizeDefaultServices(input: CreateTenantShopInput["defaultServices"] = []) {
  return input.map((service) => {
    const name = requiredTrimmed(service.name, "Nome do servico");
    const price = Number(service.price);
    const duration = Number(service.duration);
    const commissionValue = Number(service.commissionValue ?? 40);
    const commissionType = service.commissionType === "FIXED" ? "FIXED" : "PERCENT";

    if (!Number.isFinite(price) || price < 0 || price > 100000) {
      throw new TenantProvisioningError(`Preco invalido para ${name}.`);
    }

    if (!Number.isInteger(duration) || duration < 5 || duration > 600) {
      throw new TenantProvisioningError(`Duracao invalida para ${name}.`);
    }

    if (
      !Number.isFinite(commissionValue) ||
      commissionValue < 0 ||
      (commissionType === "PERCENT" && commissionValue > 100)
    ) {
      throw new TenantProvisioningError(`Comissao invalida para ${name}.`);
    }

    return {
      name,
      description: nullableTrimmed(service.description),
      price: new Prisma.Decimal(price.toFixed(2)),
      duration,
      commissionType,
      commissionValue: new Prisma.Decimal(commissionValue.toFixed(2)),
    };
  });
}

function normalizeHomeContent(input: CreateTenantShopInput["homeContent"]) {
  if (!input) {
    return null;
  }

  return {
    heroEyebrow: nullableLimitedText(input.heroEyebrow, 120),
    heroTitle: nullableLimitedText(input.heroTitle, 280),
    heroSubtitle: nullableLimitedText(input.heroSubtitle, 280),
    primaryButtonLabel: nullableLimitedText(input.primaryButtonLabel, 120),
    primaryButtonHref: normalizePublicHref(
      input.primaryButtonHref,
      DEFAULT_PUBLIC_HOME_CONTENT.primaryButtonHref
    ),
    secondaryButtonLabel: nullableLimitedText(input.secondaryButtonLabel, 120),
    secondaryButtonHref: normalizePublicHref(
      input.secondaryButtonHref,
      DEFAULT_PUBLIC_HOME_CONTENT.secondaryButtonHref
    ),
    infoOneLabel: nullableLimitedText(input.infoOneLabel, 120),
    infoOneValue: nullableLimitedText(input.infoOneValue, 280),
    infoTwoLabel: nullableLimitedText(input.infoTwoLabel, 120),
    infoTwoValue: nullableLimitedText(input.infoTwoValue, 280),
    infoThreeLabel: nullableLimitedText(input.infoThreeLabel, 120),
    infoThreeValue: nullableLimitedText(input.infoThreeValue, 280),
    showServices: input.showServices ?? DEFAULT_PUBLIC_HOME_CONTENT.showServices,
    servicesEyebrow: nullableLimitedText(input.servicesEyebrow, 120),
    servicesTitle: nullableLimitedText(input.servicesTitle, 280),
    servicesDescription: nullableLimitedText(input.servicesDescription, 280),
    showBarbers: input.showBarbers ?? DEFAULT_PUBLIC_HOME_CONTENT.showBarbers,
    barbersEyebrow: nullableLimitedText(input.barbersEyebrow, 120),
    barbersTitle: nullableLimitedText(input.barbersTitle, 280),
    barbersDescription: nullableLimitedText(input.barbersDescription, 280),
    showProducts: input.showProducts ?? DEFAULT_PUBLIC_HOME_CONTENT.showProducts,
    productsEyebrow: nullableLimitedText(input.productsEyebrow, 120),
    productsTitle: nullableLimitedText(input.productsTitle, 280),
    productsDescription: nullableLimitedText(input.productsDescription, 280),
    showReviews: input.showReviews ?? DEFAULT_PUBLIC_HOME_CONTENT.showReviews,
    reviewsEyebrow: nullableLimitedText(input.reviewsEyebrow, 120),
    reviewsTitle: nullableLimitedText(input.reviewsTitle, 280),
    reviewsEmptyText: nullableLimitedText(input.reviewsEmptyText, 280),
    showAbout: input.showAbout ?? DEFAULT_PUBLIC_HOME_CONTENT.showAbout,
    aboutEyebrow: nullableLimitedText(input.aboutEyebrow, 120),
    aboutTitle: nullableLimitedText(input.aboutTitle, 280),
    aboutBody: nullableLimitedText(input.aboutBody, 900),
    showContact: input.showContact ?? DEFAULT_PUBLIC_HOME_CONTENT.showContact,
    contactEyebrow: nullableLimitedText(input.contactEyebrow, 120),
    contactTitle: nullableLimitedText(input.contactTitle, 280),
    contactBody: nullableLimitedText(input.contactBody, 280),
    footerText: nullableLimitedText(input.footerText, 280),
  };
}

export function normalizeCreateTenantShopInput(input: CreateTenantShopInput) {
  const name = requiredTrimmed(input.name, "Nome da barbearia");
  const slug = normalizeTenantSlug(input.slug || name);
  const primaryDomain = normalizeTenantDomain(input.primaryDomain);
  const adminName = requiredTrimmed(input.admin?.name, "Nome do admin");
  const adminEmail = normalizeIdentityEmail(input.admin?.email);
  const adminPassword = String(input.admin?.password || "");
  const brandColor = normalizeHexColor(input.brandColor, DEFAULT_BRAND_COLOR);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    throw new TenantProvisioningError("E-mail do admin invalido.");
  }

  if (!isStrongPassword(adminPassword)) {
    throw new TenantProvisioningError(PASSWORD_REQUIREMENT_MESSAGE);
  }

  return {
    shopId: buildShopId(slug),
    shop: {
      name,
      slug,
      primaryDomain,
      metadataTitle: nullableTrimmed(input.metadataTitle) || name,
      metadataDescription: nullableTrimmed(input.metadataDescription),
      whatsappNumber: nullableTrimmed(input.whatsappNumber),
      instagramUrl: nullableTrimmed(input.instagramUrl),
      addressLine: nullableTrimmed(input.addressLine),
      businessHours: nullableTrimmed(input.businessHours) || DEFAULT_BUSINESS_HOURS,
      logoPath: normalizeAssetPathOrUrl(input.logoPath, "Logo"),
      faviconPath: normalizeAssetPathOrUrl(input.faviconPath, "Favicon"),
      brandColor,
      brandColorStrong: input.brandColorStrong
        ? normalizeHexColor(input.brandColorStrong, DEFAULT_BRAND_COLOR_STRONG)
        : mixHexColor(brandColor, "#ffffff", 0.45),
      brandColorMuted: nullableTrimmed(input.brandColorMuted) || buildMutedColor(brandColor),
      backgroundColor: normalizeHexColor(input.backgroundColor, DEFAULT_BACKGROUND_COLOR),
      textColor: normalizeHexColor(input.textColor, DEFAULT_TEXT_COLOR),
      fontFamily: normalizeFontFamily(input.fontFamily),
    },
    emailSettings: input.emailSettings
      ? {
          fromName: nullableTrimmed(input.emailSettings.fromName) || name,
          replyToEmail: normalizeOptionalEmail(
            input.emailSettings.replyToEmail,
            "E-mail de resposta"
          ),
          notificationEmail: normalizeOptionalEmail(
            input.emailSettings.notificationEmail,
            "E-mail de notificacao"
          ),
        }
      : null,
    homeContent: normalizeHomeContent(input.homeContent),
    admin: {
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      phone: nullableTrimmed(input.admin.phone),
    },
    defaultServices: normalizeDefaultServices(input.defaultServices),
  };
}

async function assertWrProvisioningActor(actorWrUserId: string) {
  const actor = await basePrisma.user.findFirst({
    where: {
      id: actorWrUserId,
      role: WR_ADMIN_ROLE,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!actor) {
    throw new TenantProvisioningError("Usuario WR nao autorizado.");
  }
}

async function assertTenantDoesNotExist({
  shopId,
  slug,
  primaryDomain,
  adminEmail,
}: {
  shopId: string;
  slug: string;
  primaryDomain: string | null;
  adminEmail: string;
}) {
  const [shopById, shopBySlug, shopByDomain, userByEmail] = await Promise.all([
    basePrisma.shop.findUnique({ where: { id: shopId }, select: { id: true } }),
    basePrisma.shop.findUnique({ where: { slug }, select: { id: true } }),
    primaryDomain
      ? basePrisma.shop.findUnique({
          where: { primaryDomain },
          select: { id: true },
        })
      : null,
    basePrisma.user.findFirst({
      where: {
        email: adminEmail,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (shopById || shopBySlug) {
    throw new TenantProvisioningError("Ja existe uma barbearia com esse slug.");
  }

  if (shopByDomain) {
    throw new TenantProvisioningError("Ja existe uma barbearia com esse dominio.");
  }

  if (userByEmail) {
    throw new TenantProvisioningError("Ja existe um usuario com esse e-mail.");
  }
}

export async function createTenantShop(
  input: CreateTenantShopInput,
  actorWrUserId: string
): Promise<CreateTenantShopResult> {
  const normalized = normalizeCreateTenantShopInput(input);

  await assertWrProvisioningActor(actorWrUserId);
  await assertTenantDoesNotExist({
    shopId: normalized.shopId,
    slug: normalized.shop.slug,
    primaryDomain: normalized.shop.primaryDomain,
    adminEmail: normalized.admin.email,
  });

  const passwordHash = await bcrypt.hash(normalized.admin.password, 10);

  return basePrisma.$transaction(async (tx) => {
    const shop = await tx.shop.create({
      data: {
        id: normalized.shopId,
        ...normalized.shop,
        isDefault: false,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        primaryDomain: true,
      },
    });

    if (normalized.emailSettings) {
      await tx.shopEmailSettings.create({
        data: {
          shopId: shop.id,
          fromName: normalized.emailSettings.fromName,
          replyToEmail: normalized.emailSettings.replyToEmail || null,
          notificationEmail: normalized.emailSettings.notificationEmail || null,
        },
      });
    }

    if (normalized.homeContent) {
      await tx.shopHomeContent.create({
        data: {
          shopId: shop.id,
          ...normalized.homeContent,
        },
      });
    }

    const admin = await tx.user.create({
      data: {
        shopId: shop.id,
        name: normalized.admin.name,
        email: normalized.admin.email,
        passwordHash,
        role: SHOP_ADMIN_ROLE,
        phone: normalized.admin.phone,
        isActive: true,
        emailVerified: new Date(),
      },
      select: {
        id: true,
      },
    });

    const defaultServices = await Promise.all(
      normalized.defaultServices.map((service) =>
        tx.service.create({
          data: {
            shopId: shop.id,
            ...service,
            barberId: null,
            isActive: true,
          },
          select: {
            id: true,
          },
        })
      )
    );

    return {
      shopId: shop.id,
      shopSlug: shop.slug,
      primaryDomain: shop.primaryDomain,
      adminUserId: admin.id,
      defaultServiceIds: defaultServices.map((service) => service.id),
    };
  });
}
