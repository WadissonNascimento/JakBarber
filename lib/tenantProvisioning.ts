import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { basePrisma } from "@/lib/prisma-core";
import { isStrongPassword, PASSWORD_REQUIREMENT_MESSAGE } from "@/lib/passwordPolicy";
import { normalizeIdentityEmail } from "@/lib/userIdentity";

export const WR_ADMIN_ROLE = "WR_ADMIN";
export const SHOP_ADMIN_ROLE = "SHOP_ADMIN";

const DEFAULT_BRAND_COLOR = "#0ea5e9";
const DEFAULT_BRAND_COLOR_STRONG = "#7dd3fc";
const DEFAULT_BRAND_COLOR_MUTED = "rgba(14, 165, 233, 0.18)";
const DEFAULT_BUSINESS_HOURS = "Horario sob consulta";

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
  emailSettings?: {
    fromName?: string | null;
    replyToEmail?: string | null;
    notificationEmail?: string | null;
  } | null;
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

export function normalizeCreateTenantShopInput(input: CreateTenantShopInput) {
  const name = requiredTrimmed(input.name, "Nome da barbearia");
  const slug = normalizeTenantSlug(input.slug || name);
  const primaryDomain = normalizeTenantDomain(input.primaryDomain);
  const adminName = requiredTrimmed(input.admin?.name, "Nome do admin");
  const adminEmail = normalizeIdentityEmail(input.admin?.email);
  const adminPassword = String(input.admin?.password || "");

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
      logoPath: nullableTrimmed(input.logoPath),
      faviconPath: nullableTrimmed(input.faviconPath),
      brandColor: normalizeHexColor(input.brandColor, DEFAULT_BRAND_COLOR),
      brandColorStrong: normalizeHexColor(
        input.brandColorStrong,
        DEFAULT_BRAND_COLOR_STRONG
      ),
      brandColorMuted: nullableTrimmed(input.brandColorMuted) || DEFAULT_BRAND_COLOR_MUTED,
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
