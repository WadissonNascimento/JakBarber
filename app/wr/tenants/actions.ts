"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { basePrisma } from "@/lib/prisma-core";
import { clearShopRuntimeCache } from "@/lib/shop";
import { deleteTenantBrandAsset, uploadTenantLogo } from "@/lib/tenantBrandAssets";
import {
  isTenantDesignTemplate,
  isTenantFontStyle,
  normalizeHexColor,
} from "@/lib/tenantDesign";
import { getTenantPlan, isTenantPlanCode } from "@/lib/tenantPlans";
import { requireWrAdminSession } from "@/lib/wrSession";

type UploadedTenantLogo = {
  assetPath: string;
  assetUrl: string;
};

function redirectToTenants(type: "notice" | "error", message: string): never {
  const params = new URLSearchParams({ [type]: message });
  redirect(`/wr/tenants?${params.toString()}`);
}

function redirectToTenant(
  shopId: string,
  type: "notice" | "error",
  message: string,
): never {
  const params = new URLSearchParams({ [type]: message });
  redirect(`/wr/tenants/${shopId}?${params.toString()}`);
}

function getShopId(formData: FormData) {
  return String(formData.get("shopId") || "").trim();
}

function getReturnTarget(formData: FormData) {
  return String(formData.get("returnTo") || "") === "detail" ? "detail" : "list";
}

function optionalText(formData: FormData, key: string, maxLength = 240) {
  const value = String(formData.get(key) || "").trim();
  return value ? value.slice(0, maxLength) : null;
}

function optionalPathOrUrl(formData: FormData, key: string) {
  const value = optionalText(formData, key, 500);

  if (!value) {
    return null;
  }

  if (value.startsWith("/") || value.startsWith("https://")) {
    return value;
  }

  return null;
}

function optionalImageFile(formData: FormData, key: string) {
  const file = formData.get(key);

  return file instanceof File && file.size > 0 ? file : null;
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
    from.g + (to.g - from.g) * amount,
  )}${toHex(from.b + (to.b - from.b) * amount)}`;
}

function buildMutedColor(color: string) {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, 0.18)`;
}

function redirectWithTarget(
  formData: FormData,
  shopId: string,
  type: "notice" | "error",
  message: string,
): never {
  if (getReturnTarget(formData) === "detail") {
    redirectToTenant(shopId, type, message);
  }

  redirectToTenants(type, message);
}

async function getMutableShop(shopId: string) {
  if (!shopId) {
    return null;
  }

  return basePrisma.shop.findUnique({
    where: { id: shopId },
    select: {
      id: true,
      name: true,
      slug: true,
      isDefault: true,
      isActive: true,
      archivedAt: true,
      logoPath: true,
    },
  });
}

async function assertWrPassword(userId: string, password: string) {
  if (!password) {
    return "Informe a senha do painel WR.";
  }

  const wrUser = await basePrisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      isActive: true,
      role: true,
      passwordHash: true,
    },
  });

  if (!wrUser || !wrUser.isActive || wrUser.role !== "WR_ADMIN" || !wrUser.passwordHash) {
    return "Usuario WR nao autorizado.";
  }

  const passwordMatches = await bcrypt.compare(password, wrUser.passwordHash);

  return passwordMatches ? null : "Senha do painel WR incorreta.";
}

export async function updateTenantPlanAction(formData: FormData) {
  await requireWrAdminSession();

  const shopId = getShopId(formData);
  const planCode = String(formData.get("planCode") || "custom").trim();
  const rawLimit = String(formData.get("barberLimit") || "").trim();
  const shop = await getMutableShop(shopId);

  if (!shop) {
    redirectToTenants("error", "Barbearia nao encontrada.");
  }

  if (shop.isDefault) {
    redirectToTenants("error", "A barbearia padrao nao pode ter o plano alterado por aqui.");
  }

  if (!isTenantPlanCode(planCode)) {
    redirectWithTarget(formData, shop.id, "error", "Plano invalido.");
  }

  const plan = getTenantPlan(planCode);
  const barberLimit = planCode === "custom" ? (rawLimit ? Number(rawLimit) : null) : plan.barberLimit;

  if (
    barberLimit !== null &&
    (!Number.isInteger(barberLimit) || barberLimit < 1 || barberLimit > 100)
  ) {
    redirectToTenants("error", "Limite de barbeiros invalido.");
  }

  await basePrisma.shop.update({
    where: { id: shop.id },
    data: { planCode, barberLimit },
  });

  revalidatePath("/wr/tenants");
  revalidatePath(`/wr/tenants/${shop.id}`);
  clearShopRuntimeCache();
  redirectWithTarget(formData, shop.id, "notice", "Plano e limite atualizados.");
}

export async function updateTenantDesignAction(formData: FormData) {
  await requireWrAdminSession();

  const shop = await getMutableShop(getShopId(formData));

  if (!shop) {
    redirectToTenants("error", "Barbearia nao encontrada.");
  }

  const designTemplate = String(formData.get("designTemplate") || "dark-premium").trim();
  const fontStyle = String(formData.get("fontStyle") || "modern").trim();

  if (!isTenantDesignTemplate(designTemplate)) {
    redirectToTenant(shop.id, "error", "Template de design invalido.");
  }

  if (!isTenantFontStyle(fontStyle)) {
    redirectToTenant(shop.id, "error", "Fonte invalida.");
  }

  const brandColor = normalizeHexColor(String(formData.get("brandColor") || ""), "#14b8a6");
  const logoFile = optionalImageFile(formData, "logoFile");
  const backgroundColor = normalizeHexColor(
    String(formData.get("backgroundColor") || ""),
    "#030712",
  );
  const textColor = normalizeHexColor(String(formData.get("textColor") || ""), "#f6f7fb");

  let uploadedLogo: UploadedTenantLogo | null = null;

  if (logoFile) {
    try {
      uploadedLogo = await uploadTenantLogo(logoFile, shop.slug);
    } catch (error) {
      redirectToTenant(
        shop.id,
        "error",
        error instanceof Error ? error.message : "Nao foi possivel processar a logo.",
      );
    }
  }

  try {
    await basePrisma.shop.update({
      where: { id: shop.id },
      data: {
        logoPath: uploadedLogo?.assetUrl || optionalPathOrUrl(formData, "logoPath"),
        faviconPath: optionalPathOrUrl(formData, "faviconPath"),
        heroImageUrl: optionalPathOrUrl(formData, "heroImageUrl"),
        designTemplate,
        fontStyle,
        brandColor,
        brandColorStrong: mixHexColor(brandColor, "#ffffff", 0.55),
        brandColorMuted: buildMutedColor(brandColor),
        backgroundColor,
        textColor,
      },
    });
  } catch (error) {
    if (uploadedLogo) {
      await deleteTenantBrandAsset(uploadedLogo.assetPath);
    }

    redirectToTenant(shop.id, "error", "Nao foi possivel atualizar o design.");
  }

  clearShopRuntimeCache();
  revalidatePath("/");
  revalidatePath("/wr/tenants");
  revalidatePath(`/wr/tenants/${shop.id}`);
  redirectToTenant(shop.id, "notice", "Design atualizado.");
}

export async function updateTenantHomeContentAction(formData: FormData) {
  await requireWrAdminSession();

  const shop = await getMutableShop(getShopId(formData));

  if (!shop) {
    redirectToTenants("error", "Barbearia nao encontrada.");
  }

  await basePrisma.shop.update({
    where: { id: shop.id },
    data: {
      metadataTitle: optionalText(formData, "metadataTitle", 80),
      metadataDescription: optionalText(formData, "metadataDescription", 180),
      whatsappNumber: optionalText(formData, "whatsappNumber", 32),
      instagramUrl: optionalPathOrUrl(formData, "instagramUrl"),
      addressLine: optionalText(formData, "addressLine", 160),
      businessHours: optionalText(formData, "businessHours", 120),
      heroEyebrow: optionalText(formData, "heroEyebrow", 60),
      heroTitle: optionalText(formData, "heroTitle", 90),
      heroSubtitle: optionalText(formData, "heroSubtitle", 220),
      primaryCtaLabel: optionalText(formData, "primaryCtaLabel", 32),
      secondaryCtaLabel: optionalText(formData, "secondaryCtaLabel", 32),
      secondaryCtaHref: optionalPathOrUrl(formData, "secondaryCtaHref") || "/servicos",
      attendanceText: optionalText(formData, "attendanceText", 80),
      reviewsTitle: optionalText(formData, "reviewsTitle", 90),
      reviewsEmptyText: optionalText(formData, "reviewsEmptyText", 220),
    },
  });

  clearShopRuntimeCache();
  revalidatePath("/");
  revalidatePath("/wr/tenants");
  revalidatePath(`/wr/tenants/${shop.id}`);
  redirectToTenant(shop.id, "notice", "Conteudo do site atualizado.");
}

export async function updateTenantBarberLimitAction(formData: FormData) {
  return updateTenantPlanAction(formData);
}

export async function archiveTenantAction(formData: FormData) {
  await requireWrAdminSession();

  const shop = await getMutableShop(getShopId(formData));

  if (!shop) {
    redirectToTenants("error", "Barbearia nao encontrada.");
  }

  if (shop.isDefault) {
    redirectToTenants("error", "A barbearia padrao nao pode ser arquivada.");
  }

  await basePrisma.shop.update({
    where: { id: shop.id },
    data: {
      isActive: false,
      archivedAt: new Date(),
    },
  });

  revalidatePath("/wr/tenants");
  revalidatePath(`/wr/tenants/${shop.id}`);
  clearShopRuntimeCache();
  redirectWithTarget(formData, shop.id, "notice", "Barbearia arquivada e acesso bloqueado.");
}

export async function reactivateTenantAction(formData: FormData) {
  await requireWrAdminSession();

  const shop = await getMutableShop(getShopId(formData));

  if (!shop) {
    redirectToTenants("error", "Barbearia nao encontrada.");
  }

  await basePrisma.shop.update({
    where: { id: shop.id },
    data: {
      isActive: true,
      archivedAt: null,
    },
  });

  revalidatePath("/wr/tenants");
  revalidatePath(`/wr/tenants/${shop.id}`);
  clearShopRuntimeCache();
  redirectWithTarget(formData, shop.id, "notice", "Barbearia reativada.");
}

export async function deleteTenantAction(formData: FormData) {
  const { user } = await requireWrAdminSession();

  const shop = await getMutableShop(getShopId(formData));
  const confirmed = String(formData.get("confirmDelete") || "") === "on";
  const password = String(formData.get("wrPassword") || "");

  if (!shop) {
    redirectToTenants("error", "Barbearia nao encontrada.");
  }

  if (shop.isDefault) {
    redirectToTenants("error", "A barbearia padrao nao pode ser excluida.");
  }

  if (!confirmed) {
    redirectToTenant(shop.id, "error", "Confirme a exclusao definitiva antes de continuar.");
  }

  const passwordError = await assertWrPassword(user.id, password);

  if (passwordError) {
    redirectToTenant(shop.id, "error", passwordError);
  }

  await basePrisma.shop.delete({
    where: { id: shop.id },
  });

  revalidatePath("/wr/tenants");
  clearShopRuntimeCache();
  redirectToTenants("notice", "Barbearia excluida definitivamente.");
}
