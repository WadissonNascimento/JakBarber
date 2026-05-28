"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { basePrisma } from "@/lib/prisma-core";
import { normalizeTenantDomain } from "@/lib/tenantProvisioning";
import { requireWrAdminSession } from "@/lib/wrSession";

const MAX_SHORT_TEXT = 120;
const MAX_MEDIUM_TEXT = 280;
const MAX_LONG_TEXT = 900;

function getString(formData: FormData, key: string, maxLength = MAX_SHORT_TEXT) {
  return String(formData.get(key) || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function getNullableString(
  formData: FormData,
  key: string,
  maxLength = MAX_SHORT_TEXT
) {
  const value = getString(formData, key, maxLength);
  return value || null;
}

function getTextAreaValue(
  formData: FormData,
  key: string,
  maxLength = MAX_LONG_TEXT
) {
  const value = String(formData.get(key) || "").trim().slice(0, maxLength);
  return value || null;
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function normalizeHexColor(value: string | null) {
  if (!value) {
    return null;
  }

  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error("Cor invalida. Use formato #RRGGBB.");
  }

  return value;
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

function normalizeAssetPathOrUrl(value: string | null, label: string) {
  if (!value) {
    return null;
  }

  if (value.startsWith("/")) {
    return value;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      throw new Error("invalid protocol");
    }

    return url.toString();
  } catch {
    throw new Error(`${label} invalido. Use caminho /arquivo.png ou URL https.`);
  }
}

function normalizePublicHref(value: string | null, fallback: string) {
  if (!value) {
    return fallback;
  }

  if (value.startsWith("/")) {
    return value;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      throw new Error("invalid protocol");
    }

    return url.toString();
  } catch {
    throw new Error("Link de botao invalido. Use caminho /pagina ou URL https.");
  }
}

function resultRedirect(shopId: string, type: "notice" | "error", message: string): never {
  redirect(`/wr/tenants/${shopId}?${type}=${encodeURIComponent(message)}`);
}

export async function updateTenantPublicSiteAction(formData: FormData) {
  await requireWrAdminSession();

  const shopId = getString(formData, "shopId", 90);

  if (!shopId) {
    redirect("/wr/tenants?error=Tenant invalido.");
  }

  const shop = await basePrisma.shop.findUnique({
    where: { id: shopId },
    select: { id: true, isDefault: true, brandColor: true },
  });

  if (!shop) {
    redirect("/wr/tenants?error=Tenant nao encontrado.");
  }

  if (shop.isDefault) {
    resultRedirect(shopId, "error", "A Jak Barber esta bloqueada para edicao pelo painel WR.");
  }

  try {
    const brandColor =
      normalizeHexColor(getNullableString(formData, "brandColor", 7)) ||
      shop.brandColor ||
      "#14b8a6";
    const primaryDomain = normalizeTenantDomain(getNullableString(formData, "primaryDomain"));
    const logoPath = normalizeAssetPathOrUrl(
      getNullableString(formData, "logoPath", MAX_MEDIUM_TEXT),
      "Logo"
    );
    const faviconPath = normalizeAssetPathOrUrl(
      getNullableString(formData, "faviconPath", MAX_MEDIUM_TEXT),
      "Favicon"
    );

    await basePrisma.$transaction([
      basePrisma.shop.update({
        where: { id: shopId },
        data: {
          name: getString(formData, "name"),
          primaryDomain,
          metadataTitle: getNullableString(formData, "metadataTitle", MAX_MEDIUM_TEXT),
          metadataDescription: getNullableString(
            formData,
            "metadataDescription",
            MAX_MEDIUM_TEXT
          ),
          whatsappNumber: getNullableString(formData, "whatsappNumber"),
          instagramUrl: getNullableString(formData, "instagramUrl", MAX_MEDIUM_TEXT),
          addressLine: getNullableString(formData, "addressLine", MAX_MEDIUM_TEXT),
          businessHours: getNullableString(formData, "businessHours", MAX_MEDIUM_TEXT),
          logoPath,
          faviconPath,
          brandColor,
          brandColorStrong: mixHexColor(brandColor, "#ffffff", 0.45),
          brandColorMuted: buildMutedColor(brandColor),
        },
      }),
      basePrisma.shopHomeContent.upsert({
        where: { shopId },
        create: {
          shopId,
          heroEyebrow: getNullableString(formData, "heroEyebrow"),
          heroTitle: getNullableString(formData, "heroTitle", MAX_MEDIUM_TEXT),
          heroSubtitle: getTextAreaValue(formData, "heroSubtitle", MAX_MEDIUM_TEXT),
          primaryButtonLabel: getNullableString(formData, "primaryButtonLabel"),
          primaryButtonHref: normalizePublicHref(
            getNullableString(formData, "primaryButtonHref", MAX_MEDIUM_TEXT),
            "/agendar"
          ),
          secondaryButtonLabel: getNullableString(formData, "secondaryButtonLabel"),
          secondaryButtonHref: normalizePublicHref(
            getNullableString(formData, "secondaryButtonHref", MAX_MEDIUM_TEXT),
            "/servicos"
          ),
          infoOneLabel: getNullableString(formData, "infoOneLabel"),
          infoOneValue: getNullableString(formData, "infoOneValue", MAX_MEDIUM_TEXT),
          infoTwoLabel: getNullableString(formData, "infoTwoLabel"),
          infoTwoValue: getNullableString(formData, "infoTwoValue", MAX_MEDIUM_TEXT),
          infoThreeLabel: getNullableString(formData, "infoThreeLabel"),
          infoThreeValue: getNullableString(formData, "infoThreeValue", MAX_MEDIUM_TEXT),
          showServices: getBoolean(formData, "showServices"),
          servicesEyebrow: getNullableString(formData, "servicesEyebrow"),
          servicesTitle: getNullableString(formData, "servicesTitle", MAX_MEDIUM_TEXT),
          servicesDescription: getTextAreaValue(
            formData,
            "servicesDescription",
            MAX_MEDIUM_TEXT
          ),
          showBarbers: getBoolean(formData, "showBarbers"),
          barbersEyebrow: getNullableString(formData, "barbersEyebrow"),
          barbersTitle: getNullableString(formData, "barbersTitle", MAX_MEDIUM_TEXT),
          barbersDescription: getTextAreaValue(
            formData,
            "barbersDescription",
            MAX_MEDIUM_TEXT
          ),
          showProducts: getBoolean(formData, "showProducts"),
          productsEyebrow: getNullableString(formData, "productsEyebrow"),
          productsTitle: getNullableString(formData, "productsTitle", MAX_MEDIUM_TEXT),
          productsDescription: getTextAreaValue(
            formData,
            "productsDescription",
            MAX_MEDIUM_TEXT
          ),
          showReviews: getBoolean(formData, "showReviews"),
          reviewsEyebrow: getNullableString(formData, "reviewsEyebrow"),
          reviewsTitle: getNullableString(formData, "reviewsTitle", MAX_MEDIUM_TEXT),
          reviewsEmptyText: getTextAreaValue(formData, "reviewsEmptyText", MAX_MEDIUM_TEXT),
          showAbout: getBoolean(formData, "showAbout"),
          aboutEyebrow: getNullableString(formData, "aboutEyebrow"),
          aboutTitle: getNullableString(formData, "aboutTitle", MAX_MEDIUM_TEXT),
          aboutBody: getTextAreaValue(formData, "aboutBody"),
          showContact: getBoolean(formData, "showContact"),
          contactEyebrow: getNullableString(formData, "contactEyebrow"),
          contactTitle: getNullableString(formData, "contactTitle", MAX_MEDIUM_TEXT),
          contactBody: getTextAreaValue(formData, "contactBody", MAX_MEDIUM_TEXT),
          footerText: getNullableString(formData, "footerText", MAX_MEDIUM_TEXT),
        },
        update: {
          heroEyebrow: getNullableString(formData, "heroEyebrow"),
          heroTitle: getNullableString(formData, "heroTitle", MAX_MEDIUM_TEXT),
          heroSubtitle: getTextAreaValue(formData, "heroSubtitle", MAX_MEDIUM_TEXT),
          primaryButtonLabel: getNullableString(formData, "primaryButtonLabel"),
          primaryButtonHref: normalizePublicHref(
            getNullableString(formData, "primaryButtonHref", MAX_MEDIUM_TEXT),
            "/agendar"
          ),
          secondaryButtonLabel: getNullableString(formData, "secondaryButtonLabel"),
          secondaryButtonHref: normalizePublicHref(
            getNullableString(formData, "secondaryButtonHref", MAX_MEDIUM_TEXT),
            "/servicos"
          ),
          infoOneLabel: getNullableString(formData, "infoOneLabel"),
          infoOneValue: getNullableString(formData, "infoOneValue", MAX_MEDIUM_TEXT),
          infoTwoLabel: getNullableString(formData, "infoTwoLabel"),
          infoTwoValue: getNullableString(formData, "infoTwoValue", MAX_MEDIUM_TEXT),
          infoThreeLabel: getNullableString(formData, "infoThreeLabel"),
          infoThreeValue: getNullableString(formData, "infoThreeValue", MAX_MEDIUM_TEXT),
          showServices: getBoolean(formData, "showServices"),
          servicesEyebrow: getNullableString(formData, "servicesEyebrow"),
          servicesTitle: getNullableString(formData, "servicesTitle", MAX_MEDIUM_TEXT),
          servicesDescription: getTextAreaValue(
            formData,
            "servicesDescription",
            MAX_MEDIUM_TEXT
          ),
          showBarbers: getBoolean(formData, "showBarbers"),
          barbersEyebrow: getNullableString(formData, "barbersEyebrow"),
          barbersTitle: getNullableString(formData, "barbersTitle", MAX_MEDIUM_TEXT),
          barbersDescription: getTextAreaValue(
            formData,
            "barbersDescription",
            MAX_MEDIUM_TEXT
          ),
          showProducts: getBoolean(formData, "showProducts"),
          productsEyebrow: getNullableString(formData, "productsEyebrow"),
          productsTitle: getNullableString(formData, "productsTitle", MAX_MEDIUM_TEXT),
          productsDescription: getTextAreaValue(
            formData,
            "productsDescription",
            MAX_MEDIUM_TEXT
          ),
          showReviews: getBoolean(formData, "showReviews"),
          reviewsEyebrow: getNullableString(formData, "reviewsEyebrow"),
          reviewsTitle: getNullableString(formData, "reviewsTitle", MAX_MEDIUM_TEXT),
          reviewsEmptyText: getTextAreaValue(formData, "reviewsEmptyText", MAX_MEDIUM_TEXT),
          showAbout: getBoolean(formData, "showAbout"),
          aboutEyebrow: getNullableString(formData, "aboutEyebrow"),
          aboutTitle: getNullableString(formData, "aboutTitle", MAX_MEDIUM_TEXT),
          aboutBody: getTextAreaValue(formData, "aboutBody"),
          showContact: getBoolean(formData, "showContact"),
          contactEyebrow: getNullableString(formData, "contactEyebrow"),
          contactTitle: getNullableString(formData, "contactTitle", MAX_MEDIUM_TEXT),
          contactBody: getTextAreaValue(formData, "contactBody", MAX_MEDIUM_TEXT),
          footerText: getNullableString(formData, "footerText", MAX_MEDIUM_TEXT),
        },
      }),
    ]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      resultRedirect(shopId, "error", "Dominio ja esta em uso por outra barbearia.");
    }

    resultRedirect(
      shopId,
      "error",
      error instanceof Error ? error.message : "Nao foi possivel salvar."
    );
  }

  revalidatePath("/");
  revalidatePath("/wr/tenants");
  revalidatePath(`/wr/tenants/${shopId}`);

  resultRedirect(shopId, "notice", "Site da barbearia atualizado.");
}
